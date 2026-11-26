import { useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

export default function ProductPhoto({ src }) {
  const texture = useLoader(THREE.TextureLoader, src, (loader) => loader.setCrossOrigin('anonymous'));
  const aspectRatio = texture.image?.width && texture.image?.height
    ? texture.image.width / texture.image.height
    : 1;
  const width = aspectRatio >= 1 ? 4.2 : 4.2 * aspectRatio;
  const height = aspectRatio >= 1 ? 4.2 / aspectRatio : 4.2;

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }, [texture]);

  return (
    <mesh>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  );
}
