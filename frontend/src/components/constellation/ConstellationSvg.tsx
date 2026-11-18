import { memo, useId, useMemo, type MouseEvent } from 'react';
import {
  BOX,
  createProjector,
  labelOffset,
  type ConstellationModel,
  type Projected,
  type Vec3
} from '../../lib/constellation';
import ConstellationTooltip from './ConstellationTooltip';

type Placed = { index: number; at: Projected; raw: Projected; radius: number; glow: number };

type Layout = {
  placed: Placed[];
  /** Far to near, so nearer dots draw on top. */
  drawOrder: Placed[];
  floor: string;
  grid: [Projected, Projected][];
  axis: [Projected, Projected];
  labels: { text: string; x: number; y: number; align: 'center' | 'left' | 'right'; title: boolean }[];
};

function layOut(model: ConstellationModel, width: number, height: number): Layout {
  const project = createProjector(width, height);
  const y = model.floorY;
  const corner = (x: number, z: number): Vec3 => [x * BOX.halfWidth, y, z * BOX.halfDepth];

  const placed = model.points.map((point, index): Placed => {
    const at = project(point.position);
    return {
      index,
      at,
      raw: project([point.position[0], point.rawY, point.position[2]]),
      radius: Math.max(1.4, point.radius * at.scale),
      glow: point.glow
    };
  });

  return {
    placed,
    drawOrder: [...placed].sort((a, b) => b.at.depth - a.at.depth),
    floor: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)]
      .map(project)
      .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' '),
    grid: [
      ...model.ticks.average.map((tick): [Projected, Projected] => [
        project([tick.position[0], y, -BOX.halfDepth]),
        project([tick.position[0], y, BOX.halfDepth])
      ]),
      ...model.ticks.count.map((tick): [Projected, Projected] => [
        project([-BOX.halfWidth, y, tick.position[2]]),
        project([BOX.halfWidth, y, tick.position[2]])
      ])
    ],
    axis: [project([-BOX.halfWidth, y, -BOX.halfDepth]), project([-BOX.halfWidth, BOX.height, -BOX.halfDepth])],
    labels: model.labels.map((label) => {
      const at = project(label.position);
      const offset = labelOffset(label);
      return { text: label.text, x: at.x + offset.x, y: at.y + offset.y, align: offset.align, title: !!label.title };
    })
  };
}

/** Everything that does not change on hover: floor, grid, pull lines and dots. Drawn once. */
const StaticLayer = memo(function StaticLayer({ layout, glowId }: { layout: Layout; glowId: string }) {
  return (
    <>
      <polygon points={layout.floor} fill="var(--cm-text-primary)" fillOpacity={0.035} stroke="var(--cm-control-border)" strokeOpacity={0.55} />
      {layout.grid.map(([from, to], index) => (
        <line key={index} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--cm-text-primary)" strokeOpacity={0.07} />
      ))}
      <line
        x1={layout.axis[0].x}
        y1={layout.axis[0].y}
        x2={layout.axis[1].x}
        y2={layout.axis[1].y}
        stroke="var(--cm-control-border)"
        strokeOpacity={0.7}
      />
      <g stroke="var(--cm-accent)" strokeOpacity={0.3} strokeWidth={1}>
        {layout.drawOrder.map((dot) => (
          <line key={dot.index} x1={dot.raw.x} y1={dot.raw.y} x2={dot.at.x} y2={dot.at.y} />
        ))}
      </g>
      <g fill="var(--cm-accent)" filter={`url(#${glowId})`}>
        {layout.drawOrder.map((dot) => (
          <circle key={dot.index} cx={dot.at.x} cy={dot.at.y} r={dot.radius} fillOpacity={0.55 + 0.45 * dot.glow} />
        ))}
      </g>
    </>
  );
});

type ConstellationSvgProps = {
  model: ConstellationModel;
  /** Size of the chart area in CSS pixels. */
  width: number;
  height: number;
  activeIndex: number | null;
  onActiveChange: (index: number | null) => void;
  onOpen: (index: number) => void;
  /** Draw only the picture: no hover targets, no tooltip. Used under the 3D scene while it loads. */
  inert?: boolean;
};

/**
 * The constellation as a static SVG: the same points, lines and camera as the
 * 3D scene, drawn as a still. It is the chart on phones, without WebGL, and
 * while the 3D code is loading.
 */
export default function ConstellationSvg({
  model,
  width,
  height,
  activeIndex,
  onActiveChange,
  onOpen,
  inert = false
}: ConstellationSvgProps) {
  const glowId = useId();
  const layout = useMemo(() => layOut(model, width, height), [model, width, height]);
  const active = activeIndex === null ? null : layout.placed[activeIndex];

  const indexFrom = (event: MouseEvent<SVGGElement>) => {
    const value = (event.target as SVGElement).dataset?.index;
    return value === undefined ? null : Number(value);
  };

  return (
    <div className="absolute inset-0 select-none">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block">
        <defs>
          <filter id={glowId} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <StaticLayer layout={layout} glowId={glowId} />

        {active && (
          <g pointerEvents="none">
            <line
              x1={active.raw.x}
              y1={active.raw.y}
              x2={active.at.x}
              y2={active.at.y}
              stroke="var(--cm-text-primary)"
              strokeWidth={1.5}
            />
            <circle cx={active.raw.x} cy={active.raw.y} r={3} fill="none" stroke="var(--cm-text-primary)" strokeWidth={1.5} />
            <circle
              cx={active.at.x}
              cy={active.at.y}
              r={active.radius + 4}
              fill="none"
              stroke="var(--cm-text-primary)"
              strokeWidth={1.5}
            />
          </g>
        )}

        {!inert && (
          <g
            fill="transparent"
            className="cursor-pointer"
            onPointerMove={(event) => onActiveChange(indexFrom(event))}
            onPointerLeave={() => onActiveChange(null)}
            onClick={(event) => {
              const index = indexFrom(event);
              if (index !== null) onOpen(index);
            }}
          >
            {layout.drawOrder.map((dot) => (
              <circle key={dot.index} data-index={dot.index} cx={dot.at.x} cy={dot.at.y} r={Math.max(dot.radius, 7)} />
            ))}
          </g>
        )}
      </svg>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-[11px] leading-none text-ink-2 tabular-nums">
        {layout.labels.map((label) => (
          <span
            key={`${label.text}-${label.x.toFixed(0)}`}
            className={label.title ? 'absolute whitespace-nowrap font-medium text-ink' : 'absolute whitespace-nowrap'}
            style={{
              left: label.x,
              top: label.y,
              transform: `translate(${label.align === 'center' ? '-50%' : label.align === 'right' ? '-100%' : '0'}, -50%)`
            }}
          >
            {label.text}
          </span>
        ))}
      </div>

      {active && !inert && (
        <div
          className="absolute z-10"
          style={{
            left: Math.min(Math.max(active.at.x, 128), width - 128),
            top: active.at.y - active.radius - 10,
            transform: `translate(-50%, ${active.at.y < 190 ? `${active.radius * 2 + 20}px` : '-100%'})`
          }}
        >
          <ConstellationTooltip point={model.points[active.index]} />
        </div>
      )}
    </div>
  );
}
