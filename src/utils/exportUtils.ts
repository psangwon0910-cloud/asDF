import { formatPropertyValue, getMaterialPropertyValue, PROPERTY_DEFINITIONS } from '../data/properties';
import { Material, PropertyConstraint, PropertyKey, RecommendationSummary } from '../types/material';

/**
 * Downloads a UTF-8 BOM CSV file compatible with Excel (preserves Korean Hangul).
 */
export function downloadRecommendationCSV(
  summary: RecommendationSummary,
  constraints: Record<PropertyKey, PropertyConstraint>
): void {
  const activeDefs = PROPERTY_DEFINITIONS.filter((d) => constraints[d.key].direction !== 'ignore');
  const rows: string[][] = [];

  rows.push([
    '순위',
    '소재명(한글)',
    '소재명(영문)',
    '분류',
    '조성',
    '종합점수(100)',
    '데이터커버리지(%)',
    '필수조건충족',
    ...PROPERTY_DEFINITIONS.map((d) => `${d.nameKo}(${d.unit})`),
    '측정조건',
    '데이터출처',
  ]);

  const allItems = [...summary.passing, ...summary.rejected];
  for (const item of allItems) {
    const m = item.material;
    rows.push([
      item.rank ? `${item.rank}순위` : '조건미충족',
      m.nameKo,
      m.name,
      m.category,
      m.composition,
      item.totalScore.toFixed(1),
      Math.round(item.coverageRatio * 100).toString(),
      item.passedAllHardConstraints ? '충족' : `미충족(${item.failedHardConstraints.join(', ')})`,
      ...PROPERTY_DEFINITIONS.map((d) => {
        const val = getMaterialPropertyValue(m, d.key);
        return val == null ? 'N/A' : formatPropertyValue(val, d.key);
      }),
      m.dataConditions ?? '',
      m.sources.join(' | '),
    ]);
  }

  // Also include active criteria summary at bottom
  rows.push([]);
  rows.push(['[적용된 탐색 조건]', `활성 물성 수: ${activeDefs.length}`]);
  for (const d of activeDefs) {
    const c = constraints[d.key];
    rows.push([d.nameKo, d.unit, `방향:${c.direction}`, `중요도:${c.importance}`, `필수:${c.isHardConstraint}`]);
  }

  const csvContent =
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      )
      .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `matter-finder-report-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a high-resolution PNG combining the live 3D WebGL specimen snapshot
 * and calibrated telemetry summary card.
 */
export function downloadSpecimenSnapshotPNG(
  material: Material,
  score: number | null,
  webglDataUrl: string | null
): void {
  const canvas = document.createElement('canvas');
  canvas.width = 1400;
  canvas.height = 880;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#060911';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle grid
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  const finishRender = () => {
    // Header text
    ctx.fillStyle = '#22d3ee';
    ctx.font = '600 18px "JetBrains Mono", monospace';
    ctx.fillText('MATTER FINDER · MATERIAL DISCOVERY SPECIMEN', 56, 64);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 38px "Plus Jakarta Sans", "Noto Sans KR", sans-serif';
    ctx.fillText(material.nameKo, 56, 118);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '400 20px "JetBrains Mono", monospace';
    ctx.fillText(`${material.name}  ·  ${material.category}  ·  ${material.composition}`, 56, 154);

    if (score !== null) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(1100, 48, 244, 108);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1100, 48, 244, 108);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 15px "Noto Sans KR", sans-serif';
      ctx.fillText('종합 적합도 점수', 1124, 82);

      ctx.fillStyle = '#22d3ee';
      ctx.font = '700 44px "JetBrains Mono", monospace';
      ctx.fillText(`${score.toFixed(1)}`, 1124, 134);
      ctx.fillStyle = '#64748b';
      ctx.font = '400 18px "JetBrains Mono", monospace';
      ctx.fillText('/ 100', 1245, 134);
    }

    // Property telemetry table on right half
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(760, 200, 584, 580);
    ctx.strokeStyle = '#1e293b';
    ctx.strokeRect(760, 200, 584, 580);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 20px "Noto Sans KR", sans-serif';
    ctx.fillText('주요 물성 데이터 (검증 대표값)', 790, 244);

    const keyProps = PROPERTY_DEFINITIONS.slice(0, 10);
    keyProps.forEach((def, idx) => {
      const y = 290 + idx * 46;
      const val = getMaterialPropertyValue(material, def.key);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '400 17px "Noto Sans KR", sans-serif';
      ctx.fillText(def.nameKo, 790, y);

      ctx.fillStyle = val != null ? '#f1f5f9' : '#64748b';
      ctx.font = '600 18px "JetBrains Mono", monospace';
      const valStr = `${formatPropertyValue(val, def.key)} ${val != null ? def.unit : ''}`;
      ctx.fillText(valStr, 1060, y);

      ctx.strokeStyle = 'rgba(30,41,59,0.7)';
      ctx.beginPath();
      ctx.moveTo(790, y + 14);
      ctx.lineTo(1314, y + 14);
      ctx.stroke();
    });

    // Footer disclaimer
    ctx.fillStyle = '#64748b';
    ctx.font = '400 14px "Noto Sans KR", sans-serif';
    ctx.fillText(
      `출처: ${material.sources[0] ?? 'Materials Reference'} · 3D 구조는 개념 설명용 개략 시각화입니다.`,
      56,
      834
    );

    const pngUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngUrl;
    link.download = `${material.id}-specimen.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (webglDataUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#090e1a';
      ctx.fillRect(56, 200, 668, 580);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(56, 200, 668, 580);

      const scale = Math.min(640 / img.width, 540 / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(
        img,
        56 + (668 - drawW) / 2,
        200 + (580 - drawH) / 2,
        drawW,
        drawH
      );
      finishRender();
    };
    img.onerror = finishRender;
    img.src = webglDataUrl;
  } else {
    finishRender();
  }
}
