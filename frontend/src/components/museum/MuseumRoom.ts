import * as THREE from 'three';

export class MuseumRoom {
  static createRoom(scene: THREE.Scene) {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(16, 24);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(16, 6);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xF5F5DC });
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 3, -12);
    scene.add(backWall);

    // Left wall
    const leftWallGeometry = new THREE.PlaneGeometry(24, 6);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-8, 3, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // Right wall
    const rightWallGeometry = new THREE.PlaneGeometry(24, 6);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(8, 3, 0);
    rightWall.rotation.y = -Math.PI / 2;
    scene.add(rightWall);

    // Add some artwork on the walls
    const artworkGeometry = new THREE.PlaneGeometry(2, 3);
    const artworkMaterial = new THREE.MeshLambertMaterial({ color: 0xFFD700 });
    
    // Artwork on back wall
    const artwork1 = new THREE.Mesh(artworkGeometry, artworkMaterial);
    artwork1.position.set(-4, 3, -11.9);
    scene.add(artwork1);
    
    const artwork2 = new THREE.Mesh(artworkGeometry, artworkMaterial);
    artwork2.position.set(4, 3, -11.9);
    scene.add(artwork2);
  }

  static addLighting(scene: THREE.Scene) {
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
  }
} 