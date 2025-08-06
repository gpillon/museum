import * as THREE from 'three';

/**
 * Coordinate transformation utilities for mapping 2D camera coordinates to 3D museum space
 */

// --- Constants for Perspective Calculation ---
const Z_SENSITIVITY = 0.5; // Multiplier to make Z-axis movement more pronounced.
const CAMERA_HEIGHT_3D = 5.0; // The camera's height in the 3D scene. Reduced from 5.0 to lessen perspective effect.
const ASSUMED_HIP_HEIGHT_3D = 3.6; // Assumed height of hips from the floor. Reduced proportionally.
const MIN_Z = -6; // The furthest a figure can be from the camera.
const MAX_Z = 7;  // The closest a figure can be to the camera.

export interface CameraPoint {
  x: number;
  y: number;
  confidence: number;
  name: string;
}

export interface MuseumPoint {
  x: number;
  y: number;
  z: number;
  confidence: number;
  name: string;
}

export interface MuseumConfig {
  width: number;
  length: number;
  height: number;
  cameraWidth: number;
  cameraHeight: number;
}

/**
 * Transform 2D camera coordinates to 3D museum coordinates
 */
export class CoordinateTransformer {
  private config: MuseumConfig;
  private fovY: number; // Camera Vertical Field of View in radians

  constructor(config: MuseumConfig, fovDegrees: number = 75) {
    this.config = config;
    // Calculate vertical FOV from horizontal FOV and aspect ratio
    const aspect = this.config.cameraWidth / this.config.cameraHeight;
    this.fovY = 2 * Math.atan(Math.tan(fovDegrees * Math.PI / 180 / 2) / aspect);
  }

  /**
   * Transform a single keypoint from camera to museum coordinates using a calculated Z-depth.
   */
  transformKeypoint(keypoint: CameraPoint, poseZ: number): MuseumPoint {
    const y_from_center = (this.config.cameraHeight / 2) - keypoint.y;
    const x_from_center = keypoint.x - (this.config.cameraWidth / 2);

    const worldY = (y_from_center / (this.config.cameraHeight / 2)) * Math.tan(this.fovY / 2) * Math.abs(poseZ) + CAMERA_HEIGHT_3D;
    const worldX = (x_from_center / (this.config.cameraWidth / 2)) * Math.tan((this.fovY * this.config.cameraWidth/this.config.cameraHeight) / 2) * Math.abs(poseZ);

    return {
      x: worldX,
      y: worldY,
      z: poseZ,
      confidence: keypoint.confidence,
      name: keypoint.name
    };
  }

  /**
   * Get the center position and estimated depth of a pose detection.
   */
  getPoseCenterAndZ(detection: { keypoints: CameraPoint[] }): { center: THREE.Vector3, z: number } {
    const leftAnkle = detection.keypoints.find(kp => kp.name === 'left_ankle');
    const rightAnkle = detection.keypoints.find(kp => kp.name === 'right_ankle');
    const leftHip = detection.keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = detection.keypoints.find(kp => kp.name === 'right_hip');

    let z = -8; // Default Z
    let feetY = -1;
    let hipCenterX = this.config.cameraWidth / 2;

    if (leftAnkle && rightAnkle && leftAnkle.confidence > 0.3 && rightAnkle.confidence > 0.3) {
      feetY = (leftAnkle.y + rightAnkle.y) / 2;
    }

    if (feetY !== -1) {
      // Estimate Z based on feet position (inverse projection)
      const y_from_center = (this.config.cameraHeight / 2) - feetY;
      const angle_from_horizontal = Math.atan((y_from_center / (this.config.cameraHeight / 2)) * Math.tan(this.fovY / 2));
      z = -CAMERA_HEIGHT_3D / Math.tan(angle_from_horizontal);
    } else if (leftHip && rightHip && leftHip.confidence > 0.3 && rightHip.confidence > 0.3) {
      // Fallback: Estimate Z based on hip position
      const hipY = (leftHip.y + rightHip.y) / 2;
      const y_from_center = (this.config.cameraHeight / 2) - hipY;
      const angle_from_horizontal = Math.atan((y_from_center / (this.config.cameraHeight / 2)) * Math.tan(this.fovY / 2));
      z = -(CAMERA_HEIGHT_3D - ASSUMED_HIP_HEIGHT_3D) / Math.tan(angle_from_horizontal);
    }

    // Apply sensitivity multiplier to exaggerate the effect.
    z *= Z_SENSITIVITY;

    // Clamp the Z value to keep it within a reasonable range.
    z = Math.max(MIN_Z, Math.min(MAX_Z, z));

    // Determine the pose's center X based on hip position
    if (leftHip && rightHip && leftHip.confidence > 0.3 && rightHip.confidence > 0.3) {
        hipCenterX = (leftHip.x + rightHip.x) / 2;
    }

    const centerTransformed = this.transformKeypoint({x: hipCenterX, y: 0, name: 'center', confidence: 1.0}, z);
    const centerVec = new THREE.Vector3(centerTransformed.x, 0, centerTransformed.z); // Center on the floor

    return { center: centerVec, z };
  }

  /**
   * Transform multiple keypoints based on a consistent Z-depth for the pose.
   */
  transformKeypoints(keypoints: CameraPoint[], poseZ: number): MuseumPoint[] {
    return keypoints
      .filter(kp => kp.confidence > 0.3)
      .map(kp => this.transformKeypoint(kp, poseZ));
  }

  /**
   * Get appropriate Y height for different body parts (DEPRECATED, now handled in projection)
   */
  private getKeypointHeight(keypointName: string): number {
    return 0; // This logic is no longer needed
  }

  /**
   * Create skeleton connections between keypoints
   */
  createSkeletonConnections(keypoints: MuseumPoint[]): Array<{start: MuseumPoint, end: MuseumPoint}> {
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

    const keypointMap = new Map(keypoints.map(kp => [kp.name, kp]));
    const skeletonConnections: Array<{start: MuseumPoint, end: MuseumPoint}> = [];

    connections.forEach(([startName, endName]) => {
      const startPoint = keypointMap.get(startName);
      const endPoint = keypointMap.get(endName);
      
      if (startPoint && endPoint && 
          startPoint.confidence > 0.3 && endPoint.confidence > 0.3) {
        skeletonConnections.push({ start: startPoint, end: endPoint });
      }
    });

    return skeletonConnections;
  }

  /**
   * Get museum configuration for the transformer
   */
  static getDefaultConfig(): MuseumConfig {
    return {
      width: 16,      // Museum width
      length: 24,     // Museum length  
      height: 6,      // Museum height
      cameraWidth: 640,  // Camera width
      cameraHeight: 480  // Camera height
    };
  }
}

/**
 * Create a coordinate transformer with default museum configuration
 */
export function createCoordinateTransformer(): CoordinateTransformer {
  return new CoordinateTransformer(CoordinateTransformer.getDefaultConfig());
} 