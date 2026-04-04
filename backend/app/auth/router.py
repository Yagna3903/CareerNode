"""
Auth router — thin wrapper around Supabase Auth.
Registration and login are delegated entirely to Supabase so we never
touch raw passwords or issue our own JWTs.
"""
from fastapi import APIRouter, HTTPException, status
from supabase import create_client, Client
from app.config import settings
from app.schemas import AuthRequest, AuthResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: AuthRequest):
    """
    Create a new user account via Supabase Auth.
    Returns the access token on success.
    """
    supabase = _get_supabase()
    try:
        result = supabase.auth.sign_up({"email": body.email, "password": body.password})
        if result.session is None:
            # Supabase may require email confirmation — inform the caller.
            raise HTTPException(
                status_code=status.HTTP_202_ACCEPTED,
                detail="Account created. Please verify your email before logging in.",
            )
        return AuthResponse(access_token=result.session.access_token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc


@router.post("/login", response_model=AuthResponse)
async def login(body: AuthRequest):
    """
    Sign in with email + password via Supabase Auth.
    Returns an access token (JWT) for use in subsequent requests.
    """
    supabase = _get_supabase()
    try:
        result = supabase.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
        if result.session is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )
        return AuthResponse(access_token=result.session.access_token)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
        ) from exc
