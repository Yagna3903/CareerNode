"""
Auth dependency — verifies a Supabase JWT token using the service-role client.
FastAPI routes declare `current_user: dict = Depends(get_current_user)` to
require authentication.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import settings

bearer_scheme = HTTPBearer()

def _get_supabase_admin() -> Client:
    """Return a Supabase client authenticated with the service-role key."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Validate the Bearer token against Supabase Auth.
    Returns the decoded user payload on success, raises 401 on failure.
    """
    token = credentials.credentials
    supabase: Client = _get_supabase_admin()

    try:
        response = supabase.auth.get_user(token)
        if response is None or response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"id": response.user.id, "email": response.user.email}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
