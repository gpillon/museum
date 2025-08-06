import React, { useRef, useEffect, useCallback } from 'react';

interface PoseCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  detections: any[];
  isConnected?: boolean;
}

const PoseCanvas: React.FC<PoseCanvasProps> = ({ videoRef, detections, isConnected = true }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionsRef = useRef<any[]>([]);

  const drawDetections = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Use current detections or last known detections if disconnected
    const detectionsToDraw = isConnected ? detections : lastDetectionsRef.current;

    // Draw detections
    detectionsToDraw.forEach((detection, index) => {
      const { bbox, keypoints } = detection;
      
      // Draw bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(bbox.x1, bbox.y1, bbox.x2 - bbox.x1, bbox.y2 - bbox.y1);
      
      // Draw confidence score
      ctx.fillStyle = '#00ff00';
      ctx.font = '12px Arial';
      ctx.fillText(
        `Pose ${index + 1}: ${(bbox.confidence * 100).toFixed(1)}%`,
        bbox.x1,
        bbox.y1 - 5
      );

      // Draw keypoints
      keypoints.forEach((keypoint: any) => {
        if (keypoint.confidence > 0.3) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ff0000';
          ctx.fill();
          
          // Draw keypoint name
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px Arial';
          ctx.fillText(keypoint.name, keypoint.x + 6, keypoint.y - 6);
        }
      });

      // Draw skeleton connections
      drawSkeleton(ctx, keypoints);
    });
  }, [detections, videoRef, isConnected]);

  const drawSkeleton = useCallback((ctx: CanvasRenderingContext2D, keypoints: any[]) => {
    const connections = [
      ['nose', 'left_eye'], ['nose', 'right_eye'],
      ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
      ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
      ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
      ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
    ];

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startPoint = keypoints.find((kp: any) => kp.name === start);
      const endPoint = keypoints.find((kp: any) => kp.name === end);
      
      if (startPoint && endPoint && 
          startPoint.confidence > 0.3 && endPoint.confidence > 0.3) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });
  }, []);

  // Update last detections when we have new ones
  useEffect(() => {
    if (detections.length > 0) {
      lastDetectionsRef.current = [...detections];
    }
  }, [detections]);

  // Use requestAnimationFrame for smooth rendering
  useEffect(() => {
    const animate = () => {
      drawDetections();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Always animate, even when disconnected, to maintain last detections
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawDetections]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{
        width: '100%',
        height: '100%'
      }}
    />
  );
};

export default PoseCanvas; 