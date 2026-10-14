import * as THREE from "three";

function block(parent: THREE.Object3D, w: number, h: number, d: number, color: number, x: number, y: number, z: number, glow = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color, emissive: glow, emissiveIntensity: glow ? 0.9 : 0 }),
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
}

/** Blocky cave miner. Faces local -Z, which is the player's look direction. */
export function buildMiner(): { group: THREE.Group; arm: THREE.Group } {
  const group = new THREE.Group();
  block(group, 0.34, 0.46, 0.28, 0x1a2433, -0.12, 0.23, 0);
  block(group, 0.34, 0.46, 0.28, 0x1a2433, 0.12, 0.23, 0);
  block(group, 0.5, 0.08, 0.32, 0x6b3f22, 0, 0.5, 0);
  block(group, 0.1, 0.1, 0.06, 0xe0b34a, 0, 0.5, -0.16);
  block(group, 0.56, 0.5, 0.34, 0x0e8f96, 0, 0.82, 0);
  block(group, 0.08, 0.08, 0.05, 0xe0b34a, 0, 0.96, -0.18);
  block(group, 0.08, 0.08, 0.05, 0xe0b34a, 0, 0.82, -0.18);
  block(group, 0.08, 0.08, 0.05, 0xe0b34a, 0, 0.68, -0.18);
  block(group, 0.08, 0.44, 0.08, 0x6b3f22, -0.18, 0.86, -0.14);
  block(group, 0.08, 0.44, 0.08, 0x6b3f22, 0.18, 0.86, -0.14);
  block(group, 0.44, 0.4, 0.4, 0xc48a62, 0, 1.36, 0);
  block(group, 0.48, 0.14, 0.46, 0x5a3820, 0, 1.56, 0.02);
  block(group, 0.3, 0.1, 0.08, 0x5a3820, 0, 1.18, -0.2);
  block(group, 0.5, 0.16, 0.14, 0x163a78, 0, 1.38, -0.22);
  block(group, 0.1, 0.07, 0.05, 0xffaa33, -0.1, 1.38, -0.3, 0xffaa33);
  block(group, 0.1, 0.07, 0.05, 0xffaa33, 0.1, 1.38, -0.3, 0xffaa33);
  const arm = new THREE.Group();
  arm.position.set(0.4, 1.08, 0);
  group.add(arm);
  block(arm, 0.16, 0.42, 0.16, 0x0e8f96, 0, -0.2, 0);
  block(arm, 0.16, 0.14, 0.16, 0xc48a62, 0, -0.46, -0.08);
  block(arm, 0.06, 0.36, 0.06, 0x6b3f22, 0, -0.55, -0.16);
  block(arm, 0.3, 0.07, 0.07, 0xd7dde6, 0, -0.72, -0.16);
  block(group, 0.16, 0.42, 0.16, 0x0e8f96, -0.4, 0.88, 0.08);
  block(group, 0.16, 0.14, 0.16, 0xc48a62, -0.4, 0.6, 0.16);
  arm.rotation.x = -0.7;
  return { group, arm };
}
