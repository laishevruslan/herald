import { type SuikaEditor } from '../editor';
import { type SuikaGraphics } from '../graphics';
import { toPNGBlob, toSVG } from '../to_svg';

export const exportService = {
  exportOriginFile: (editor: SuikaEditor, filename = 'design') => {
    const data = editor.sceneGraph.toJSON();
    const blob = new Blob([data], {
      type: 'application/json',
    });
    download(blob, filename + '.suika');
  },

  exportCurrentPageSVG: (editor: SuikaEditor) => {
    const currentPage = editor.doc.getCurrentCanvas();
    const graphicsItems = currentPage
      .getChildren()
      .filter((item) => item.isVisible());

    if (graphicsItems.length === 0) {
      console.error('No graphics items to export');
      return;
    }

    const svg = toSVG(graphicsItems).svg;
    const blob = new Blob([svg], {
      type: 'image/svg+xml',
    });

    const suffix = currentPage.attrs.objectName;
    download(blob, `${suffix}.svg`);
  },

  /** PNG blob of the current page (no download). Used by Herald spike / publish. */
  getCurrentPagePNGBlob: async (editor: SuikaEditor): Promise<Blob | null> => {
    return exportService.getCanvasPNGBlob(editor.doc.getCurrentCanvas());
  },

  /** PNG of one canvas page. Does not change the current page. */
  getCanvasPNGBlob: async (canvas: {
    getChildren(): SuikaGraphics[];
  }): Promise<Blob | null> => {
    const graphicsItems = canvas
      .getChildren()
      .filter((item) => item.isVisible());

    if (graphicsItems.length === 0) {
      return null;
    }

    return toPNGBlob(graphicsItems);
  },

  exportCurrentPagePNG: async (editor: SuikaEditor) => {
    const currentPage = editor.doc.getCurrentCanvas();
    try {
      const blob = await exportService.getCurrentPagePNGBlob(editor);
      if (!blob) return;
      const suffix = currentPage.attrs.objectName;
      download(blob, `${suffix}.png`);
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  },
};

const download = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', filename);
  a.click();
};
