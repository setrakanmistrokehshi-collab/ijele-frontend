import { useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Chain, Necklace, Watch } from './JewelryModels.jsx';
import ProductPhoto from './ProductPhoto.jsx';

const MODELS = [Watch, Chain, Necklace]; // same order as the slides
const SPACING = 7; // distance between models; the next one waits just outside the frame

/** Reflections for the gold. Generated in code (no HDR download), so it needs no network and no CSP exception. */
function Environment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const generator = new THREE.PMREMGenerator(gl);
    const texture = generator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = texture;
    return () => { scene.environment = null; texture.dispose(); generator.dispose(); };
  }, [gl, scene]);
  return null;
}

/** Moves the product photos or model fallbacks: damped slide changes and a gentle lean toward the mouse. */
function Rig({ slides, index, pointer, reducedMotion, onReady }) {
  const root = useRef();
  const items = useRef([]);
  const position = useRef(index); // fractional "current slide" that eases toward `index`
  const lean = useRef({ x: 0, y: 0 });
  const invalidate = useThree((state) => state.invalidate);
  const { damp } = THREE.MathUtils;

  // With reduced motion the scene only renders when asked to, so ask whenever the slide changes.
  useEffect(() => { if (reducedMotion) { position.current = index; invalidate(); } }, [index, reducedMotion, invalidate]);
  useEffect(() => { onReady?.(); }, [onReady]);

  useFrame((state, delta) => {
    const deltaSeconds = Math.min(delta, 0.05); // no lurch after the tab was in the background
    const elapsedSeconds = state.clock.elapsedTime;
    position.current = reducedMotion ? index : damp(position.current, index, 3.2, deltaSeconds);
    lean.current.x = damp(lean.current.x, reducedMotion ? 0 : pointer.current.x, 3, deltaSeconds);
    lean.current.y = damp(lean.current.y, reducedMotion ? 0 : pointer.current.y, 3, deltaSeconds);
    root.current.rotation.set(lean.current.y * 0.18, lean.current.x * 0.35, 0);
    items.current.forEach((item, itemIndex) => {
      if (!item) return;
      const offset = itemIndex - position.current; // 0 means this model is in front of the camera
      item.visible = Math.abs(offset) < 1.6;
      item.position.set(offset * SPACING, reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.9 + itemIndex) * 0.08, -Math.abs(offset) * 1.5);
      item.scale.setScalar(0.55 + 0.45 * Math.max(0, 1 - Math.abs(offset)));
      item.rotation.y = -offset * 0.9 + (reducedMotion ? 0 : Math.sin(elapsedSeconds * 0.55 + itemIndex * 1.7) * 0.5);
    });
  });

  return (
    <group ref={root}>
      {MODELS.map((Model, modelIndex) => (
        <group key={modelIndex} ref={(node) => { items.current[modelIndex] = node; }}>
          {slides[modelIndex].image ? <ProductPhoto src={slides[modelIndex].image} /> : <Model />}
        </group>
      ))}
    </group>
  );
}

export default function HeroScene({ slides, index, pointer, active, reducedMotion, onReady, onFail }) {
  return (
    <Canvas
      frameloop={reducedMotion ? 'demand' : active ? 'always' : 'never'} // no frames when off-screen or in a background tab
      dpr={[1, 1.75]} camera={{ position: [0, 0, 9], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); onFail?.(); });
      }}
    >
      <Environment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 6]} intensity={1.4} />
      <Rig slides={slides} index={index} pointer={pointer} reducedMotion={reducedMotion} onReady={onReady} />
    </Canvas>
  );
}
