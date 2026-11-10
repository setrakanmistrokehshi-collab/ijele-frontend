import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Everything here is built from primitives, so the hero ships no model files and costs no extra requests.

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function useMaterials() {
  const materials = useMemo(() => ({
    gold: new THREE.MeshStandardMaterial({ color: '#d9b45a', metalness: 1, roughness: 0.22 }),
    goldBright: new THREE.MeshStandardMaterial({ color: '#f0cf7a', metalness: 1, roughness: 0.12 }),
    dial: new THREE.MeshStandardMaterial({ color: '#16213a', metalness: 0.3, roughness: 0.55 }),
    strap: new THREE.MeshStandardMaterial({ color: '#3a281d', metalness: 0, roughness: 0.65 }),
    gem: new THREE.MeshPhysicalMaterial({ color: '#d6ecff', metalness: 0, roughness: 0.02, clearcoat: 1, flatShading: true, envMapIntensity: 2.2 }),
  }), []);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  return materials;
}

/** Interlocking oval links drawn with one instanced mesh. Alternate links are turned 90° so they look chained. */
function LinkRing({ links, radius, tube, stretch = 1.45, material }) {
  const mesh = useRef();
  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    const turn = new THREE.Quaternion();
    const flip = new THREE.Quaternion();
    const orientation = new THREE.Quaternion();
    const scale = new THREE.Vector3(stretch, 1, 1);
    links.forEach((link, i) => {
      turn.setFromAxisAngle(Z_AXIS, link.angle);
      flip.setFromAxisAngle(X_AXIS, link.flip ? Math.PI / 2 : 0);
      orientation.copy(turn).multiply(flip);
      matrix.compose(new THREE.Vector3(...link.position), orientation, scale);
      mesh.current.setMatrixAt(i, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [links, stretch]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, links.length]} material={material} frustumCulled={false}>
      <torusGeometry args={[radius, tube, 14, 40]} />
    </instancedMesh>
  );
}

export function Watch() {
  const materials = useMaterials();
  const hour = useRef();
  const minute = useRef();
  const second = useRef();
  const ticks = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  // The hands show the visitor's real time. Under reduced motion the scene renders on demand, so they simply stay put.
  const setHands = () => {
    const now = new Date();
    const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
    const minutes = now.getMinutes() + seconds / 60;
    const hours = (now.getHours() % 12) + minutes / 60;
    second.current.rotation.z = -(seconds / 60) * Math.PI * 2;
    minute.current.rotation.z = -(minutes / 60) * Math.PI * 2;
    hour.current.rotation.z = -(hours / 12) * Math.PI * 2;
  };
  useLayoutEffect(setHands, []);
  useFrame(setHands);

  return (
    <group rotation={[0.08, 0, 0]}>
      <mesh material={materials.strap} position={[0, 1.55, -0.14]} rotation={[-0.3, 0, 0]}><boxGeometry args={[0.74, 1.2, 0.12]} /></mesh>
      <mesh material={materials.strap} position={[0, -1.55, -0.14]} rotation={[0.3, 0, 0]}><boxGeometry args={[0.74, 1.2, 0.12]} /></mesh>
      <mesh material={materials.gold} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1, 1, 0.3, 72]} /></mesh>
      <mesh material={materials.goldBright} position={[0, 0, 0.16]}><torusGeometry args={[0.97, 0.07, 24, 96]} /></mesh>
      <mesh material={materials.dial} position={[0, 0, 0.15]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.9, 0.9, 0.02, 72]} /></mesh>
      {ticks.map((i) => {
        const angle = (i / 12) * Math.PI * 2;
        const major = i % 3 === 0;
        return (
          <mesh key={i} material={materials.goldBright} position={[Math.sin(angle) * 0.76, Math.cos(angle) * 0.76, 0.17]} rotation={[0, 0, -angle]}>
            <boxGeometry args={[major ? 0.07 : 0.04, major ? 0.2 : 0.12, 0.02]} />
          </mesh>
        );
      })}
      <group ref={hour} position={[0, 0, 0.19]}><mesh material={materials.goldBright} position={[0, 0.22, 0]}><boxGeometry args={[0.07, 0.5, 0.02]} /></mesh></group>
      <group ref={minute} position={[0, 0, 0.2]}><mesh material={materials.goldBright} position={[0, 0.34, 0]}><boxGeometry args={[0.05, 0.75, 0.02]} /></mesh></group>
      <group ref={second} position={[0, 0, 0.21]}><mesh material={materials.gold} position={[0, 0.3, 0]}><boxGeometry args={[0.015, 0.8, 0.01]} /></mesh></group>
      <mesh material={materials.goldBright} position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 0.04, 24]} /></mesh>
      <mesh material={materials.goldBright} position={[1.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, 0.22, 24]} /></mesh>
    </group>
  );
}

const LOOP_LINKS = 20; // even, so links alternate cleanly
const LOOP_RADIUS = 1.56; // chord between neighbours ≈ the link's inner length, which is what makes links overlap

export function Chain() {
  const materials = useMaterials();
  const links = useMemo(() => Array.from({ length: LOOP_LINKS }, (_, index) => {
    const angle = (index / LOOP_LINKS) * Math.PI * 2;
    return { position: [Math.cos(angle) * LOOP_RADIUS, Math.sin(angle) * LOOP_RADIUS, 0], angle: angle + Math.PI / 2, flip: index % 2 === 1 };
  }), []);
  return (
    <group rotation={[0.35, 0, 0]}>
      <LinkRing links={links} radius={0.2} tube={0.048} material={materials.gold} />
    </group>
  );
}

const ARC_HALF_WIDTH = 1.7;
const ARC_DEPTH = 1.35;
const ARC_LINK = { radius: 0.1, tube: 0.026, stretch: 1.45 };

/** Links spaced evenly by arc length along a parabola that hangs like a necklace. */
function necklaceLinks() {
  const y = (x) => ARC_DEPTH * (x / ARC_HALF_WIDTH) ** 2 - 0.7;
  const slope = (x) => (2 * ARC_DEPTH * x) / ARC_HALF_WIDTH ** 2;
  const steps = 400;
  const xs = [];
  const lengths = [0];
  for (let i = 0; i <= steps; i += 1) {
    xs.push(-ARC_HALF_WIDTH + (i / steps) * ARC_HALF_WIDTH * 2);
    if (i > 0) lengths.push(lengths[i - 1] + Math.hypot(xs[i] - xs[i - 1], y(xs[i]) - y(xs[i - 1])));
  }
  const total = lengths[steps];
  const pitch = 2 * (ARC_LINK.radius * ARC_LINK.stretch - ARC_LINK.tube);
  const count = Math.max(2, 2 * Math.round(total / pitch / 2)); // even
  return Array.from({ length: count }, (_, k) => {
    const target = ((k + 0.5) / count) * total;
    let i = 1;
    while (i < steps && lengths[i] < target) i += 1;
    const x = xs[i];
    return { position: [x, y(x), 0], angle: Math.atan2(slope(x), 1), flip: k % 2 === 1 };
  });
}

export function Necklace() {
  const materials = useMaterials();
  const links = useMemo(necklaceLinks, []);
  const gem = useRef();
  useFrame((state) => { gem.current.rotation.y = state.clock.elapsedTime * 0.8; });
  return (
    <group position={[0, 0.25, 0]}>
      <LinkRing links={links} {...ARC_LINK} material={materials.gold} />
      <mesh material={materials.gold} position={[0, -0.74, 0]}><torusGeometry args={[0.09, 0.025, 12, 28]} /></mesh>
      <group ref={gem} position={[0, -1.16, 0]}>
        <mesh material={materials.gem}><cylinderGeometry args={[0.3, 0.46, 0.16, 8]} /></mesh>
        <mesh material={materials.gem} position={[0, -0.4, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.46, 0.64, 8]} /></mesh>
      </group>
    </group>
  );
}
