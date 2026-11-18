import { memo, useMemo, type MouseEvent } from 'react';
import type { PullModel } from '../../lib/bayesPull';
import { floorCorners } from '../../lib/bayesPull';
import { createProjector, labelOffset, type Projected } from '../../lib/constellation';
import PullTooltip from './PullTooltip';

type Placed = { index: number; at: Projected; raw: Projected; radius: number };

function layOut(model: PullModel, width: number, height: number) {
  const project = createProjector(width, height);
  const path = (points: Projected[]) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
  const rows = model.rows.map((row) => row.map(project));
  const columns = rows[0].map((_, column) => rows.map((row) => row[column]));
  const placed = model.points.map((point, index): Placed => {
    const at = project(point.position);
    return { index, at, raw: project([point.position[0], point.rawY, point.position[2]]), radius: Math.max(1.5, point.radius * at.scale) };
  });
  return {
    floor: floorCorners().map(project).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    rowPaths: rows.map(path),
    columnPaths: columns.map(path),
    placed,
    drawOrder: [...placed].sort((a, b) => b.at.depth - a.at.depth),
    labels: model.labels.map((label) => {
      const at = project(label.position);
      const offset = labelOffset(label);
      return { text: label.text, x: at.x + offset.x, y: at.y + offset.y, align: offset.align, title: !!label.title };
    })
  };
}
type Layout = ReturnType<typeof layOut>;

const StaticLayer = memo(function StaticLayer({ layout }: { layout: Layout }) {
  return (
    <>
      <polygon points={layout.floor} fill="var(--cm-text-primary)" fillOpacity={0.035} stroke="var(--cm-control-border)" strokeOpacity={0.55} />
      <g fill="none" strokeLinejoin="round">
        {layout.columnPaths.map((d, i) => (
          <path key={`c${i}`} d={d} stroke="var(--cm-text-primary)" strokeOpacity={0.12} />
        ))}
        {layout.rowPaths.map((d, i) => (
          <path key={`r${i}`} d={d} stroke="var(--cm-accent)" strokeOpacity={0.5} />
        ))}
      </g>
      <g stroke="var(--cm-text-primary)" strokeOpacity={0.28}>
        {layout.drawOrder.map((dot) => (
          <line key={dot.index} x1={dot.raw.x} y1={dot.raw.y} x2={dot.at.x} y2={dot.at.y} />
        ))}
      </g>
      <g fill="var(--cm-text-primary)">
        {layout.drawOrder.map((dot) => (
          <circle key={dot.index} cx={dot.at.x} cy={dot.at.y} r={dot.radius} fillOpacity={0.85} />
        ))}
      </g>
    </>
  );
});

type Props = {
  model: PullModel;
  width: number;
  height: number;
  activeIndex: number | null;
  onActiveChange: (index: number | null) => void;
  onOpen: (index: number) => void;
  inert?: boolean;
};

/** The pull surface as a static SVG: same camera as the 3D scene. Used on phones, without WebGL, and while 3D loads. */
export default function BayesPullSvg({ model, width, height, activeIndex, onActiveChange, onOpen, inert = false }: Props) {
  const layout = useMemo(() => layOut(model, width, height), [model, width, height]);
  const active = activeIndex === null ? null : layout.placed[activeIndex];
  const indexFrom = (event: MouseEvent<SVGGElement>) => {
    const value = (event.target as SVGElement).dataset?.index;
    return value === undefined ? null : Number(value);
  };

  return (
    <div className="absolute inset-0 select-none">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="block">
        <StaticLayer layout={layout} />
        {active && (
          <g pointerEvents="none" stroke="var(--cm-accent)" strokeWidth={1.5} fill="none">
            <line x1={active.raw.x} y1={active.raw.y} x2={active.at.x} y2={active.at.y} />
            <circle cx={active.at.x} cy={active.at.y} r={active.radius + 4} />
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
              <circle key={dot.index} data-index={dot.index} cx={dot.at.x} cy={dot.at.y} r={Math.max(dot.radius, 6)} />
            ))}
          </g>
        )}
      </svg>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 text-[11px] leading-none text-ink-2 tabular-nums">
        {layout.labels.map((label) => (
          <span
            key={`${label.text}-${label.x.toFixed(0)}-${label.y.toFixed(0)}`}
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
          <PullTooltip point={model.points[active.index]} simulated={model.simulated} />
        </div>
      )}
    </div>
  );
}
