import * as THREE from 'three';
import { CameraPoint, CoordinateTransformer, createCoordinateTransformer } from '../../utils/coordinateTransform';

// The skeleton is now composed of two-part limbs for more detail.
const BONE_DEFINITIONS: { name: string, parent: string | null, length: number, position: THREE.Vector3 }[] = [
  // Core
  { name: 'torso', parent: null, length: 0.6, position: new THREE.Vector3(0, 0.7, 0) },
  { name: 'head', parent: 'torso', length: 0.2, position: new THREE.Vector3(0, 0.6, 0) },

  // Arms (Upper arm is child of torso, Lower arm is child of Upper arm)
  { name: 'leftUpperArm', parent: 'torso', length: 0.25, position: new THREE.Vector3(0, 0.55, 0) },
  { name: 'leftLowerArm', parent: 'leftUpperArm', length: 0.25, position: new THREE.Vector3(0, 0.25, 0) },
  { name: 'rightUpperArm', parent: 'torso', length: 0.25, position: new THREE.Vector3(0, 0.55, 0) },
  { name: 'rightLowerArm', parent: 'rightUpperArm', length: 0.25, position: new THREE.Vector3(0, 0.25, 0) },

  // Legs
  { name: 'leftUpperLeg', parent: 'torso', length: 0.3, position: new THREE.Vector3(0, 0, 0) },
  { name: 'leftLowerLeg', parent: 'leftUpperLeg', length: 0.3, position: new THREE.Vector3(0, 0.3, 0) },
  { name: 'rightUpperLeg', parent: 'torso', length: 0.3, position: new THREE.Vector3(0, 0, 0) },
  { name: 'rightLowerLeg', parent: 'rightUpperLeg', length: 0.3, position: new THREE.Vector3(0, 0.3, 0) },
];

export class HumanoidSkeleton extends THREE.Group {
  private bones: { [key: string]: THREE.Bone } = {};
  private coordinateTransformer: CoordinateTransformer;

  constructor(color?: THREE.Color) {
    super();
    this.coordinateTransformer = createCoordinateTransformer();
    this.createSkeleton(color || new THREE.Color(0xffffff * Math.random()));
  }

  private createSkeleton(color: THREE.Color) {
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.2,
      roughness: 0.8,
      depthTest: false,
    });

    BONE_DEFINITIONS.forEach(({ name, parent, length, position }) => {
      const bone = new THREE.Bone();
      bone.name = name;
      this.bones[name] = bone;
      bone.position.copy(position);

      if (parent && this.bones[parent]) {
        this.bones[parent].add(bone);
      } else {
        this.add(bone); // Add root bone to the group
      }

      // Add a visual mesh to each bone
      if (name === 'head') {
        const geometry = new THREE.SphereGeometry(0.15, 16, 12);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = length; // Position head sphere at the end of the bone
        bone.add(mesh);
      } else if (length > 0) {
        const geometry = new THREE.CylinderGeometry(0.04, 0.04, length, 8);
        geometry.translate(0, length / 2, 0); // Align pivot with the bottom
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 1;
        bone.add(mesh);
      }
    });
  }

  // A new, dedicated function to set the classic stick figure pose.
  private setToDefaultPose() {
    // Reset all rotations to identity before applying new ones.
    Object.values(this.bones).forEach(bone => bone.quaternion.set(0,0,0,1));

    // The torso itself does not need rotation.
    // The head bone is a child of the torso and points straight up by default.
    
    // Define the angles from the vertical centerline.
    const armAngle = Math.PI / 2; // 45 degrees
    const legAngle = Math.PI / 6; // 30 degrees

    // Define the axis of rotation (the Z-axis, for in-plane rotation).
    const rotationAxis = new THREE.Vector3(0, 0, 1);

    // Apply rotations to the upper part of the limbs.
    // The lower parts will have no rotation, so they extend straight.
    this.bones.leftUpperArm.quaternion.setFromAxisAngle(rotationAxis, armAngle);
    this.bones.rightUpperArm.quaternion.setFromAxisAngle(rotationAxis, -armAngle);
    this.bones.leftUpperLeg.quaternion.setFromAxisAngle(rotationAxis, legAngle + Math.PI);
    this.bones.rightUpperLeg.quaternion.setFromAxisAngle(rotationAxis, -legAngle - Math.PI);
  }

  public updateFromKeypoints(keypoints: CameraPoint[]) {
    // 1. Set the entire skeleton to the default pose first.
    this.setToDefaultPose();

    // 2. Get the 3D world positions of all available keypoints.
    const { z } = this.coordinateTransformer.getPoseCenterAndZ({ keypoints });
    const transformedKeypoints = this.coordinateTransformer.transformKeypoints(keypoints, z);
    const targets: { [name: string]: THREE.Vector3 } = {};
    transformedKeypoints.forEach(p => {
        targets[p.name] = new THREE.Vector3(p.x, p.y, p.z);
    });

    // 3. Animate the torso based on hip and shoulder positions.
    const leftHip = targets['left_hip'];
    const rightHip = targets['right_hip'];
    const leftShoulder = targets['left_shoulder'];
    const rightShoulder = targets['right_shoulder'];

    if (leftHip && rightHip && leftShoulder && rightShoulder) {
        const hipMidpoint = new THREE.Vector3().addVectors(leftHip, rightHip).multiplyScalar(0.5);
        const shoulderMidpoint = new THREE.Vector3().addVectors(leftShoulder, rightShoulder).multiplyScalar(0.5);

        // Orient the torso to point from hips to shoulders.
        // Note: We no longer set the torso's world position here.
        const torsoDirection = new THREE.Vector3().subVectors(shoulderMidpoint, hipMidpoint).normalize();
        const defaultUp = new THREE.Vector3(0, 1, 0);
        this.bones.torso.quaternion.setFromUnitVectors(defaultUp, torsoDirection);
    }

    // 4. If arm keypoints are available, override the default pose and animate the arms.
    this.orientBone(this.bones.leftUpperArm, targets['left_shoulder'], targets['left_elbow']);
    this.orientBone(this.bones.leftLowerArm, targets['left_elbow'], targets['left_wrist']);
    this.orientBone(this.bones.rightUpperArm, targets['right_shoulder'], targets['right_elbow']);
    this.orientBone(this.bones.rightLowerArm, targets['right_elbow'], targets['right_wrist']);

    // 5. If leg keypoints are available, override the default pose and animate the legs.
    this.orientBone(this.bones.leftUpperLeg, targets['left_hip'], targets['left_knee']);
    this.orientBone(this.bones.leftLowerLeg, targets['left_knee'], targets['left_ankle']);
    this.orientBone(this.bones.rightUpperLeg, targets['right_hip'], targets['right_knee']);
    this.orientBone(this.bones.rightLowerLeg, targets['right_knee'], targets['right_ankle']);
  }

  // A new, robust function for correctly orienting a bone between two points.
  private orientBone(bone: THREE.Bone, startPoint?: THREE.Vector3, endPoint?: THREE.Vector3) {
    if (!bone || !startPoint || !endPoint) {
      return; // If keypoints are missing, do nothing and leave the bone in its default pose.
    }

    const parent = bone.parent;
    if (!parent) return;

    // The desired direction of the bone in world space.
    const worldDirection = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();

    // We need to transform this world direction into the parent's local space
    // because the bone's rotation is relative to its parent.
    parent.updateWorldMatrix(true, false);
    const parentInverseWorld = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    
    const localDirection = new THREE.Vector3().copy(worldDirection);
    localDirection.transformDirection(parentInverseWorld);

    // The bone's default orientation is along its local Y-axis.
    const defaultOrientation = new THREE.Vector3(0, 1, 0);

    // Calculate the quaternion to rotate from the default orientation to the target direction.
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultOrientation, localDirection);

    // Apply the rotation.
    bone.quaternion.copy(quaternion);
  }
} 