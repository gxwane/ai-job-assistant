"""
OCR 字段提取 API
用于识别截图中的公司名和薪资
"""
from fastapi import APIRouter

from ..schemas import OCRExtractRequest, OCRExtractResponse
from ..services.ocr_service import extract_field

router = APIRouter(prefix="/api/ocr", tags=["OCR识别"])


@router.post("/extract-field", response_model=OCRExtractResponse)
def extract_field_ocr(request: OCRExtractRequest):
    """
    从裁剪图片中识别公司名或薪资

    - fieldType=salary: 识别薪资（如 200-300元/天、8-15K）
    - fieldType=company: 识别公司名（过滤"公司/职位/首页"等无效结果）
    """
    result = extract_field(request.imageBase64, request.fieldType)
    return OCRExtractResponse(**result)
