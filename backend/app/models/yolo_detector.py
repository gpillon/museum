import cv2
import numpy as np
from ultralytics import YOLO
import base64
import io
from PIL import Image
import logging
from .device_manager import DeviceManager
import os

logger = logging.getLogger(__name__)

class YOLODetector:
    def __init__(self, model_path=None):
        """
        Initialize YOLO pose detector
        Args:
            model_path: Path to the YOLO pose model (optional, will use recommended if not provided)
        """
        self.device_manager = DeviceManager()
        
        # Get optimal settings based on available devices and models
        optimal_settings = self.device_manager.get_optimal_settings()
        self.settings = optimal_settings
        
        # Use provided model path or recommended model
        if model_path:
            self.model_path = model_path
        else:
            self.model_path = f"models/{self.settings['model']}"
        
        self._load_model()
    
    def _load_model(self):
        """
        Load the YOLO model with current settings
        """
        try:
            # Check if model file exists
            if not os.path.exists(self.model_path):
                logger.info(f"Model {self.model_path} not found, will be downloaded automatically")
            
            # Load model with device setting (YOLO will download automatically if needed)
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
    
    def get_current_settings(self) -> dict:
        """
        Get current model settings
        """
        return self.settings.copy()
    
    def get_available_settings(self) -> dict:
        """
        Get available settings and their constraints
        """
        available_devices = self.device_manager.get_available_devices()
        available_models = self.device_manager.get_available_models()
        device_capabilities = self.device_manager.get_device_capabilities()
        model_info = self.device_manager.get_model_info()
        
        return {
            'model': {
                'type': 'string',
                'options': available_models,
                'default': self.device_manager.get_recommended_model(),
                'description': 'YOLO model to use for pose detection',
                'info': model_info
            },
            'confidence': {
                'type': 'float',
                'min': 0.0,
                'max': 1.0,
                'default': 0.75,
                'description': 'Confidence threshold for detections'
            },
            'iou_threshold': {
                'type': 'float',
                'min': 0.0,
                'max': 1.0,
                'default': 0.45,
                'description': 'IoU threshold for non-maximum suppression'
            },
            'max_det': {
                'type': 'int',
                'min': 1,
                'max': 1000,
                'default': 300,
                'description': 'Maximum number of detections'
            },
            'device': {
                'type': 'string',
                'options': available_devices,
                'default': self.device_manager.get_recommended_device(),
                'description': 'Device to run inference on',
                'capabilities': device_capabilities
            },
            'verbose': {
                'type': 'boolean',
                'default': False,
                'description': 'Enable verbose output'
            },
            'agnostic_nms': {
                'type': 'boolean',
                'default': False,
                'description': 'Use agnostic non-maximum suppression'
            },
            'half': {
                'type': 'boolean',
                'default': self.device_manager.get_device_info(self.settings['device']).get('half_precision', False),
                'description': 'Use half precision (FP16)',
                'available': self.device_manager.get_device_info(self.settings['device']).get('half_precision', False)
            },
            'dnn': {
                'type': 'boolean',
                'default': False,
                'description': 'Use OpenCV DNN for ONNX inference'
            }
        }
    
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
        
        if 'model' in new_settings:
            model = new_settings['model']
            is_valid, error_msg = self.device_manager.validate_model_setting(model)
            if is_valid:
                if model != self.settings.get('model', ''):
                    needs_recreation = True
                    # Update model path
                    self.model_path = f"models/{model}"
                validated_settings['model'] = model
            else:
                logger.warning(f"Invalid model value: {model}, using default. {error_msg}")
                validated_settings['model'] = self.device_manager.get_recommended_model()
        
        if 'confidence' in new_settings:
            conf = new_settings['confidence']
            if 0 <= conf <= 1:
                validated_settings['confidence'] = conf
            else:
                logger.warning(f"Invalid confidence value: {conf}, using default")
                validated_settings['confidence'] = 0.75
        
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
            is_valid, error_msg = self.device_manager.validate_device_setting(device)
            if is_valid:
                if device != self.settings.get('device', 'cpu'):
                    needs_recreation = True
                validated_settings['device'] = device
            else:
                logger.warning(f"Invalid device value: {device}, using default. {error_msg}")
                validated_settings['device'] = self.device_manager.get_recommended_device()
        
        if 'verbose' in new_settings:
            validated_settings['verbose'] = bool(new_settings['verbose'])
        
        if 'agnostic_nms' in new_settings:
            validated_settings['agnostic_nms'] = bool(new_settings['agnostic_nms'])
        
        if 'half' in new_settings:
            half = bool(new_settings['half'])
            current_device = validated_settings.get('device', self.settings.get('device', 'cpu'))
            device_info = self.device_manager.get_device_info(current_device)
            
            if device_info and device_info.get('half_precision', False):
                if half != self.settings.get('half', False):
                    needs_recreation = True
                validated_settings['half'] = half
            else:
                logger.warning(f"Half precision not available for device {current_device}, ignoring setting")
        
        if 'dnn' in new_settings:
            validated_settings['dnn'] = bool(new_settings['dnn'])
        
        # Apply validated settings
        self.settings.update(validated_settings)
        logger.info(f"Model settings updated: {validated_settings}")
        
        # Refresh model information after settings update
        self.device_manager.refresh_model_info()
        
        # Recreate model if needed (model, device or half precision changed)
        if needs_recreation:
            logger.info("Recreating model due to model, device or half precision change")
            self._recreate_model()
    
    def reset_settings(self):
        """
        Reset settings to default values
        """
        old_device = self.settings.get('device', 'cpu')
        old_model = self.settings.get('model', '')
        old_half = self.settings.get('half', False)
        
        # Get optimal settings based on current device and model availability
        optimal_settings = self.device_manager.get_optimal_settings()
        self.settings = optimal_settings
        
        # Update model path
        self.model_path = f"models/{self.settings['model']}"
        
        # Refresh model information after reset
        self.device_manager.refresh_model_info()
        
        # Recreate model if device, model or half precision changed
        if (old_device != self.settings['device'] or 
            old_model != self.settings['model'] or 
            old_half != self.settings['half']):
            logger.info("Recreating model after reset due to device, model or half precision change")
            self._recreate_model()
        
        logger.info("Settings reset to optimal values")
    
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