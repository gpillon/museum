import * as THREE from 'three';
import { HumanoidSkeleton } from './HumanoidSkeleton';
import { CameraPoint, CoordinateTransformer, createCoordinateTransformer } from '../../utils/coordinateTransform';

export interface PoseDetection {
  id: number;
  keypoints: {
    x: number;
    y: number;
    confidence: number;
    name: string;
  }[];
}

export class ModelManager {
  private models: { [id: number]: THREE.Group } = {};
  private scene: THREE.Scene;
  private coordinateTransformer: CoordinateTransformer;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.coordinateTransformer = createCoordinateTransformer();
  }

  public async updateModels(detections: PoseDetection[]) {
    const currentIds = new Set(detections.map(d => d.id));

    // Remove models for detections that no longer exist
    Object.keys(this.models).forEach(idStr => {
      const id = parseInt(idStr);
      if (!currentIds.has(id)) {
        this.scene.remove(this.models[id]);
        delete this.models[id];
      }
    });

    // Create new models or update existing ones
    for (const detection of detections) {
      const cameraKeypoints: CameraPoint[] = detection.keypoints.map(kp => ({
        x: kp.x,
        y: kp.y,
        confidence: kp.confidence,
        name: kp.name
      }));
      
      // Calculate the model's position on every frame.
      const { center } = this.coordinateTransformer.getPoseCenterAndZ({ keypoints: cameraKeypoints });

      const model = this.models[detection.id];
      if (model) {
        // Model exists: update its position and pose.
        model.position.copy(center);
        
        const skeleton = model.getObjectByName('humanoid-skeleton') as HumanoidSkeleton;
        if (skeleton) {
          skeleton.updateFromKeypoints(cameraKeypoints);
          this.ensureOnFloor(model);
        }
      } else {
        // Model doesn't exist: create it at the calculated position.
        this.createNewModel(detection, cameraKeypoints, center);
      }
    }
  }

  public updateAnimations() {
    // This is no longer used
  }
  
  private createNewModel(detection: PoseDetection, cameraKeypoints: CameraPoint[], center: THREE.Vector3) {
    if (this.models[detection.id]) {
      return; // Already created in another async operation
    }

    // Create our custom humanoid skeleton model with a random color
    const color = new THREE.Color(Math.random() * 0xffffff);
    const skeleton = new HumanoidSkeleton(color);
    skeleton.name = 'humanoid-skeleton';
    
    const modelGroup = new THREE.Group();
    modelGroup.add(skeleton);
    
    // Position the model group based on the calculated center
    modelGroup.position.copy(center);
    
    // Apply a global scale to make the figure larger
    modelGroup.scale.set(2.5, 2.5, 2.5);

    // Add to scene
    this.scene.add(modelGroup);
    this.models[detection.id] = modelGroup;

    // Set initial pose
    skeleton.updateFromKeypoints(cameraKeypoints);
    this.ensureOnFloor(modelGroup);
  }

  private ensureOnFloor(modelGroup: THREE.Group) {
    // Wait a frame for matrices to update
    setTimeout(() => {
      const box = new THREE.Box3().setFromObject(modelGroup);
      const lowestPoint = box.min.y;
      
      if (isFinite(lowestPoint)) {
        modelGroup.position.y -= lowestPoint;
      }
    }, 0);
  }
} 