from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import asyncio
import json
import time
from collections import deque
from app.api.routes import router as api_router
from app.websocket.manager import ConnectionManager
from app.models.yolo_detector import YOLODetector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="YOLO Pose Detection API",
    description="Real-time pose detection using YOLO11n-pose model",
    version="1.0.0"
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket connection manager
manager = ConnectionManager()

# Global detector instance to avoid recreating it for each frame
detector = None

# Performance tracking
performance_stats = {
    'frames_processed': 0,
    'total_detections': 0,
    'processing_times': deque(maxlen=100),
    'last_log_time': time.time()
}

def get_detector():
    global detector
    if detector is None:
        detector = YOLODetector()
    return detector

def log_performance_stats():
    """Log aggregate performance statistics"""
    current_time = time.time()
    if current_time - performance_stats['last_log_time'] >= 60:  # Every minute
        if performance_stats['frames_processed'] > 0:
            avg_processing_time = sum(performance_stats['processing_times']) / len(performance_stats['processing_times']) if performance_stats['processing_times'] else 0
            avg_detections_per_frame = performance_stats['total_detections'] / performance_stats['frames_processed']
            
            logger.info(f"Performance Stats (1min): "
                       f"Frames: {performance_stats['frames_processed']}, "
                       f"Detections: {performance_stats['total_detections']}, "
                       f"Avg Detections/Frame: {avg_detections_per_frame:.2f}, "
                       f"Avg Processing Time: {avg_processing_time:.2f}ms")
            
            # Reset counters
            performance_stats['frames_processed'] = 0
            performance_stats['total_detections'] = 0
            performance_stats['processing_times'].clear()
            performance_stats['last_log_time'] = current_time

# Include API routes
app.include_router(api_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "YOLO Pose Detection API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "yolo-pose-api"}

@app.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    detector_instance = get_detector()
    
    try:
        while True:
            # Receive data from client with timeout
            try:
                data = await asyncio.wait_for(websocket.receive(), timeout=30.0)
            except asyncio.TimeoutError:
                # Send keep-alive ping
                await websocket.send_json({"type": "ping", "timestamp": int(asyncio.get_event_loop().time() * 1000)})
                continue
            
            # Handle different message types
            if "bytes" in data:
                # Process image data
                image_data = data["bytes"]
                start_time = time.time()
            
                try:
                    # Process with YOLO model
                    results = detector_instance.detect_pose(image_data)
                    
                    # Track performance
                    processing_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                    performance_stats['frames_processed'] += 1
                    performance_stats['total_detections'] += results.get('count', 0)
                    performance_stats['processing_times'].append(processing_time)
                    
                    # Log performance stats every minute
                    log_performance_stats()
                    
                    # Add timestamp for latency calculation (use milliseconds)
                    results["timestamp"] = int(asyncio.get_event_loop().time() * 1000)
            
                    # Send results back to client
                    await websocket.send_json(results)
                    
                except Exception as e:
                    logger.error(f"Error processing frame: {e}")
                    await websocket.send_json({
                        "success": False,
                        "error": str(e),
                        "timestamp": int(asyncio.get_event_loop().time() * 1000)
                    })
                    
            elif "text" in data:
                # Handle text messages (like heartbeats)
                try:
                    message = json.loads(data["text"])
                    if message.get("type") == "heartbeat":
                        await websocket.send_json({
                            "type": "heartbeat_response",
                            "timestamp": int(asyncio.get_event_loop().time() * 1000)
                        })
                except json.JSONDecodeError:
                    pass
                    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)
    finally:
        # Ensure connection is properly closed
        try:
            await websocket.close()
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 