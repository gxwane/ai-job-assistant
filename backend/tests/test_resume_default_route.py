"""
Unit tests for default resume route with in-memory database isolation.
"""


def test_default_resume_route_returns_success(test_client):
    response = test_client.get("/api/resume/default")

    assert response.status_code == 200, response.text
    body = response.json()
    assert "has_resume" in body
    assert "resume_id" in body
    assert "filename" in body
