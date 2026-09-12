import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from inference.classifier import IssueClassifier
from inference.duplicate_detector import DuplicateDetector
from inference.severity import calculate_severity

app = FastAPI(title="AI Service - Civic Issue Classification", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = os.getenv("MODEL_PATH", "models/classifier.pth")
classifier = IssueClassifier(model_path=MODEL_PATH)
duplicate_detector = DuplicateDetector()


class DuplicateCheckRequest(BaseModel):
    latitude: float
    longitude: float
    radius_meters: float = 50
    hours_window: int = 72


class SeverityRequest(BaseModel):
    category: str
    upvotes: int = 1
    nearby_count: int = 0
    hours_since_report: float = 0
    ai_confidence: float = 0.0


@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": classifier.model is not None}


@app.post("/classify")
async def classify_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    result = classifier.classify(contents)
    return result


@app.post("/classify-bytes")
async def classify_image_bytes(file: bytes = File(...)):
    if len(file) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")

    result = classifier.classify(file)
    return result


@app.post("/check-duplicate")
async def check_duplicate(
    file: UploadFile = File(...),
    latitude: float = 0.0,
    longitude: float = 0.0,
    radius_meters: float = 50,
    hours_window: int = 72
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()

    new_hash = duplicate_detector.compute_hash(contents)

    return {
        "is_duplicate": False,
        "hash": str(new_hash),
        "message": "Duplicate check requires database connection. Use /check-duplicate-api for full check."
    }


@app.post("/severity")
async def calculate_issue_severity(request: SeverityRequest):
    result = calculate_severity(
        category=request.category,
        upvotes=request.upvotes,
        nearby_count=request.nearby_count,
        hours_since_report=request.hours_since_report,
        ai_confidence=request.ai_confidence
    )
    return result


@app.post("/process")
async def process_issue(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    classification = classifier.classify(contents)

    severity = calculate_severity(
        category=classification["category"],
        upvotes=1,
        ai_confidence=classification["confidence"]
    )

    return {
        "classification": classification,
        "severity": severity
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
