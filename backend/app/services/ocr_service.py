"""
OCR 服务
用于识别截图中的公司名和薪资文本
EasyOCR主引擎 + PaddleOCR兜底
含红色文字增强、多策略预处理
"""
import base64
import io
import logging
import re

# PIL and numpy are part of the optional [ocr] extra.
# Import them lazily so the module can still be loaded when OCR is not installed.
try:
    from PIL import Image, ImageEnhance, ImageFilter  # noqa: F401
    import numpy as np
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False

logger = logging.getLogger(__name__)

# Set to True only when EasyOCR (and its dependencies) are importable.
OCR_AVAILABLE: bool = False

_ocr_reader = None
_paddle_ocr = None


def _get_reader():
    global _ocr_reader, OCR_AVAILABLE
    if _ocr_reader is None:
        try:
            import easyocr
        except ImportError as exc:
            raise ImportError(
                "EasyOCR is not installed. "
                "Install the OCR extra with: uv pip install \".[ocr]\""
            ) from exc
        logger.info("正在初始化 EasyOCR...")
        _ocr_reader = easyocr.Reader(['ch_sim', 'en'], gpu=False, verbose=False)
        OCR_AVAILABLE = True
        logger.info("EasyOCR 初始化完成")
    return _ocr_reader


def _get_paddle():
    """延迟加载PaddleOCR兜底"""
    global _paddle_ocr
    if _paddle_ocr is None:
        try:
            from paddleocr import PaddleOCR
            logger.info("正在初始化 PaddleOCR...")
            _paddle_ocr = PaddleOCR(lang='ch', show_log=False)
            logger.info("PaddleOCR 初始化完成")
        except ImportError:
            logger.warning("PaddleOCR未安装，将仅使用EasyOCR")
            _paddle_ocr = False
    return _paddle_ocr if _paddle_ocr else None


def decode_base64_image(image_base64: str) -> bytes:
    b64_data = image_base64
    if b64_data.startswith('data:'):
        b64_data = b64_data.split(',', 1)[1]
    return base64.b64decode(b64_data)


def enhance_for_red_text(image_bytes: bytes) -> bytes:
    """
    红色薪资文字专用增强：
    提取红色通道，把红字变黑、背景变白
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        arr = np.array(img.convert('RGB'), dtype=np.float32)

        # 红色增强：R通道明显高于G和B的区域可能是红色文字
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        # 红色得分 = R - max(G, B)，正值表示偏红
        red_score = r - np.maximum(g, b)

        # 阈值：红色分量显著高于其他
        is_red = red_score > 40

        # 创建输出：红区→黑(0)，其他→白(255)
        result = np.where(is_red, 0, 255).astype(np.uint8)

        # 如果红色区域占比太小（<1%），不适用此方法，返回None
        red_ratio = np.sum(is_red) / is_red.size
        if red_ratio < 0.005:
            logger.info(f"红色像素占比仅{red_ratio:.3f}，跳过红色增强")
            return None

        logger.info(f"红色像素占比{red_ratio:.3f}，应用红色增强")
        out = Image.fromarray(result)
        buf = io.BytesIO()
        out.save(buf, format='PNG')
        return buf.getvalue()
    except Exception as e:
        logger.warning(f"红色增强失败: {e}")
        return None


def preprocess_for_ocr(image_bytes: bytes, strategy: str = 'standard') -> bytes:
    """通用OCR预处理"""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        w, h = img.size

        if strategy == 'highres':
            scale = 6
        elif strategy == 'redtext':
            scale = 5
        else:
            scale = 4

        img = img.resize((w * scale, h * scale), Image.LANCZOS)

        if strategy == 'redtext':
            # 红色增强 → 再转灰度
            red_enhanced = enhance_for_red_text(image_bytes)
            if red_enhanced:
                img = Image.open(io.BytesIO(red_enhanced))
                img = img.resize((w * scale, h * scale), Image.LANCZOS)
            else:
                img = img.convert('L')
        else:
            img = img.convert('L')

        # 对比度增强
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)

        # 二值化
        arr = np.array(img)
        threshold = np.mean(arr) * 0.8
        arr = np.where(arr > threshold, 255, 0).astype(np.uint8)
        img = Image.fromarray(arr)

        buf = io.BytesIO()
        img.save(buf, format='PNG')
        logger.info(f"预处理({strategy}): {w}x{h} → {img.width}x{img.height}")
        return buf.getvalue()
    except Exception as e:
        logger.warning(f"预处理失败: {e}")
        return image_bytes


def extract_text_easyocr(image_bytes: bytes) -> tuple:
    """EasyOCR识别，返回(文本, 检测详情)"""
    reader = _get_reader()
    results = reader.readtext(image_bytes)
    detections = [{"text": r[1], "confidence": round(r[2], 3)} for r in results]
    text = ' '.join([r[1] for r in results]).strip()
    return text, detections


def extract_text_paddleocr(image_bytes: bytes) -> tuple:
    """PaddleOCR识别，返回(文本, 检测详情)"""
    try:
        paddle = _get_paddle()
        if not paddle:
            return '', []
        results = paddle.ocr(image_bytes, cls=False)
        if not results or not results[0]:
            return '', []
        detections = []
        texts = []
        for line in results[0]:
            texts.append(line[1][0])
            detections.append({"text": line[1][0], "confidence": round(line[1][1], 3)})
        return ' '.join(texts).strip(), detections
    except Exception as e:
        logger.warning(f"PaddleOCR失败: {e}")
        return '', []


def extract_text_from_image(image_base64: str, field_type: str = '') -> dict:
    """
    多策略OCR识别，返回详细信息
    """
    result = {
        "rawText": "",
        "detections": [],
        "originalImageBase64": "",
        "processedImageBase64": "",
        "strategy": "",
    }

    try:
        image_bytes = decode_base64_image(image_base64)
        result["originalImageBase64"] = image_base64[:200] + "..." if len(image_base64) > 200 else image_base64

        strategies = []

        if field_type == 'salary':
            # 薪资优先用红色增强
            strategies = [
                ('redtext', "红色增强+二值化(x5)"),
                ('highres', "高清放大+二值化(x6)"),
                ('standard', "标准放大+二值化(x4)"),
                ('raw', "原始图片"),
            ]
        else:
            strategies = [
                ('standard', "标准放大+二值化(x4)"),
                ('raw', "原始图片"),
            ]

        for strategy_id, strategy_name in strategies:
            logger.info(f"OCR尝试策略: {strategy_name}")

            if strategy_id == 'raw':
                ocr_bytes = image_bytes
            else:
                ocr_bytes = preprocess_for_ocr(image_bytes, strategy_id)

            if strategy_id != 'raw':
                processed_buf = io.BytesIO(ocr_bytes)
                processed_img = Image.open(processed_buf)
                buf = io.BytesIO()
                processed_img.save(buf, format='PNG')
                result["processedImageBase64"] = base64.b64encode(buf.getvalue()).decode('utf-8')
                result["processedImageBase64"] = "data:image/png;base64," + result["processedImageBase64"]

            # EasyOCR
            text, detections = extract_text_easyocr(ocr_bytes)
            if text:
                result["rawText"] = text
                result["detections"] = detections
                result["strategy"] = f"EasyOCR:{strategy_name}"
                logger.info(f"EasyOCR成功({strategy_name}): '{text}'")
                return result

            # EasyOCR失败，尝试PaddleOCR（仅在放大策略下）
            if strategy_id in ('redtext', 'highres'):
                text2, det2 = extract_text_paddleocr(ocr_bytes)
                if text2:
                    result["rawText"] = text2
                    result["detections"] = det2
                    result["strategy"] = f"PaddleOCR:{strategy_name}"
                    logger.info(f"PaddleOCR成功({strategy_name}): '{text2}'")
                    return result

        logger.info("所有OCR策略均失败")
        return result

    except Exception as e:
        logger.error(f"OCR异常: {e}")
        import traceback
        traceback.print_exc()
        return result


def extract_field(image_base64: str, field_type: str) -> dict:
    """提取字段并返回详细结果"""
    ocr_result = extract_text_from_image(image_base64, field_type)
    raw_text = ocr_result.get("rawText", "")

    if field_type == 'salary':
        cleaned_text = clean_salary_text(raw_text)
    elif field_type == 'company':
        cleaned_text = clean_company_text(raw_text)
    else:
        cleaned_text = raw_text.strip()

    valid = bool(cleaned_text and cleaned_text != '-')
    reason = ''

    if not raw_text:
        reason = f'OCR未识别到任何文字（尝试了{ocr_result.get("strategy", "所有")}策略）'
    elif not cleaned_text:
        reason = f'OCR识别到 "{raw_text}" 但清洗后为空'
    elif not valid:
        reason = f'清洗结果 "{cleaned_text}" 未通过校验'

    return {
        "text": cleaned_text if valid else '-',
        "fieldType": field_type,
        "rawText": raw_text,
        "cleanedText": cleaned_text,
        "valid": valid,
        "reason": reason,
        "strategy": ocr_result.get("strategy", ""),
        "detections": ocr_result.get("detections", []),
        "processedImageBase64": ocr_result.get("processedImageBase64", ""),
    }


def clean_salary_text(text: str) -> str:
    if not text or not text.strip():
        return ''
    text = re.sub(r'[\s\u200b\u200c\u200d\ufeff]+', '', text)
    text = text.replace('—', '-').replace('–', '-').replace('~', '-').replace('一', '-').replace('_', '-')
    # O→0修正
    text = re.sub(r'(?<=\d)O(?=\d)', '0', text, flags=re.IGNORECASE)
    text = re.sub(r'O(?=[-\d])', '0', text, flags=re.IGNORECASE)
    text = re.sub(r'(?<=[-\d])O', '0', text, flags=re.IGNORECASE)

    patterns = [
        r'(\d{3,4}\s*[-~—–_]\s*\d{3,4}\s*元\s*/\s*[天日])',
        r'(\d{3,4}\s*[-~—–_]\s*\d{3,4}\s*/\s*[天日])',
        r'(\d+\s*[Kk]\s*[-~—–_]\s*\d+\s*[Kk])',
        r'(\d{1,2}\s*[-~—–_]\s*\d{1,2}\s*[Kk])',
        r'(\d{4,5}\s*[-~—–_]\s*\d{4,5})',
        r'(面议)',
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            r = m.group(1).replace(' ', '')
            r = re.sub(r'[-~—–_]', '-', r)
            r = r.replace('K', 'K').replace('k', 'K')
            return r

    cleaned = text.strip()
    if ('元' in cleaned or 'K' in cleaned.lower() or '薪' in cleaned) and len(cleaned) <= 20:
        return cleaned
    if re.search(r'\d', cleaned) and '-' in cleaned and len(cleaned) <= 20:
        return cleaned
    return ''


def clean_company_text(text: str) -> str:
    if not text or not text.strip():
        return ''
    text = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    text = text.replace('（', '(').replace('）', ')')

    invalid_set = {
        '公司', '职位', '首页', '推荐', '地图搜索',
        '求职类型', '薪资待遇', '公司规模', '融资阶段',
        '不限', '全职', '兼职', '实习',
        '经验要求', '学历要求', '行业筛选',
        'boss', 'BOSS', 'kanzhun', '直聘', '招聘', '求职',
        '首页职位', '所在城市',
    }
    t = text.strip()
    if t.lower() in {x.lower() for x in invalid_set} or t in invalid_set:
        return ''
    if len(t) < 2:
        return ''
    if len(t) > 60:
        t = t[:60]
    return t
