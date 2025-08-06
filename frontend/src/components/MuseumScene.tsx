import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { MuseumRoom } from './museum/MuseumRoom';
import { ModelManager, PoseDetection } from './museum/ModelManager';

interface MuseumSceneProps {
  detections: PoseDetection[];
}

const MuseumScene: React.FC<MuseumSceneProps> = ({ detections }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelManagerRef = useRef<ModelManager | null>(null);
  const detectionsRef = useRef<PoseDetection[]>([]);

  // Keep a ref to the latest detections to avoid stale state in the animation loop.
  useEffect(() => {
    detectionsRef.current = detections;
  }, [detections]);

  // Initialize the 3D scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Create camera (45-degree view) - restored old position
    const camera = new THREE.PerspectiveCamera(50, 4/3, 0.1, 1000);
    camera.position.set(12, 12, 12);
    camera.lookAt(0, 1.5, 0);
    cameraRef.current = camera;

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Add lighting
    MuseumRoom.addLighting(scene);

    // Create museum room
    MuseumRoom.createRoom(scene);

    // Initialize model manager
    modelManagerRef.current = new ModelManager(scene);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update models with the latest detections on every frame.
      if (modelManagerRef.current) {
        modelManagerRef.current.updateModels(detectionsRef.current).catch(error => {
          console.error('Error updating models:', error);
        });
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (mountRef.current && camera && renderer) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      }
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      if (mountRef.current && renderer) {
        mountRef.current.removeChild(renderer.domElement);
      }
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full"
      style={{ aspectRatio: '4/3', objectFit: 'cover' }}
    />
  );
};

export default MuseumScene; 