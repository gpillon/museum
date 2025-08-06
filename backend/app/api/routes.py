from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging
from app.models.yolo_detector import YOLODetector
import io

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize YOLO detector
detector = YOLODetector()

@router.post("/detect")
async def detect_pose(file: UploadFile = File(...)):
    """
    Detect poses in uploaded image
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Detect poses
        results = detector.detect_pose(image_data)
        
        if "error" in results:
            raise HTTPException(status_code=500, detail=results["error"])
        
        return JSONResponse(content=results)
        
    except Exception as e:
        logger.error(f"Error in pose detection API: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_status():
    """
    Get API status and model info
    """
    return {
        "status": "running",
        "model": "yolo11n-pose",
        "endpoints": {
            "detect": "POST /api/detect",
            "websocket": "WS /ws/detect",
            "health": "GET /health",
            "settings": "POST /api/settings"
        }
    }

@router.post("/settings")
async def update_settings(settings: dict):
    """
    Update YOLO model settings
    """
    try:
        # Update the global detector with new settings
        from app.main import get_detector
        detector = get_detector()
        
        # Apply settings to the detector
        detector.update_settings(settings)
        logger.info(f"Model settings updated: {settings}")
        
        return {
            "success": True,
            "message": "Settings updated successfully",
            "settings": settings
        }
        
    except Exception as e:
        logger.error(f"Error updating settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/settings/reset")
async def reset_settings():
    """
    Reset YOLO model settings to defaults
    """
    try:
        # Reset the global detector settings
        from app.main import get_detector
        detector = get_detector()
        
        # Reset settings to defaults
        detector.reset_settings()
        logger.info("Model settings reset to defaults")
        
        return {
            "success": True,
            "message": "Settings reset to defaults",
            "settings": detector.settings
        }
        
    except Exception as e:
        logger.error(f"Error resetting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_detection(file: UploadFile = File(...)):
    """
    Test detection with minimal parameters
    """
    try:
        # Read image data
        image_data = await file.read()
        
        # Get detector and test
        from app.main import get_detector
        detector = get_detector()
        results = detector.test_detection(image_data)
        
        return JSONResponse(content=results)
        
    except Exception as e:
        logger.error(f"Error in test detection: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 