import { wrapCardText } from './shareData.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function renderShareCard(model) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas unavailable');
  const measure = (text, size, weight = 600) => {
    context.font = `${weight} ${size}px ${FONT}`;
    return context.measureText(text).width;
  };
  const wrap = (text, width, size, weight) => wrapCardText(text, width, value => measure(value, size, weight));
  const title = wrap(model.title, 1088, 44, 700);
  const jam = model.jamLines.flatMap(line => wrap(line, 1088, 24, 400));
  const cells = (model.sections.length ? model.sections : [{ label: model.title, values: [model.empty] }]).map(section => {
    const labels = wrap(section.label.toLocaleUpperCase(model.language), 486, 19, 600);
    const values = wrap(section.values.join(' + '), 486, 26, 500);
    return { labels, values, height: 48 + labels.length * 26 + 12 + values.length * 35 };
  });
  const rows = [];
  for (let index = 0; index < cells.length; index += 2) {
    rows.push({ cells: cells.slice(index, index + 2), height: Math.max(...cells.slice(index, index + 2).map(v => v.height)) });
  }
  const contentTop = 154 + title.length * 54 + (jam.length ? 20 + jam.length * 34 : 0);
  const footerUrl = wrap(model.generatorUrl, 1088, 22, 400);
  const credit = wrap(model.credit, 1088, 20, 500);
  canvas.height = contentTop + rows.reduce((sum, row) => sum + row.height + 18, 0) + 70 + credit.length * 28 + footerUrl.length * 30;
  context.fillStyle = '#0f1117';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const gradient = context.createLinearGradient(0, 0, 1200, 300);
  gradient.addColorStop(0, '#24203e');
  gradient.addColorStop(1, '#121720');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1200, contentTop - 20);
  const draw = (lines, x, y, size, lineHeight, color, weight = 600) => {
    context.font = `${weight} ${size}px ${FONT}`;
    context.fillStyle = color;
    context.textBaseline = 'top';
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  };
  context.fillStyle = '#8b7cff';
  context.fillRect(56, 49, 6, 28);
  draw(['Game Idea Generator'], 78, 48, 26, 34, '#b3a8ff');
  draw(title, 56, 106, 44, 54, '#ffab66', 700);
  draw(jam, 56, 120 + title.length * 54, 24, 34, '#c0c7d6', 400);
  let top = contentTop;
  for (const row of rows) {
    row.cells.forEach((cell, index) => {
      const x = 56 + index * 554;
      context.fillStyle = '#1b202b';
      context.beginPath();
      context.roundRect(x, top, 534, row.height, 14);
      context.fill();
      context.strokeStyle = '#303749';
      context.stroke();
      draw(cell.labels, x + 24, top + 24, 19, 26, '#b3a8ff');
      draw(cell.values, x + 24, top + 36 + cell.labels.length * 26, 26, 35, '#e7eaf0', 500);
    });
    top += row.height + 18;
  }
  context.fillStyle = '#303749';
  context.fillRect(56, top + 8, 1088, 1);
  draw(credit, 56, top + 30, 20, 28, '#9da7bc', 500);
  draw(footerUrl, 56, top + 34 + credit.length * 28, 22, 30, '#b3a8ff', 400);
  return canvas;
}

export async function downloadShareCard(model) {
  const canvas = renderShareCard(model);
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value =>
    value ? resolve(value) : reject(new Error('PNG export failed')), 'image/png'));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `game-idea-${model.language}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
