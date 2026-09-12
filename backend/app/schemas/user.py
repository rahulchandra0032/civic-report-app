from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole


class UserCreate(BaseModel):
    phone: str = Field(..., max_length=15)
    name: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    phone: str
    name: Optional[str]
    role: UserRole
    ward_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class OTPRequest(BaseModel):
    phone: str = Field(..., max_length=15)


class OTPVerify(BaseModel):
    phone: str = Field(..., max_length=15)
    otp: str = Field(..., max_length=6)


class OTPResponse(BaseModel):
    message: str
    otp: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
