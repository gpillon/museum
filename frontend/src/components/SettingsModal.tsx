import React, { useState, useEffect } from 'react';

interface ModelSettings {
  confidence: number;
  iou_threshold: number;
  max_det: number;
  device: string;
  verbose: boolean;
  agnostic_nms: boolean;
  half: boolean;
  dnn: boolean;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ModelSettings) => void;
  onReset?: () => void;
  currentSettings?: ModelSettings;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onReset,
  currentSettings 
}) => {
  const [settings, setSettings] = useState<ModelSettings>({
    confidence: 0.75,
    iou_threshold: 0.45,
    max_det: 300,
    device: 'cpu',
    verbose: false,
    agnostic_nms: false,
    half: false,
    dnn: false
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  }, [currentSettings]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(settings);
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    if (!onReset) return;
    
    setIsLoading(true);
    try {
      await onReset();
      onClose();
    } catch (error) {
      console.error('Error resetting settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Model Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* Detection Settings */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Detection Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.confidence}
                  onChange={(e) => setSettings(prev => ({ ...prev, confidence: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {settings.confidence} (Higher = fewer but more confident detections)
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IoU Threshold
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.iou_threshold}
                  onChange={(e) => setSettings(prev => ({ ...prev, iou_threshold: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {settings.iou_threshold} (Higher = stricter overlap detection)
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Detections
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.max_det}
                  onChange={(e) => setSettings(prev => ({ ...prev, max_det: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-sm text-gray-500 mt-1">
                  Maximum number of poses to detect
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Processing Device
                </label>
                <select
                  value={settings.device}
                  onChange={(e) => setSettings(prev => ({ ...prev, device: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cpu">CPU</option>
                  <option value="cuda">CUDA (GPU)</option>
                  <option value="mps">MPS (Apple Silicon)</option>
                </select>
                <div className="text-sm text-gray-500 mt-1">
                  Choose processing device for detection
                </div>
              </div>
            </div>
          </div>

          {/* Processing Options */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Processing Options</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.verbose}
                  onChange={(e) => setSettings(prev => ({ ...prev, verbose: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Verbose Output</span>
                <span className="text-xs text-gray-500 ml-2">(Detailed logging)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.agnostic_nms}
                  onChange={(e) => setSettings(prev => ({ ...prev, agnostic_nms: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Agnostic NMS</span>
                <span className="text-xs text-gray-500 ml-2">(Class-agnostic non-max suppression)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.half}
                  onChange={(e) => setSettings(prev => ({ ...prev, half: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Half Precision (FP16)</span>
                <span className="text-xs text-gray-500 ml-2">(Faster inference, lower memory)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.dnn}
                  onChange={(e) => setSettings(prev => ({ ...prev, dnn: e.target.checked }))}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Use DNN</span>
                <span className="text-xs text-gray-500 ml-2">(Deep Neural Network acceleration)</span>
              </label>
            </div>
          </div>

          {/* Tips Section */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">💡 Tips</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Lower confidence (0.1-0.3) = more detections, may include false positives</li>
              <li>• Higher confidence (0.5-0.8) = fewer detections, more accurate</li>
              <li>• Lower IoU (0.3-0.5) = allows more overlapping detections</li>
              <li>• Higher IoU (0.6-0.8) = stricter overlap detection</li>
              <li>• GPU processing (CUDA/MPS) = faster detection</li>
              <li>• Half precision = faster but may reduce accuracy slightly</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          {onReset && (
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {isLoading ? 'Resetting...' : 'Reset to Defaults'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 