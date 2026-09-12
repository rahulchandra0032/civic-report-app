import random
import string
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt
from app.config import get_settings
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, OTPRequest, OTPVerify, OTPResponse, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()

# In-memory OTP store (replace with Redis in production)
otp_store: dict[str, dict] = {}


def generate_otp() -> str:
    return ''.join(random.choices(string.digits, k=settings.OTP_LENGTH))


def create_access_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": expire
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


@router.post("/send-otp", response_model=OTPResponse)
async def send_otp(request: OTPRequest, db: AsyncSession = Depends(get_db)):
    otp = generate_otp()
    otp_store[request.phone] = {
        "otp": otp,
        "expires": datetime.utcnow() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    }

    # In production, send OTP via SMS API
    # await sms_service.send(request.phone, f"Your OTP is: {otp}")

    return OTPResponse(message="OTP sent successfully", otp=otp if settings.DEBUG else None)


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(request: OTPVerify, db: AsyncSession = Depends(get_db)):
    stored = otp_store.get(request.phone)
    if not stored:
        raise HTTPException(status_code=400, detail="OTP not found. Request a new one.")

    if datetime.utcnow() > stored["expires"]:
        del otp_store[request.phone]
        raise HTTPException(status_code=400, detail="OTP expired. Request a new one.")

    if stored["otp"] != request.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    del otp_store[request.phone]

    result = await db.execute(select(User).where(User.phone == request.phone))
    user = result.scalar_one_or_none()

    if not user:
        user = User(phone=request.phone, role=UserRole.CITIZEN)
        db.add(user)
        await db.flush()

    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/register", response_model=TokenResponse)
async def register(request: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone == request.phone))
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(phone=request.phone, name=request.name, role=UserRole.CITIZEN)
    db.add(user)
    await db.flush()

    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )
