export type ImageType = 'png' | 'svg';

type ExportableNode = {
  position: {
    x: number;
    y: number;
  };
  width?: number | null;
  height?: number | null;
};

type FullDiagramExportOptions = {
  width: number;
  height: number;
  style: {
    width: string;
    height: string;
    transform: string;
  };
};

const DEFAULT_NODE_WIDTH = 220;
const DEFAULT_NODE_HEIGHT = 120;
const DEFAULT_EXPORT_PADDING = 64;

export function getExportFilename(name: string, type: ImageType): string {
  return `${name}-${new Date().toISOString().slice(0, 10)}.${type}`;
}

export function buildFullDiagramExportOptions(
  nodes: ExportableNode[],
  padding = DEFAULT_EXPORT_PADDING
): FullDiagramExportOptions {
  if (nodes.length === 0) {
    const fallbackWidth = 800;
    const fallbackHeight = 600;
    return {
      width: fallbackWidth,
      height: fallbackHeight,
      style: {
        width: `${fallbackWidth}px`,
        height: `${fallbackHeight}px`,
        transform: 'translate(0px, 0px) scale(1)',
      },
    };
  }

  const bounds = nodes.reduce(
    (rect, node) => {
      const width = node.width ?? DEFAULT_NODE_WIDTH;
      const height = node.height ?? DEFAULT_NODE_HEIGHT;
      return {
        minX: Math.min(rect.minX, node.position.x),
        minY: Math.min(rect.minY, node.position.y),
        maxX: Math.max(rect.maxX, node.position.x + width),
        maxY: Math.max(rect.maxY, node.position.y + height),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  );
  const width = Math.ceil(bounds.maxX - bounds.minX + padding * 2);
  const height = Math.ceil(bounds.maxY - bounds.minY + padding * 2);

  return {
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${padding - bounds.minX}px, ${padding - bounds.minY}px) scale(1)`,
    },
  };
}

export async function exportReactFlowImage(type: ImageType, diagramName: string, nodes: ExportableNode[]): Promise<void> {
  const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewport) {
    throw new Error('React Flow viewport not found.');
  }

  const selectedElements = viewport.querySelectorAll('.selected');
  const removedClasses: Array<{ element: Element; classes: string[] }> = [];
  selectedElements.forEach((element) => {
    const classes = element.className.split(' ').filter((cls) => cls === 'selected');
    if (classes.length > 0) {
      removedClasses.push({ element, classes });
      element.classList.remove('selected');
    }
  });

  try {
    const { toPng, toSvg } = await import('html-to-image');
    const createImage = type === 'png' ? toPng : toSvg;
    const exportOptions = buildFullDiagramExportOptions(nodes);
    const dataUrl = await createImage(viewport, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      skipFonts: true,
      width: exportOptions.width,
      height: exportOptions.height,
      style: exportOptions.style,
    });

    const link = document.createElement('a');
    link.download = getExportFilename(diagramName, type);
    link.href = dataUrl;
    link.click();
  } finally {
    removedClasses.forEach(({ element }) => element.classList.add('selected'));
  }
}
