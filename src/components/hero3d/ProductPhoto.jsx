import { useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export default function ProductPhoto({ src }) {
  const texture = useLoader(THREE.TextureLoader, src, (loader) => loader.setCrossOrigin('anonymous'));

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh>
      <planeGeometry args={[3.4, 3.4]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
