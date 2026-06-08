import { toPng, toSvg } from 'html-to-image';

export type ImageType = 'png' | 'svg';

export function getExportFilename(name: string, type: ImageType): string {
  return `${name}-${new Date().toISOString().slice(0, 10)}.${type}`;
}

export async function exportReactFlowImage(type: ImageType, diagramName: string): Promise<void> {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    throw new Error('React Flow viewport not found.');
  }

  const createImage = type === 'png' ? toPng : toSvg;
  const dataUrl = await createImage(viewport, {
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    skipFonts: true,
  });

  const link = document.createElement('a');
  link.download = getExportFilename(diagramName, type);
  link.href = dataUrl;
  link.click();
}
