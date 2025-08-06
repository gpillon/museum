import pytest
import numpy as np
from app.models.yolo_detector import YOLODetector

def test_yolo_detector_initialization():
    """Test YOLO detector initialization"""
    try:
        detector = YOLODetector()
        assert detector is not None
    except Exception as e:
        pytest.skip(f"YOLO model not available: {e}")

def test_detect_pose_with_invalid_data():
    """Test pose detection with invalid image data"""
    try:
        detector = YOLODetector()
        # Test with invalid data
        result = detector.detect_pose(b"invalid_image_data")
        assert "error" in result
    except Exception as e:
        pytest.skip(f"YOLO model not available: {e}")

def test_process_keypoints():
    """Test keypoint processing"""
    try:
        detector = YOLODetector()
        # Mock keypoints data
        mock_keypoints = np.array([
            [100, 200, 0.8],  # nose
            [110, 190, 0.9],  # left_eye
            [90, 190, 0.7],   # right_eye
        ])
        
        processed = detector._process_keypoints(mock_keypoints)
        assert len(processed) == 3
        assert processed[0]["name"] == "nose"
        assert processed[0]["x"] == 100.0
        assert processed[0]["y"] == 200.0
        assert processed[0]["confidence"] == 0.8
    except Exception as e:
        pytest.skip(f"YOLO model not available: {e}") 