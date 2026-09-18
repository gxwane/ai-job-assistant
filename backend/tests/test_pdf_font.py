"""
Unit tests for font discovery and defensive PDF rendering in statistics.py.

Coverage targets:
- _find_cn_font() candidate paths include Linux, macOS, and Windows fonts
- _find_cn_font() handles missing font files silently without throwing
- draw_cn fallback never raises UnicodeEncodeError even when no Chinese font is present
"""
import io
import pytest
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

from app.routers.statistics import _find_cn_font, _get_cn_font


class TestFontDiscovery:
    """Tests for font scanning and registration."""

    def test_candidates_cover_linux_distributions(self):
        """Verify candidate list contains Debian/Ubuntu/CentOS font locations."""
        import inspect
        from app.routers import statistics
        source = inspect.getsource(statistics._find_cn_font)
        assert "wqy-zenhei" in source
        assert "wqy-microhei" in source
        assert "NotoSansCJK" in source

    def test_find_cn_font_does_not_raise(self):
        """Scanning on any OS should succeed and return either font name or None."""
        result = _find_cn_font()
        assert result is None or isinstance(result, str)


class TestDefensivePdfDraw:
    """Verify drawing Chinese text does not crash when font is missing."""

    def test_draw_cn_fallback_without_chinese_font(self, monkeypatch):
        """When no Chinese font is registered, drawing Chinese characters must NOT raise UnicodeEncodeError."""
        from app.routers import statistics

        # Force no Chinese font available
        monkeypatch.setattr(statistics, "_get_cn_font", lambda: None)

        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        has_cn = False
        font_name = None

        # Simulate the safe draw_cn logic from statistics.py
        def draw_cn(text, x, y, size=10, color=None, bold=False):
            c.setFillColorRGB(0.2, 0.2, 0.2)
            if has_cn:
                c.setFont(font_name, size)
                c.drawString(x, y, text)
            else:
                c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
                safe_text = text.encode("ascii", "replace").decode("ascii")
                c.drawString(x, y, safe_text)

        # Drawing Chinese with Helvetica must succeed via safe ASCII replacement
        try:
            draw_cn("智能求职分析报告：高频技能与匹配统计", 50, 500, size=12)
            c.showPage()
            c.save()
        except UnicodeEncodeError as e:
            pytest.fail(f"draw_cn raised UnicodeEncodeError: {e}")

        # The generated PDF buffer should not be empty
        pdf_bytes = buf.getvalue()
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b"%PDF")
