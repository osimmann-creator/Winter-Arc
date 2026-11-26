import { useFrame, useThree } from '@react-three/fiber';
import { BloomEffect, BrightnessContrastEffect, ChromaticAberrationEffect, EffectComposer, EffectPass, HueSaturationEffect, KernelSize, RenderPass, ToneMappingEffect, ToneMappingMode, VignetteEffect } from 'postprocessing';
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';

// Film finish: HDR bloom on the sun, chrome and gold; a touch of chromatic
// aberration on impacts; vignette; ACES tone mapping. The plaque has its own
// scene, drawn over the world before the effects so it blooms with it.

export const Post: React.FC<{ overlay: { scene: THREE.Scene; camera: THREE.Camera }; bloom: number; aberration: number; exposure: number }> = ({ overlay, bloom, aberration, exposure }) => {
  const { gl, scene, camera, size } = useThree();
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, camera));
    const over = new RenderPass(overlay.scene, overlay.camera);
    over.clearPass.setClearFlags(false, true, false);
    composer.addPass(over);
    const bloomFx = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, intensity: 1.0, radius: 0.72, kernelSize: KernelSize.LARGE });
    const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: true, modulationOffset: 0.25 });
    const vignette = new VignetteEffect({ offset: 0.3, darkness: 0.52 });
    const grade = new BrightnessContrastEffect({ brightness: 0, contrast: 0.06 });
    const sat = new HueSaturationEffect({ saturation: 0.1 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    composer.addPass(new EffectPass(camera, bloomFx, ca, vignette));
    composer.addPass(new EffectPass(camera, tone, grade, sat));
    return { composer, bloomFx, ca, tone };
  }, [gl, scene, camera, overlay]);
  useLayoutEffect(() => {
    fx.composer.setSize(size.width, size.height);
  }, [fx, size.width, size.height]);
  useLayoutEffect(() => {
    fx.bloomFx.intensity = bloom;
    fx.ca.offset.set(aberration * 0.0035, aberration * 0.0018);
    gl.toneMappingExposure = exposure;
  }, [fx, bloom, aberration, exposure, gl]);
  // Remotion drives R3F with advance(); a priority-1 callback takes over the render.
  useFrame(() => {
    fx.composer.render(1 / 30);
  }, 1);
  return null;
};
