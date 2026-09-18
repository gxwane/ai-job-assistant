"""
岗位结构化解析引擎 Job Structured Parser v2

分段切片解析策略：
  1. 找到JD正文开始位置 (find_jd_start_index)
  2. 找到HR信息块开始位置 (find_hr_block_start_index)
  3. 前缀区 → 提取 job_tags
  4. JD区 (正文开始→HR块开始 或 文末) → 清洗后得 clean_job_description
  5. HR信息块 → 提取 hr_name, hr_status
  6. 不依赖 _fix_broken_lines（避免破坏编号内容）
"""
import logging
import re

logger = logging.getLogger(__name__)

# ==================== 常量定义 ====================

# 展示顺序
HR_STATUS_LIST = [
    "在线", "刚刚活跃", "今日活跃", "3日内活跃",
    "本周活跃", "两周内活跃", "本月活跃",
    "两月内活跃", "2月内活跃", "3月内活跃", "半年前活跃",
]

# 按长度降序（优先匹配长词，防"3日内活跃"误判为"日内活跃"）
HR_STATUS_SORTED = sorted(HR_STATUS_LIST, key=len, reverse=True)

HR_STATUS_SCORE = {
    "在线": 100, "刚刚活跃": 98, "今日活跃": 95,
    "3日内活跃": 85, "本周活跃": 70, "两周内活跃": 60,
    "本月活跃": 50, "两月内活跃": 30, "2月内活跃": 30,
    "3月内活跃": 15, "半年前活跃": 5,
    "未知": 0,
}

JD_SECTION_MARKERS = [
    "薪资待遇", "工作时间",
    "岗位职责", "工作职责", "关键职责",
    "工作内容", "职责描述",
    "任职要求", "能力要求", "职位要求", "任职资格",
    "岗位要求", "工作要求", "资格要求",
    "职位信息", "岗位信息", "岗位内容",
]

# JD正文中需要删除的噪音行（整行匹配或包含即删除）
JD_NOISE_PATTERNS = [
    "去App", "与随时沟通", "立即沟通", "继续沟通",
    "留在此页", "发送消息", "已向BOSS发送消息",
    "招聘HR", "回复快", "回复率",
    "查看主页", "沟通意愿", "在线简历", "附件简历",
    "交换微信", "交换手机", "对我感兴趣",
]

# HR姓名提取时排除的关键词
HR_NAME_EXCLUDE = [
    "公司", "招聘HR", "人事", "去App", "沟通",
    "活跃", "立即沟通", "董事长", "经理", "主管",
    "科技", "有限", "集团", "网络", "信息",
]

KNOWN_SKILLS = {
    "Java", "Python", "C++", "C#", "Go", "Rust", "Kotlin", "Scala",
    "TypeScript", "JavaScript", "PHP", "Ruby", "Swift", "R", "Matlab", "Shell",
    "Spring", "SpringBoot", "SpringCloud", "SpringMVC", "MyBatis", "Hibernate",
    "Django", "Flask", "FastAPI", "Tornado", "Celery",
    "Vue", "React", "Angular", "Next.js", "Nuxt", "Svelte",
    "Express", "Koa", "NestJS", "Gin", "Echo",
    "PyTorch", "TensorFlow", "Keras", "Scikit-learn", "Pandas", "NumPy",
    "Redis", "MySQL", "PostgreSQL", "MongoDB", "Elasticsearch", "ClickHouse",
    "Kafka", "RabbitMQ", "RocketMQ", "Pulsar", "Nginx", "Tomcat",
    "Docker", "Kubernetes", "K8s", "Jenkins", "GitLab CI", "GitHub Actions",
    "Terraform", "Ansible", "Prometheus", "Grafana", "ELK",
    "AWS", "GCP", "Azure",
    "Hadoop", "Spark", "Flink", "Hive", "HBase", "Presto",
    "LangChain", "RAG", "Agent", "LLM", "大模型", "向量数据库", "NLP",
    "AIGC", "Stable Diffusion", "LoRA", "Transformer",
    "OpenCV", "YOLO", "CNN", "PyTorch", "TensorFlow",
    "Git", "SVN", "Maven", "Gradle", "Webpack", "Vite", "Babel",
    "JUnit", "Selenium", "TestNG", "JMeter",
    "TCP/IP", "HTTP", "gRPC", "WebSocket", "RESTful", "GraphQL",
    "DAPR", "DDD", "TDD", "MQTT",
    "Linux", "Windows Server", "SQL", "NoSQL", "CI/CD",
    "Spring Cloud Alibaba", "Sentinel", "Nacos", "Seata", "Dubbo",
    "Zookeeper", "Eureka", "Consul",
}

NON_SKILL_KEYWORDS = [
    "可居家办公",
    "薪资", "地点",
    "全职", "兼职", "应届",
    "去App", "招聘HR", "立即沟通", "随时沟通",
]

# 精确匹配的噪声词组（整行匹配，不做子串匹配，避免误杀）
NON_SKILL_EXACT = [
    "本科", "硕士", "博士", "大专", "中专", "高中",
    "学历不限", "经验不限", "经验", "工作年限",
    "在校", "实习",
]

# ==================== 标签提取：明确技能词 ====================

VALID_SKILL_TAGS = {
    # 编程语言
    "Java", "Python", "C++", "C#", "Go", "Rust", "Kotlin", "Scala",
    "TypeScript", "JavaScript", "PHP", "Ruby", "Swift", "R", "Matlab", "Shell",
    # 框架/库
    "Spring", "SpringBoot", "SpringCloud", "SpringMVC", "MyBatis", "Hibernate",
    "Django", "Flask", "FastAPI", "Tornado", "Celery",
    "Vue", "React", "Angular", "Next.js", "Nuxt", "Svelte",
    "Express", "Koa", "NestJS", "Gin", "Echo",
    "PyTorch", "TensorFlow", "Keras", "Scikit-learn", "Pandas", "NumPy",
    # 数据库/中间件
    "Redis", "MySQL", "PostgreSQL", "MongoDB", "Elasticsearch", "ClickHouse",
    "Kafka", "RabbitMQ", "RocketMQ", "Pulsar", "Nginx", "Tomcat",
    # 容器/运维
    "Docker", "Kubernetes", "K8s", "Jenkins", "GitLab CI", "GitHub Actions",
    "Terraform", "Ansible", "Prometheus", "Grafana", "ELK",
    "Linux", "Windows Server", "SQL", "NoSQL", "CI/CD",
    # AI/ML
    "LangChain", "RAG", "Agent", "AI-Agent", "LLM", "大模型", "向量数据库", "NLP",
    "AIGC", "Stable Diffusion", "LoRA", "Transformer",
    "OpenCV", "YOLO", "CNN", "PyTorch", "TensorFlow",
    "机器学习", "深度学习", "数据分析", "ASR", "TTS",
    # 工具链
    "Git", "SVN", "Maven", "Gradle", "Webpack", "Vite", "Babel",
    "JUnit", "Selenium", "TestNG", "JMeter",
    # 协议/架构
    "TCP/IP", "HTTP", "gRPC", "WebSocket", "RESTful", "GraphQL",
    "DAPR", "DDD", "TDD", "MQTT",
    # 云/其他
    "AWS", "GCP", "Azure", "阿里云", "腾讯云",
    "Hadoop", "Spark", "Flink", "Hive", "HBase", "Presto",
    "Spring Cloud Alibaba", "Sentinel", "Nacos", "Seata", "Dubbo",
    "Zookeeper", "Eureka", "Consul",
}

# ==================== 无效标签模式 ====================

# 无意义短语（子串匹配，按长度降序防短词误杀）
INVALID_TAG_PATTERNS_SORTED = sorted([
    "与BOSS随时沟通", "微信扫码分享",
    "薪资可谈", "周末双休",
    "今日活跃", "刚刚活跃",
    "立即沟通", "继续沟通",
    "招聘经理", "招聘专员", "招聘HR",
    "科技有限公司",
    "与随时沟通",
    "居家办公", "去App",
    "与AI", "和AI", "对AI",
    "女士", "先生", "小姐", "老师",
    "双休", "收藏", "举报",
    "HR", "人事", "董事长",
    "活跃", "在线",
    "集团",
], key=len, reverse=True)

# 精确匹配无效词（不用于串匹配，防误杀）
INVALID_TAG_EXACT = set([
    "AI相关", "AI经验",
])

# 姓名后缀
NAME_SUFFIXES = ["先生", "女士", "小姐", "老师", "经理", "HR"]

# 无效标签（同时包含全词匹配）
INVALID_TAG_EXACT = set()


# ==================== 标签过滤函数 ====================

def is_invalid_job_tag(tag: str, context: str = "") -> bool:
    """
    检查一个候选标签是否无效。

    规则：
    1. 空或过短
    2. 命中HR状态词
    3. 命中HR姓名模式
    4. 命中招聘/公司/无意义短语
    5. 包含姓名后缀
    6. 疑似姓名（2-4中文 + 附近有HR状态）
    """
    if not tag or len(tag) < 2:
        return True

    # 命中HR状态词（包括完全匹配和包含）
    for status in HR_STATUS_SORTED:
        if tag == status or status in tag:
            return True

    # 纯姓名后缀
    for suffix in NAME_SUFFIXES:
        if tag.endswith(suffix):
            return True

    # 精确匹配无效词（如 "AI相关" 单独出现时无效，但 "AI相关经验" 有效）
    if tag in INVALID_TAG_EXACT:
        return True

    # 无意义短语子串匹配（长词优先）
    for pattern in INVALID_TAG_PATTERNS_SORTED:
        if pattern in tag:
            return True

    # 公司后缀
    company_suffixes = ["科技有限公司", "有限公司", "集团", "企业管理"]
    for cs in company_suffixes:
        if cs in tag:
            if tag not in VALID_SKILL_TAGS:
                return True

    # 疑似纯中文姓名（2-4个中文，且附近context有HR状态的话）
    if re.match(r'^[\u4e00-\u9fff·]{2,4}$', tag):
        for status in HR_STATUS_SORTED:
            if status in context:
                return True

    return False


def is_valid_skill_tag(tag: str) -> bool:
    """
    检查一个标签是否是合法的技能/岗位要求标签。

    允许：
    - 明确技能词（在VALID_SKILL_TAGS中）
    - 包含英文的复合技术词
    - 具备岗位能力描述的短中文标签
    """
    if not tag or len(tag) < 2:
        return False

    # 明确技能词
    if tag in VALID_SKILL_TAGS:
        return True

    # 包含英文/数字（如 "app运营", "Linux开发/部署经验", "C端产品"）
    if re.search(r'[A-Za-z0-9]', tag):
        return True

    # 纯中文能力标签（2-10字，不像人名/状态）
    if re.match(r'^[\u4e00-\u9fff]+$', tag) and 2 <= len(tag) <= 10:
        # 排除纯数字/标点
        return True

    return False


# ==================== 公开主函数 ====================

def parse_job_text(raw_text: str) -> dict:
    """
    结构化解析岗位原始文本（分段切片策略）

    Returns: {
        "job_tags": [...],
        "clean_job_description": "...",
        "hr_name": "...",
        "hr_status": "...",
        "hr_active_score": 0,
        "raw_job_text": "..."
    }
    """
    if not raw_text or not raw_text.strip():
        return {
            "job_tags": [],
            "clean_job_description": "",
            "hr_name": "",
            "hr_status": "",
            "hr_active_score": 0,
            "raw_job_text": raw_text or "",
        }

    # Step 0: 轻度归一化（只做空白合并，不合并跨行内容）
    text = normalize_raw_text(raw_text)

    # Step 1: 找到JD正文起始行号
    jd_start_idx = find_jd_start_index(text)

    # Step 2: 找到HR信息块起始行号
    hr_block_start_idx = find_hr_block_start_index(text)

    # Step 3: 切片 — 前缀区、JD区、HR区
    if jd_start_idx is not None:
        prefix_text = text[:jd_start_idx]
    else:
        prefix_text = text

    if jd_start_idx is not None and hr_block_start_idx is not None and hr_block_start_idx > jd_start_idx:
        jd_body = text[jd_start_idx:hr_block_start_idx]
        hr_block = text[hr_block_start_idx:]
    elif jd_start_idx is not None:
        jd_body = text[jd_start_idx:]
        hr_block = ""
    elif hr_block_start_idx is not None:
        jd_body = text[:hr_block_start_idx]
        hr_block = text[hr_block_start_idx:]
    else:
        jd_body = text
        hr_block = ""

    # Step 4: 从前缀提取标签
    job_tags = extract_job_tags(prefix_text)

    # Step 5: 从HR块提取HR信息
    hr_status, hr_active_score = extract_hr_status(text)
    hr_name = extract_hr_name(hr_block, hr_status)
    if not hr_name and hr_status:
        hr_name = _find_hr_name_in_full_text(text, hr_status)

    # Step 5.5: 从job_tags中删除HR姓名
    if hr_name and job_tags:
        job_tags = [t for t in job_tags if t != hr_name]

    # Step 6: 清洗JD正文
    clean_jd = clean_jd_body(jd_body)

    # Step 6.5: 如果前缀无标签，从JD正文提取技能关键词作为兜底
    if not job_tags and clean_jd:
        job_tags = _extract_skill_keywords_from_jd(clean_jd)

    return {
        "job_tags": job_tags,
        "clean_job_description": clean_jd,
        "hr_name": hr_name,
        "hr_status": hr_status,
        "hr_active_score": hr_active_score,
        "raw_job_text": raw_text,
    }


# ==================== 第1步：轻度归一化 ====================

def normalize_raw_text(text: str) -> str:
    """
    轻度归一化：
    - 统一换行
    - 检测并修复CJK单字断行（"至\\n少掌握" → "至少掌握"）
    - 逐行修复中文之间被错误插入的空格
    - 每行去首尾空白
    - 合并连续空行
    - 去掉首尾空白行
    """
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    lines = text.split('\n')

    # Step 1: 检测并修复CJK单字断行
    lines = _repair_cjk_line_breaks(lines)

    # Step 2: 逐行清洗 + 合并空行
    result = []
    prev_empty = False
    for line in lines:
        stripped = line.strip()
        if stripped:
            # 修复中文之间的错误空格
            stripped = re.sub(r'(?<=[\u4e00-\u9fff])[ \t]+(?=[\u4e00-\u9fff])', '', stripped)
            stripped = re.sub(r'(?<=[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])[ \t]+(?=[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff])',
                              '', stripped)

        if not stripped:
            if not prev_empty:
                result.append("")
                prev_empty = True
        else:
            result.append(stripped)
            prev_empty = False

    # 去首尾空行
    while result and not result[0]:
        result.pop(0)
    while result and not result[-1]:
        result.pop()

    return "\n".join(result)


def _repair_cjk_line_breaks(lines: list) -> list:
    """
    修复CJK字符被错误断行的情况。

    例如：
        "至"       → 合并为 "至少掌握中一门编程语言"
        "少掌握"
        "中一门编程语言"

    规则：
    - 当前行纯CJK且长度1-2 → 很可能是残片
    - 当前行以编号开头但编号后只有1-3个CJK → 可能是"1、至"这种
    - 下一行以CJK开头 → 合并
    - 不合并HR状态行
    - 不合并时两行都是合理标签长度(2-5字) → 两个独立标签
    """
    if len(lines) < 2:
        return lines

    result = []
    i = 0
    while i < len(lines):
        current = lines[i].strip()

        if not current:
            result.append("")
            i += 1
            continue

        if i + 1 < len(lines):
            next_line = lines[i + 1].strip()
            if next_line:
                # 检查下一行不是编号行
                next_is_numbered = bool(re.match(r'^[一二三1-9][、.)）\s]', next_line))
                # 检查下一行不是HR状态
                next_is_hr = any(status in next_line for status in HR_STATUS_SORTED)

                if not next_is_numbered and not next_is_hr:
                    next_starts_cjk = bool(re.match(r'^[\u4e00-\u9fff]', next_line))

                    should_merge = False

                    # 情况A: 当前行纯CJK且只有1-2字符 → 残片
                    if re.match(r'^[\u4e00-\u9fff]{1,2}$', current) and next_starts_cjk:
                        should_merge = True

                    # 情况B: "1、至" → 编号后跟1-3个CJK残片
                    if not should_merge:
                        m = re.match(r'^(\d[、.])\s*([\u4e00-\u9fff]{1,3})$', current)
                        if m and next_starts_cjk:
                            # 前缀+残片+下一行 → 合并为"1、至少掌握..."
                            prefix = m.group(1)
                            fragment = m.group(2)
                            result.append(prefix + fragment + next_line)
                            i += 2
                            continue

                    if should_merge:
                        # 但不合并两个都是合理标签长度(2-5 CJK字)的行
                        cur_is_tag = bool(re.match(r'^[\u4e00-\u9fff]{2,5}$', current))
                        nxt_is_tag = bool(re.match(r'^[\u4e00-\u9fff]{2,5}$', next_line))
                        if not (cur_is_tag and nxt_is_tag):
                            result.append(current + next_line)
                            i += 2
                            continue

        result.append(current)
        i += 1

    return result


# ==================== 第2步：找JD正文起始 ====================

def find_jd_start_index(text: str):
    """
    找到正文开始关键词最早出现的位置（字符偏移量）。

    关键词支持后接：： : 空格 换行

    返回字符偏移量（即 text[:idx] 即为前缀文本），未找到返回 None。
    """
    lines = text.split('\n')
    accumulated = 0  # 累积字符偏移

    for line in lines:
        stripped = line.strip()
        for marker in JD_SECTION_MARKERS:
            # 支持 "岗位职责"、"一、岗位职责"、"岗位职责：" 等
            pattern = re.escape(marker) + r'[：:\s]*'
            m = re.search(pattern, stripped)
            if m:
                # 找到该行在原文中的起始偏移
                line_start = text.index(line) if line in text else accumulated
                # 该行中 marker 之后的偏移
                marker_pos_in_line = stripped.find(marker)
                if marker_pos_in_line >= 0:
                    return line_start + marker_pos_in_line
        accumulated += len(line) + 1  # +1 for \n

    return None


# ==================== 第3步：找HR信息块起始 ====================

def find_hr_block_start_index(text: str):
    """
    找到HR信息块起始位置（字符偏移量）。

    逻辑：
    1. 找到HR状态词所在行
    2. 向前1-2行找HR姓名
    3. 返回HR姓名行（或HR状态行）的字符偏移

    返回 None 如果没有HR状态。
    """
    # 先找HR状态
    hr_status, _ = extract_hr_status(text)
    if not hr_status:
        return None

    lines = text.split('\n')
    status_line_idx = None

    # 找HR状态所在行号
    for idx, line in enumerate(lines):
        if hr_status in line.strip():
            status_line_idx = idx
            break

    if status_line_idx is None:
        return None

    # 向前找HR姓名行
    name_start_idx = status_line_idx
    for offset in range(1, min(4, status_line_idx + 1)):
        candidate_idx = status_line_idx - offset
        candidate = lines[candidate_idx].strip()
        if not candidate:
            continue
        if _is_likely_hr_name(candidate):
            name_start_idx = candidate_idx
            break

    # 计算字符偏移
    offset = 0
    for i in range(name_start_idx):
        offset += len(lines[i]) + 1  # +1 for \n
    return offset


def _is_likely_hr_name(text: str) -> bool:
    """
    检查文本是否像HR姓名。

    条件：
    - 长度2-10字
    - 不能包含公司/噪声关键词
    - 格式：中文姓名(2-4字) 或 中文姓名+称谓(先生/女士/小姐)
    """
    if not text:
        return False
    if len(text) < 2 or len(text) > 10:
        return False

    # 排除含关键词的
    for kw in HR_NAME_EXCLUDE:
        if kw in text:
            return False

    # 中文姓名+可能称谓
    if re.match(r'^[\u4e00-\u9fff·]{2,4}(先生|女士|小姐|老师)?$', text):
        return True

    # 纯中文短名
    if re.match(r'^[\u4e00-\u9fff·]{2,4}$', text):
        return True

    # 英文名
    if re.match(r'^[A-Z][a-z]{1,9}$', text):
        return True

    return False


# ==================== 第4步：提取HR状态 ====================

def extract_hr_status(text: str) -> tuple:
    """
    提取HR活跃状态和分值。

    返回 ("状态文本", 分数)
    优先匹配更长的状态文本。
    """
    for status in HR_STATUS_SORTED:
        if status in text:
            return status, HR_STATUS_SCORE.get(status, 0)
    return "", 0


# ==================== 第5步：提取HR姓名 ====================

def _find_hr_name_in_full_text(text: str, hr_status: str) -> str:
    """全文搜索HR状态，找紧前方的姓名候选（从后往前找最后一次匹配）"""
    if not text or not hr_status:
        return ""
    lines = text.split('\n')
    # 从后向前找HR状态行（尾部更可能是真正的HR信息块）
    for idx in range(len(lines) - 1, 0, -1):
        if hr_status in lines[idx].strip():
            for offset in range(1, min(4, idx + 1)):
                candidate = lines[idx - offset].strip()
                if candidate and _is_likely_hr_name(candidate):
                    return candidate
            break
    return ""


def extract_hr_name(hr_block: str, hr_status: str) -> str:
    """
    从HR信息块中提取HR姓名。

    如果 hr_block 为空，在尾部"HR状态+后续行"中查找。
    优先匹配 HR状态行紧前方有姓名候选的模式。
    """
    if not hr_status:
        return ""

    # 使用 hr_block；如果为空则用空字符串（调用者会用其他方式兜底）
    text_to_search = hr_block if hr_block else ""
    lines = text_to_search.split('\n') if text_to_search else []

    # 在 hr_block 中找状态行
    for idx, line in enumerate(lines):
        if hr_status in line.strip():
            # 向上找姓名
            for offset in range(1, min(4, idx + 1)):
                candidate = lines[idx - offset].strip()
                if candidate and _is_likely_hr_name(candidate):
                    return candidate
            break

    return ""


# ==================== 第6步：提取岗位标签 ====================

# ==================== 标签提取停止关键词 ====================

TAG_STOP_MARKERS = [
    "岗位职责", "职位职责", "工作职责", "关键职责",
    "任职要求", "职位要求", "岗位要求", "能力要求",
    "教育背景", "团队介绍", "公司介绍", "ByteIntern",
    "核心工作", "工作内容", "福利待遇", "薪资待遇",
    "【岗位职责】", "【职位职责】", "【任职要求】", "【职位要求】",
    "一、", "二、", "三、",
]

# ==================== 标签格式禁词 ====================

TAG_FORMAT_FORBIDDEN = [
    "毕业生", "同学", "团队", "介绍", "岗位", "职责", "要求",
    "2026", "2027", "2028", "2029",
    "公司", "有限公司", "科技", "集团", "企业",
    "招聘", "HR", "人事",
    "立即沟通", "去App", "随时沟通",
    "活跃", "在线",
    "女士", "先生", "小姐",
    "居家办公", "双休",
]

# 正文动词（出现在tag中则判定为句子残片）
BODY_VERBS = [
    "掌握", "熟悉", "了解", "负责", "参与", "具备",
    "能够", "完成", "使用", "开发", "测试", "部署",
    "设计", "实现", "优化", "维护", "管理", "分析",
    "编写", "构建", "配置", "集成",
]

# 正文名词（窄范围，避免误杀"Linux开发/部署经验"中的"经验"、"数据分析能力好"中的"能力"）
BODY_NOUNS = ["skill", "要求", "职责", "工具的使用", "语言的"]


# ==================== 标签提取 ====================

def is_body_sentence(tag: str) -> bool:
    """
    检查是否为正文句子残片，绝对不能作为标签。

    规则：
    - 长度 > 15
    - 包含中文标点（，、。；）
    - 包含正文名词（skill/要求/职责/工具的使用/语言的）
    - 纯中文且 >8字 且包含动词 → 句子残片
    - 中英混合技能词（如"Linux开发/部署经验"）不受动词检查
    """
    if not tag:
        return True
    if len(tag) > 15:
        return True
    if any(ch in tag for ch in '，、。；;,.'):
        return True

    # 正文名词检查（窄范围）
    for noun in BODY_NOUNS:
        if noun in tag:
            return True

    # 动词检查：仅对纯中文长标签触发（避免误杀"Linux开发/部署经验"）
    has_english = bool(re.search(r'[A-Za-z]', tag))
    is_pure_cjk = bool(re.match(r'^[\u4e00-\u9fff]+$', tag))

    if not has_english and is_pure_cjk and len(tag) > 8:
        for verb in BODY_VERBS:
            if verb in tag:
                return True

    return False


def is_body_fragment(tag: str) -> bool:
    """
    检查是否为正文残片，不应作为标签。

    命中以下任意条件返回 True：
    - 长度 <2 或 >20
    - 包含冒号
    - 包含句逗号
    - 以编号开头（1. / 1、/ 一、/ 二、/ 三、）
    - 包含禁词
    - is_body_sentence
    """
    if not tag or len(tag) < 2 or len(tag) > 20:
        return True

    if '：' in tag or ':' in tag:
        return True

    if any(ch in tag for ch in '，。；;,.。'):
        return True

    if re.match(r'^[一二三1-9][、.)）\s]', tag):
        return True

    for word in TAG_FORMAT_FORBIDDEN:
        if word in tag:
            return True

    if re.search(r'20[2-9]\d', tag):
        return True

    if re.match(r'^[\u4e00-\u9fff]+$', tag) and len(tag) > 10:
        return True

    if is_body_sentence(tag):
        return True

    return False


def extract_job_tags(prefix_text: str, context: str = "") -> list[str]:
    """
    从JD正文开始前的文本中提取岗位标签（严格版）。

    规则：
    - 遇到 TAG_STOP_MARKERS 立即停止
    - is_body_fragment → 丢弃
    - is_invalid_job_tag → 丢弃
    - is_valid_skill_tag → 保留
    - 去重，最多 12 个
    - 返回前调用 clean_job_tags 二次清洗
    """
    if not prefix_text:
        return []

    lines = prefix_text.split('\n')
    seen = set()
    candidates = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # 遇到停止标记 → 立即停止
        stop = False
        for marker in TAG_STOP_MARKERS:
            if marker in stripped:
                stop = True
                break
        if stop:
            break

        # 长度
        if len(stripped) < 2 or len(stripped) > 40:
            continue

        # 旧噪声
        if _is_noise_tag(stripped):
            continue

        # 正文残片
        if is_body_fragment(stripped):
            continue

        # 强过滤
        if is_invalid_job_tag(stripped, context):
            continue

        # 合法技能标签
        if is_valid_skill_tag(stripped):
            if stripped not in seen:
                seen.add(stripped)
                candidates.append(stripped)

        if len(candidates) >= 12:
            break

    # 二次清洗
    return clean_job_tags(candidates)


def clean_job_tags(job_tags: list) -> list:
    """
    二次清洗 job_tags：
    - 再次过滤无效标签、正文句子、正文残片
    - 去重，最多保留 12 个
    """
    if not job_tags:
        return []

    seen = set()
    result = []
    for tag in job_tags:
        tag_str = str(tag).strip()
        if not tag_str or len(tag_str) < 2:
            continue
        if is_invalid_job_tag(tag_str, ""):
            continue
        if is_body_sentence(tag_str):
            continue
        if is_body_fragment(tag_str):
            continue
        if not is_valid_skill_tag(tag_str):
            continue
        if tag_str not in seen:
            seen.add(tag_str)
            result.append(tag_str)
        if len(result) >= 12:
            break

    return result


def clean_job_tags_for_matching(job_tags: list) -> list:
    """
    硬性技能匹配前最终清洗。比 clean_job_tags 更激进。
    供 analysis_service / plugin_service 调用。
    """
    if not job_tags:
        return []

    cleaned = []
    for tag in job_tags:
        tag_str = str(tag).strip()
        if not tag_str or len(tag_str) < 2:
            continue
        if is_invalid_job_tag(tag_str, ""):
            continue
        if is_body_sentence(tag_str):
            continue
        if is_body_fragment(tag_str):
            continue
        if is_valid_skill_tag(tag_str):
            cleaned.append(tag_str)

    seen = set()
    result = []
    for t in cleaned:
        if t not in seen:
            seen.add(t)
            result.append(t)
    if len(result) > 12:
        result = result[:12]

    return result


def _extract_skill_keywords_from_jd(jd_text: str) -> list:
    """
    从JD正文中提取技能关键词（仅限已知技能词，绝不抽取句子）。
    仅在Boss标签区为空时作为兜底。
    """
    if not jd_text:
        return []

    found = []
    seen = set()

    # 从KNOWN_SKILLS中找匹配
    for skill in sorted(KNOWN_SKILLS, key=len, reverse=True):
        if skill in jd_text and skill not in seen:
            found.append(skill)
            seen.add(skill)
        if len(found) >= 12:
            break

    return found


def _is_noise_tag(text: str) -> bool:
    for keyword in NON_SKILL_KEYWORDS:
        if keyword in text:
            return True
    for keyword in NON_SKILL_EXACT:
        if text == keyword:
            return True
    return False


# ==================== 第7步：清洗JD正文 ====================

def clean_jd_body(jd_body: str) -> str:
    """
    清洗JD正文。

    规则：
    1. 不删除编号（1. / 2. / 1、等）
    2. 删除噪音行
    3. 删除尾部HR/公司信息
    4. 合并多余空行
    """
    if not jd_body:
        return ""

    lines = jd_body.split('\n')

    # 1. 标记每行是否应删除
    keep = [True] * len(lines)

    # 2. 找到HR块起始（在jd_body尾部查找HR姓名+状态组合）
    hr_tail_start = _find_hr_tail_in_jd(lines)
    if hr_tail_start is not None:
        for i in range(hr_tail_start, len(lines)):
            keep[i] = False

    # 3. 逐行检查噪音
    for idx, line in enumerate(lines):
        if not keep[idx]:
            continue
        stripped = line.strip()

        # 空行保留
        if not stripped:
            continue

        # 单独一行的HR状态
        if stripped in HR_STATUS_SORTED:
            keep[idx] = False
            continue

        # 噪音关键词匹配
        for noise in JD_NOISE_PATTERNS:
            if noise in stripped:
                keep[idx] = False
                break

    # 4. 重建，合并多余空行
    result = []
    prev_empty = False
    for idx, line in enumerate(lines):
        if not keep[idx]:
            continue
        stripped = line.strip()
        if not stripped:
            if not prev_empty:
                result.append("")
                prev_empty = True
        else:
            result.append(stripped)
            prev_empty = False

    # 5. 去尾部空行
    while result and not result[-1]:
        result.pop()

    return "\n".join(result)


def _find_hr_tail_in_jd(lines: list):
    """
    在JD正文尾部查找HR信息块（HR姓名+状态+公司行）。

    JD正文不应包含HR信息。如果jd_body切片不准确（因为HR块可能
    出现在jd_marker之前），这里做兜底检测。

    检测逻辑：从尾部向前扫描，找到"可能是HR姓名 + HR状态 + 公司信息"
    的连续2-3行组合。

    返回HR块起始行号，未找到返回None。
    """
    if len(lines) < 2:
        return None

    # 从后向前找HR状态行
    for idx in range(len(lines) - 1, 0, -1):
        stripped = lines[idx].strip()
        # 检查是否包含HR状态
        for status in HR_STATUS_SORTED:
            if status in stripped:
                # 向前看是否有姓名候选
                prev = lines[idx - 1].strip()
                if prev and _is_likely_hr_name(prev):
                    return idx - 1
                # 前两行
                if idx >= 2:
                    prev2 = lines[idx - 2].strip()
                    if prev2 and _is_likely_hr_name(prev2):
                        return idx - 2
                # 如果上一行是空行，再前看一行
                if idx >= 2 and not prev:
                    prev2 = lines[idx - 2].strip()
                    if prev2 and _is_likely_hr_name(prev2):
                        return idx - 2
                # 如果找不到姓名行，从状态行本身开始删除
                return idx

    return None
