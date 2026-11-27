import { useThree } from '@react-three/fiber';
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

// Shared set-building pieces: a polished floor with real planar reflections,
// and wall slabs with window openings.

// ---------------------------------------------------------------- floor with planar reflections
export const ReflectiveFloor: React.FC<{ texture: THREE.Texture; repeat: number; y: number; roughness?: number; strength?: number; tint?: string }> = ({ texture, repeat, y, roughness = 0.66, strength = 0.7, tint = '#FFFFFF' }) => {
  const size = useThree((s) => s.size);
  const { reflector, floor } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(40, 40);
    const reflector = new Reflector(geo, { textureWidth: Math.round(size.width * 0.5), textureHeight: Math.round(size.height * 0.5), clipBias: 0.003, multisample: 0 });
    reflector.rotation.x = -Math.PI / 2;
    reflector.position.y = y;
    const rm = reflector.material as THREE.ShaderMaterial;
    rm.colorWrite = false;
    rm.depthWrite = false;
    reflector.renderOrder = -100; // render the reflection before anything samples it
    reflector.userData.floorReflector = true;
    const map = texture.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeat, repeat);
    map.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ map, color: tint, roughness, metalness: 0, envMapIntensity: 0.25 });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.tReflect = { value: reflector.getRenderTarget().texture };
      shader.uniforms.uReflectMatrix = { value: rm.uniforms.textureMatrix.value };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform mat4 uReflectMatrix;\nvarying vec4 vReflectUv;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvReflectUv = uReflectMatrix * vec4( position, 1.0 );');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D tReflect;\nvarying vec4 vReflectUv;')
        .replace(
          '#include <tonemapping_fragment>',
          `{
            vec2 ruv = vReflectUv.xy / vReflectUv.w;
            vec3 refl = vec3( 0.0 );
            float wsum = 0.0;
            for ( int i = -2; i <= 2; i ++ ) {
              for ( int j = -2; j <= 2; j ++ ) {
                float w = exp( - float( i * i + j * j ) * 0.35 );
                refl += texture2D( tReflect, ruv + vec2( float( i ) * 0.0016, float( j ) * 0.0026 ) ).rgb * w;
                wsum += w;
              }
            }
            refl /= wsum;
            float ndv = clamp( dot( normalize( vViewPosition ), normal ), 0.0, 1.0 );
            float fres = 0.06 + 0.94 * pow( 1.0 - ndv, 4.0 );
            float lum = dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) );
            gl_FragColor.rgb += min( refl, vec3( 2.5 ) ) * fres * smoothstep( 0.015, 0.12, lum ) * ${strength.toFixed(3)};
          }
          #include <tonemapping_fragment>`,
        );
    };
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = y;
    floor.receiveShadow = true;
    const draw = reflector.onBeforeRender.bind(reflector);
    reflector.onBeforeRender = (...args) => {
      floor.visible = false;
      draw(...args);
      floor.visible = true;
    };
    return { reflector, floor };
  }, [size.width, size.height, texture, repeat, y, roughness, strength, tint]);
  return (
    <>
      <primitive object={reflector} />
      <primitive object={floor} />
    </>
  );
};

/** A wall slab with rectangular / arched openings, extruded for thickness. */
export const wallWithHoles = (w0: number, w1: number, h0: number, h1: number, holes: { c: number; w: number; y0: number; y1: number; arch?: boolean }[], depth: number) => {
  const s = new THREE.Shape();
  s.moveTo(w0, h0);
  s.lineTo(w1, h0);
  s.lineTo(w1, h1);
  s.lineTo(w0, h1);
  s.closePath();
  for (const h of holes) {
    const p = new THREE.Path();
    const x0 = h.c - h.w / 2;
    const x1 = h.c + h.w / 2;
    p.moveTo(x0, h.y0);
    p.lineTo(x1, h.y0);
    if (h.arch) {
      p.lineTo(x1, h.y1 - h.w / 2);
      p.absarc(h.c, h.y1 - h.w / 2, h.w / 2, 0, Math.PI, false);
    } else {
      p.lineTo(x1, h.y1);
      p.lineTo(x0, h.y1);
    }
    p.closePath();
    s.holes.push(p);
  }
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 });
};

