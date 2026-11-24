import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { formatPropertyValue, getMaterialPropertyValue, PROPERTY_MAP } from '../../data/properties';
import { Material, PropertyKey, RecommendationItem } from '../../types/material';

const SERIES_COLORS = ['#22d3ee', '#3b82f6', '#f59e0b', '#ec4899'];

interface RadarSeries {
  id: string;
  label: string;
  color: string;
  values: Record<PropertyKey, number | null>; // normalized 0..100
  rawValues: Record<PropertyKey, number | null>;
}

interface RadarComparisonChartProps {
  materials: Material[];
  allMaterialsForBounds: Material[];
  axes: PropertyKey[];
  invertLowIsBetter?: boolean;
  reducedMotion?: boolean;
}

export const RadarComparisonChart: React.FC<RadarComparisonChartProps> = ({
  materials,
  allMaterialsForBounds,
  axes,
  invertLowIsBetter = true,
  reducedMotion = false,
}) => {
  const [hoveredVertex, setHoveredVertex] = useState<{
    seriesLabel: string;
    axis: PropertyKey;
    rawValue: number | null;
    normValue: number;
    color: string;
  } | null>(null);

  const seriesList: RadarSeries[] = useMemo(() => {
    const bounds: Record<string, { min: number; max: number }> = {};
    for (const key of axes) {
      const def = PROPERTY_MAP[key];
      const vals = allMaterialsForBounds
        .map((m) => getMaterialPropertyValue(m, key))
        .filter((v): v is number => v != null && Number.isFinite(v));
      const min = vals.length > 0 ? Math.min(...vals) : def.minBound;
      const max = vals.length > 0 ? Math.max(...vals) : def.maxBound;
      bounds[key] = { min, max: max > min ? max : min + 1 };
    }

    return materials.map((m, idx) => {
      const normMap = {} as Record<PropertyKey, number | null>;
      const rawMap = {} as Record<PropertyKey, number | null>;

      for (const key of axes) {
        const def = PROPERTY_MAP[key];
        const raw = getMaterialPropertyValue(m, key);
        rawMap[key] = raw;

        if (raw == null) {
          normMap[key] = null;
          continue;
        }
        const { min, max } = bounds[key];
        let ratio = 0.5;
        if (def.scaleType === 'log') {
          const sMin = Math.log10(Math.max(min, 0.01));
          const sMax = Math.log10(Math.max(max, 0.02));
          const sVal = Math.log10(Math.max(raw, 0.005));
          ratio = sMax > sMin ? (sVal - sMin) / (sMax - sMin) : 0.5;
        } else {
          ratio = (raw - min) / (max - min);
        }
        ratio = Math.min(1, Math.max(0.05, ratio));
        if (invertLowIsBetter && (key === 'density' || key === 'thermalExpansion')) {
          ratio = Math.max(0.08, 1 - ratio + 0.05);
        }
        normMap[key] = Math.round(Math.min(100, ratio * 100));
      }

      return {
        id: m.id,
        label: m.nameKo,
        color: SERIES_COLORS[idx % SERIES_COLORS.length],
        values: normMap,
        rawValues: rawMap,
      };
    });
  }, [materials, allMaterialsForBounds, axes, invertLowIsBetter]);

  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 126;
  const angleStep = (Math.PI * 2) / Math.max(axes.length, 3);

  const getPoint = (axisIdx: number, pct: number) => {
    const angle = axisIdx * angleStep - Math.PI / 2;
    const r = (pct / 100) * radius;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className="w-full max-w-[400px] aspect-square relative">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
          {/* Concentric grid rings */}
          {[25, 50, 75, 100].map((ring) => {
            const pts = axes
              .map((_, i) => {
                const p = getPoint(i, ring);
                return `${p.x},${p.y}`;
              })
              .join(' ');
            return (
              <polygon
                key={ring}
                points={pts}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
              />
            );
          })}

          {/* Radial axes & labels */}
          {axes.map((key, i) => {
            const outer = getPoint(i, 100);
            const labelPos = getPoint(i, 121);
            const def = PROPERTY_MAP[key];
            const anchor =
              Math.abs(labelPos.x - cx) < 12
                ? 'middle'
                : labelPos.x > cx
                ? 'start'
                : 'end';

            return (
              <g key={key}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="fill-slate-300 text-[10px] font-mono-tabular"
                >
                  {def.nameKo}
                </text>
                <text
                  x={labelPos.x}
                  y={labelPos.y + 12}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className="fill-slate-500 text-[9px] font-mono-tabular"
                >
                  ({def.unit})
                </text>
              </g>
            );
          })}

          {/* Polygons */}
          {seriesList.map((series) => {
            const pts = axes
              .map((key, i) => {
                const val = series.values[key] ?? 0;
                const p = getPoint(i, val);
                return `${p.x},${p.y}`;
              })
              .join(' ');

            return (
              <g key={series.id}>
                <motion.polygon
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35 }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  points={pts}
                  fill={series.color}
                  fillOpacity={0.14}
                  stroke={series.color}
                  strokeWidth="2"
                />
                {axes.map((key, i) => {
                  const norm = series.values[key];
                  if (norm == null) return null;
                  const p = getPoint(i, norm);
                  return (
                    <circle
                      key={`${series.id}-${key}`}
                      cx={p.x}
                      cy={p.y}
                      r={4.5}
                      fill={series.color}
                      stroke="#060911"
                      strokeWidth="1.5"
                      className="cursor-pointer transition-transform hover:scale-125"
                      onMouseEnter={() =>
                        setHoveredVertex({
                          seriesLabel: series.label,
                          axis: key,
                          rawValue: series.rawValues[key],
                          normValue: norm,
                          color: series.color,
                        })
                      }
                      onMouseLeave={() => setHoveredVertex(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {hoveredVertex && (
          <div className="pointer-events-none absolute top-2 right-2 bg-[#0a101e] border border-slate-700 rounded-md px-3 py-2 shadow-xl z-20 min-w-[175px]">
            <p className="text-xs font-semibold truncate" style={{ color: hoveredVertex.color }}>
              {hoveredVertex.seriesLabel}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {PROPERTY_MAP[hoveredVertex.axis].nameKo}
            </p>
            <p className="text-sm font-mono-tabular text-slate-100 mt-0.5">
              {formatPropertyValue(hoveredVertex.rawValue, hoveredVertex.axis)}{' '}
              <span className="text-[11px] text-slate-400">
                {PROPERTY_MAP[hoveredVertex.axis].unit}
              </span>
            </p>
            <p className="text-[10px] font-mono-tabular text-cyan-400 mt-0.5">
              정규화 지수: {hoveredVertex.normValue} / 100
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-2 text-xs">
        {seriesList.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="truncate max-w-[160px]">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PropertyBarChartProps {
  materials: Material[];
  propertyKey: PropertyKey;
  reducedMotion?: boolean;
}

export const PropertyBarChart: React.FC<PropertyBarChartProps> = ({
  materials,
  propertyKey,
  reducedMotion = false,
}) => {
  const def = PROPERTY_MAP[propertyKey];
  const entries = materials.map((m, idx) => ({
    material: m,
    value: getMaterialPropertyValue(m, propertyKey),
    color: SERIES_COLORS[idx % SERIES_COLORS.length],
  }));

  const validValues = entries
    .map((e) => e.value)
    .filter((v): v is number => v != null && Number.isFinite(v));
  const maxVal = validValues.length > 0 ? Math.max(...validValues, 0.001) : 1;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-100">{def.nameKo}</h4>
          <p className="text-xs text-slate-400">{def.nameEn}</p>
        </div>
        <span className="text-xs font-mono-tabular text-cyan-400">단위: {def.unit}</span>
      </div>

      <div className="space-y-2.5">
        {entries.map((entry) => {
          const pct =
            entry.value != null && maxVal > 0
              ? Math.max(3, Math.min(100, (Math.max(0, entry.value) / maxVal) * 100))
              : 0;
          return (
            <div key={entry.material.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 truncate max-w-[60%]">{entry.material.nameKo}</span>
                <span className="font-mono-tabular text-slate-100">
                  {entry.value != null ? (
                    <>
                      {formatPropertyValue(entry.value, propertyKey)}{' '}
                      <span className="text-slate-400">{def.unit}</span>
                    </>
                  ) : (
                    <span className="text-amber-400">데이터 미확보</span>
                  )}
                </span>
              </div>
              <div className="h-2.5 bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                {entry.value != null && (
                  <motion.div
                    initial={reducedMotion ? false : { width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface ScoreComparisonChartProps {
  items: RecommendationItem[];
  reducedMotion?: boolean;
}

export const ScoreComparisonChart: React.FC<ScoreComparisonChartProps> = ({
  items,
  reducedMotion = false,
}) => {
  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.material.id} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono-tabular text-cyan-400 shrink-0">
                {item.rank ? `${item.rank}순위` : '후보'}
              </span>
              <span className="text-slate-100 font-medium truncate">{item.material.nameKo}</span>
            </div>
            <span className="font-mono-tabular font-semibold text-slate-100 shrink-0">
              {item.totalScore.toFixed(1)} / 100
            </span>
          </div>
          <div className="h-3 bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
            <motion.div
              initial={reducedMotion ? false : { width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(2, item.totalScore))}%` }}
              transition={{ duration: 0.45, delay: idx * 0.06 }}
              className="h-full"
              style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
