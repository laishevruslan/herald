import { fabric } from 'fabric';
import { fetchImageBlobUrl, type SceneObject } from './api';
import type { FabricCanvas } from './exportPng';

/** Build a compact scene without data URLs (server rejects those). */
export function serializeScene(canvas: FabricCanvas): { version: 1; objects: SceneObject[] } {
  const objects: SceneObject[] = [];
  for (const obj of canvas.getObjects()) {
    const anyObj = obj as any;
    if (anyObj.type === 'textbox' || anyObj.type === 'i-text' || anyObj.type === 'text') {
      objects.push({
        type: 'textbox',
        text: String(anyObj.text || ''),
        left: anyObj.left || 0,
        top: anyObj.top || 0,
        width: (anyObj.width || 200) * (anyObj.scaleX || 1),
        fontSize: anyObj.fontSize || 36,
        fontWeight: anyObj.fontWeight || '400',
        fill: String(anyObj.fill || '#111827'),
        textAlign: anyObj.textAlign || 'left',
      });
    } else if (anyObj.type === 'rect') {
      objects.push({
        type: 'rect',
        left: anyObj.left || 0,
        top: anyObj.top || 0,
        width: (anyObj.width || 100) * (anyObj.scaleX || 1),
        height: (anyObj.height || 100) * (anyObj.scaleY || 1),
        fill: String(anyObj.fill || '#2563eb'),
        rx: anyObj.rx || 0,
        ry: anyObj.ry || 0,
      });
    } else if (anyObj.type === 'image' && anyObj.contentId) {
      objects.push({
        type: 'image',
        contentId: anyObj.contentId,
        left: anyObj.left || 0,
        top: anyObj.top || 0,
        scaleX: anyObj.scaleX || 1,
        scaleY: anyObj.scaleY || 1,
        angle: anyObj.angle || 0,
      });
    }
  }
  return { version: 1, objects };
}

export async function applyScene(canvas: FabricCanvas, objects: SceneObject[]): Promise<void> {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  for (const o of objects || []) {
    if (o.type === 'textbox') {
      canvas.add(new fabric.Textbox(o.text, {
        left: o.left,
        top: o.top,
        width: o.width,
        fontFamily: 'Inter, sans-serif',
        fontSize: o.fontSize,
        fontWeight: o.fontWeight || '400',
        fill: o.fill || '#111827',
        textAlign: o.textAlign || 'left',
      }));
    } else if (o.type === 'rect') {
      canvas.add(new fabric.Rect({
        left: o.left,
        top: o.top,
        width: o.width,
        height: o.height,
        fill: o.fill || '#2563eb',
        rx: o.rx || 0,
        ry: o.ry || 0,
      }));
    } else if (o.type === 'image' && o.contentId) {
      try {
        const url = await fetchImageBlobUrl(o.contentId);
        await new Promise<void>((resolve, reject) => {
          fabric.Image.fromURL(url, (img: any) => {
            if (!img) { reject(new Error('image load failed')); return; }
            img.contentId = o.contentId;
            img.set({
              left: o.left,
              top: o.top,
              scaleX: o.scaleX,
              scaleY: o.scaleY,
              angle: o.angle || 0,
            });
            canvas.add(img);
            resolve();
          }, { crossOrigin: 'anonymous' });
        });
      } catch {
        // Skip missing images rather than failing the whole re-edit.
      }
    }
  }
  canvas.requestRenderAll();
}

export function seedDefaultPoster(canvas: FabricCanvas, displayW: number, displayH: number): void {
  canvas.clear();
  canvas.backgroundColor = '#ffffff';
  canvas.add(new fabric.Textbox('SALE −30%', {
    left: 40,
    top: Math.round(displayH * 0.28),
    width: displayW - 80,
    fontFamily: 'Inter, sans-serif',
    fontWeight: '700',
    fontSize: Math.round(displayW * 0.075),
    fill: '#111827',
    textAlign: 'center',
  }));
  canvas.add(new fabric.Textbox('Poster editor — not a slide', {
    left: 40,
    top: Math.round(displayH * 0.48),
    width: displayW - 80,
    fontFamily: 'Inter, sans-serif',
    fontWeight: '400',
    fontSize: Math.round(displayW * 0.03),
    fill: '#4b5563',
    textAlign: 'center',
  }));
  canvas.add(new fabric.Rect({
    left: displayW / 2 - 90,
    top: Math.round(displayH * 0.62),
    width: 180,
    height: 48,
    rx: 8,
    ry: 8,
    fill: '#2563eb',
  }));
  canvas.requestRenderAll();
}
