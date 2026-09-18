"""
Unit tests for interview_service.py.

Coverage targets:
- parse_interview_json handles standard JSON, code blocks, single quotes, trailing commas
- close_truncated_json completes unclosed brackets and braces
- generate_job_interview_questions logic
"""
from app.services.interview_service import close_truncated_json, parse_interview_json


class TestJsonRepair:
    def test_clean_json(self):
        raw = '{"total": 1, "questions": [{"question": "Q1", "answer": "A1"}]}'
        result = parse_interview_json(raw)
        assert result["total"] == 1
        assert len(result["questions"]) == 1

    def test_markdown_codeblock(self):
        raw = '```json\n{"total": 2, "questions": []}\n```'
        result = parse_interview_json(raw)
        assert result["total"] == 2

    def test_trailing_comma(self):
        raw = '{"total": 1, "questions": [{"q": "test",}],}'
        result = parse_interview_json(raw)
        assert result["total"] == 1

    def test_single_quotes_fixed(self):
        raw = "{'total': 1, 'questions': [{'q': 'test'}]}"
        result = parse_interview_json(raw)
        assert result["total"] == 1

    def test_unclosed_brackets_completed(self):
        """Truncated LLM stream ending abruptly."""
        raw = '{"total": 1, "questions": [{"question": "How to handle concurrency?"'
        closed = close_truncated_json(raw)
        assert closed.endswith("}]}")
        result = parse_interview_json(raw)
        assert "questions" in result
