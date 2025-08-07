import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import PoseCanvas from './PoseCanvas';
import PerformanceMonitor from './PerformanceMonitor';
import SettingsModal from './SettingsModal';
import MuseumScene from './MuseumScene';
import { FrameRateOptimizer, LatencyMonitor, ArrayBufferUtils } from '../utils/performanceUtils';

interface PoseDetectorProps {
  onConnectionChange: (connected: boolean) => void;
  onDetectionUpdate: (count: number) => void;
}

const PoseDetector: React.FC<PoseDetectorProps> = ({ 
  onConnectionChange, 
  onDetectionUpdate 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<any[]>([]);
  const [frameRate, setFrameRate] = useState(10);
  const [performanceStats, setPerformanceStats] = useState({
    fps: 0,
    latency: 0,
    droppedFrames: 0,
    queueSize: 0,
    queueDroppedFrames: 0
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const { 
    isConnected, 
    sendMessage, 
    lastMessage,
    messageQueueSize,
    averageLatency,
    connectionStatus
  } = useWebSocket(`${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}${window.location.port ? `:${window.location.port}` : ''}/ws/detect`);

  // Performance monitoring
  const frameCountRef = useRef(0);
  const droppedFramesRef = useRef(0);
  const queueDroppedFramesRef = useRef(0);
  const lastFrameSentRef = useRef(0);
  const frameRateOptimizerRef = useRef(new FrameRateOptimizer(frameRate));
  const latencyMonitorRef = useRef(new LatencyMonitor());

  // Test metadata handling on component mount
  useEffect(() => {
    const testResult = ArrayBufferUtils.testMetadataHandling();
    if (testResult) {
      console.log('✅ ArrayBuffer metadata handling test passed');
    } else {
      console.error('❌ ArrayBuffer metadata handling test failed');
    }
  }, []);

  // Update parent component with connection status
  useEffect(() => {
    onConnectionChange(isConnected);
  }, [isConnected, onConnectionChange]);

  // Handle detection results
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage);
        if (data.success && data.detections) {
          setDetections(data.detections);
          onDetectionUpdate(data.count);
        }
      } catch (e) {
        console.error('Error parsing detection results:', e);
      }
    }
  }, [lastMessage, onDetectionUpdate]);

  // Adaptive frame rate based on performance
  useEffect(() => {
    const updateFrameRate = () => {
      const currentFps = frameRateOptimizerRef.current.getCurrentFps();
      const droppedFrames = frameRateOptimizerRef.current.getDroppedFramesCount();
      
      // Debug log for FPS calculation
      const fpsDebugInfo = frameRateOptimizerRef.current.getFpsDebugInfo();
      console.debug(`FPS Debug: currentFps=${currentFps}, droppedFrames=${droppedFrames}, queueSize=${messageQueueSize}, debugInfo=`, fpsDebugInfo);
      
      // Update FPS even if it's 0 (to show current state)
      setPerformanceStats(prev => ({ 
        ...prev, 
        fps: currentFps,
        droppedFrames: droppedFrames
      }));
      
      // Update latency monitor
      latencyMonitorRef.current.addLatency(averageLatency);
      
      // Only adjust frame rate if there's a significant performance issue
      if (currentFps < 5 || averageLatency > 500) {
        const newFrameRate = frameRateOptimizerRef.current.adjustFrameRate(currentFps, averageLatency);
        setFrameRate(newFrameRate);
      }
    };

    // Update immediately and then every second
    updateFrameRate();
    const interval = setInterval(updateFrameRate, 1000);
    return () => clearInterval(interval);
  }, [averageLatency, frameRate, messageQueueSize]);

  // Update performance stats
  useEffect(() => {
    setPerformanceStats(prev => ({
      ...prev,
      latency: averageLatency,
      queueSize: messageQueueSize
    }));
  }, [averageLatency, messageQueueSize]);

  // Start webcam stream
  const startStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user',
          frameRate: { ideal: 30, max: 30 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
        frameCountRef.current = 0;
        droppedFramesRef.current = 0;
        queueDroppedFramesRef.current = 0;
        lastFrameSentRef.current = 0;
        // Reset dropped frames counter when starting stream
        frameRateOptimizerRef.current.resetDroppedFramesCount();
        // Reset FPS stats
        setPerformanceStats(prev => ({ 
          ...prev, 
          fps: 0,
          droppedFrames: 0,
          queueDroppedFrames: 0
        }));
      }
    } catch (err) {
      setError('Failed to access webcam. Please check permissions.');
      console.error('Webcam error:', err);
    }
  }, []);

  // Stop webcam stream
  const stopStream = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  // Send frame to backend with frame dropping
  const sendFrame = useCallback(() => {
    if (videoRef.current && canvasRef.current && isConnected) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Only drop frames if we're sending too fast (basic rate limiting)
        if (frameRateOptimizerRef.current.shouldDropFrame()) {
          return; // Drop this frame
        }
        
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0);
        
        // Use fixed quality for now to ensure reliable detection
        const quality = 0.8;
        
        // Convert canvas to blob and send
        canvas.toBlob((blob) => {
          if (blob) {
            blob.arrayBuffer().then(buffer => {
              // Generate UUID for this frame
              const uuid = ArrayBufferUtils.generateUuid();
              
              // Check if we can send this frame (queue size check is in useWebSocket)
              const currentQueueSize = messageQueueSize;
              if (currentQueueSize > 2) {
                // Frame will be dropped by useWebSocket, count it
                queueDroppedFramesRef.current++;
                setPerformanceStats(prev => ({ 
                  ...prev, 
                  queueDroppedFrames: queueDroppedFramesRef.current 
                }));
              } else {
                // Frame will be sent, track it for FPS calculation
                frameRateOptimizerRef.current.trackSentFrame(uuid);
              }
              
              sendMessage(buffer);
              frameCountRef.current++;
            }).catch(error => {
              console.error('Error sending frame:', error);
            });
          }
        }, 'image/jpeg', quality);
      }
    }
  }, [isConnected, sendMessage, frameRate, messageQueueSize]);

  // Handle settings save
  const handleSaveSettings = async (settings: any) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save settings: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Settings saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  // Handle settings reset
  const handleResetSettings = async () => {
    try {
      const response = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to reset settings: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('Settings reset successfully:', result);
      return result;
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  };

  // Start frame sending loop with adaptive timing
  useEffect(() => {
    if (isStreaming && isConnected) {
      const interval = setInterval(sendFrame, 1000 / frameRate);
      return () => clearInterval(interval);
    }
  }, [isStreaming, isConnected, sendFrame, frameRate]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-800">
            Real-time Pose Detection
          </h2>
          <div className="flex gap-2">
            {!isStreaming ? (
              <button
                onClick={startStream}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Start Camera
              </button>
            ) : (
              <button
                onClick={stopStream}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Stop Camera
              </button>
            )}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Settings
            </button>

          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <PerformanceMonitor
          fps={performanceStats.fps}
          latency={performanceStats.latency}
          queueSize={performanceStats.queueSize}
          droppedFrames={performanceStats.droppedFrames}
          frameRate={frameRate}
          connectionStatus={connectionStatus}
          queueDroppedFrames={performanceStats.queueDroppedFrames}
        />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Camera View */}
        <div className="relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-lg border-2 border-gray-300"
              style={{ 
                display: isStreaming ? 'block' : 'none',
                aspectRatio: '4/3',
                objectFit: 'cover'
              }}
          />
          
          {!isStreaming && (
              <div className="w-full rounded-lg border-2 border-gray-300 flex items-center justify-center bg-gray-200" style={{ aspectRatio: '4/3' }}>
              <div className="text-center">
                <div className="text-6xl mb-4">📷</div>
                <p className="text-gray-600">Click "Start Camera" to begin pose detection</p>
              </div>
            </div>
          )}

          {/* Hidden canvas for frame capture */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />

          {/* Overlay canvas for pose visualization */}
          {isStreaming && (
            <PoseCanvas
              videoRef={videoRef}
              detections={detections}
                isConnected={isConnected}
            />
          )}
        </div>

          {/* Museum Scene */}
          <div className="relative" style={{ aspectRatio: '4/3' }}>
            <MuseumScene
              detections={detections}
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 space-y-1">
          <p>Status: {connectionStatus} to backend</p>
          <p>Streaming: {isStreaming ? 'Active' : 'Inactive'}</p>
          <p>Detections: {detections.length} poses found</p>
          <p>Frame Rate: {frameRate} FPS (Target)</p>
          <p>Performance: {performanceStats.fps.toFixed(1)} FPS (Actual)</p>
          <p>Latency: {performanceStats.latency.toFixed(0)}ms</p>
          <p>Queue Size: {performanceStats.queueSize} messages</p>
          <p>Dropped Frames: {performanceStats.droppedFrames}</p>
          <p>Queue Dropped Frames: {performanceStats.queueDroppedFrames}</p>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onReset={handleResetSettings}
      />
    </div>
  );
};

export default PoseDetector; 