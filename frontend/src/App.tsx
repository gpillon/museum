import { useState } from 'react';
import PoseDetector from './components/PoseDetector';
import StatusBar from './components/StatusBar';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            YOLO Pose Detection
          </h1>
          <p className="text-gray-600">
            Real-time pose detection using YOLO11n-pose model
          </p>
        </header>

        <StatusBar 
          isConnected={isConnected} 
          detectionCount={detectionCount} 
        />

        <main className="mt-8">
          <PoseDetector 
            onConnectionChange={setIsConnected}
            onDetectionUpdate={setDetectionCount}
          />
        </main>

        <footer className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by YOLO11n-pose • FastAPI • React</p>
        </footer>
      </div>
    </div>
  );
}

export default App; 