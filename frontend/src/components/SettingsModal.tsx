import React, { useState, useEffect } from 'react';

interface ModelSettings {
  model: string;
  confidence: number;
  iou_threshold: number;
  max_det: number;
  device: string;
  verbose: boolean;
  agnostic_nms: boolean;
  half: boolean;
  dnn: boolean;
}

interface AvailableSetting {
  type: string;
  min?: number;
  max?: number;
  default: any;
  description: string;
  options?: string[];
  capabilities?: Record<string, any>;
  info?: Record<string, any>;
  available?: boolean;
}

interface AvailableSettings {
  [key: string]: AvailableSetting;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: ModelSettings) => Promise<any>;
  onReset?: () => Promise<any>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onReset 
}) => {
  const [settings, setSettings] = useState<ModelSettings>({
    model: 'yolo11n-pose.pt',
    confidence: 0.75,
    iou_threshold: 0.45,
    max_det: 5,
    device: 'cpu',
    verbose: false,
    agnostic_nms: false,
    half: false,
    dnn: true
  });

  const [availableSettings, setAvailableSettings] = useState<AvailableSettings>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Load current settings and available settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      // Force refresh model information first
      const refreshResponse = await fetch('/api/settings/refresh-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.available_settings) {
          setAvailableSettings(refreshData.available_settings);
          console.log('Model information refreshed:', refreshData.available_settings);
        }
      }

      // Load current settings
      const currentResponse = await fetch('/api/settings');
      if (currentResponse.ok) {
        const currentData = await currentResponse.json();
        if (currentData.success && currentData.settings) {
          setSettings(currentData.settings);
        }
      }

      // Load available settings (should be fresh from refresh)
      const availableResponse = await fetch('/api/settings/available');
      if (availableResponse.ok) {
        const availableData = await availableResponse.json();
        if (availableData.success && availableData.available_settings) {
          setAvailableSettings(availableData.available_settings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await onSave(settings);
      
      // Update available settings if the backend returns updated info
      if (result && result.available_settings) {
        setAvailableSettings(result.available_settings);
        console.log('Available settings updated after save:', result.available_settings);
      }
      
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
      const result = await onReset();
      
      // Update available settings if the backend returns updated info
      if (result && result.available_settings) {
        setAvailableSettings(result.available_settings);
        console.log('Available settings updated after reset:', result.available_settings);
      }
      
      // Reload settings after reset
      await loadSettings();
    } catch (error) {
      console.error('Error resetting settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceOptions = () => {
    const deviceSetting = availableSettings.device;
    if (!deviceSetting || !deviceSetting.options) {
      return [
        { value: 'cpu', label: 'CPU', available: true },
        { value: 'cuda', label: 'CUDA (GPU)', available: false },
        { value: 'mps', label: 'MPS (Apple Silicon)', available: false }
      ];
    }

    return deviceSetting.options.map(option => {
      const capability = deviceSetting.capabilities?.[option];
      const isAvailable = capability?.available !== false;
      return {
        value: option,
        label: capability?.name || option.toUpperCase(),
        available: isAvailable,
        description: capability?.description || '',
        performance: capability?.performance || 'Unknown'
      };
    });
  };

  const isHalfPrecisionAvailable = () => {
    const deviceSetting = availableSettings.device;
    if (!deviceSetting) return false;
    
    const currentDevice = settings.device;
    const deviceCapability = deviceSetting.capabilities?.[currentDevice];
    return deviceCapability?.half_precision || false;
  };

  const getModelOptions = () => {
    const modelSetting = availableSettings.model;
    if (!modelSetting || !modelSetting.options) {
      return [
        { value: 'yolo11n-pose.pt', label: 'YOLO11n-Pose', available: true, downloaded: true },
        { value: 'yolo11s-pose.pt', label: 'YOLO11s-Pose', available: true, downloaded: false },
        { value: 'yolo11m-pose.pt', label: 'YOLO11m-Pose', available: true, downloaded: false },
        { value: 'yolo11l-pose.pt', label: 'YOLO11l-Pose', available: true, downloaded: false },
        { value: 'yolo11x-pose.pt', label: 'YOLO11x-Pose', available: true, downloaded: false }
      ];
    }

    const options = modelSetting.options.map(option => {
      const modelInfo = modelSetting.info?.[option];
      const isDownloaded = modelInfo?.downloaded || false;
      const option_data = {
        value: option,
        label: `${modelInfo?.name || option.replace('.pt', '').toUpperCase()}${!isDownloaded ? ' (download)' : ''}`,
        available: true, // All models are available for selection
        downloaded: isDownloaded,
        description: modelInfo?.description || '',
        performance: modelInfo?.performance || 'Unknown',
        size_mb: modelInfo?.size_mb || 0
      };
      
      // Debug log for model state
      console.debug(`Model ${option}: downloaded=${isDownloaded}, label=${option_data.label}`);
      
      return option_data;
    });

    console.debug('All model options:', options);
    return options;
  };

  const getModelInfo = () => {
    const modelSetting = availableSettings.model;
    if (!modelSetting || !modelSetting.info) {
      return null;
    }

    const modelInfo = modelSetting.info[settings.model];
    if (!modelInfo) {
      return null;
    }

    return {
      size_mb: modelInfo.size_mb,
      performance: modelInfo.performance,
      description: modelInfo.description,
      downloaded: modelInfo.downloaded
    };
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

        {isLoadingSettings ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-600">Loading settings...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Model Selection</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    YOLO Model
                  </label>
                  <select
                    value={settings.model}
                    onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {getModelOptions().map(option => (
                      <option 
                        key={option.value} 
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-sm text-gray-500 mt-1">
                    Choose YOLO model for pose detection
                  </div>
                  {getModelInfo() && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      <div><strong>Size:</strong> {getModelInfo()?.size_mb} MB {!getModelInfo()?.downloaded && '(estimated)'}</div>
                      <div><strong>Performance:</strong> {getModelInfo()?.performance}</div>
                      <div><strong>Description:</strong> {getModelInfo()?.description}</div>
                      {!getModelInfo()?.downloaded && (
                        <div className="mt-1 text-orange-600 font-semibold">
                          ⬇️ Will be downloaded automatically when selected
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                    min={availableSettings.confidence?.min || 0}
                    max={availableSettings.confidence?.max || 1}
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
                    min={availableSettings.iou_threshold?.min || 0}
                    max={availableSettings.iou_threshold?.max || 1}
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
                    min={availableSettings.max_det?.min || 1}
                    max={availableSettings.max_det?.max || 1000}
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
                    {getDeviceOptions().map(option => (
                      <option 
                        key={option.value} 
                        value={option.value}
                        disabled={!option.available}
                      >
                        {option.label} {!option.available ? '(Not Available)' : ''}
                      </option>
                    ))}
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
                    disabled={!isHalfPrecisionAvailable()}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <span className={`text-sm ${!isHalfPrecisionAvailable() ? 'text-gray-400' : 'text-gray-700'}`}>
                    Half Precision (FP16)
                  </span>
                  <span className="text-xs text-gray-500 ml-2">
                    {!isHalfPrecisionAvailable() ? '(Not available for current device)' : '(Faster inference, lower memory)'}
                  </span>
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
        )}

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
              disabled={isLoading || isLoadingSettings}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {isLoading ? 'Resetting...' : 'Reset to Defaults'}
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isLoading || isLoadingSettings}
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