import React from 'react';

interface StatusBarProps {
  isConnected: boolean;
  detectionCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ isConnected, detectionCount }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div 
              className={`w-3 h-3 rounded-full mr-2 ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm font-medium">
              Backend: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
            <span className="text-sm font-medium">
              Detections: {detectionCount}
            </span>
          </div>
        </div>
        
        <div className="text-xs text-gray-500">
          YOLO11n-pose • Real-time
        </div>
      </div>
    </div>
  );
};

export default StatusBar; 