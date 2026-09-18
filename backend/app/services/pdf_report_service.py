"""
PDF 报告生成服务
负责从数据库聚合求职统计指标，通过 Matplotlib 渲染可视化图表，并使用 ReportLab 构建多页专业求职分析 PDF 报告。
"""
import io
import os
import re
import tempfile
from collections import Counter
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import JobRecord, Resume


# ==================== 中文字体探测与注册 ====================

_CN_FONT_NAME = None


def find_cn_font() -> str | None:
    """扫描系统中文字体并注册到 ReportLab"""
    candidates = [
        # Windows
        ("C:/Windows/Fonts/simhei.ttf", "SimHei"),
        ("C:/Windows/Fonts/msyh.ttc", "Microsoft YaHei"),
        ("C:/Windows/Fonts/msyhbd.ttc", "Microsoft YaHei"),
        ("C:/Windows/Fonts/simsun.ttc", "SimSun"),
        # Debian / Ubuntu (fonts-wqy-zenhei, fonts-wqy-microhei)
        ("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", "WenQuanYi Zen Hei"),
        ("/usr/share/fonts/truetype/wqy/wqy-microhei.ttc", "WenQuanYi Micro Hei"),
        # CentOS / Fedora / RHEL
        ("/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc", "WenQuanYi Zen Hei"),
        ("/usr/share/fonts/wqy-microhei/wqy-microhei.ttc", "WenQuanYi Micro Hei"),
        # Noto & Droid CJK
        ("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", "Noto Sans CJK"),
        ("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc", "Noto Sans CJK"),
        ("/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc", "Noto Sans CJK"),
        ("/usr/share/fonts/truetype/droid/DroidSansFallbackFull.ttf", "Droid Sans Fallback"),
        # macOS
        ("/System/Library/Fonts/PingFang.ttc", "PingFang"),
        ("/System/Library/Fonts/Hiragino Sans GB.ttc", "Hiragino Sans GB"),
        ("/Library/Fonts/Songti.ttc", "Songti"),
    ]
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont

    for path, name in candidates:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(name, path))
                return name
            except Exception:
                pass
    return None


def get_cn_font() -> str | None:
    global _CN_FONT_NAME
    if _CN_FONT_NAME is None:
        _CN_FONT_NAME = find_cn_font()
    return _CN_FONT_NAME


# ==================== 图表渲染辅助 ====================

def _setup_cn_matplotlib():
    """配置 matplotlib 中文字体"""
    import matplotlib.pyplot as plt
    candidates = [
        "SimHei", "Microsoft YaHei", "PingFang SC",
        "Hiragino Sans GB", "WenQuanYi Zen Hei",
    ]
    for name in candidates:
        try:
            plt.rcParams["font.sans-serif"] = [name, "DejaVu Sans"]
            plt.rcParams["axes.unicode_minus"] = False
            import matplotlib.font_manager as fm
            if any(name.lower() in f.name.lower() for f in fm.fontManager.ttflist):
                return
        except Exception:
            pass


def _generate_charts(dist: dict, funnel: dict) -> dict[str, str]:
    """生成 matplotlib 图表，返回图片临时路径字典"""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    _setup_cn_matplotlib()
    images = {}

    # 1. 匹配度分布柱状图
    fig, ax = plt.subplots(figsize=(5.5, 3.5))
    labels = [r["label"] for r in dist["ranges"]]
    counts = [r["count"] for r in dist["ranges"]]
    colors = ["#34a853", "#85CE61", "#E6A23C", "#F56C6C", "#909399"]
    ax.bar(labels, counts, color=colors[:len(labels)], edgecolor="white")
    ax.set_ylabel("岗位数量", fontsize=10)
    ax.set_title("匹配度分布", fontsize=12, fontweight="bold", color="#1a73e8")
    for i, v in enumerate(counts):
        if v > 0:
            ax.text(i, v + max(counts) * 0.02, str(v), ha="center", fontsize=9)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    fig.tight_layout()
    tmp1 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig.savefig(tmp1.name, dpi=120, bbox_inches="tight")
    plt.close(fig)
    images["dist"] = tmp1.name

    # 2. 漏斗图
    fig, ax = plt.subplots(figsize=(4.5, 4))
    steps = [
        ("扫描岗位", funnel["total_jobs"]),
        ("推荐岗位", funnel["recommended_jobs"]),
        ("已沟通", funnel["communicated_jobs"]),
        ("面试邀请", funnel["interview_jobs"]),
        ("Offer", funnel["offer_jobs"]),
    ]
    max_val = max(v for _, v in steps) or 1
    funnel_colors = ["#1a73e8", "#34a853", "#fbbc04", "#ea4335", "#9b59b6"]
    bar_height = 0.45
    for i, (label, val) in enumerate(steps):
        width = max(val / max_val, 0.04)
        y_pos = 4 - i
        ax.barh(y_pos, width, bar_height, color=funnel_colors[i], edgecolor="white", label=label)
        ax.text(width + 0.02, y_pos, str(val), va="center", fontsize=11, fontweight="bold")
        ax.text(0.02, y_pos, label, va="center", fontsize=9, color="white", fontweight="bold")

    ax.set_yticks([])
    ax.set_xlim(0, 1.25)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.set_title("求职漏斗", fontsize=12, fontweight="bold", color="#1a73e8")
    fig.tight_layout()
    tmp2 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig.savefig(tmp2.name, dpi=120, bbox_inches="tight")
    plt.close(fig)
    images["funnel"] = tmp2.name

    return images


def _hr_color(status: str):
    """根据 HR 状态返回对应颜色"""
    from reportlab.lib.colors import HexColor
    color_map = {
        "在线": HexColor("#34a853"),
        "刚刚活跃": HexColor("#34a853"),
        "今日活跃": HexColor("#34a853"),
        "3日内活跃": HexColor("#fbbc04"),
        "本周活跃": HexColor("#fbbc04"),
        "两周内活跃": HexColor("#ea4335"),
        "本月活跃": HexColor("#ea4335"),
        "两月内活跃": HexColor("#ea4335"),
        "3月内活跃": HexColor("#ea4335"),
        "半年前活跃": HexColor("#ea4335"),
    }
    return color_map.get(status, HexColor("#999999"))


# ==================== 主导出接口 ====================

def generate_job_report_pdf(
    overview: dict,
    dist: dict,
    funnel: dict,
    recent: list,
    hr_dist: dict,
    top10_high: list,
    resume_name: str,
    top_skills: list,
    top_directions: list,
) -> tuple[io.BytesIO, str]:
    """
    构建完整的多页专业求职分析 PDF 报告

    Returns:
        (BytesIO 数据流, 建议下载文件名)
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.colors import HexColor
    from reportlab.pdfgen import canvas as rl_canvas

    now = datetime.now()
    report_time = now.strftime("%Y-%m-%d %H:%M:%S")
    filename = f"AI求职报告_{now.strftime('%Y%m%d_%H%M%S')}.pdf"

    chart_images = _generate_charts(dist, funnel)

    buf = io.BytesIO()
    W, H = A4
    c = rl_canvas.Canvas(buf, pagesize=A4)
    font_name = get_cn_font()
    has_cn = font_name is not None

    BLUE = HexColor("#1a73e8")
    GRAY = HexColor("#666666")
    LIGHT_BG = HexColor("#f0f4ff")

    def draw_cn(text, x, y, size=10, color=None, bold=False):
        c.setFillColor(color or GRAY)
        if has_cn:
            c.setFont(font_name, size)
            c.drawString(x, y, str(text))
        else:
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            safe_text = str(text).encode("ascii", "replace").decode("ascii")
            c.drawString(x, y, safe_text)

    def draw_header_footer(page_num):
        c.saveState()
        c.setFillColor(BLUE)
        c.setStrokeColor(BLUE)
        c.setLineWidth(0.5)
        c.line(30, H - 35, W - 30, H - 35)
        draw_cn("AI求职助手", 30, H - 30, 8, BLUE)
        draw_cn(report_time, W - 180, H - 30, 8, GRAY)
        c.line(30, 35, W - 30, 35)
        draw_cn(f"第 {page_num} 页", W - 100, 20, 8, GRAY)
        c.restoreState()

    page = [1]

    def new_page():
        c.showPage()
        page[0] += 1
        draw_header_footer(page[0])

    # ====== Page 1: 封面 ======
    draw_header_footer(1)
    y = H - 120
    c.setFillColor(BLUE)
    c.rect(30, H - 90, W - 60, 2, fill=1, stroke=0)

    draw_cn("AI求职助手", 50, y, 36, BLUE)
    y -= 40
    draw_cn("智能求职分析报告", 50, y, 22, GRAY)
    y -= 30
    c.setStrokeColor(BLUE)
    c.setLineWidth(2)
    c.line(50, y, 250, y)

    y -= 40
    draw_cn("基于简历与岗位匹配分析生成", 50, y, 12, GRAY)
    y -= 30
    draw_cn(f"生成时间：{report_time}", 50, y, 12, GRAY)
    y -= 22
    draw_cn(f"简历文件：{resume_name}", 50, y, 12, GRAY)
    y -= 22
    draw_cn(f"扫描岗位：{overview['total_jobs']} 个", 50, y, 12, GRAY)

    # ====== Page 2: 求职总览 ======
    new_page()
    y = H - 60
    draw_cn("求职总览", 40, y, 20, BLUE)
    y -= 15
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(40, y, W - 40, y)
    y -= 30

    cards = [
        ("扫描岗位", str(overview["total_jobs"]), "个"),
        ("推荐岗位", str(overview["recommended_jobs"]), "个"),
        ("已沟通", str(overview["communicated_jobs"]), "个"),
        ("平均匹配度", str(overview["average_score"]), "分"),
        ("最高匹配度", str(overview["max_score"]), "分"),
        ("推荐率", f"{overview['recommended_jobs'] / max(overview['total_jobs'], 1) * 100:.1f}%", ""),
    ]
    card_w = (W - 80 - 20) / 3
    card_h = 60
    for i, (label, val, unit) in enumerate(cards):
        col = i % 3
        row = i // 3
        cx = 40 + col * (card_w + 10)
        cy = y - row * (card_h + 10)
        c.setFillColor(LIGHT_BG)
        c.roundRect(cx, cy - card_h, card_w, card_h, 4, fill=1, stroke=0)
        draw_cn(label, cx + 12, cy - 20, 10, GRAY)
        draw_cn(val + unit, cx + 12, cy - 48, 18, BLUE, bold=True)

    y -= (card_h + 10) * 2 + 20
    if os.path.exists(chart_images.get("dist", "")):
        c.drawImage(chart_images["dist"], 40, y - 180, width=240, height=160, preserveAspectRatio=True)
    if os.path.exists(chart_images.get("funnel", "")):
        c.drawImage(chart_images["funnel"], 300, y - 180, width=240, height=160, preserveAspectRatio=True)

    # ====== Page 3: HR 活跃度分析 ======
    new_page()
    y = H - 60
    draw_cn("HR 活跃状态分布", 40, y, 20, BLUE)
    y -= 15
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(40, y, W - 40, y)
    y -= 30

    hr_items = hr_dist.get("distribution", {})
    hr_total = sum(hr_items.values()) or 1
    draw_cn(f"已分析 {hr_total} 个岗位的招聘者活跃状态，活跃度越高沟通回复概率越大：", 40, y, 10, GRAY)
    y -= 25

    active_keys = ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃"]
    for status, count in hr_items.items():
        pct = count / hr_total * 100
        color = _hr_color(status)
        is_active = status in active_keys
        c.setFillColor(color)
        c.circle(50, y + 4, 4, fill=1, stroke=0)
        draw_cn(f"{status}{'  (推荐投递)' if is_active else ''}", 62, y, 10, color if is_active else GRAY, bold=is_active)
        bar_w = 200
        c.setFillColor(HexColor("#eeeeee"))
        c.rect(220, y + 1, bar_w, 8, fill=1, stroke=0)
        c.setFillColor(color)
        c.rect(220, y + 1, bar_w * (pct / 100), 8, fill=1, stroke=0)
        draw_cn(f"{count} 个 ({pct:.1f}%)", 435, y, 9, GRAY)
        y -= 24
        if y < 80:
            break

    # ====== Page 4: 高匹配 & HR活跃 Top 10 ======
    new_page()
    y = H - 60
    draw_cn("高匹配 & HR活跃岗位 TOP 10", 40, y, 20, BLUE)
    y -= 15
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(40, y, W - 40, y)
    y -= 25
    draw_cn("综合匹配度与HR活跃度加权排序，优先推荐沟通以下岗位：", 40, y, 10, GRAY)
    y -= 25

    c.setFillColor(HexColor("#f8f9fa"))
    c.rect(40, y - 5, W - 80, 20, fill=1, stroke=0)
    draw_cn("岗位", 45, y, 9, BLUE, bold=True)
    draw_cn("公司", 185, y, 9, BLUE, bold=True)
    draw_cn("薪资", 295, y, 9, BLUE, bold=True)
    draw_cn("HR状态", 365, y, 9, BLUE, bold=True)
    draw_cn("匹配度", 440, y, 9, BLUE, bold=True)
    draw_cn("综合分", 495, y, 9, BLUE, bold=True)
    y -= 20

    for i, jr in enumerate(top10_high):
        if y < 70:
            break
        if i % 2 == 0:
            c.setFillColor(HexColor("#fafafa"))
            c.rect(40, y - 4, W - 80, 18, fill=1, stroke=0)
        draw_cn(str(jr.job_title or "")[:10], 45, y, 8, GRAY)
        draw_cn(str(jr.company or "")[:8], 185, y, 8, GRAY)
        draw_cn(str(jr.salary or "-")[:8], 295, y, 8, GRAY)
        hr_st = jr.hr_active_status or "未知"
        draw_cn(hr_st[:6], 365, y, 8, _hr_color(hr_st))
        score_color = HexColor("#34a853") if (jr.match_score or 0) >= 80 else HexColor("#E6A23C")
        draw_cn(f"{jr.match_score or 0}分", 440, y, 8, score_color, bold=True)
        draw_cn(f"{jr.composite_score or 0:.1f}", 495, y, 8, BLUE, bold=True)
        y -= 20

    # ====== Page 5: 技能缺口与求职建议 ======
    new_page()
    y = H - 60
    draw_cn("技能缺口分析与求职建议", 40, y, 20, BLUE)
    y -= 15
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(40, y, W - 40, y)
    y -= 30

    draw_cn("高频缺失技能 TOP 10（建议在简历中针对性补充）", 40, y, 12, BLUE, bold=True)
    y -= 25
    if top_skills:
        max_sk = top_skills[0][1] if top_skills else 1
        for skill, cnt in top_skills:
            pct = cnt / max_sk
            draw_cn(skill[:12], 45, y, 9, GRAY)
            c.setFillColor(HexColor("#eeeeee"))
            c.rect(130, y + 1, 200, 8, fill=1, stroke=0)
            c.setFillColor(HexColor("#ea4335"))
            c.rect(130, y + 1, 200 * pct, 8, fill=1, stroke=0)
            draw_cn(f"{cnt} 个岗位要求", 340, y, 9, GRAY)
            y -= 20
    else:
        draw_cn("暂无技能缺口数据（需先执行岗位匹配分析）", 45, y, 9, GRAY)
        y -= 20

    y -= 20
    draw_cn("推荐沟通的求职方向", 40, y, 12, BLUE, bold=True)
    y -= 25
    if top_directions:
        for direction, cnt in top_directions:
            draw_cn(f"• {direction}（相关推荐岗位 {cnt} 个）", 50, y, 10, GRAY)
            y -= 20
    else:
        draw_cn("• 数据积累中", 50, y, 10, GRAY)
        y -= 20

    # ====== Page 6: 最近推荐岗位明细 ======
    new_page()
    y = H - 60
    draw_cn("最近推荐岗位明细 (前 30 条)", 40, y, 20, BLUE)
    y -= 15
    c.setStrokeColor(BLUE)
    c.setLineWidth(1)
    c.line(40, y, W - 40, y)
    y -= 25

    c.setFillColor(HexColor("#f8f9fa"))
    c.rect(40, y - 5, W - 80, 20, fill=1, stroke=0)
    draw_cn("岗位", 45, y, 9, BLUE, bold=True)
    draw_cn("公司", 200, y, 9, BLUE, bold=True)
    draw_cn("匹配度", 370, y, 9, BLUE, bold=True)
    draw_cn("状态", 440, y, 9, BLUE, bold=True)
    draw_cn("时间", 495, y, 9, BLUE, bold=True)
    y -= 20

    for i, r in enumerate(recent[:30]):
        if y < 55:
            new_page()
            y = H - 70
        if i % 2 == 0:
            c.setFillColor(HexColor("#fafafa"))
            c.rect(40, y - 4, W - 80, 16, fill=1, stroke=0)
        draw_cn(str(r["job_title"])[:12], 45, y, 8, GRAY)
        draw_cn(str(r["company"])[:10], 200, y, 8, GRAY)
        sc = r["match_score"] or 0
        sc_color = HexColor("#34a853") if sc >= 80 else (HexColor("#E6A23C") if sc >= 60 else HexColor("#F56C6C"))
        draw_cn(f"{sc}分", 370, y, 8, sc_color, bold=True)
        draw_cn(str(r["status"]), 440, y, 8, GRAY)
        t_str = str(r["created_at"])[:10] if r["created_at"] else "-"
        draw_cn(t_str, 495, y, 8, GRAY)
        y -= 18

    # 清理图表临时文件
    for path in chart_images.values():
        try:
            os.remove(path)
        except Exception:
            pass

    c.save()
    buf.seek(0)
    return buf, filename
