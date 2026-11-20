// The pull surface in WebGL. Loaded with React.lazy, only where the 3D chart is used.
// It renders on demand: a frame is drawn only when something changes (a drag, a
// hover, a new slider value), so nothing runs while the chart sits still,
// is off screen, or the tab is hidden.
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { floorCorners, type PullModel } from '../../lib/bayesPull';
import { CAMERA, labelOffset } from '../../lib/constellation';
import PullTooltip from './PullTooltip';

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const BASE_AZIMUTH = Math.atan2(CAMERA.position[0] - CAMERA.target[0], CAMERA.position[2] - CAMERA.target[2]);

type SceneProps = {
  model: PullModel;
  activeIndex: number | null;
  label: string;
  onActiveChange: (index: number | null) => void;
  onOpen: (index: number) => void;
  onReady: () => void;
  onFailure: () => void;
  overlay: RefObject<HTMLElement>;
};

const segments = (positions: number[]) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
};

function Surface({ model }: { model: PullModel }) {
  const amber = useMemo(() => new THREE.Color(token('--cm-accent')), []);
  const ink = useMemo(() => token('--cm-text-primary'), []);
  const { surface, rows, columns, floor } = useMemo(() => {
    const height = model.rows.length;
    const width = model.rows[0].length;
    const positions: number[] = [];
    const colors: number[] = [];
    const dark = new THREE.Color(token('--cm-canvas'));
    const color = new THREE.Color();
    for (const row of model.rows) {
      for (const p of row) {
        positions.push(...p);
        color.copy(dark).lerp(amber, 0.25 + 0.75 * Math.min(1, p[1] / 7));
        colors.push(color.r, color.g, color.b);
      }
    }
    const index: number[] = [];
    for (let r = 0; r < height - 1; r += 1) {
      for (let c = 0; c < width - 1; c += 1) {
        const a = r * width + c;
        index.push(a, a + 1, a + width, a + 1, a + width + 1, a + width);
      }
    }
    const surfaceGeometry = segments(positions);
    surfaceGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    surfaceGeometry.setIndex(index);
    const rowLines: number[] = [];
    const columnLines: number[] = [];
    model.rows.forEach((row, r) =>
      row.forEach((p, c) => {
        if (c < width - 1) rowLines.push(...p, ...row[c + 1]);
        if (r < height - 1) columnLines.push(...p, ...model.rows[r + 1][c]);
      })
    );
    const corners = floorCorners();
    const floorLines = corners.flatMap((p, i) => [...p, ...corners[(i + 1) % 4]]);
    return { surface: surfaceGeometry, rows: segments(rowLines), columns: segments(columnLines), floor: segments(floorLines) };
  }, [model, amber]);
  useEffect(() => () => [surface, rows, columns, floor].forEach((g) => g.dispose()), [surface, rows, columns, floor]);

  return (
    <>
      <mesh geometry={surface}>
        <meshBasicMaterial vertexColors transparent opacity={0.32} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <lineSegments geometry={rows}>
        <lineBasicMaterial color={amber} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={columns}>
        <lineBasicMaterial color={ink} transparent opacity={0.12} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <lineSegments geometry={floor}>
        <lineBasicMaterial color={ink} transparent opacity={0.3} depthWrite={false} toneMapped={false} />
      </lineSegments>
    </>
  );
}

function Labels({ model, overlay }: { model: PullModel; overlay: RefObject<HTMLElement> }) {
  return (
    <>
      {model.labels.map((label) => {
        const offset = labelOffset(label);
        const shift = offset.align === 'center' ? '-50%' : offset.align === 'right' ? '-100%' : '0px';
        return (
          <Html portal={overlay} key={`${label.text}-${label.position.join(',')}`} position={label.position} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <span
              aria-hidden="true"
              className={
                label.title
                  ? 'block select-none whitespace-nowrap text-[11px] font-medium leading-none text-ink'
                  : 'block select-none whitespace-nowrap text-[11px] leading-none text-ink-2 tabular-nums'
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

function Films({ model, activeIndex, overlay, onActiveChange, onOpen }: Omit<SceneProps, 'label' | 'onReady' | 'onFailure'>) {
  const dots = useRef<THREE.InstancedMesh>(null);
  const targets = useRef<THREE.InstancedMesh>(null);
  const canvas = useThree((state) => state.gl.domElement);
  const ink = useMemo(() => token('--cm-text-primary'), []);
  const amber = useMemo(() => token('--cm-accent'), []);
  const stems = useMemo(
    () => segments(model.points.flatMap((p) => [p.position[0], p.rawY, p.position[2], ...p.position])),
    [model]
  );
  useEffect(() => () => stems.dispose(), [stems]);

  useLayoutEffect(() => {
    const matrix = new THREE.Matrix4();
    model.points.forEach((point, index) => {
      const [x, y, z] = point.position;
      matrix.makeScale(point.radius, point.radius, point.radius).setPosition(x, y, z);
      dots.current?.setMatrixAt(index, matrix);
      const reach = Math.max(point.radius, 0.18);
      matrix.makeScale(reach, reach, reach).setPosition(x, y, z);
      targets.current?.setMatrixAt(index, matrix);
    });
    for (const mesh of [dots.current, targets.current]) {
      if (!mesh) continue;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [model]);

  const count = model.points.length;
  const active = activeIndex === null ? null : model.points[activeIndex];
  return (
    <>
      <lineSegments geometry={stems}>
        <lineBasicMaterial color={ink} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </lineSegments>
      <instancedMesh key={`d${count}`} ref={dots} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color={ink} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        key={`t${count}`}
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
          if (event.delta <= 4 && event.instanceId !== undefined) onOpen(event.instanceId);
        }}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </instancedMesh>
      {active && (
        <>
          <mesh position={active.position} scale={active.radius * 2}>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial color={amber} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
          </mesh>
          <Html portal={overlay} position={active.position} zIndexRange={[40, 30]} style={{ pointerEvents: 'none' }}>
            <div style={{ transform: 'translate(-50%, calc(-100% - 14px))' }}>
              <PullTooltip point={active} simulated={model.simulated} />
            </div>
          </Html>
        </>
      )}
    </>
  );
}

/** If the first frame comes out bright instead of dark (a faulty driver), hand over to the SVG. */
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
    const context = gl.getContext();
    const pixel = new Uint8Array(4);
    context.readPixels(2, 2, 1, 1, context.RGBA, context.UNSIGNED_BYTE, pixel);
    const luminance = (0.2126 * pixel[0] + 0.7152 * pixel[1] + 0.0722 * pixel[2]) / 255;
    if (luminance > 0.5) onFailure();
    else onReady();
  });
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

export default function BayesPullScene({ model, activeIndex, label, onActiveChange, onOpen, onReady, onFailure, overlay }: SceneProps) {
  const background = useMemo(() => token('--cm-canvas'), []);
  return (
    <Canvas
      flat
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: CAMERA.position, fov: CAMERA.fov, near: 0.5, far: 80 }}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(background, 1);
        gl.domElement.style.touchAction = 'pan-y';
        gl.domElement.style.cursor = 'grab';
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          onFailure();
        });
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={[background]} />
      <Surface model={model} />
      <Labels model={model} overlay={overlay} />
      <Films model={model} activeIndex={activeIndex} overlay={overlay} onActiveChange={onActiveChange} onOpen={onOpen} />
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.55}
        target={CAMERA.target}
        minAzimuthAngle={BASE_AZIMUTH - 0.7}
        maxAzimuthAngle={BASE_AZIMUTH + 0.7}
        minPolarAngle={1.05}
        maxPolarAngle={1.54}
      />
      <FrameGuard onReady={onReady} onFailure={onFailure} />
      <CanvasLabel label={label} />
    </Canvas>
  );
}
