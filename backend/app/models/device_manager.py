import torch
import logging
import os
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

class DeviceManager:
    """
    Manages available devices and their capabilities for YOLO model
    """
    
    def __init__(self):
        self.available_devices = self._detect_available_devices()
        self.device_capabilities = self._get_device_capabilities()
        self.available_models = self._detect_available_models()
    
    def refresh_model_info(self):
        """
        Refresh model information by re-scanning the models directory
        """
        logger.info("Refreshing model information...")
        
        # Re-scan for downloaded models
        old_models = self.available_models.copy()
        self.available_models = self._detect_available_models()
        
        # Update device capabilities (in case they changed)
        self.device_capabilities = self._get_device_capabilities()
        
        logger.info(f"Model refresh completed. Available models: {self.available_models}")
        logger.info(f"Models changed: {set(old_models) != set(self.available_models)}")
        
        # Log detailed changes
        new_models = set(self.available_models) - set(old_models)
        removed_models = set(old_models) - set(self.available_models)
        
        if new_models:
            logger.info(f"New models detected: {new_models}")
        if removed_models:
            logger.info(f"Models removed: {removed_models}")
    
    def _detect_available_models(self) -> List[str]:
        """
        Detect available YOLO pose models
        """
        models_dir = "models"
        available_models = []
        
        # Define all possible models
        all_models = [
            "yolo11n-pose.pt",
            "yolo11s-pose.pt", 
            "yolo11m-pose.pt",
            "yolo11l-pose.pt",
            "yolo11x-pose.pt"
        ]
        
        # Check which models actually exist
        for model in all_models:
            model_path = os.path.join(models_dir, model)
            if os.path.exists(model_path):
                available_models.append(model)
                logger.info(f"Found model: {model}")
            else:
                logger.info(f"Model not found: {model} (will be downloaded if selected)")
        
        logger.info(f"Available models: {available_models}")
        return available_models
    
    def _detect_available_devices(self) -> List[str]:
        """
        Detect available devices for YOLO model
        """
        devices = ['cpu']  # CPU is always available
        
        # Check for CUDA
        if torch.cuda.is_available():
            devices.append('cuda')
            logger.info(f"CUDA available with {torch.cuda.device_count()} devices")
        
        # Check for MPS (Apple Silicon)
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            devices.append('mps')
            logger.info("MPS (Apple Silicon) available")
        
        logger.info(f"Available devices: {devices}")
        return devices
    
    def _get_device_capabilities(self) -> Dict[str, Dict]:
        """
        Get capabilities for each available device
        """
        capabilities = {}
        
        # CPU capabilities
        capabilities['cpu'] = {
            'name': 'CPU',
            'description': 'Central Processing Unit',
            'half_precision': False,
            'recommended': False,
            'memory': 'System RAM',
            'performance': 'Low'
        }
        
        # CUDA capabilities
        if 'cuda' in self.available_devices:
            try:
                gpu_name = torch.cuda.get_device_name(0)
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)  # GB
                
                capabilities['cuda'] = {
                    'name': f'CUDA ({gpu_name})',
                    'description': 'NVIDIA GPU with CUDA support',
                    'half_precision': True,
                    'recommended': True,
                    'memory': f'{gpu_memory:.1f} GB',
                    'performance': 'High'
                }
            except Exception as e:
                logger.warning(f"Error getting CUDA capabilities: {e}")
                capabilities['cuda'] = {
                    'name': 'CUDA',
                    'description': 'NVIDIA GPU with CUDA support',
                    'half_precision': True,
                    'recommended': True,
                    'memory': 'Unknown',
                    'performance': 'High'
                }
        
        # MPS capabilities
        if 'mps' in self.available_devices:
            capabilities['mps'] = {
                'name': 'MPS (Apple Silicon)',
                'description': 'Apple Silicon GPU with Metal Performance Shaders',
                'half_precision': True,
                'recommended': True,
                'memory': 'Unified Memory',
                'performance': 'High'
            }
        
        return capabilities
    
    def get_available_devices(self) -> List[str]:
        """
        Get list of available devices
        """
        return self.available_devices.copy()
    
    def get_available_models(self) -> List[str]:
        """
        Get list of all possible models (including those not yet downloaded)
        """
        # Return all possible models, not just the ones that exist
        return [
            "yolo11n-pose.pt",
            "yolo11s-pose.pt", 
            "yolo11m-pose.pt",
            "yolo11l-pose.pt",
            "yolo11x-pose.pt"
        ]
    
    def get_downloaded_models(self) -> List[str]:
        """
        Get list of models that are actually downloaded
        """
        return self.available_models.copy()
    
    def get_device_capabilities(self) -> Dict[str, Dict]:
        """
        Get capabilities for all available devices
        """
        return self.device_capabilities.copy()
    
    def get_model_info(self) -> Dict[str, Dict]:
        """
        Get information about available models
        """
        model_info = {}
        downloaded_models = self.get_downloaded_models()
        
        for model in self.get_available_models():
            model_path = os.path.join("models", model)
            is_downloaded = model in downloaded_models
            
            if is_downloaded:
                try:
                    file_size = os.path.getsize(model_path) / (1024 * 1024)  # MB
                    model_info[model] = {
                        'name': model.replace('.pt', '').upper(),
                        'size_mb': round(file_size, 1),
                        'description': self._get_model_description(model),
                        'performance': self._get_model_performance(model),
                        'downloaded': True
                    }
                except Exception as e:
                    logger.warning(f"Error getting model info for {model}: {e}")
                    model_info[model] = {
                        'name': model.replace('.pt', '').upper(),
                        'size_mb': 0,
                        'description': 'Unknown',
                        'performance': 'Unknown',
                        'downloaded': True
                    }
            else:
                # Model not downloaded - provide estimated info
                model_info[model] = {
                    'name': model.replace('.pt', '').upper(),
                    'size_mb': self._get_estimated_model_size(model),
                    'description': self._get_model_description(model),
                    'performance': self._get_model_performance(model),
                    'downloaded': False
                }
        
        return model_info
    
    def _get_estimated_model_size(self, model: str) -> float:
        """
        Get estimated size for models not yet downloaded
        """
        estimated_sizes = {
            "yolo11n-pose.pt": 6.0,
            "yolo11s-pose.pt": 19.0,
            "yolo11m-pose.pt": 52.0,
            "yolo11l-pose.pt": 87.0,
            "yolo11x-pose.pt": 136.0
        }
        return estimated_sizes.get(model, 0.0)
    
    def _get_model_description(self, model: str) -> str:
        """
        Get description for a specific model
        """
        descriptions = {
            "yolo11n-pose.pt": "Nano model - Fastest, smallest, lowest accuracy",
            "yolo11s-pose.pt": "Small model - Good balance of speed and accuracy",
            "yolo11m-pose.pt": "Medium model - Better accuracy, moderate speed",
            "yolo11l-pose.pt": "Large model - High accuracy, slower inference",
            "yolo11x-pose.pt": "Extra Large model - Highest accuracy, slowest inference"
        }
        return descriptions.get(model, "Unknown model")
    
    def _get_model_performance(self, model: str) -> str:
        """
        Get performance category for a specific model
        """
        performance = {
            "yolo11n-pose.pt": "Fastest",
            "yolo11s-pose.pt": "Fast",
            "yolo11m-pose.pt": "Medium",
            "yolo11l-pose.pt": "Slow",
            "yolo11x-pose.pt": "Slowest"
        }
        return performance.get(model, "Unknown")
    
    def is_device_available(self, device: str) -> bool:
        """
        Check if a specific device is available
        """
        return device in self.available_devices
    
    def is_model_available(self, model: str) -> bool:
        """
        Check if a specific model is available
        """
        return model in self.available_models
    
    def get_recommended_device(self) -> str:
        """
        Get the recommended device for best performance
        """
        for device in self.available_devices:
            if device != 'cpu' and self.device_capabilities.get(device, {}).get('recommended', False):
                return device
        return 'cpu'
    
    def get_recommended_model(self) -> str:
        """
        Get the recommended model for best balance
        """
        # Prefer smaller models for better performance
        preferred_order = [
            "yolo11n-pose.pt",
            "yolo11s-pose.pt",
            "yolo11m-pose.pt",
            "yolo11l-pose.pt",
            "yolo11x-pose.pt"
        ]
        
        for model in preferred_order:
            if model in self.available_models:
                return model
        
        # Fallback to first available model
        return self.available_models[0] if self.available_models else "yolo11s-pose.pt"
    
    def get_device_info(self, device: str) -> Optional[Dict]:
        """
        Get detailed information about a specific device
        """
        if device not in self.available_devices:
            return None
        
        info = self.device_capabilities.get(device, {}).copy()
        info['available'] = True
        
        # Add additional info for CUDA
        if device == 'cuda' and torch.cuda.is_available():
            try:
                info['gpu_count'] = torch.cuda.device_count()
                info['current_device'] = torch.cuda.current_device()
                info['device_name'] = torch.cuda.get_device_name(0)
                info['memory_allocated'] = torch.cuda.memory_allocated(0) / (1024**3)  # GB
                info['memory_reserved'] = torch.cuda.memory_reserved(0) / (1024**3)  # GB
            except Exception as e:
                logger.warning(f"Error getting CUDA device info: {e}")
        
        return info
    
    def validate_device_setting(self, device: str) -> tuple[bool, str]:
        """
        Validate if a device setting is valid
        Returns: (is_valid, error_message)
        """
        if device not in self.available_devices:
            return False, f"Device '{device}' is not available. Available devices: {self.available_devices}"
        
        return True, ""
    
    def validate_model_setting(self, model: str) -> tuple[bool, str]:
        """
        Validate if a model setting is valid
        Returns: (is_valid, error_message)
        """
        all_models = self.get_available_models()
        if model not in all_models:
            return False, f"Model '{model}' is not a valid YOLO model. Valid models: {all_models}"
        
        return True, ""
    
    def get_optimal_settings(self) -> Dict:
        """
        Get optimal settings based on available devices and models
        """
        recommended_device = self.get_recommended_device()
        device_info = self.get_device_info(recommended_device)
        
        settings = {
            'model': 'yolo11n-pose.pt',
            'device': recommended_device,
            'confidence': 0.75,
            'iou_threshold': 0.45,
            'max_det': 5,
            'verbose': False,
            'agnostic_nms': False,
            'half': device_info.get('half_precision', False) if device_info else False,
            'dnn': True
        }
        
        return settings 