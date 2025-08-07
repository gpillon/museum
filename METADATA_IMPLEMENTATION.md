# Metadata Implementation for Latency Tracking

## Overview

This implementation adds metadata to ArrayBuffer communications between frontend and backend to enable accurate latency tracking and frame monitoring.

## Changes Made

### 1. ArrayBuffer Metadata Structure

Each ArrayBuffer sent from frontend to backend now includes 24 bytes of metadata:
- **8 bytes**: Timestamp in milliseconds (BigInt, big-endian)
- **16 bytes**: UUID for frame tracking

### 2. Frontend Changes

#### `performanceUtils.ts`
- Added `ArrayBufferUtils` class for metadata handling
- Enhanced `FrameRateOptimizer` with proper dropped frames tracking
- Added UUID generation and metadata extraction functions

#### `useWebSocket.ts`
- Modified to add metadata to ArrayBuffer before sending
- Updated latency calculation to use both original and response timestamps
- Improved queue size tracking

#### `PoseDetector.tsx`
- Updated to use new dropped frames tracking
- Added metadata test on component mount
- Enhanced performance monitoring

### 3. Backend Changes

#### `main.py`
- Added metadata extraction functions
- Modified WebSocket handler to extract and preserve metadata
- Enhanced response with multiple timestamps for detailed monitoring
- Added frame UUID tracking for future OTLP logging

## Latency Calculation

The system now calculates multiple latency metrics:

1. **End-to-End Latency**: `Date.now() - frame_timestamp`
2. **Server Processing Time**: `response_timestamp - frame_timestamp`
3. **Model Processing Time**: `processing_time` (from backend)

## Dropped Frames Tracking

- Frames are dropped based on frame rate limits
- Each dropped frame increments a counter
- Counter is reset when streaming starts
- Accurate tracking for performance monitoring

## Queue Size Monitoring

- Messages are queued when WebSocket is disconnected
- Queue size is displayed in real-time
- Queue is processed when connection is restored
- **NEW**: Images are dropped when queue size exceeds 2 messages
- **NEW**: Queue dropped frames are tracked separately from rate-limited drops

## Queue Overflow Protection

The system now includes intelligent queue management:

- **Queue Size Limit**: Images are dropped when queue exceeds 2 messages
- **Queue Dropped Frames**: Separate counter for frames dropped due to queue overflow
- **Performance Impact**: Prevents memory issues and improves responsiveness
- **Visual Feedback**: Queue dropped frames are displayed in red in the performance monitor

This prevents the accumulation of frames when the backend is slow or disconnected, ensuring the system remains responsive.

## Future OTLP Integration

This implementation prepares for OpenTelemetry Protocol (OTLP) logging:

- Frame UUIDs enable correlation between frontend and backend logs
- Multiple timestamps provide detailed performance breakdown
- Processing times are tracked for model performance monitoring
- All metrics are structured for easy OTLP export

## Testing

The implementation includes self-testing:
- `ArrayBufferUtils.testMetadataHandling()` verifies metadata integrity
- Console logs show test results on component mount
- Debug logs show detailed latency breakdown per frame

## Performance Impact

- Minimal overhead: only 24 bytes per frame
- No impact on image quality or detection accuracy
- Enables accurate performance monitoring
- Prepares for production monitoring with OTLP 