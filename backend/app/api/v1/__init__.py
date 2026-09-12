from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.issues import router as issues_router
from app.api.v1.wards import router as wards_router
from app.api.v1.geo import router as geo_router
from app.api.v1.admin import router as admin_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(issues_router)
api_router.include_router(wards_router)
api_router.include_router(geo_router)
api_router.include_router(admin_router)
