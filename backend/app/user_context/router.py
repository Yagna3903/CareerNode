"""
User Context router — manages a user's master resume and education background.
Requires authentication.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
import fitz
import docx
import io
from supabase import create_client

from app.config import settings
from app.schemas import UserContextCreate, UserContextResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/user-context", tags=["user-context"])


def _sb():
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


@router.get("", response_model=UserContextResponse)
async def get_user_context(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's stored resume and education."""
    user_id = current_user["id"]
    resp = _sb().table("user_context").select("*").eq("user_id", user_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No profile found.")
    return resp.data


@router.put("", response_model=UserContextResponse, status_code=status.HTTP_200_OK)
async def upsert_user_context(
    body: UserContextCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create or update the user's master resume and education background."""
    user_id = current_user["id"]
    payload = {"user_id": user_id}
    
    if body.master_resume_text is not None:
        payload["master_resume_text"] = body.master_resume_text
    if body.education_background is not None:
        payload["education_background"] = body.education_background
    if body.first_name is not None:
        payload["first_name"] = body.first_name
    if body.last_name is not None:
        payload["last_name"] = body.last_name
    if body.phone_number is not None:
        payload["phone_number"] = body.phone_number
    if body.job_level_preference is not None:
        payload["job_level_preference"] = body.job_level_preference

    resp = (
        _sb()
        .table("user_context")
        .upsert(payload, on_conflict="user_id")
        .execute()
    )
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save user context.")
    return resp.data[0]


@router.post("/upload", response_model=UserContextResponse)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Extract text from PDF/DOCX and upsert into user's master resume."""
    user_id = current_user["id"]
    content = await file.read()
    text = ""

    filename = file.filename or ""

    if filename.lower().endswith(".pdf"):
        doc = fitz.open(stream=content, filetype="pdf")
        for page in doc:
            text += page.get_text()
    elif filename.lower().endswith(".docx"):
        doc = docx.Document(io.BytesIO(content))
        text = "\n".join([para.text for para in doc.paragraphs])
    else:
        raise HTTPException(status_code=400, detail="Only PDF or DOCX files are supported.")

    payload = {
        "user_id": user_id,
        "master_resume_text": text.strip()
    }
    resp = _sb().table("user_context").upsert(payload, on_conflict="user_id").execute()
    
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to save resume context.")
    return resp.data[0]

