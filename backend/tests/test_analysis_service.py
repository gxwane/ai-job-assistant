"""
Unit tests for calculate_final_score() — backend hard-rule scoring engine.

Coverage targets:
- Score capping rules (priority order)
- Sub-score clamping (skill ≤40, project ≤30, edu ≤15, potential ≤15)
- Score level thresholds (≥85 / ≥70 / ≥50 / ≥30 / <30)
- Recommendation generation based on score & category_match
- score_cap_reason population
- final_score never exceeds 100 or goes below 0
"""
import pytest

from app.services.analysis_service import calculate_final_score

# ── Helper ─────────────────────────────────────────────────────────────────────

def make_llm_result(
    skill_score: int = 35,
    project_score: int = 25,
    education_score: int = 13,
    potential_score: int = 12,
    category_match: bool = True,
    core_skill_hit_rate: float = 0.86,
    matched_core_skills: list | None = None,
) -> dict:
    """Build a minimal valid llm_result dict for scoring tests."""
    if matched_core_skills is None:
        matched_core_skills = ["Python", "FastAPI", "MySQL"]
    return {
        "skill_score": skill_score,
        "project_score": project_score,
        "education_score": education_score,
        "potential_score": potential_score,
        "category_match": category_match,
        "core_skill_hit_rate": core_skill_hit_rate,
        "matched_core_skills": matched_core_skills,
        "missing_core_skills": [],
        "risk_warnings": [],
        "summary": "测试摘要",
        "matched_points": [],
        "missing_skills": [],
        "resume_suggestions": [],
    }


LONG_JD = "这是一段足够长的岗位描述。" * 10   # > 80 chars
SHORT_JD = "短JD"                              # < 80 chars


# ── Sub-score clamping ─────────────────────────────────────────────────────────

class TestSubScoreClamping:
    """Sub-scores must be clamped to their individual maxima before summing."""

    def test_skill_score_clamped_to_40(self):
        result = calculate_final_score(make_llm_result(skill_score=99), LONG_JD)
        assert result["score_breakdown"]["skill_score"] == 40

    def test_project_score_clamped_to_30(self):
        result = calculate_final_score(make_llm_result(project_score=99), LONG_JD)
        assert result["score_breakdown"]["project_score"] == 30

    def test_education_score_clamped_to_15(self):
        result = calculate_final_score(make_llm_result(education_score=99), LONG_JD)
        assert result["score_breakdown"]["education_score"] == 15

    def test_potential_score_clamped_to_15(self):
        result = calculate_final_score(make_llm_result(potential_score=99), LONG_JD)
        assert result["score_breakdown"]["potential_score"] == 15

    def test_negative_scores_clamped_to_zero(self):
        result = calculate_final_score(
            make_llm_result(skill_score=-5, project_score=-10), LONG_JD
        )
        assert result["score_breakdown"]["skill_score"] == 0
        assert result["score_breakdown"]["project_score"] == 0

    def test_raw_total_correct(self):
        result = calculate_final_score(
            make_llm_result(skill_score=20, project_score=15, education_score=10, potential_score=8),
            LONG_JD,
        )
        assert result["score_breakdown"]["raw_total"] == 53


# ── Cap Rule 1: category_match = False → max 35 ───────────────────────────────

class TestCategoryMatchCap:
    """category_match=False must cap final_score at 35."""

    def test_cap_applied_when_no_category_match(self):
        llm = make_llm_result(
            category_match=False,
            core_skill_hit_rate=0.9,
            matched_core_skills=["Python"],
            skill_score=35, project_score=25, education_score=13, potential_score=12,
        )
        result = calculate_final_score(llm, LONG_JD)
        assert result["match_score"] <= 35

    def test_cap_reason_mentions_category(self):
        llm = make_llm_result(category_match=False)
        result = calculate_final_score(llm, LONG_JD)
        assert result["score_cap_reason"] is not None
        assert "category_match" in result["score_cap_reason"]

    def test_recommendation_warns_direction_mismatch(self):
        llm = make_llm_result(category_match=False)
        result = calculate_final_score(llm, LONG_JD)
        assert "不建议投递" in result["recommendation"]


# ── Cap Rule 2a: core_skill_hit_rate < 0.15 → max 35 ─────────────────────────

class TestLowHitRateCap35:
    def test_hit_rate_zero_caps_at_35(self):
        llm = make_llm_result(
            core_skill_hit_rate=0.0,
            matched_core_skills=["A"],
            skill_score=35, project_score=25, education_score=13, potential_score=12,
        )
        result = calculate_final_score(llm, LONG_JD)
        assert result["match_score"] <= 35

    def test_hit_rate_exactly_015_not_capped_at_35(self):
        """hit_rate == 0.15 is NOT < 0.15, so the 35-cap must NOT trigger.
        The 50-cap (< 0.30) may still apply and its reason string contains '15%',
        so we assert that the *35-cap phrase* ('< 15%') is absent, not '15%' itself.
        """
        llm = make_llm_result(
            core_skill_hit_rate=0.15,
            matched_core_skills=["A"],
            skill_score=20, project_score=15, education_score=8, potential_score=7,
        )
        result = calculate_final_score(llm, LONG_JD)
        # raw_total = 50, 50-cap applies (0.15 < 0.30), but NOT 35-cap
        assert result["match_score"] <= 50
        cap_reason = result.get("score_cap_reason") or ""
        # The 35-cap reason always contains '< 15%'; the 50-cap reason contains '< 30%'
        assert "< 15%" not in cap_reason, (
            f"35-cap must not trigger at hit_rate=0.15, got: {cap_reason}"
        )


# ── Cap Rule 2b: core_skill_hit_rate < 0.30 → max 50 ─────────────────────────

class TestLowHitRateCap50:
    def test_hit_rate_020_caps_at_50(self):
        llm = make_llm_result(
            core_skill_hit_rate=0.20,
            matched_core_skills=["A"],
            skill_score=35, project_score=25, education_score=13, potential_score=12,
        )
        result = calculate_final_score(llm, LONG_JD)
        assert result["match_score"] <= 50

    def test_hit_rate_exactly_030_not_capped(self):
        """hit_rate == 0.30 is NOT < 0.30, so neither low-rate cap should trigger."""
        llm = make_llm_result(
            core_skill_hit_rate=0.30,
            matched_core_skills=["A"],
            skill_score=30, project_score=20, education_score=10, potential_score=8,
        )
        result = calculate_final_score(llm, LONG_JD)
        # raw_total = 68, no cap triggered — score should equal raw_total
        assert result["match_score"] == 68


# ── Cap Rule 3: matched_core_skills empty → max 40 ────────────────────────────

class TestEmptyMatchedSkillsCap:
    def test_empty_skills_list_caps_at_40(self):
        llm = make_llm_result(
            matched_core_skills=[],
            core_skill_hit_rate=0.5,   # high hit_rate but empty skills list
            skill_score=35, project_score=25, education_score=13, potential_score=12,
        )
        result = calculate_final_score(llm, LONG_JD)
        assert result["match_score"] <= 40

    def test_cap_reason_mentions_no_skills(self):
        llm = make_llm_result(matched_core_skills=[], core_skill_hit_rate=0.5)
        result = calculate_final_score(llm, LONG_JD)
        assert result["score_cap_reason"] is not None
        assert "核心技能" in result["score_cap_reason"]


# ── Cap Rule 4: short JD → max 45 ─────────────────────────────────────────────

class TestShortJdCap:
    def test_short_jd_caps_at_45(self):
        llm = make_llm_result(
            skill_score=35, project_score=25, education_score=13, potential_score=12,
        )
        result = calculate_final_score(llm, SHORT_JD)
        assert result["match_score"] <= 45

    def test_long_jd_no_cap(self):
        llm = make_llm_result(
            skill_score=35, project_score=25, education_score=13, potential_score=12,
        )
        result = calculate_final_score(llm, LONG_JD)
        # raw_total = 85, no cap → score_level should be "高度匹配"
        assert result["match_score"] == 85
        assert result["score_level"] == "高度匹配"


# ── Cap priority: most restrictive wins ───────────────────────────────────────

class TestCapPriority:
    """When multiple caps apply, the lowest (most restrictive) wins."""

    def test_category_false_and_short_jd_both_apply(self):
        """category_match=False (cap=35) and short JD (cap=45): result must be ≤35."""
        llm = make_llm_result(
            category_match=False,
            skill_score=35, project_score=25, education_score=13, potential_score=12,
        )
        result = calculate_final_score(llm, SHORT_JD)
        assert result["match_score"] <= 35


# ── Score level thresholds ─────────────────────────────────────────────────────

class TestScoreLevels:
    @pytest.mark.parametrize("total,expected_level", [
        (85, "高度匹配"),
        (90, "高度匹配"),
        (70, "良好匹配"),
        (84, "良好匹配"),
        (50, "部分匹配"),
        (69, "部分匹配"),
        (30, "勉强匹配"),
        (49, "勉强匹配"),
        (29, "不推荐"),
        (0,  "不推荐"),
    ])
    def test_score_level(self, total, expected_level):
        # Build a result dict that will produce `total` as final score (no caps)
        # skill≤40, project≤30, edu≤15, potential≤15, sum=100 max
        skill = min(total, 40)
        remaining = total - skill
        project = min(remaining, 30)
        remaining -= project
        edu = min(remaining, 15)
        potential = remaining - edu

        llm = make_llm_result(
            skill_score=skill,
            project_score=project,
            education_score=edu,
            potential_score=max(0, potential),
            core_skill_hit_rate=0.9,
            matched_core_skills=["A", "B", "C"],
        )
        result = calculate_final_score(llm, LONG_JD)
        assert result["score_level"] == expected_level, (
            f"total={total}, got score={result['match_score']}, level={result['score_level']}"
        )


# ── score_cap_reason is None when no cap applies ──────────────────────────────

class TestNoCap:
    def test_no_cap_reason_when_all_good(self):
        llm = make_llm_result(
            skill_score=30, project_score=20, education_score=10, potential_score=8,
            core_skill_hit_rate=0.9,
            matched_core_skills=["A"],
        )
        result = calculate_final_score(llm, LONG_JD)
        assert result["score_cap_reason"] is None

    def test_final_cap_is_none_in_breakdown_when_no_cap(self):
        llm = make_llm_result(
            skill_score=10, project_score=10, education_score=5, potential_score=5,
        )
        result = calculate_final_score(llm, LONG_JD)
        assert result["score_breakdown"]["final_cap"] is None


# ── Output contract: required keys always present ─────────────────────────────

class TestOutputContract:
    REQUIRED_KEYS = {
        "match_score", "score_breakdown", "score_level",
        "recommendation", "score_cap_reason", "risk_warnings",
        "summary",
    }

    def test_all_required_keys_present(self):
        result = calculate_final_score(make_llm_result(), LONG_JD)
        for key in self.REQUIRED_KEYS:
            assert key in result, f"Missing key: {key}"

    def test_match_score_always_0_to_100(self):
        # Negative raw_total edge case
        llm = make_llm_result(
            skill_score=-100, project_score=-100,
            education_score=-100, potential_score=-100,
        )
        result = calculate_final_score(llm, LONG_JD)
        assert 0 <= result["match_score"] <= 100
