export interface PerformanceMetrics {
  fps: number;
  latency: number;
  queueSize: number;
  droppedFrames: number;
  frameRate: number;
}

// Constants for ArrayBuffer metadata
export const METADATA_SIZE = 24; // 8 bytes timestamp + 16 bytes UUID
export const TIMESTAMP_OFFSET = 0;
export const UUID_OFFSET = 8;

export class ArrayBufferUtils {
  static addMetadata(buffer: ArrayBuffer, timestamp: number, uuid: string): ArrayBuffer {
    const metadata = new ArrayBuffer(METADATA_SIZE);
    const metadataView = new DataView(metadata);
    
    // Add timestamp (8 bytes)
    metadataView.setBigUint64(TIMESTAMP_OFFSET, BigInt(timestamp), false);
    
    // Add UUID (16 bytes) - convert string UUID to bytes
    const uuidBytes = this.uuidToBytes(uuid);
    const uuidArray = new Uint8Array(metadata, UUID_OFFSET, 16);
    uuidArray.set(uuidBytes);
    
    // Combine metadata with original buffer
    const combined = new ArrayBuffer(buffer.byteLength + METADATA_SIZE);
    const combinedView = new Uint8Array(combined);
    combinedView.set(new Uint8Array(metadata), 0);
    combinedView.set(new Uint8Array(buffer), METADATA_SIZE);
    
    return combined;
  }
  
  static extractMetadata(buffer: ArrayBuffer): { timestamp: number; uuid: string; data: ArrayBuffer } {
    const view = new DataView(buffer);
    const timestamp = Number(view.getBigUint64(TIMESTAMP_OFFSET, false));
    
    // Extract UUID bytes
    const uuidBytes = new Uint8Array(buffer, UUID_OFFSET, 16);
    const uuid = this.bytesToUuid(uuidBytes);
    
    // Extract original data
    const data = buffer.slice(METADATA_SIZE);
    
    return { timestamp, uuid, data };
  }
  
  private static uuidToBytes(uuid: string): Uint8Array {
    // Remove hyphens and convert to bytes
    const cleanUuid = uuid.replace(/-/g, '');
    const bytes = new Uint8Array(16);
    
    for (let i = 0; i < 16; i++) {
      bytes[i] = parseInt(cleanUuid.substr(i * 2, 2), 16);
    }
    
    return bytes;
  }
  
  private static bytesToUuid(bytes: Uint8Array): string {
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  
  static generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Test function to verify metadata handling
  static testMetadataHandling(): boolean {
    try {
      const originalData = new ArrayBuffer(100);
      const timestamp = Date.now();
      const testUuid = this.generateUuid();
      
      // Add metadata
      const bufferWithMetadata = this.addMetadata(originalData, timestamp, testUuid);
      
      // Extract metadata
      const extracted = this.extractMetadata(bufferWithMetadata);
      
      // Verify extraction
      const success = extracted.timestamp === timestamp && 
                     extracted.uuid === testUuid && 
                     extracted.data.byteLength === originalData.byteLength;
      
      if (!success) {
        console.error('Metadata test failed:', {
          original: { timestamp, uuid: testUuid, size: originalData.byteLength },
          extracted: extracted
        });
      }
      
      return success;
    } catch (error) {
      console.error('Metadata test error:', error);
      return false;
    }
  }
}

export class FrameRateOptimizer {
  private frameHistory: number[] = [];
  private maxHistorySize = 10;
  private lastFrameTime = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private sentFrames = new Set<string>(); // Track sent frame UUIDs
  private droppedFramesCount = 0;
  private sentFrameTimes: number[] = []; // Track times of actually sent frames

  constructor(private targetFps: number = 10) {}

  shouldDropFrame(): boolean {
    const now = performance.now();
    const timeSinceLastFrame = now - this.lastFrameTime;
    const minFrameInterval = 1000 / this.targetFps;
    
    // Only drop if we're sending too fast
    if (timeSinceLastFrame < minFrameInterval) {
      this.droppedFramesCount++;
      return true;
    }
    
    this.lastFrameTime = now;
    this.frameHistory.push(now);
    this.frameCount++;
    
    // Keep only recent frames
    if (this.frameHistory.length > this.maxHistorySize) {
      this.frameHistory.shift();
    }
    
    return false;
  }

  trackSentFrame(uuid: string): void {
    this.sentFrames.add(uuid);
    // Track the time when frame was actually sent
    this.sentFrameTimes.push(performance.now());
    
    // Keep only recent frame UUIDs to prevent memory leaks
    if (this.sentFrames.size > 100) {
      const uuidArray = Array.from(this.sentFrames);
      this.sentFrames = new Set(uuidArray.slice(-50));
    }
    
    // Keep only recent sent frame times for FPS calculation
    if (this.sentFrameTimes.length > 20) {
      this.sentFrameTimes = this.sentFrameTimes.slice(-10);
    }
  }

  getDroppedFramesCount(): number {
    return this.droppedFramesCount;
  }

  resetDroppedFramesCount(): void {
    this.droppedFramesCount = 0;
    this.sentFrameTimes = []; // Reset sent frame times when starting new stream
  }

  getCurrentFps(): number {
    const now = performance.now();
    
    // Only update FPS every 500ms to avoid noise
    if (now - this.lastFpsUpdate < 500) {
      return this._calculateFps();
    }
    
    this.lastFpsUpdate = now;
    return this._calculateFps();
  }

  // Force FPS update (useful for debugging)
  forceFpsUpdate(): number {
    this.lastFpsUpdate = 0; // Reset to force update
    return this.getCurrentFps();
  }

  // Get debug info for FPS calculation
  getFpsDebugInfo(): { sentFrames: number; timeSpan: number; fps: number } {
    const fps = this._calculateFps();
    const sentFrames = this.sentFrameTimes.length;
    const timeSpan = sentFrames >= 2 ? 
      this.sentFrameTimes[sentFrames - 1] - this.sentFrameTimes[0] : 0;
    
    return { sentFrames, timeSpan, fps };
  }

  private _calculateFps(): number {
    // Use sent frame times for more accurate FPS calculation
    if (this.sentFrameTimes.length < 2) return 0;
    
    // Calculate FPS based on actually sent frames
    const recentSentFrames = this.sentFrameTimes.slice(-5);
    if (recentSentFrames.length < 2) return 0;
    
    const timeSpan = recentSentFrames[recentSentFrames.length - 1] - recentSentFrames[0];
    
    if (timeSpan === 0) return 0;
    
    // FPS = (number of frames - 1) / time span in seconds
    return ((recentSentFrames.length - 1) * 1000) / timeSpan;
  }

  adjustFrameRate(currentFps: number, latency: number): number {
    let newFrameRate = this.targetFps;
    
    // Only reduce frame rate if performance is very poor
    if (currentFps < this.targetFps * 0.4 || latency > 300) {
      newFrameRate = Math.max(5, this.targetFps - 1);
    }
    // Increase frame rate if performance is very good
    else if (currentFps > this.targetFps * 1.5 && latency < 50) {
      newFrameRate = Math.min(15, this.targetFps + 1);
    }
    
    this.targetFps = newFrameRate;
    return newFrameRate;
  }
}

export class LatencyMonitor {
  private latencyHistory: number[] = [];
  private maxHistorySize = 20;

  addLatency(latency: number): void {
    // Only add reasonable latency values
    if (latency > 0 && latency < 10000) {
      this.latencyHistory.push(latency);
      
      if (this.latencyHistory.length > this.maxHistorySize) {
        this.latencyHistory.shift();
      }
    }
  }

  getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    
    const validLatencies = this.latencyHistory.filter(l => l > 0 && l < 10000);
    if (validLatencies.length === 0) return 0;
    
    return validLatencies.reduce((sum, latency) => sum + latency, 0) / validLatencies.length;
  }

  getLatencyTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.latencyHistory.length < 5) return 'stable';
    
    const recent = this.latencyHistory.slice(-5);
    const older = this.latencyHistory.slice(-10, -5);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, latency) => sum + latency, 0) / recent.length;
    const olderAvg = older.reduce((sum, latency) => sum + latency, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference < -10) return 'improving';
    if (difference > 10) return 'degrading';
    return 'stable';
  }
}