// The constellation in WebGL. This module pulls in three.js, so it is only ever
// loaded with React.lazy, after the page and the SVG still are already on screen.
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { BOX, CAMERA, labelOffset, type ConstellationModel } from '../../lib/constellation';
import ConstellationTooltip from './ConstellationTooltip';

// Labels and the tooltip are DOM nodes. They mount into a container the wrapper owns, so
// they are removed cleanly when the page is left.
const OverlayContext = createContext<RefObject<HTMLElement> | undefined>(undefined);

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Where the shared camera sits around its target, and how far the view may move.
const BASE_AZIMUTH = Math.atan2(CAMERA.position[0] - CAMERA.target[0], CAMERA.position[2] - CAMERA.target[2]);
const DRAG_RANGE = 0.7;
const DRIFT_RANGE = 0.22;
const DRIFT_SPEED = 0.03; // radians per second: slow enough to read labels while it moves
const RESUME_AFTER_DRAG = 4; // seconds

type SceneProps = {
  model: ConstellationModel;
  activeIndex: number | null;
  /** True while the camera may drift: on screen, tab visible, not paused, motion allowed. */
  running: boolean;
  label: string;
  onActiveChange: (index: number | null) => void;
  onOpen: (index: number) => void;
  /** Called once a frame has been drawn and looks right. */
  onReady: () => void;
  /** Called if WebGL is lost or the first frame comes out wrong. */
  onFailure: () => void;
  /** Where the labels and tooltip are mounted. */
  overlay: RefObject<HTMLElement>;
};

/** Every film as one instanced sphere, plus an invisible, larger copy that takes the pointer. */
function Films({ model, onActiveChange, onOpen }: Pick<SceneProps, 'model' | 'onActiveChange' | 'onOpen'>) {
  const dots = useRef<THREE.InstancedMesh>(null);
  const targets = useRef<THREE.InstancedMesh>(null);
  const canvas = useThree((state) => state.gl.domElement);
  const amber = useMemo(() => new THREE.Color(token('--cm-accent')), []);

  useLayoutEffect(() => {
    const dotMesh = dots.current;
    const targetMesh = targets.current;
    if (!dotMesh || !targetMesh) return;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    model.points.forEach((point, index) => {
      const [x, y, z] = point.position;
      matrix.makeScale(point.radius, point.radius, point.radius).setPosition(x, y, z);
      dotMesh.setMatrixAt(index, matrix);
      // Above 1.0 the colour blooms: higher adjusted scores glow more.
      dotMesh.setColorAt(index, color.copy(amber).multiplyScalar(0.8 + 0.5 * point.glow));
      const reach = Math.max(point.radius, 0.2);
      matrix.makeScale(reach, reach, reach).setPosition(x, y, z);
      targetMesh.setMatrixAt(index, matrix);
    });
    dotMesh.instanceMatrix.needsUpdate = true;
    if (dotMesh.instanceColor) dotMesh.instanceColor.needsUpdate = true;
    targetMesh.instanceMatrix.needsUpdate = true;
    dotMesh.computeBoundingSphere();
    targetMesh.computeBoundingSphere();
  }, [model, amber]);

  const count = model.points.length;
  return (
    <>
      <instancedMesh key={`dots-${count}`} ref={dots} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        key={`targets-${count}`}
        ref={targets}
        args={[undefined, undefined, count]}
        onPointerMove={(event) => {
          event.stopPropagation();
          if (event.instanceId !== undefined) onActiveChange(event.instanceId);
          canvas.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          onActiveChange(null);
          canvas.style.cursor = 'grab';
        }}
        onClick={(event) => {
          event.stopPropagation();
          // A drag that ends on a dot is not a click.
          if (event.delta <= 4 && event.instanceId !== undefined) onOpen(event.instanceId);
        }}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </instancedMesh>
    </>
  );
}

const segments = (positions: number[]) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
};

/** The pull lines, the floor at the dataset mean, its grid, and the score axis. */
function Frame({ model }: { model: ConstellationModel }) {
  const overlay = useContext(OverlayContext);
  const amber = useMemo(() => token('--cm-accent'), []);
  const ink = useMemo(() => token('--cm-text-primary'), []);
  const y = model.floorY;

  const pulls = useMemo(
    () => segments(model.points.flatMap((point) => [point.position[0], point.rawY, point.position[2], ...point.position])),
    [model]
  );
  const grid = useMemo(() => {
    const w = BOX.halfWidth;
    const d = BOX.halfDepth;
    return segments([
      ...model.ticks.average.flatMap((tick) => [tick.position[0], y, -d, tick.position[0], y, d]),
      ...model.ticks.count.flatMap((tick) => [-w, y, tick.position[2], w, y, tick.position[2]])
    ]);
  }, [model, y]);
  const outline = useMemo(() => {
    const w = BOX.halfWidth;
    const d = BOX.halfDepth;
    return segments([-w, y, -d, w, y, -d, w, y, -d, w, y, d, w, y, d, -w, y, d, -w, y, d, -w, y, -d, -w, y, -d, -w, BOX.height, -d]);
  }, [y]);
  useEffect(() => () => [pulls, grid, outline].forEach((geometry) => geometry.dispose()), [pulls, grid, outline]);

  return (
    <>
      <lineSegments geometry={pulls}>
        <lineBasicMaterial color={amber} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={grid}>
        <lineBasicMaterial color={ink} transparent opacity={0.07} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={outline}>
        <lineBasicMaterial color={ink} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <mesh rotation-x={-Math.PI / 2} position={[0, y - 0.01, 0]}>
        <planeGeometry args={[BOX.halfWidth * 2, BOX.halfDepth * 2]} />
        <meshBasicMaterial color={ink} transparent opacity={0.035} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {model.labels.map((label) => {
        const offset = labelOffset(label);
        const shift = offset.align === 'center' ? '-50%' : offset.align === 'right' ? '-100%' : '0px';
        return (
          <Html portal={overlay} key={`${label.text}-${label.position.join(',')}`} position={label.position} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <span
              aria-hidden="true"
              className={
                label.title
                  ? 'block text-[11px] font-medium leading-none whitespace-nowrap text-ink select-none'
                  : 'block text-[11px] leading-none whitespace-nowrap text-ink-2 tabular-nums select-none'
              }
              style={{ transform: `translate(calc(${shift} + ${offset.x}px), calc(-50% + ${offset.y}px))` }}
            >
              {label.text}
            </span>
          </Html>
        );
      })}
    </>
  );
}

/** A halo, a bright pull line and the tooltip for the film under the pointer or the keyboard focus. */
function ActiveFilm({ model, index }: { model: ConstellationModel; index: number }) {
  const point = model.points[index];
  const overlay = useContext(OverlayContext);
  const ink = useMemo(() => token('--cm-text-primary'), []);
  const line = useMemo(
    () => (point ? segments([point.position[0], point.rawY, point.position[2], ...point.position]) : null),
    [point]
  );
  useEffect(() => () => line?.dispose(), [line]);
  if (!point || !line) return null;

  return (
    <>
      <lineSegments geometry={line}>
        <lineBasicMaterial color={ink} toneMapped={false} />
      </lineSegments>
      <mesh position={point.position} scale={point.radius * 1.9}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshBasicMaterial color={ink} transparent opacity={0.25} depthWrite={false} toneMapped={false} />
      </mesh>
      <Html portal={overlay} position={point.position} zIndexRange={[40, 30]} style={{ pointerEvents: 'none' }}>
        <div style={{ transform: 'translate(-50%, calc(-100% - 16px))' }}>
          <ConstellationTooltip point={point} />
        </div>
      </Html>
    </>
  );
}

/** Drag to orbit within limits. No zoom and no pan, so the wheel still scrolls the page. */
function CameraRig({ running }: { running: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const canvas = useThree((state) => state.gl.domElement);
  const dragging = useRef(false);
  const resumeAt = useRef(0);
  const direction = useRef(1);

  useEffect(() => {
    // Vertical swipes scroll the page; horizontal drags orbit.
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
  }, [canvas]);

  useFrame((_state, delta) => {
    const orbit = controls.current;
    if (!orbit || !running || dragging.current || performance.now() / 1000 < resumeAt.current) return;
    const angle = orbit.getAzimuthalAngle();
    if (angle > BASE_AZIMUTH + DRIFT_RANGE) direction.current = -1;
    if (angle < BASE_AZIMUTH - DRIFT_RANGE) direction.current = 1;
    orbit.setAzimuthalAngle(angle + direction.current * DRIFT_SPEED * Math.min(delta, 0.05));
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableZoom={false}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.55}
      target={CAMERA.target}
      minAzimuthAngle={BASE_AZIMUTH - DRAG_RANGE}
      maxAzimuthAngle={BASE_AZIMUTH + DRAG_RANGE}
      minPolarAngle={1.05}
      maxPolarAngle={1.54}
      onStart={() => {
        dragging.current = true;
      }}
      onEnd={() => {
        dragging.current = false;
        resumeAt.current = performance.now() / 1000 + RESUME_AFTER_DRAG;
      }}
    />
  );
}

/**
 * Checks the first frames. If the canvas has come out bright instead of dark
 * (seen on one GPU with an earlier effect), the scene reports failure and the
 * SVG still takes over, so a faulty driver can never leave a white box.
 */
function FrameGuard({ onReady, onFailure }: Pick<SceneProps, 'onReady' | 'onFailure'>) {
  const frames = useRef(0);
  const settled = useRef(false);
  const invalidate = useThree((state) => state.invalidate);

  useFrame(({ gl }) => {
    if (settled.current) return;
    frames.current += 1;
    if (frames.current < 2) {
      invalidate();
      return;
    }
    settled.current = true;
    gl.setRenderTarget(null);
    const context = gl.getContext();
    const pixel = new Uint8Array(4);
    context.readPixels(2, 2, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);
    const luminance = (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
    if (luminance > 0.5) onFailure();
    else onReady();
  }, 2);

  return null;
}

/** Puts the role and label on the <canvas> element itself, and keeps the label current. */
function CanvasLabel({ label }: { label: string }) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', label);
  }, [canvas, label]);
  return null;
}

export default function ConstellationScene({
  model,
  activeIndex,
  running,
  label,
  onActiveChange,
  onOpen,
  onReady,
  onFailure,
  overlay
}: SceneProps) {
  const background = useMemo(() => token('--cm-canvas'), []);

  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop={running ? 'always' : 'demand'}
      camera={{ position: CAMERA.position, fov: CAMERA.fov, near: 0.5, far: 80 }}
      gl={{ alpha: false, antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(background, 1);
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onFailure();
        });
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[background]} />
      <OverlayContext.Provider value={overlay}>
        <Frame model={model} />
        {activeIndex !== null && <ActiveFilm model={model} index={activeIndex} />}
      </OverlayContext.Provider>
      <Films model={model} onActiveChange={onActiveChange} onOpen={onOpen} />
      <CameraRig running={running} />
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.4} luminanceThreshold={0.7} luminanceSmoothing={0.2} />
        <Noise opacity={0.028} />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
      <FrameGuard onReady={onReady} onFailure={onFailure} />
      <CanvasLabel label={label} />
    </Canvas>
  );
}
