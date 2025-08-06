import React from 'react';

interface PerformanceMonitorProps {
  fps: number;
  latency: number;
  queueSize: number;
  droppedFrames: number;
  frameRate: number;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  fps,
  latency,
  queueSize,
  droppedFrames,
  frameRate,
  connectionStatus
}) => {
  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-600';
    if (latency < 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFpsColor = (fps: number, targetFps: number) => {
    const ratio = fps / targetFps;
    if (ratio > 0.8) return 'text-green-600';
    if (ratio > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQueueColor = (queueSize: number) => {
    if (queueSize === 0) return 'text-green-600';
    if (queueSize < 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">Performance Monitor</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{fps.toFixed(1)}</div>
          <div className="text-xs text-gray-600">FPS (Actual)</div>
          <div className={`text-xs ${getFpsColor(fps, frameRate)}`}>
            Target: {frameRate} FPS
          </div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${getLatencyColor(latency)}`}>
            {latency.toFixed(0)}ms
          </div>
          <div className="text-xs text-gray-600">Latency</div>
          <div className="text-xs text-gray-500">
            {latency < 50 ? 'Excellent' : latency < 100 ? 'Good' : 'Poor'}
          </div>
        </div>
        
        <div className="text-center">
          <div className={`text-2xl font-bold ${getQueueColor(queueSize)}`}>
            {queueSize}
          </div>
          <div className="text-xs text-gray-600">Queue Size</div>
          <div className="text-xs text-gray-500">
            {queueSize === 0 ? 'No backlog' : queueSize < 10 ? 'Minor delay' : 'High delay'}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{droppedFrames}</div>
          <div className="text-xs text-gray-600">Dropped Frames</div>
          <div className="text-xs text-gray-500">
            {droppedFrames === 0 ? 'No drops' : 'Performance optimization'}
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Connection: {connectionStatus === 'connected' ? '✅ Connected' : connectionStatus === 'connecting' ? '🔄 Connecting' : connectionStatus === 'reconnecting' ? '🔄 Reconnecting' : '❌ Disconnected'}</span>
          <span>Last Update: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor; 