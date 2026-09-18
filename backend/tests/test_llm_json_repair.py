"""
Unit tests for _parse_llm_json() — LLM response JSON repair logic.

Coverage targets:
- Clean JSON string (happy path)
- JSON wrapped in ```json ... ``` markdown fence
- JSON wrapped in plain ``` ... ``` fence
- Leading/trailing whitespace and newlines
- Trailing comma before } (repair case)
- Trailing comma before ] (repair case)
- JSON embedded in prose (bracket extraction)
- Completely invalid input → fallback dict returned
- Empty string → fallback dict returned
- Fallback dict structure matches expected schema
"""
import json
import pytest

from app.services.analysis_service import _parse_llm_json


# ── Fixtures ───────────────────────────────────────────────────────────────────

VALID_JSON_DICT = {
    "skill_score": 30,
    "project_score": 20,
    "education_score": 10,
    "potential_score": 8,
    "category_match": True,
    "core_skill_hit_rate": 0.75,
    "matched_core_skills": ["Python", "FastAPI"],
    "summary": "测试摘要",
}

VALID_JSON_STR = json.dumps(VALID_JSON_DICT, ensure_ascii=False)


# ── Happy path ─────────────────────────────────────────────────────────────────

class TestHappyPath:
    def test_clean_json(self):
        result = _parse_llm_json(VALID_JSON_STR)
        assert result["skill_score"] == 30
        assert result["category_match"] is True

    def test_leading_trailing_whitespace(self):
        result = _parse_llm_json(f"  \n  {VALID_JSON_STR}  \n  ")
        assert result["skill_score"] == 30

    def test_chinese_values_preserved(self):
        data = {"summary": "候选人Python后端经验与AI应用开发岗需求契合"}
        result = _parse_llm_json(json.dumps(data, ensure_ascii=False))
        assert "Python后端" in result["summary"]


# ── Markdown fenced code blocks ───────────────────────────────────────────────

class TestMarkdownFence:
    def test_json_fence_with_language_tag(self):
        raw = f"```json\n{VALID_JSON_STR}\n```"
        result = _parse_llm_json(raw)
        assert result["skill_score"] == 30

    def test_plain_fence_no_language_tag(self):
        raw = f"```\n{VALID_JSON_STR}\n```"
        result = _parse_llm_json(raw)
        assert result["skill_score"] == 30

    def test_fence_with_surrounding_prose(self):
        raw = (
            "以下是分析结果：\n"
            f"```json\n{VALID_JSON_STR}\n```\n"
            "以上供参考。"
        )
        result = _parse_llm_json(raw)
        assert result["skill_score"] == 30

    def test_fence_extra_whitespace_inside(self):
        raw = f"```json\n\n  {VALID_JSON_STR}  \n\n```"
        result = _parse_llm_json(raw)
        assert result["category_match"] is True


# ── Trailing comma repair ──────────────────────────────────────────────────────

class TestTrailingCommaRepair:
    def test_trailing_comma_before_closing_brace(self):
        raw = '{"skill_score": 25, "project_score": 15,}'
        result = _parse_llm_json(raw)
        assert result["skill_score"] == 25
        assert result["project_score"] == 15

    def test_trailing_comma_before_closing_bracket(self):
        raw = '{"items": ["a", "b", "c",]}'
        result = _parse_llm_json(raw)
        assert result["items"] == ["a", "b", "c"]

    def test_nested_trailing_comma(self):
        raw = '{"outer": {"inner": 1,},}'
        result = _parse_llm_json(raw)
        assert result["outer"]["inner"] == 1


# ── Bracket extraction from prose ─────────────────────────────────────────────

class TestBracketExtraction:
    def test_json_embedded_in_prose(self):
        raw = (
            "根据您的简历分析，我认为匹配度良好。\n"
            f"{VALID_JSON_STR}\n"
            "以上是完整的分析结果。"
        )
        result = _parse_llm_json(raw)
        assert result["skill_score"] == 30

    def test_json_after_colon_label(self):
        raw = f"结果如下：{VALID_JSON_STR}"
        result = _parse_llm_json(raw)
        assert result["skill_score"] == 30


# ── Fallback on invalid input ─────────────────────────────────────────────────

class TestFallback:
    FALLBACK_REQUIRED_KEYS = {
        "resume_category", "job_category", "category_match",
        "core_skill_hit_rate", "skill_score", "project_score",
        "education_score", "potential_score",
        "matched_core_skills", "missing_core_skills",
        "risk_warnings", "summary",
    }

    def test_completely_invalid_returns_fallback(self):
        result = _parse_llm_json("这不是 JSON 内容，完全无法解析。")
        for key in self.FALLBACK_REQUIRED_KEYS:
            assert key in result, f"Fallback missing key: {key}"

    def test_empty_string_returns_fallback(self):
        result = _parse_llm_json("")
        assert "skill_score" in result
        assert result["skill_score"] == 0

    def test_fallback_category_match_is_false(self):
        """Fallback must signal category mismatch to trigger score cap."""
        result = _parse_llm_json("not json at all")
        assert result["category_match"] is False

    def test_fallback_scores_are_zero(self):
        result = _parse_llm_json("??")
        assert result["skill_score"] == 0
        assert result["project_score"] == 0
        assert result["education_score"] == 0
        assert result["potential_score"] == 0

    def test_fallback_risk_warnings_non_empty(self):
        """Fallback should warn the user that parsing failed."""
        result = _parse_llm_json("broken")
        assert isinstance(result["risk_warnings"], list)
        assert len(result["risk_warnings"]) > 0

    def test_curly_brace_but_invalid_json(self):
        """Text that starts/ends with {} but is not valid JSON."""
        result = _parse_llm_json("{this is not: valid json,}")
        # Either repaired successfully (unlikely here) or falls back gracefully
        assert isinstance(result, dict)


# ── Edge cases ─────────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_number_values_preserved(self):
        raw = '{"core_skill_hit_rate": 0.375, "skill_score": 15}'
        result = _parse_llm_json(raw)
        assert abs(result["core_skill_hit_rate"] - 0.375) < 1e-9
        assert result["skill_score"] == 15

    def test_boolean_values_preserved(self):
        raw = '{"category_match": false}'
        result = _parse_llm_json(raw)
        assert result["category_match"] is False

    def test_nested_list_preserved(self):
        raw = '{"matched_core_skills": ["Python", "FastAPI", "Docker"]}'
        result = _parse_llm_json(raw)
        assert result["matched_core_skills"] == ["Python", "FastAPI", "Docker"]

    def test_unicode_escape_in_json(self):
        raw = '{"summary": "\\u5019\\u9009\\u4eba"}'  # "候选人"
        result = _parse_llm_json(raw)
        assert result["summary"] == "候选人"
