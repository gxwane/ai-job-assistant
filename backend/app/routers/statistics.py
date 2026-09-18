"""
数据统计 API 路由
V2: 专业 PDF 报告 + matplotlib 图表 + 中文支持
"""
import io
import os
import re
import tempfile
from collections import Counter
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from urllib.parse import quote
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from ..database import get_db
from ..models import Resume, AnalysisRecord, JobRecord

router = APIRouter(prefix="/api/statistics", tags=["数据统计"])

# ==================== 中文字体注册 ====================

_CN_FONT_NAME = None
_CN_FONT_BOLD = None

def _find_cn_font():
    """扫描系统中文字体"""
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

def _get_cn_font():
    global _CN_FONT_NAME
    if _CN_FONT_NAME is None:
        _CN_FONT_NAME = _find_cn_font()
    return _CN_FONT_NAME

def _cn_font(canvas_obj, size=10):
    font = _get_cn_font()
    if font:
        canvas_obj.setFont(font, size)
    else:
        canvas_obj.setFont("Helvetica", size)

# ==================== 统计接口 ====================

@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    resume_count = db.query(Resume).count()
    total_jobs = db.query(JobRecord).count()
    recommended_jobs = db.query(JobRecord).filter(
        (JobRecord.status == "recommended") | (JobRecord.match_score >= 80)
    ).count()
    communicated_jobs = db.query(JobRecord).filter(
        JobRecord.status == "communicated"
    ).count()
    avg_score = db.query(func.avg(JobRecord.match_score)).filter(
        JobRecord.match_score.isnot(None)
    ).scalar()
    max_score = db.query(func.max(JobRecord.match_score)).filter(
        JobRecord.match_score.isnot(None)
    ).scalar()
    return {
        "resume_count": resume_count,
        "total_jobs": total_jobs,
        "recommended_jobs": recommended_jobs,
        "communicated_jobs": communicated_jobs,
        "average_score": round(avg_score or 0, 1),
        "max_score": max_score or 0,
    }


@router.get("/score-distribution")
def get_score_distribution(db: Session = Depends(get_db)):
    ranges = [
        ("90-100", 90, 101), ("80-89", 80, 90), ("70-79", 70, 80),
        ("60-69", 60, 70),
    ]
    result = []
    for label, lo, hi in ranges:
        count = db.query(JobRecord).filter(
            JobRecord.match_score >= lo, JobRecord.match_score < hi,
        ).count()
        result.append({"label": label, "count": count})
    below = db.query(JobRecord).filter(
        JobRecord.match_score < 60, JobRecord.match_score.isnot(None),
    ).count()
    result.append({"label": "60以下", "count": below})
    return {"ranges": result}


@router.get("/job-funnel")
def get_job_funnel(db: Session = Depends(get_db)):
    return {
        "total_jobs": db.query(JobRecord).count(),
        "recommended_jobs": db.query(JobRecord).filter(
            (JobRecord.status == "recommended") | (JobRecord.match_score >= 80)
        ).count(),
        "communicated_jobs": db.query(JobRecord).filter(JobRecord.status == "communicated").count(),
        "interview_jobs": db.query(JobRecord).filter(JobRecord.status == "interview").count(),
        "offer_jobs": db.query(JobRecord).filter(JobRecord.status == "offer").count(),
    }


@router.get("/hr-status-distribution")
def get_hr_status_distribution(db: Session = Depends(get_db)):
    """HR活跃状态分布统计"""
    from ..services.job_parser import HR_STATUS_LIST

    distribution = {}
    total_with_status = db.query(JobRecord).filter(
        JobRecord.hr_status.isnot(None), JobRecord.hr_status != ""
    ).count()

    for status in HR_STATUS_LIST:
        count = db.query(JobRecord).filter(JobRecord.hr_status == status).count()
        distribution[status] = count

    # 未知 = 空或NULL
    unknown = db.query(JobRecord).filter(
        (JobRecord.hr_status.is_(None)) | (JobRecord.hr_status == "")
    ).count()
    distribution["未知"] = unknown

    return {
        "distribution": distribution,
        "total": db.query(JobRecord).count(),
        "total_with_status": total_with_status,
    }


@router.get("/recent-recommended")
def get_recent_recommended(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    records = (
        db.query(JobRecord)
        .filter(JobRecord.match_score.isnot(None))
        .order_by(desc(JobRecord.created_at))
        .limit(limit).all()
    )
    return [
        {"id": r.id, "job_title": r.job_title, "company": r.company,
         "match_score": r.match_score, "status": r.status,
         "created_at": r.created_at.isoformat() if r.created_at else None}
        for r in records
    ]


# ==================== PDF 导出 V2 ====================

@router.get("/report/pdf")
def export_pdf_report(db: Session = Depends(get_db)):
    """专业求职分析报告 PDF V2"""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm, cm
        from reportlab.lib.colors import HexColor
        from reportlab.pdfgen import canvas as rl_canvas
    except ImportError:
        raise HTTPException(status_code=500, detail="请安装 reportlab: pip install reportlab")

    # ---- 收集数据 ----
    overview = get_overview(db)
    dist = get_score_distribution(db)
    funnel = get_job_funnel(db)
    recent = get_recent_recommended(50, db)
    hr_dist = get_hr_status_distribution(db)
    # 高匹配且HR活跃 Top 10: 按 composite_score DESC
    top10_high = (
        db.query(JobRecord)
        .filter(JobRecord.composite_score.isnot(None))
        .filter(JobRecord.match_score >= 70)
        .order_by(desc(JobRecord.composite_score))
        .limit(10).all()
    )

    # 最新简历名
    latest_resume = db.query(Resume).order_by(desc(Resume.created_at)).first()
    resume_name = latest_resume.filename if latest_resume else "未上传简历"

    # 技能缺口：从 analysis_result_json 中提取 missing_skills
    skill_counter = Counter()
    direction_counter = Counter()
    jobs_with_analysis = db.query(JobRecord).filter(
        JobRecord.analysis_result_json.isnot(None),
        JobRecord.match_score >= 60,
    ).all()
    for jr in jobs_with_analysis:
        try:
            data = jr.analysis_result_json
            if isinstance(data, str):
                import json; data = json.loads(data)
            for skill in (data.get("missing_skills") or []):
                skill_counter[skill] += 1
            # 方向统计：取岗位标题前几字作为方向
            title = jr.job_title or ""
            dirs = re.split(r'[（(/\-]', title)
            if dirs:
                direction_counter[dirs[0].strip()] += 1
        except Exception:
            pass

    top_skills = skill_counter.most_common(10)
    top_directions = direction_counter.most_common(5)

    # 生成时间
    now = datetime.now()
    report_time = now.strftime("%Y-%m-%d %H:%M:%S")
    filename = f"AI求职报告_{now.strftime('%Y%m%d_%H%M%S')}.pdf"

    # ---- 生成图表 ----
    chart_images = _generate_charts(dist, funnel, top_skills, top_directions)

    # ---- PDF 构建 ----
    buf = io.BytesIO()
    W, H = A4
    c = rl_canvas.Canvas(buf, pagesize=A4)
    font_name = _get_cn_font()
    has_cn = font_name is not None

    BLUE = HexColor("#1a73e8")
    GRAY = HexColor("#666666")
    LIGHT_BG = HexColor("#f0f4ff")

    # 辅助函数
    def draw_cn(text, x, y, size=10, color=None, bold=False):
        c.setFillColor(color or GRAY)
        if has_cn:
            c.setFont(font_name, size)
            c.drawString(x, y, text)
        else:
            c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
            safe_text = str(text).encode("ascii", "replace").decode("ascii")
            c.drawString(x, y, safe_text)

    def draw_header_footer(page_num):
        """页眉页脚"""
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

    # ====== 封面 ======
    draw_header_footer(1)
    y = H - 120

    # Logo 区域
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
    y -= 30

    cards = [
        ("累计扫描岗位", str(overview["total_jobs"]), BLUE),
        ("推荐岗位", str(overview["recommended_jobs"]), HexColor("#34a853")),
        ("已沟通岗位", str(overview["communicated_jobs"]), HexColor("#ea4335")),
        ("平均匹配度", f"{overview['average_score']}分", HexColor("#fbbc04")),
        ("最高匹配度", f"{overview['max_score']}分", HexColor("#4285f4")),
        ("简历数量", str(overview["resume_count"]), GRAY),
    ]
    x_pos = 40
    for label, value, color in cards:
        if x_pos > W - 160:
            x_pos = 40
            y -= 70
        c.setFillColor(LIGHT_BG)
        c.roundRect(x_pos, y - 45, 140, 50, 6, fill=1, stroke=0)
        draw_cn(label, x_pos + 12, y - 20, 10, GRAY)
        draw_cn(value, x_pos + 12, y - 38, 18, color)
        x_pos += 155

    # ====== Page 3: 匹配度分布 + 漏斗 ======
    new_page()
    y = H - 50
    draw_cn("匹配度分布", 40, y, 16, BLUE)
    y -= 18
    if chart_images.get("dist"):
        c.drawImage(chart_images["dist"], 30, y - 230, 260, 220)
    draw_cn("求职漏斗", 340, H - 50, 16, BLUE)
    if chart_images.get("funnel"):
        c.drawImage(chart_images["funnel"], 310, H - 270, 240, 240)

    # ====== Page 4: Top 10 高匹配且HR活跃 ======
    new_page()
    y = H - 50
    draw_cn("Top 10 高匹配且HR活跃岗位", 40, y, 16, BLUE)
    draw_cn("（按综合推荐指数排序）", 280, y, 10, GRAY)
    y -= 20

    # 表头
    headers = [("排名", 40), ("岗位名称", 100), ("公司", 260), ("匹配", 390), ("综合", 440), ("HR状态", 490)]
    for hdr, x in headers:
        draw_cn(hdr, x, y, 9, BLUE)
    y -= 6
    c.line(40, y, W - 40, y)
    y -= 18

    status_map = {"recommended": "推荐", "communicated": "已沟通", "interview": "面试", "offer": "Offer",
                  "analyzed": "已分析", "captured": "已捕获", "ignored": "已忽略"}
    for idx, job in enumerate(top10_high):
        if y < 60:
            new_page()
            y = H - 50
        rank = str(idx + 1)
        title = (job.job_title or "-")[:16]
        company = (job.company or "-")[:15]
        match_s = f"{job.match_score}分" if job.match_score else "-"
        comp_s = f"{job.composite_score}分" if job.composite_score else "-"
        hr_s = job.hr_status or "未知"
        color = BLUE if idx < 3 else GRAY
        draw_cn(rank, 40, y, 9, color)
        draw_cn(title, 60, y, 9, color)
        draw_cn(company, 200, y, 9, GRAY)
        draw_cn(match_s, 330, y, 9, GRAY)
        draw_cn(comp_s, 390, y, 9, HexColor("#34a853") if (job.match_score or 0) >= 80 else GRAY)
        draw_cn(hr_s, 440, y, 9, _hr_color(hr_s))
        y -= 18

    # ====== Page 5: HR活跃分布 ======
    new_page()
    y = H - 50
    draw_cn("HR活跃状态分布", 40, y, 16, BLUE)
    y -= 24

    dist_data = hr_dist.get("distribution", {})
    hr_status_list = ["在线", "刚刚活跃", "今日活跃", "3日内活跃", "本周活跃",
                      "本月活跃", "两周内活跃", "两月内活跃", "3月内活跃", "半年前活跃", "未知"]

    max_count = max(dist_data.values()) if dist_data else 1
    for status in hr_status_list:
        count = dist_data.get(status, 0)
        if y < 50:
            new_page()
            y = H - 50
        draw_cn(f"{status}", 50, y, 10, GRAY)
        bar_w = int(count / max(max_count, 1) * 250)
        c.setFillColor(_hr_color(status))
        c.rect(180, y - 5, max(bar_w, 2), 12, fill=1, stroke=0)
        draw_cn(f"{count}人", 440, y, 9, GRAY)
        y -= 22

    # ====== Page 5: 方向分析 + 技能缺口 ======
    new_page()
    y = H - 50
    draw_cn("推荐方向 TOP5", 40, y, 16, BLUE)
    y -= 22
    for idx, (dname, dcount) in enumerate(top_directions or [("暂无数据", 0)]):
        if dcount == 0 and dname == "暂无数据":
            draw_cn("暂无足够数据", 50, y, 11, GRAY)
            break
        draw_cn(f"{idx+1}. {dname}", 50, y, 12, GRAY)
        c.setFillColor(LIGHT_BG)
        bar_w = min(dcount * 25, 200)
        c.rect(250, y - 2, bar_w, 10, fill=1, stroke=0)
        draw_cn(f"{dcount}个岗位", 255 + bar_w, y - 1, 9, GRAY)
        y -= 24

    y -= 20
    draw_cn("最需补强技能 TOP10", 40, y, 16, BLUE)
    y -= 22
    for idx, (skill, scount) in enumerate(top_skills or [("暂无数据", 0)]):
        if scount == 0 and skill == "暂无数据":
            draw_cn("暂无足够数据", 50, y, 11, GRAY)
            break
        draw_cn(f"{idx+1}. {skill}", 50, y, 11, GRAY)
        draw_cn(f"（{scount}次）", 300, y, 9, GRAY)
        y -= 18

    # HR活跃分析 (before AI summary)
    dist_data = hr_dist.get("distribution", {})
    hr_active_total = sum(
        dist_data.get(s, 0) for s in ["在线", "刚刚活跃", "今日活跃"]
    )
    hr_inactive_total = sum(
        dist_data.get(s, 0) for s in ["3月内活跃", "半年前活跃"]
    )

    # ====== Page 6: AI 总结 ======
    new_page()
    y = H - 50
    draw_cn("AI 求职总结", 40, y, 18, BLUE)
    y -= 30

    # 转换 top10_high 为 dict 格式给 _generate_summary
    top10_dicts = [
        {"job_title": j.job_title, "company": j.company, "match_score": j.match_score,
         "status": j.status, "id": j.id}
        for j in top10_high
    ]

    suggestions = _generate_summary(overview, top_directions, top_skills, top10_dicts)

    # 加入HR活跃建议
    if hr_inactive_total > hr_active_total * 2:
        suggestions["summary"] += "\n【HR活跃分析】大量岗位HR处于不活跃状态（3月内或半年前活跃），建议优先沟通在线、刚刚活跃、今日活跃的HR，以提升回复概率。"

    summary_lines = suggestions["summary"].split("\n")
    for line in summary_lines:
        if not line.strip():
            y -= 8
            continue
        draw_cn(line.strip(), 50, y, 11, GRAY)
        y -= 22

    # ---- 清理临时图片 ----
    for path in chart_images.values():
        try: os.remove(path)
        except: pass

    c.save()
    buf.seek(0)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


# ==================== 图表生成 ====================

def _generate_charts(dist, funnel, top_skills, top_directions):
    """生成 matplotlib 图表，返回路径字典"""
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
            # 验证字体可用
            import matplotlib.font_manager as fm
            if any(name.lower() in f.name.lower() for f in fm.fontManager.ttflist):
                return
        except Exception:
            pass


def _hr_color(status: str):
    """根据HR状态返回对应颜色"""
    from reportlab.lib.colors import HexColor
    color_map = {
        "在线": HexColor("#34a853"),      # 绿色
        "刚刚活跃": HexColor("#34a853"),  # 绿色
        "今日活跃": HexColor("#34a853"),  # 绿色
        "3日内活跃": HexColor("#fbbc04"),  # 黄色
        "本周活跃": HexColor("#fbbc04"),  # 黄色
        "两周内活跃": HexColor("#ea4335"),# 橙色
        "本月活跃": HexColor("#ea4335"),  # 橙色
        "两月内活跃": HexColor("#ea4335"),# 橙色
        "3月内活跃": HexColor("#ea4335"),# 红色
        "半年前活跃": HexColor("#ea4335"),# 红色
    }
    return color_map.get(status, HexColor("#909399"))  # 灰色=未知


def _generate_summary(overview, top_directions, top_skills, top10):
    """根据统计生成 AI 总结"""
    lines = []

    avg = overview["average_score"]
    if avg >= 80:
        lines.append("【总体评价】当前简历与目标岗位平均匹配度为%.0f分，竞争力较强。" % avg)
    elif avg >= 60:
        lines.append("【总体评价】当前简历与目标岗位平均匹配度为%.0f分，已具备一定竞争力，但仍存在提升空间。" % avg)
    else:
        lines.append("【总体评价】当前简历与目标岗位平均匹配度较低（%.0f分），建议优化简历关键词和项目描述。" % avg)

    lines.append("")

    if top_directions and top_directions[0][1] > 0:
        dirs = ", ".join(d[0] for d in top_directions[:5])
        lines.append(f"【优势方向】{dirs}")

    lines.append("")

    if top_skills and top_skills[0][1] > 0:
        skills = ", ".join(s[0] for s in top_skills[:5])
        lines.append(f"【技能短板】{skills}")

    lines.append("")

    if len(top10) > 0:
        hi80 = [j for j in top10 if (j["match_score"] or 0) >= 80]
        if hi80:
            lines.append(f"【高匹配机会】共有{len(hi80)}个岗位匹配度超过80分：")
            for j in hi80[:5]:
                lines.append(f"  {j['job_title']} @ {j['company'] or '-'} - {j['match_score']}分")

    lines.append("")
    lines.append("【建议】")
    if avg < 70:
        lines.append("1. 优化简历中技能关键词，补充JD中频繁出现的缺少技能。")
    lines.append("2. 优先投递80分以上高匹配岗位，提高沟通成功率。")
    if overview["communicated_jobs"] < overview["recommended_jobs"] * 0.3:
        lines.append("3. 已沟通率偏低，建议主动点击沟通按钮联系高匹配岗位。")

    return {"summary": "\n".join(lines)}
