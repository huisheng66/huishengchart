import { getExportFilename } from './image';

it('builds stable image export filenames with the current date', () => {
  expect(getExportFilename('huishengchart', 'png')).toMatch(/^huishengchart-\d{4}-\d{2}-\d{2}\.png$/);
  expect(getExportFilename('huishengchart', 'svg')).toMatch(/^huishengchart-\d{4}-\d{2}-\d{2}\.svg$/);
});
