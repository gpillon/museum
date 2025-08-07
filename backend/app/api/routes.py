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

@router.get("/settings")
async def get_settings():
    """
    Get current YOLO model settings
    """
    try:
        from app.main import get_detector
        detector = get_detector()
        
        # Refresh model information before returning settings
        detector.device_manager.refresh_model_info()
        
        current_settings = detector.get_current_settings()
        logger.info(f"Retrieved current settings: {current_settings}")
        
        return {
            "success": True,
            "settings": current_settings
        }
        
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings/available")
async def get_available_settings():
    """
    Get available settings and their constraints
    """
    try:
        from app.main import get_detector
        detector = get_detector()
        
        # Refresh model information before returning available settings
        detector.device_manager.refresh_model_info()
        
        available_settings = detector.get_available_settings()
        logger.info("Retrieved available settings")
        
        return {
            "success": True,
            "available_settings": available_settings
        }
        
    except Exception as e:
        logger.error(f"Error getting available settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        # Get updated settings after the change
        current_settings = detector.get_current_settings()
        available_settings = detector.get_available_settings()
        
        return {
            "success": True,
            "message": "Settings updated successfully",
            "settings": current_settings,
            "available_settings": available_settings
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
        
        # Get updated settings after reset
        current_settings = detector.get_current_settings()
        available_settings = detector.get_available_settings()
        
        return {
            "success": True,
            "message": "Settings reset to defaults",
            "settings": current_settings,
            "available_settings": available_settings
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

@router.post("/settings/refresh-models")
async def refresh_model_information():
    """
    Force refresh of model information
    """
    try:
        from app.main import get_detector
        detector = get_detector()
        
        # Force refresh model information
        detector.device_manager.refresh_model_info()
        
        # Get updated information
        available_settings = detector.get_available_settings()
        current_settings = detector.get_current_settings()
        
        logger.info("Model information refreshed")
        
        return {
            "success": True,
            "message": "Model information refreshed successfully",
            "settings": current_settings,
            "available_settings": available_settings
        }
        
    except Exception as e:
        logger.error(f"Error refreshing model information: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 