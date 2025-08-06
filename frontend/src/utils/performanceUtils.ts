export interface PerformanceMetrics {
  fps: number;
  latency: number;
  queueSize: number;
  droppedFrames: number;
  frameRate: number;
}

export class FrameRateOptimizer {
  private frameHistory: number[] = [];
  private maxHistorySize = 10;
  private lastFrameTime = 0;
  private frameCount = 0;
  private lastFpsUpdate = 0;

  constructor(private targetFps: number = 10) {}

  shouldDropFrame(): boolean {
    const now = performance.now();
    const timeSinceLastFrame = now - this.lastFrameTime;
    const minFrameInterval = 1000 / this.targetFps;
    
    // Only drop if we're sending too fast
    if (timeSinceLastFrame < minFrameInterval) {
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

  getCurrentFps(): number {
    const now = performance.now();
    
    // Only update FPS every 500ms to avoid noise
    if (now - this.lastFpsUpdate < 500) {
      return this._calculateFps();
    }
    
    this.lastFpsUpdate = now;
    return this._calculateFps();
  }

  private _calculateFps(): number {
    if (this.frameHistory.length < 2) return 0;
    
    // Calculate FPS based on recent frames
    const recentFrames = this.frameHistory.slice(-5);
    if (recentFrames.length < 2) return 0;
    
    const timeSpan = recentFrames[recentFrames.length - 1] - recentFrames[0];
    
    if (timeSpan === 0) return 0;
    
    // FPS = (number of frames - 1) / time span in seconds
    return ((recentFrames.length - 1) * 1000) / timeSpan;
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