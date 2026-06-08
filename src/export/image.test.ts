import { buildFullDiagramExportOptions, getExportFilename } from './image';

it('builds stable image export filenames with the current date', () => {
  expect(getExportFilename('huishengchart', 'png')).toMatch(/^huishengchart-\d{4}-\d{2}-\d{2}\.png$/);
  expect(getExportFilename('huishengchart', 'svg')).toMatch(/^huishengchart-\d{4}-\d{2}-\d{2}\.svg$/);
});

it('builds export options that include the full diagram bounds', () => {
  const options = buildFullDiagramExportOptions(
    [
      { position: { x: 240, y: 160 }, width: 260, height: 140 },
      { position: { x: -120, y: 720 }, width: 180, height: 220 },
      { position: { x: 820, y: -80 }, width: 200, height: 120 },
    ],
    32
  );

  expect(options.width).toBe(1204);
  expect(options.height).toBe(1084);
  expect(options.style).toEqual({
    width: '1204px',
    height: '1084px',
    transform: 'translate(152px, 112px) scale(1)',
  });
});
