"""
大模型统一调用客户端
- 默认支持 DeepSeek API
- 无 API Key 时自动切换 mock 模式
"""
import json
import re

import httpx

from ..config import DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, DEEPSEEK_MODEL, MOCK_MODE


class LLMClient:
    """大模型客户端，封装 API 调用逻辑"""

    def __init__(self):
        self.api_key = DEEPSEEK_API_KEY
        self.base_url = DEEPSEEK_BASE_URL.rstrip("/")
        self.model = DEEPSEEK_MODEL
        self.mock_mode = MOCK_MODE
        # mock 数据索引，用于切换不同场景
        self._mock_index = 0
        self.load_active_config()

    def load_active_config(self, db=None) -> None:
        """从 数据库 > .env/模块变量 > 默认值 动态加载当前有效配置"""
        try:
            from ..database import SessionLocal
            from ..models import SystemSetting
            session = db or SessionLocal()
            should_close = db is None
            try:
                setting = session.query(SystemSetting).filter(SystemSetting.id == 1).first()
                if setting:
                    self.api_key = setting.api_key or ""
                    self.base_url = (setting.base_url or "https://api.deepseek.com").rstrip("/")
                    self.model = setting.model or "deepseek-chat"
                    if setting.is_mock_mode is not None:
                        self.mock_mode = setting.is_mock_mode
                    else:
                        self.mock_mode = not self.api_key or self.api_key == "your_deepseek_api_key_here"
                    return
            finally:
                if should_close:
                    session.close()
        except Exception:
            pass

        # 回退到模块变量（兼容 patch 与环境变量）
        import sys
        mod = sys.modules[__name__]
        self.api_key = getattr(mod, "DEEPSEEK_API_KEY", DEEPSEEK_API_KEY)
        self.base_url = getattr(mod, "DEEPSEEK_BASE_URL", DEEPSEEK_BASE_URL).rstrip("/")
        self.model = getattr(mod, "DEEPSEEK_MODEL", DEEPSEEK_MODEL)
        self.mock_mode = getattr(mod, "MOCK_MODE", MOCK_MODE)

    def reload(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        model: str | None = None,
        mock_mode: bool | None = None,
    ) -> None:
        """即时热重载运行时参数（供设置保存后调用，毫秒级生效）"""
        if api_key is not None:
            self.api_key = api_key
        if base_url is not None:
            self.base_url = base_url.rstrip("/")
        if model is not None:
            self.model = model
        if mock_mode is not None:
            self.mock_mode = mock_mode
        elif api_key is not None:
            self.mock_mode = not self.api_key or self.api_key == "your_deepseek_api_key_here"

    def _build_chat_url(self) -> str:
        """规范化构建 Chat Completions API URL，防止 /v1 重复拼接"""
        clean_base = self.base_url.rstrip("/")
        clean_base = re.sub(r"/v1/?$", "", clean_base)
        return f"{clean_base}/v1/chat/completions"

    def chat(self, system_prompt: str, user_prompt: str, temperature: float = 0.3, max_tokens: int = 4096, timeout: float = 60.0) -> str:
        """
        发送对话请求到大模型
        Args:
            system_prompt: 系统提示词
            user_prompt: 用户提示词
            temperature: 温度参数，分析类任务建议 0.3
            max_tokens: 最大输出token数，默认4096
            timeout: 超时秒数，默认60
        Returns:
            模型返回的文本内容
        """
        if self.mock_mode:
            print("[LLMClient] 当前为 Mock 模式，返回模拟数据")
            return self._mock_response()

        return self._call_api(system_prompt, user_prompt, temperature, max_tokens, timeout)

    def _call_api(self, system_prompt: str, user_prompt: str, temperature: float, max_tokens: int = 4096, timeout: float = 60.0) -> str:
        """真实调用 DeepSeek API"""
        url = self._build_chat_url()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPError as e:
            raise RuntimeError(f"调用大模型 API 失败：{str(e)}")
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"解析大模型返回数据失败：{str(e)}")

    def chat_stream(self, system_prompt: str, user_prompt: str, temperature: float = 0.3, max_tokens: int = 16384, timeout: float = 240.0) -> str:
        """
        流式对话请求 - 边生成边返回，适合长文本生成
        Args:
            system_prompt: 系统提示词
            user_prompt: 用户提示词
            temperature: 温度参数
            max_tokens: 最大输出token数
            timeout: 总超时秒数，默认240（4分钟），超时后返回已生成的内容
        Returns:
            模型返回的完整文本内容
        """
        if self.mock_mode:
            print("[LLMClient] Mock 模式，返回模拟数据")
            if "面试" in system_prompt or "面试" in user_prompt:
                return self._mock_interview_questions_response()
            return self._mock_response()

        url = self._build_chat_url()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        collected = []
        try:
            with httpx.Client(timeout=timeout) as client:
                with client.stream("POST", url, json=payload, headers=headers) as response:
                    response.raise_for_status()
                    for line in response.iter_lines():
                        if line.startswith("data: "):
                            data_str = line[6:]
                            if data_str.strip() == "[DONE]":
                                break
                            try:
                                chunk = json.loads(data_str)
                                delta = chunk.get("choices", [{}])[0].get("delta", {})
                                content = delta.get("content", "")
                                if content:
                                    collected.append(content)
                            except json.JSONDecodeError:
                                pass
            result = "".join(collected)
            if not result:
                raise RuntimeError("流式响应未返回任何内容")
            return result
        except httpx.ReadTimeout:
            # 超时后返回已生成的部分内容
            result = "".join(collected)
            if result:
                print(f"[LLMClient] 流式响应超时，已收集 {len(result)} 字符")
                return result
            raise RuntimeError("调用大模型 API 超时（4分钟），且未生成任何内容")
        except httpx.HTTPError as e:
            raise RuntimeError(f"调用大模型 API 失败：{str(e)}")

    def _mock_response(self) -> str:
        """返回模拟的分析结果 JSON（部分匹配场景）"""
        mock_result = self._mock_partial_match()
        return json.dumps(mock_result, ensure_ascii=False)

    def _mock_interview_questions_response(self) -> str:
        """返回模拟的面试高频问答题 JSON（符合前端渲染契约）"""
        categories = [
            ("自我介绍与动机", "极高"),
            ("技术栈深度问题", "极高"),
            ("项目经验深挖", "很高"),
            ("架构设计与系统设计", "很高"),
            ("问题解决与调试能力", "很高"),
            ("团队协作与沟通", "较高"),
            ("岗位理解与职业规划", "较高"),
            ("行为面试题", "较高"),
        ]
        base_questions = self._get_interview_questions()
        questions = []
        for idx, item in enumerate(base_questions, start=1):
            cat, prob = categories[(idx - 1) % len(categories)]
            if idx == 1:
                prob = "极高"
                cat = "自我介绍与动机"
            questions.append({
                "index": idx,
                "probability": prob,
                "category": cat,
                "question": item["question"],
                "answer": item["answer"],
                "tips": ["突出核心原理与实践经验", "结合 STAR 原则陈述成果", "体现清晰的思考逻辑与复盘意识"]
            })

        extra_questions = [
            ("请谈谈你在项目中如何做容量规划与压力测试？", "采用压测工具模拟高并发流量，探测系统吞吐量拐点与瓶颈组件。"),
            ("如何保证微服务之间调用的一致性与高可用？", "通过超时重试、熔断降级（Sentinel/Hystrix）及分布式事务最终一致性保障。"),
            ("如何做线上慢 SQL 优化与排查？", "通过慢查询日志与 EXPLAIN 分析索引命中，消除回表与全表扫描。"),
            ("请谈谈你在团队中推动过的一项技术改进或流程优化？", "引入代码静态扫描与自动化测试，提升代码交付质量与评审效率。"),
            ("对于微服务拆分，你的划分粒度原则是什么？", "根据业务边界上下文（DDD）与团队规模进行解耦，避免过度微服务化。"),
            ("如果生产环境突然出现 CPU 100%，你的排查步骤是什么？", "通过 top/ps 定位进程与线程，jstack/py-spy 抓取堆栈，分析热点代码。"),
            ("如何设计一个高可用的分布式锁？", "基于 Redis setnx 与 Redlock 算法，结合 Lua 脚本保障原子释放。"),
            ("谈谈你对消息队列积压问题的应对方案？", "排查消费者异常，水平扩容消费端并发度，紧急时做死信队列降级。"),
            ("在多人团队协作中，如何减少代码分支冲突与交付阻塞？", "采用主干或敏捷特性分支，坚持小步快跑、频繁合并与代码 Review。"),
            ("你对未来 1~3 年的个人技术成长目标是什么？", "深化底层架构设计与大模型工程化落地能力，成长为能带领核心模块的骨干工程师。")
        ]
        for idx, (q, a) in enumerate(extra_questions, start=len(base_questions) + 1):
            cat, prob = categories[(idx - 1) % len(categories)]
            questions.append({
                "index": idx,
                "probability": prob,
                "category": cat,
                "question": q,
                "answer": a,
                "tips": ["结合实际工程场景", "突出问题定位方法论", "给出量化指标提升"]
            })

        mock_data = {
            "job_title": "AI应用开发 / 后端开发工程师",
            "company": "示例科技公司",
            "generated_at": "2026-09-18",
            "total": len(questions),
            "questions": questions
        }
        return json.dumps(mock_data, ensure_ascii=False)

    def _mock_high_match(self) -> dict:
        """高度匹配场景：Python后端开发投递AI开发岗"""
        return {
            "resume_category": "Python后端开发",
            "job_category": "AI应用开发",
            "category_match": True,
            "category_reason": "候选人Python后端开发方向与AI应用开发岗高度相关，技术栈相通，方向一致",
            "core_job_skills": ["Python", "FastAPI", "机器学习基础", "Docker", "MySQL", "Redis", "RESTful API设计"],
            "resume_skills": ["Python", "FastAPI", "MySQL", "Redis", "Git", "Linux基础", "Docker", "RESTful API"],
            "matched_core_skills": ["Python", "FastAPI", "MySQL", "Redis", "RESTful API设计", "Docker"],
            "missing_core_skills": ["机器学习基础"],
            "core_skill_hit_rate": 0.86,
            "skill_score": 35,
            "project_score": 25,
            "education_score": 13,
            "potential_score": 12,
            "risk_warnings": [],
            "summary": "技术栈高度匹配，候选人Python后端经验与AI应用开发岗需求契合，仅需补充机器学习基础知识。",
            "matched_points": [
                "精通Python和FastAPI框架，与岗位核心技术要求高度匹配",
                "有完整的Web后端项目经验，熟悉RESTful API设计和数据库操作",
                "具备Docker容器化部署经验，匹配岗位的部署要求",
                "熟练使用MySQL和Redis，满足数据存储和缓存技术需求"
            ],
            "missing_skills": [
                "机器学习基础（如scikit-learn、TensorFlow基础使用）",
                "对AI应用的性能调优和模型部署经验不足"
            ],
            "resume_suggestions": [
                "建议在简历中突出展示与AI相关的项目或学习经历",
                "可以补充机器学习和深度学习基础课程的学习记录",
                "建议在项目描述中体现数据处理和API性能优化的能力"
            ],
            "interview_questions": self._get_interview_questions()
        }

    def _mock_partial_match(self) -> dict:
        """部分匹配场景：Python后端开发投递Java后端开发岗"""
        return {
            "resume_category": "Python后端开发",
            "job_category": "Java后端开发",
            "category_match": True,
            "category_reason": "候选人Python后端开发方向和Java后端开发岗同属于后端开发大类，方向基本一致但技术栈不同",
            "core_job_skills": ["Java", "Spring Boot", "MyBatis", "MySQL", "Redis", "微服务架构", "Docker", "K8s"],
            "resume_skills": ["Python", "FastAPI", "MySQL", "Redis", "Docker", "Git", "Linux基础"],
            "matched_core_skills": ["MySQL", "Redis", "Docker"],
            "missing_core_skills": ["Java", "Spring Boot", "MyBatis", "微服务架构", "K8s"],
            "core_skill_hit_rate": 0.375,
            "skill_score": 15,
            "project_score": 18,
            "education_score": 10,
            "potential_score": 9,
            "risk_warnings": ["候选人主要技术栈为Python，与岗位要求的Java/Spring Boot体系差异较大", "缺少Java生态和微服务经验"],
            "summary": "方向一致但技术栈差异明显，核心技能命中率偏低，需补充Java生态和微服务架构经验。",
            "matched_points": [
                "熟悉MySQL和Redis等数据库技术，与岗位数据存储需求匹配",
                "具备Docker容器化部署经验",
                "有Web后端开发的通用思维和工程经验"
            ],
            "missing_skills": [
                "Java和Spring Boot框架开发经验",
                "微服务架构（Spring Cloud/Dubbo等）的设计和开发经验",
                "Kubernetes容器编排经验",
                "MyBatis等ORM框架使用经验"
            ],
            "resume_suggestions": [
                "建议学习Java基础和Spring Boot框架，补充跨语言开发能力",
                "可以在简历中强调通用后端工程能力（如数据库设计、API设计等）",
                "建议增加微服务相关项目经验或学习记录"
            ],
            "interview_questions": self._get_interview_questions()
        }

    def _mock_no_match(self) -> dict:
        """完全不匹配场景：Python后端开发投递销售岗"""
        return {
            "resume_category": "Python后端开发",
            "job_category": "销售经理",
            "category_match": False,
            "category_reason": "候选人方向为Python后端开发（技术岗），岗位方向为销售经理（业务岗），二者职业方向完全不同，属于跨领域投递",
            "core_job_skills": ["客户开发", "商务谈判", "销售策略制定", "CRM系统管理", "团队管理", "业绩目标达成"],
            "resume_skills": ["Python", "FastAPI", "MySQL", "Redis", "Docker", "Git", "Linux"],
            "matched_core_skills": [],
            "missing_core_skills": ["客户开发", "商务谈判", "销售策略制定", "CRM系统管理", "团队管理", "业绩目标达成"],
            "core_skill_hit_rate": 0.0,
            "skill_score": 2,
            "project_score": 2,
            "education_score": 5,
            "potential_score": 3,
            "risk_warnings": ["职业方向完全不匹配，技术背景与销售岗位无任何关联", "岗位描述过少，建议补充详细的岗位要求和职责说明"],
            "summary": "候选人技术背景与销售岗位方向完全不一致，不建议投递此岗位。",
            "matched_points": [],
            "missing_skills": [
                "销售及客户开发相关技能",
                "商务谈判和沟通技巧",
                "销售团队管理经验"
            ],
            "resume_suggestions": [
                "建议明确自己的职业方向，选择与自身技术背景匹配的岗位",
                "如需转型销售方向，建议先通过培训和实践积累相关经验"
            ],
            "interview_questions": self._get_interview_questions()
        }

    def _get_interview_questions(self) -> list:
        """生成20条面试题"""
        return [
            {
                "question": "请详细解释Python中的装饰器原理，以及它在FastAPI中是如何被应用的？",
                "answer": "装饰器本质是闭包+高阶函数的语法糖。在FastAPI中，@app.get()等装饰器内部通过路由注册机制，将函数映射到对应的HTTP方法和路径上，同时利用类型注解完成参数校验和依赖注入。你可以结合自己写过的FastAPI接口举例说明。"
            },
            {
                "question": "SQLAlchemy中Session的生命周期是怎样的？如何处理长事务问题？",
                "answer": "Session代表一次数据库会话，从创建到close为一个生命周期。长事务会占用连接和锁，建议：1）使用with上下文管理器自动管理 2）批量操作时分段提交 3）在Web请求中使用请求级别的session 4）设置statement_timeout防止死锁。"
            },
            {
                "question": "你在项目中是如何做API接口的输入验证和错误处理的？",
                "answer": "可以介绍：1）用Pydantic模型做请求体验证 2）自定义异常类（如BusinessException）3）用FastAPI的异常处理器@app.exception_handler统一返回错误格式 4）区分4xx和5xx的错误处理策略。"
            },
            {
                "question": "请描述RESTful API的设计原则，以及你如何在项目中实践这些原则？",
                "answer": "核心原则：1）资源导向URL设计（名词复数）2）使用HTTP方法语义化（GET/POST/PUT/DELETE）3）状态码正确使用 4）版本管理（/v1/）5）分页和过滤支持。结合自己的项目说明如何设计接口路径和响应格式。"
            },
            {
                "question": "请描述你在项目中遇到过的最棘手的技术问题，以及你是如何解决的？",
                "answer": "建议用STAR法则回答：描述具体场景（Situation）、明确要解决的问题（Task）、说明你的解决思路和排查过程（Action）、展示最终成果和收获（Result）。可以选择一个真实的debug经历来增强说服力。"
            },
            {
                "question": "Python中GIL是什么？它如何影响多线程程序？你有什么解决方案？",
                "answer": "GIL（全局解释器锁）保证同一时刻只有一个线程执行Python字节码，导致CPU密集型任务多线程效率低。解决方案：1）IO密集型用多线程 2）CPU密集型用multiprocessing 3）使用C扩展释放GIL 4）考虑asyncio异步编程。"
            },
            {
                "question": "你在项目中做过哪些数据库优化？请举一个具体例子",
                "answer": "可以从：1）慢查询分析和EXPLAIN执行计划 2）合理建立复合索引 3）避免SELECT * 4）懒加载vs预加载（joinedload）的选择 5）数据库读写分离 6）分库分表策略等方面回答，结合实际项目数据说明优化效果。"
            },
            {
                "question": "如何保证一个Web系统的安全性？你在项目中做了哪些安全措施？",
                "answer": "列举常用安全措施：1）参数校验防SQL注入和XSS 2）CSRF Token 3）HTTPS强制 4）敏感数据加密存储 5）接口鉴权（JWT/OAuth2）6）Rate Limiting防暴力破解 7）日志脱敏。结合自己项目的实际做法回答更有说服力。"
            },
            {
                "question": "Docker容器化部署的流程是怎样的？Dockerfile中有哪些最佳实践？",
                "answer": "流程：编写Dockerfile → docker build → docker run/推送到镜像仓库 → 在服务器pull并启动。最佳实践：1）使用轻量基础镜像（alpine）2）多阶段构建减小体积 3）.dockerignore排除无用文件 4）不存储数据在容器内 5）健康检查HEALTHCHECK。"
            },
            {
                "question": "RESTful API和GraphQL的优缺点分别是什么？你在什么场景下会选哪个？",
                "answer": "REST：优点为无状态、易缓存、工具链成熟；缺点为可能过度获取/不足获取数据。GraphQL：优点为按需获取、单端点、强类型Schema；缺点为复杂度高、缓存困难。简单CRUD用REST，复杂关联数据查询用GraphQL。"
            },
            {
                "question": "如果让你设计一个高并发的RESTful API服务，你会考虑哪些方面？",
                "answer": "从以下角度回答：1）使用异步框架（FastAPI/Starlette）提升并发 2）数据库连接池配置 3）引入Redis做热点数据缓存 4）使用消息队列异步处理耗时任务 5）接口限流方案（令牌桶/漏桶）6）负载均衡和水平扩展。"
            },
            {
                "question": "请你评价一下自己最满意的项目，从架构、亮点和改进空间三个方面谈",
                "answer": "选择简历中最具代表性的项目回答。架构方面：技术选型理由、分层设计。亮点方面：解决了什么难题、性能指标提升、创新点。改进空间：诚实指出不足和后续规划，展现自省和学习能力。"
            },
            {
                "question": "你如何保持对新技术的持续学习？请分享你的学习方法和最近关注的技术方向",
                "answer": "学习方法：1）关注官方文档和RFC 2）参与开源社区/技术博客 3）做side project实践验证 4）参加技术会议或线上课程。最近可以关注AIGC、RAG、Agent、边缘计算等方向，并结合你投递岗位的技术栈展开。"
            },
            {
                "question": "作为开发工程师，你如何与产品经理和测试工程师协作？举一个沟通协调的例子",
                "answer": "强调：1）需求评审时主动澄清技术边界 2）开发中保持进度同步 3）提测前写好自测用例 4）Bug修复后及时反馈。用具体案例说明你如何推动多方达成共识。"
            },
            {
                "question": "使用git进行团队协作时，你用过哪些分支策略？如何处理代码冲突？",
                "answer": "常用策略：Git Flow（main/develop/feature/release/hotfix）适用于版本发布明确的项目。处理冲突：1）git diff查看差异 2）与冲突方沟通确认取舍 3）手动合并后测试通过再提交 4）善用rebase保持提交历史清晰。"
            },
            {
                "question": "如果你想对本岗位的业务提出一个优化方向或创新点，你会从哪里入手？",
                "answer": "面试前研究公司产品和业务线，结合技术能力提出建设性方案。比如：建议用AI技术优化某个流程、用数据驱动决策、引入自动化测试提升效率等。展现你对业务的思考和主动性。"
            },
            {
                "question": "在过去的工作或项目中，你是否有与团队成员意见不一致的经历？你是如何处理的？",
                "answer": "用STAR法则：描述分歧焦点，说明你如何理性沟通、用数据和实验验证观点、尊重团队决定并从中学到经验。重点展示'对事不对人'和'以数据说话'的专业态度。"
            },
            {
                "question": "让你在短时间内学习一个陌生技术栈并交付功能，你的学习路径是怎样的？",
                "answer": "路径：1）快速浏览官方quick start和核心文档 2）搭建最小可运行Demo 3）针对任务需求查找最佳实践 4）边做边学，遇到问题检索issue/Stack Overflow 5）代码review时向熟悉该技术的人请教。"
            },
            {
                "question": "请介绍一下你对面向对象编程中SOLID原则的理解，并结合你的代码举例",
                "answer": "简洁解释五大原则并各举一个实际场景：单一职责（一个类只负责一件事）、开闭原则（对扩展开放对修改关闭）、里氏替换、接口隔离、依赖倒置。结合自己项目中的service/repository分层说明如何落实。"
            },
            {
                "question": "你对这个岗位未来1-3年的发展有什么看法？你准备如何成长为更高级别的工程师？",
                "answer": "结合行业趋势谈岗位发展方向（如AI赋能、全栈化、DevOps融合）。个人成长计划：短期目标（快速融入团队/掌握技术栈）、中期目标（独立负责模块/技术分享）、长期目标（技术专家或管理路线）。展现清晰的成长意识。"
            }
        ]


# 全局单例
llm_client = LLMClient()
