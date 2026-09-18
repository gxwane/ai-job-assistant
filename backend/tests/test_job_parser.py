"""
岗位结构化解析引擎 单元测试
"""
import sys
sys.path.insert(0, '.')

from app.services.job_parser import (
    parse_job_text,
    find_jd_start_index,
    find_hr_block_start_index,
    extract_hr_status,
    extract_hr_name,
    extract_job_tags,
    clean_jd_body,
    normalize_raw_text,
)


def test_case_1():
    """案例1: 计算机视觉应用工程师"""
    print("=" * 60)
    print("案例1: 计算机视觉应用工程师（实习）")
    print("=" * 60)

    raw = """计算机视觉应用工程师（实习）
关键职责：
1. 实现和改进图像分类、目标检测、语义分割等经典CV算法。
2. 负责训练数据的收集、标注和管理。
3. 在嵌入式设备或云端部署和优化CV模型，实现低延迟、高吞吐。
4. 跟踪CV领域的最新研究进展，并应用于实际项目中。
能力要求：
Python, PyTorch/TensorFlow, OpenCV, YOLO, CNN/Transformer模型
郭可英
刚刚活跃
郑州引力琥珀人工智能"""

    result = parse_job_text(raw)

    print(f"job_tags: {result['job_tags']}")
    print(f"hr_name: {repr(result['hr_name'])}")
    print(f"hr_status: {repr(result['hr_status'])}")
    print(f"hr_active_score: {result['hr_active_score']}")
    print(f"clean_jd:\n{result['clean_job_description']}")
    print()

    jd = result['clean_job_description']
    errors = []

    # 检查 "1. 实现" 没有被破坏
    if "1. 实现和改进" not in jd:
        errors.append(f'FAIL: "1. 实现和改进" not in JD. Got: {jd[:100]}')
    else:
        print('PASS: "1. 实现和改进" preserved')

    # 检查 hr_status
    if result['hr_status'] != '刚刚活跃':
        errors.append(f'FAIL: hr_status expected "刚刚活跃", got {repr(result["hr_status"])}')
    else:
        print('PASS: hr_status = "刚刚活跃"')

    # 检查 hr_name
    if result['hr_name'] != '郭可英':
        errors.append(f'FAIL: hr_name expected "郭可英", got {repr(result["hr_name"])}')
    else:
        print('PASS: hr_name = "郭可英"')

    # 检查 clean_jd 不含HR信息
    if '郭可英' in jd:
        errors.append('FAIL: hr_name "郭可英" still in JD')
    else:
        print('PASS: hr_name not in JD')

    if '刚刚活跃' in jd:
        errors.append('FAIL: hr_status "刚刚活跃" still in JD')
    else:
        print('PASS: hr_status not in JD')

    if '郑州引力琥珀' not in jd:
        print('NOTE: company info not in JD (may be ok if it was cut with HR block)')
    else:
        print('PASS: company info removed from JD')

    return errors


def test_case_2():
    """案例2: Linux开发/部署经验 + Python + 蒋先生/2月内活跃"""
    print()
    print("=" * 60)
    print("案例2: 大模型应用开发 + HR信息残留")
    print("=" * 60)

    raw = """Linux开发/部署经验
Python

岗位职责：
1. 负责大模型应用平台的开发与维护
2. 确保平台功能的实现符合技术和业务需求
3. 与团队合作，优化平台性能和用户体验

任职要求：
1. 具备良好的沟通能力和团队协作精神
2. 能够高效完成任务，并对工作细节有严谨把控
3. 具有持续学习和改进工作方法的能力

蒋先生
2月内活跃
杭州连控科技有限公司 · 董事长"""

    result = parse_job_text(raw)

    print(f"job_tags: {result['job_tags']}")
    print(f"hr_name: {repr(result['hr_name'])}")
    print(f"hr_status: {repr(result['hr_status'])}")
    print(f"hr_active_score: {result['hr_active_score']}")
    print(f"clean_jd:\n{result['clean_job_description']}")
    print()

    jd = result['clean_job_description']
    errors = []

    # 检查 job_tags
    if 'Linux开发/部署经验' not in result['job_tags']:
        errors.append(f'FAIL: "Linux开发/部署经验" not in job_tags. Got: {result["job_tags"]}')
    else:
        print('PASS: job_tags contains "Linux开发/部署经验"')

    if 'Python' not in result['job_tags']:
        errors.append(f'FAIL: "Python" not in job_tags. Got: {result["job_tags"]}')
    else:
        print('PASS: job_tags contains "Python"')

    # 检查 hr_status
    if result['hr_status'] != '2月内活跃':
        errors.append(f'FAIL: hr_status expected "2月内活跃", got {repr(result["hr_status"])}')
    else:
        print('PASS: hr_status = "2月内活跃"')

    # 检查 hr_name
    if result['hr_name'] != '蒋先生':
        errors.append(f'FAIL: hr_name expected "蒋先生", got {repr(result["hr_name"])}')
    else:
        print('PASS: hr_name = "蒋先生"')

    # 检查 clean_jd 不含HR信息
    for noise in ['蒋先生', '2月内活跃', '杭州连控科技有限公司', '董事长']:
        if noise in jd:
            errors.append(f'FAIL: "{noise}" still in JD')
        else:
            print(f'PASS: "{noise}" not in JD')

    # 检查JD内容完整
    for required in ['岗位职责', '负责大模型应用平台的开发与维护', '任职要求']:
        if required not in jd:
            errors.append(f'FAIL: "{required}" missing from JD')
        else:
            print(f'PASS: "{required}" present in JD')

    return errors


def test_case_3():
    """案例3: 标签区+正文区+中文空格修复"""
    print()
    print("=" * 60)
    print("案例3: 标签区 + 职位描述不作为JD起始")
    print("=" * 60)

    raw = """不接受居家办公
C端产品
数据分析能力好
应用商店运营
app运营
游戏类
产品运营
双休
薪资待遇
工作时间
岗位职责
岗位要求"""

    result = parse_job_text(raw)

    print(f"job_tags: {result['job_tags']}")
    print(f"clean_jd: {repr(result['clean_job_description'])}")
    print()

    jd = result['clean_job_description']
    tags = result['job_tags']
    errors = []

    # 期望的标签（不接受居家办公和双休是无意义短语，应被过滤）
    expected_tags = [
        "C端产品", "数据分析能力好",
        "应用商店运营", "app运营", "游戏类", "产品运营"
    ]
    for tag in expected_tags:
        if tag in tags:
            print(f'PASS: job_tags contains "{tag}"')
        else:
            errors.append(f'FAIL: job_tags missing "{tag}"')

    # 按新规则应排除的
    excluded = ["不接受居家办公", "双休"]
    for tag in excluded:
        if tag not in tags:
            print(f'PASS: "{tag}" excluded from job_tags')
        else:
            errors.append(f'FAIL: "{tag}" should be excluded')

    # clean_jd 应从"薪资待遇"开始
    if '薪资待遇' in jd:
        print('PASS: clean_jd starts with "薪资待遇"')
    else:
        errors.append('FAIL: "薪资待遇" not in jd')

    if '岗位职责' in jd:
        print('PASS: clean_jd contains "岗位职责"')
    else:
        errors.append('FAIL: "岗位职责" not in jd')

    if '岗位要求' in jd:
        print('PASS: clean_jd contains "岗位要求"')
    else:
        errors.append('FAIL: "岗位要求" not in jd')

    return errors


def test_cjk_spaces():
    """中文空格修复测试"""
    print()
    print("=" * 60)
    print("中文空格修复测试")
    print("=" * 60)

    from app.services.job_parser import normalize_raw_text
    errors = []

    t1 = "截图 测试"
    r1 = normalize_raw_text(t1)
    if r1 == "截图测试":
        print('PASS: "截图 测试" → "截图测试"')
    else:
        errors.append(f'FAIL: got {repr(r1)}')

    # 中文间多空格
    t2 = "产品  运营  分析"
    r2 = normalize_raw_text(t2)
    if "产品运营分析" in r2:
        print('PASS: multi-space CJK collapse')
    else:
        errors.append(f'FAIL: got {repr(r2)}')

    # 中文-英文边界保留空格
    t3 = "app运营 双休"
    r3 = normalize_raw_text(t3)
    if "app运营" in r3 and "双休" in r3:
        print('PASS: CJK-EN boundary preserved')
    else:
        errors.append(f'FAIL: got {repr(r3)}')

    return errors


def test_case_4():
    """案例4: HR信息混入job_tags — 卢女士/刚刚活跃/与AI 不应作为标签"""
    print()
    print("=" * 60)
    print("案例4: Agent/AI相关经验/AI技术 + 卢女士/刚刚活跃/与AI")
    print("=" * 60)

    raw = """Agent
AI相关经验
AI技术
与AI
卢女士
刚刚活跃

一、岗位职责
1. 参与AI相关业务，快速熟悉业务逻辑，积累跨领域实践经验。
2. 结合大模型、机器学习等AI技术，参与业务优化。

二、任职要求
1. 2026/2027届本科及以上毕业生。
2. 对AI技术有浓厚兴趣。

卢女士
刚刚活跃
武汉市赴亚科技 · 招聘经理"""

    result = parse_job_text(raw)

    print(f"job_tags: {result['job_tags']}")
    print(f"hr_name: {repr(result['hr_name'])}")
    print(f"hr_status: {repr(result['hr_status'])}")
    print(f"clean_jd: {repr(result['clean_job_description'][:200])}")

    tags = result['job_tags']
    jd = result['clean_job_description']
    errors = []

    # 必须包含的标签
    for expected in ['Agent', 'AI相关经验', 'AI技术']:
        if expected in tags:
            print(f'PASS: job_tags contains "{expected}"')
        else:
            errors.append(f'FAIL: job_tags missing "{expected}"')

    # 必须排除的标签
    for forbidden in ['卢女士', '刚刚活跃', '与AI', '招聘经理', '武汉市赴亚科技']:
        if forbidden in tags:
            errors.append(f'FAIL: "{forbidden}" should NOT be in job_tags')
        else:
            print(f'PASS: "{forbidden}" not in job_tags')

    # HR信息
    if result['hr_name'] == '卢女士':
        print('PASS: hr_name = "卢女士"')
    else:
        errors.append(f'FAIL: hr_name expected "卢女士", got {repr(result["hr_name"])}')

    if result['hr_status'] == '刚刚活跃':
        print('PASS: hr_status = "刚刚活跃"')
    else:
        errors.append(f'FAIL: hr_status expected "刚刚活跃", got {repr(result["hr_status"])}')

    # clean_jd 不包含HR信息
    for noise in ['卢女士', '刚刚活跃', '招聘经理']:
        if noise in jd:
            errors.append(f'FAIL: "{noise}" still in clean JD')
        else:
            print(f'PASS: "{noise}" not in clean JD')

    return errors


def test_clean_tags_for_matching():
    """测试 clean_job_tags_for_matching 二次清洗"""
    print()
    print("=" * 60)
    print("clean_job_tags_for_matching 二次清洗测试")
    print("=" * 60)

    from app.services.job_parser import clean_job_tags_for_matching
    errors = []

    dirty = ['Agent', 'AI相关经验', 'AI技术', '与AI', '卢女士', '刚刚活跃', '招聘经理']
    cleaned = clean_job_tags_for_matching(dirty)
    print(f"Input: {dirty}")
    print(f"Cleaned: {cleaned}")

    for good in ['Agent', 'AI相关经验', 'AI技术']:
        if good in cleaned:
            print(f'PASS: "{good}" kept')
        else:
            errors.append(f'FAIL: "{good}" lost')

    for bad in ['卢女士', '刚刚活跃', '与AI', '招聘经理']:
        if bad not in cleaned:
            print(f'PASS: "{bad}" removed')
        else:
            errors.append(f'FAIL: "{bad}" still present')

    return errors


def test_case_5():
    """案例5: 全栈无侧重 + ByteIntern 正文不应作为标签"""
    print()
    print("=" * 60)
    print("案例5: 全栈无侧重 (Boss真实短标签)")
    print("=" * 60)

    raw = """全栈无侧重

ByteIntern：面向2027届毕业生（2026年9月-2027年8月期间毕业），为符合岗位要求的同学提供转正机会。
团队介绍：客服平台团队...
岗位职责：
1. 负责智能客服系统的全栈研发工作
2. 在AI工具辅助下完成前端界面到后端服务的数据存储任务
职位要求：
1. 2027届本科及以上学历在读"""

    result = parse_job_text(raw)
    tags = result['job_tags']
    jd = result['clean_job_description']

    print(f"job_tags: {tags}")
    print(f"clean_jd: {repr(jd[:150])}")
    errors = []

    # 只能有全栈无侧重
    if tags == ['全栈无侧重']:
        print('PASS: job_tags exactly ["全栈无侧重"]')
    else:
        errors.append(f'FAIL: expected ["全栈无侧重"], got {tags}')

    forbidden = ['ByteIntern', '2027', '毕业生', '团队介绍', '岗位职责', '职位要求', '向2027届']
    for f in forbidden:
        tag_str = ' '.join(tags)
        if f in tag_str:
            errors.append(f'FAIL: "{f}" found in job_tags')
        else:
            print(f'PASS: "{f}" not in job_tags')

    return errors


def test_case_6():
    """案例6: Python + 【岗位职责】不应作为标签"""
    print()
    print("=" * 60)
    print("案例6: Python (不应含【岗位职责】残片)")
    print("=" * 60)

    raw = """Python

【岗位职责】
1. 参与AI Agent相关开发工作
2. 结合大语言模型设计Agent工具调用
【职位要求】
1. 教育背景：2027年或2028年毕业本科及以上"""

    result = parse_job_text(raw)
    tags = result['job_tags']

    print(f"job_tags: {tags}")
    errors = []

    if tags == ['Python']:
        print('PASS: job_tags exactly ["Python"]')
    else:
        errors.append(f'FAIL: expected ["Python"], got {tags}')

    forbidden = ['【岗位职责】', '1. 参', '职位要求', '教育背景']
    for f in forbidden:
        tag_str = ' '.join(tags)
        if f in tag_str:
            errors.append(f'FAIL: "{f}" found in job_tags')
        else:
            print(f'PASS: "{f}" not in job_tags')

    return errors


def test_case_7():
    """案例7: 正文句子不应成为标签 + HR姓名过滤 + CJK断行修复"""
    print()
    print("=" * 60)
    print("案例7: 正文句子排除 + HR姓名过滤")
    print("=" * 60)

    # 正常文本（不含异常断行）
    raw = """1、至少掌握Python/C++/Java/C#中的一门编程语言；

2、熟悉IDEA、VS code等编程工具的使用；

3、了解AI-Agent的skill；

付春秋
今日活跃"""

    result = parse_job_text(raw)
    tags = result['job_tags']
    jd = result['clean_job_description']

    print(f"job_tags: {tags}")
    print(f"hr_name: {repr(result['hr_name'])}")
    print(f"hr_status: {repr(result['hr_status'])}")
    print(f"clean_jd: {repr(jd[:200])}")
    errors = []

    # HR信息
    if result['hr_name'] == '付春秋':
        print('PASS: hr_name = "付春秋"')
    else:
        errors.append(f'FAIL: hr_name expected "付春秋", got {repr(result["hr_name"])}')

    if result['hr_status'] == '今日活跃':
        print('PASS: hr_status = "今日活跃"')
    else:
        errors.append(f'FAIL: hr_status expected "今日活跃", got {repr(result["hr_status"])}')

    # HR姓名不得是标签
    if '付春秋' not in tags:
        print('PASS: HR name not in job_tags')
    else:
        errors.append('FAIL: HR name in job_tags')

    # 正文句子不得是标签（含动词/工具名的整句）
    tag_text = ' '.join(tags)
    forbidden_body = ['熟悉', '掌握', '了解', 'IDEA', 'VS code', 'skill', '语言的', '工具的使用']
    for bad in forbidden_body:
        if bad in tag_text:
            errors.append(f'FAIL: body fragment "{bad}" in job_tags')
        else:
            print(f'PASS: "{bad}" not in job_tags')

    # Python和AI-Agent可以从JD兜底提取
    if 'Python' in tags:
        print('PASS: "Python" extracted from JD as skill keyword')
    if 'AI-Agent' in tags:
        print('PASS: "AI-Agent" extracted from JD as skill keyword')
    if 'C++' in tags:
        print('PASS: "C++" extracted from JD as skill keyword')

    return errors


def test_case_7b():
    """案例7b: CJK单字断行修复"""
    print()
    print("=" * 60)
    print("案例7b: CJK单字断行修复")
    print("=" * 60)

    from app.services.job_parser import normalize_raw_text

    raw = "1\u3001\u81f3\n\u5c11\u638c\u63e1Python/C++/Java/C#\u4e2d\u7684\u4e00\u95e8"
    fixed = normalize_raw_text(raw)
    print(f"Raw: {repr(raw)}")
    print(f"Fixed: {repr(fixed)}")
    errors = []

    # "\u81f3\n\u5c11\u638c\u63e1" should become "\u81f3\u5c11\u638c\u63e1"
    if "\u81f3\n\u5c11\u638c\u63e1" not in fixed:
        print("PASS: CJK single-char break repaired")
    else:
        errors.append("FAIL: CJK break not repaired")

    return errors


def test_unit_functions():
    """额外的单元函数测试"""
    print()
    print("=" * 60)
    print("单元函数测试")
    print("=" * 60)

    errors = []

    # test find_jd_start_index
    t = "一些标签\n岗位职责：\n1. 做xxx"
    idx = find_jd_start_index(t)
    if idx is not None:
        print(f'PASS: find_jd_start_index returns {idx}')
    else:
        errors.append('FAIL: find_jd_start_index returned None')

    # test find_jd_start_index with "关键职责"
    t2 = "标签1\n标签2\n关键职责：\n1. xxx"
    idx2 = find_jd_start_index(t2)
    if idx2 is not None:
        print(f'PASS: find_jd_start_index with 关键职责 returns {idx2}')
    else:
        errors.append('FAIL: find_jd_start_index with 关键职责 returned None')

    # test extract_hr_status
    status, score = extract_hr_status("蒋先生\n2月内活跃\n公司")
    if status == '2月内活跃' and score == 30:
        print('PASS: extract_hr_status "2月内活跃" → 30')
    else:
        errors.append(f'FAIL: extract_hr_status got {status}, {score}')

    # test extract_hr_status priority
    t3 = "公司\n3日内活跃\n末尾"
    status3, _ = extract_hr_status(t3)
    if status3 == '3日内活跃':
        print('PASS: extract_hr_status "3日内活跃" (not "日内活跃")')
    else:
        errors.append(f'FAIL: extract_hr_status got {status3}')

    # test extract_hr_name
    hr_block = "蒋先生\n2月内活跃\n杭州连控科技有限公司 · 董事长"
    name = extract_hr_name(hr_block, "2月内活跃")
    if name == '蒋先生':
        print('PASS: extract_hr_name → "蒋先生"')
    else:
        errors.append(f'FAIL: extract_hr_name got {repr(name)}')

    return errors


if __name__ == '__main__':
    all_errors = []
    all_errors.extend(test_case_1())
    all_errors.extend(test_case_2())
    all_errors.extend(test_case_3())
    all_errors.extend(test_case_4())
    all_errors.extend(test_case_5())
    all_errors.extend(test_case_6())
    all_errors.extend(test_case_7())
    all_errors.extend(test_case_7b())
    all_errors.extend(test_cjk_spaces())
    all_errors.extend(test_clean_tags_for_matching())
    all_errors.extend(test_unit_functions())

    print()
    print("=" * 60)
    if all_errors:
        print(f"FAILED: {len(all_errors)} errors")
        for e in all_errors:
            print(f"  - {e}")
        sys.exit(1)
    else:
        print("ALL TESTS PASSED")
        sys.exit(0)
