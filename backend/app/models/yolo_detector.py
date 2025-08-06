import cv2
import numpy as np
from ultralytics import YOLO
import base64
import io
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class YOLODetector:
    def __init__(self, model_path="../yolo11n-pose.pt"):
        """
        Initialize YOLO pose detector
        Args:
            model_path: Path to the YOLO pose model
        """
        self.model_path = model_path
        self.settings = {
            'confidence': 0.75,
            'iou_threshold': 0.45,
            'max_det': 300,
            'device': 'cpu',
            'verbose': False,
            'agnostic_nms': False,
            'half': False,
            'dnn': False
        }
        self._load_model()
    
    def _load_model(self):
        """
        Load the YOLO model with current settings
        """
        try:
            # Load model with device setting
            self.model = YOLO(self.model_path)
            
            # Move model to specified device if needed
            if self.settings['device'] != 'cpu':
                # Note: YOLO handles device placement automatically
                pass
                
            logger.info(f"YOLO model loaded successfully from {self.model_path} with device: {self.settings['device']}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise
    
    def _recreate_model(self):
        """
        Recreate the YOLO model instance with current settings
        """
        try:
            # Clear any existing model references
            if hasattr(self, 'model'):
                del self.model
            
            # Reload the model
            self._load_model()
            logger.info("YOLO model recreated with new settings")
        except Exception as e:
            logger.error(f"Failed to recreate YOLO model: {e}")
            raise
    
    def update_settings(self, new_settings: dict):
        """
        Update model settings
        Args:
            new_settings: Dictionary containing new settings
        """
        # Track if we need to recreate the model
        needs_recreation = False
        
        # Validate settings before applying
        validated_settings = {}
        
        if 'confidence' in new_settings:
            conf = new_settings['confidence']
            if 0 <= conf <= 1:
                validated_settings['confidence'] = conf
            else:
                logger.warning(f"Invalid confidence value: {conf}, using default")
                validated_settings['confidence'] = 0.25
        
        if 'iou_threshold' in new_settings:
            iou = new_settings['iou_threshold']
            if 0 <= iou <= 1:
                validated_settings['iou_threshold'] = iou
            else:
                logger.warning(f"Invalid IoU threshold value: {iou}, using default")
                validated_settings['iou_threshold'] = 0.45
        
        if 'max_det' in new_settings:
            max_det = new_settings['max_det']
            if 1 <= max_det <= 1000:
                validated_settings['max_det'] = max_det
            else:
                logger.warning(f"Invalid max_det value: {max_det}, using default")
                validated_settings['max_det'] = 300
        
        if 'device' in new_settings:
            device = new_settings['device']
            if device in ['cpu', 'cuda', 'mps']:
                if device != self.settings.get('device', 'cpu'):
                    needs_recreation = True
                validated_settings['device'] = device
            else:
                logger.warning(f"Invalid device value: {device}, using default")
                validated_settings['device'] = 'cpu'
        
        if 'verbose' in new_settings:
            validated_settings['verbose'] = bool(new_settings['verbose'])
        
        if 'agnostic_nms' in new_settings:
            validated_settings['agnostic_nms'] = bool(new_settings['agnostic_nms'])
        
        if 'half' in new_settings:
            half = bool(new_settings['half'])
            if half != self.settings.get('half', False):
                needs_recreation = True
            validated_settings['half'] = half
        
        if 'dnn' in new_settings:
            validated_settings['dnn'] = bool(new_settings['dnn'])
        
        # Apply validated settings
        self.settings.update(validated_settings)
        logger.info(f"Model settings updated: {validated_settings}")
        
        # Recreate model if needed (device or half precision changed)
        if needs_recreation:
            logger.info("Recreating model due to device or half precision change")
            self._recreate_model()
    
    def reset_settings(self):
        """
        Reset settings to default values
        """
        old_device = self.settings.get('device', 'cpu')
        old_half = self.settings.get('half', False)
        
        self.settings = {
            'confidence': 0.25,
            'iou_threshold': 0.45,
            'max_det': 300,
            'device': 'cpu',
            'verbose': False,
            'agnostic_nms': False,
            'half': False,
            'dnn': False
        }
        
        # Recreate model if device or half precision changed
        if old_device != 'cpu' or old_half != False:
            logger.info("Recreating model after reset due to device or half precision change")
            self._recreate_model()
        
        logger.info("Settings reset to default values")
    
    def detect_pose(self, image_data):
        """
        Detect poses in the given image data
        Args:
            image_data: Raw image bytes from WebSocket
        Returns:
            dict: Detection results with poses and bounding boxes
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Invalid image data"}
            
            # Use only essential parameters to avoid conflicts
            valid_params = {
                'conf': self.settings['confidence'],
                'iou': self.settings['iou_threshold'],
                'max_det': self.settings['max_det'],
                'device': self.settings['device'],
                'verbose': self.settings['verbose'],
                'agnostic_nms': self.settings['agnostic_nms'],
                'half': self.settings['half'],
                'dnn': self.settings['dnn']
            }
            
            # Run YOLO detection with minimal parameters
            results = self.model(image, **valid_params)
            
            # Process results
            detections = []
            for i, result in enumerate(results):
                if result.keypoints is not None and result.boxes is not None:
                    keypoints = result.keypoints.data.cpu().numpy()
                    boxes = result.boxes.data.cpu().numpy()
                    
                    for j, (box, kpts) in enumerate(zip(boxes, keypoints)):
                        detection = {
                            "id": j,
                            "bbox": {
                                "x1": float(box[0]),
                                "y1": float(box[1]),
                                "x2": float(box[2]),
                                "y2": float(box[3]),
                                "confidence": float(box[4])
                            },
                            "keypoints": self._process_keypoints(kpts),
                            "pose_confidence": float(box[5]) if len(box) > 5 else float(box[4])
                        }
                        detections.append(detection)
            
            return {
                "success": True,
                "detections": detections,
                "count": len(detections)
            }
            
        except Exception as e:
            logger.error(f"Error in pose detection: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"error": str(e)}
    
    def _process_keypoints(self, keypoints):
        """
        Process keypoints into a structured format
        Args:
            keypoints: Raw keypoints from YOLO
        Returns:
            list: Processed keypoints with confidence scores
        """
        # YOLO pose keypoints mapping (17 keypoints for COCO format)
        keypoint_names = [
            "nose", "left_eye", "right_eye", "left_ear", "right_ear",
            "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
            "left_wrist", "right_wrist", "left_hip", "right_hip",
            "left_knee", "right_knee", "left_ankle", "right_ankle"
        ]
        
        processed_kpts = []
        for i, (x, y, conf) in enumerate(keypoints):
            if i < len(keypoint_names):
                processed_kpts.append({
                    "name": keypoint_names[i],
                    "x": float(x),
                    "y": float(y),
                    "confidence": float(conf)
                })
        
        return processed_kpts
    
    def detect_from_file(self, image_path):
        """
        Detect poses from image file (for testing)
        Args:
            image_path: Path to image file
        Returns:
            dict: Detection results
        """
        try:
            results = self.model(image_path, verbose=False)
            return self._process_results(results)
        except Exception as e:
            logger.error(f"Error detecting from file: {e}")
            return {"error": str(e)}
    
    def _process_results(self, results):
        """Helper method to process YOLO results"""
        detections = []
        for result in results:
            if result.keypoints is not None:
                keypoints = result.keypoints.data.cpu().numpy()
                boxes = result.boxes.data.cpu().numpy()
                
                for i, (box, kpts) in enumerate(zip(boxes, keypoints)):
                    detection = {
                        "id": i,
                        "bbox": {
                            "x1": float(box[0]),
                            "y1": float(box[1]),
                            "x2": float(box[2]),
                            "y2": float(box[3]),
                            "confidence": float(box[4])
                        },
                        "keypoints": self._process_keypoints(kpts),
                        "pose_confidence": float(box[5]) if len(box) > 5 else float(box[4])
                    }
                    detections.append(detection)
        
        return {
            "success": True,
            "detections": detections,
            "count": len(detections)
        } 

    def test_detection(self, image_data):
        """
        Test detection with minimal parameters
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"error": "Invalid image data"}
            
            logger.info(f"Testing detection with image size: {image.shape}")
            
            # Try with no parameters first
            results = self.model(image)
            logger.info(f"Basic detection returned {len(results)} results")
            
            # Process results
            detections = []
            for i, result in enumerate(results):
                if result.keypoints is not None and result.boxes is not None:
                    keypoints = result.keypoints.data.cpu().numpy()
                    boxes = result.boxes.data.cpu().numpy()
                    
                    logger.info(f"Test found {len(boxes)} detections")
                    
                    for j, (box, kpts) in enumerate(zip(boxes, keypoints)):
                        detection = {
                            "id": j,
                            "bbox": {
                                "x1": float(box[0]),
                                "y1": float(box[1]),
                                "x2": float(box[2]),
                                "y2": float(box[3]),
                                "confidence": float(box[4])
                            },
                            "keypoints": self._process_keypoints(kpts),
                            "pose_confidence": float(box[5]) if len(box) > 5 else float(box[4])
                        }
                        detections.append(detection)
            
            return {
                "success": True,
                "detections": detections,
                "count": len(detections),
                "test": True
            }
            
        except Exception as e:
            logger.error(f"Error in test detection: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return {"error": str(e)} 