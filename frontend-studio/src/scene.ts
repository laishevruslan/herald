/**
 * Bridge between compact library scene_json (v1 display / v2 logical) and Layerhub IScene.
 * Player never sees this — only re-edit + PNG export.
 */

import type { IScene } from '@layerhub-io/types';
import { fetchImageBlobUrl, type SceneObject } from './api';
import { displaySize } from './exportPng';
import { resolveFontFamily } from './fontCatalogue';

export type StudioScene = {
  version: 1 | 2;
  objects: SceneObject[];
};

function rectPath(w: number, h: number): (string | number)[][] {
  return [
    ['M', 0, 0],
    ['L', w, 0],
    ['L', w, h],
    ['L', 0, h],
    ['z'],
  ];
}

/** Scale legacy v1 display-space objects up to logical frame coords. */
export function upgradeLegacyObjects(
  objects: SceneObject[],
  logicalW: number,
  logicalH: number,
  version?: number,
): SceneObject[] {
  if (version === 2 || !objects?.length) return objects || [];
  const { dw, dh } = displaySize(logicalW, logicalH);
  if (dw <= 0 || dh <= 0) return objects;
  const sx = logicalW / dw;
  const sy = logicalH / dh;
  let maxR = 0;
  let maxB = 0;
  for (const o of objects) {
    const w = o.type === 'image' ? 200 * (o.scaleX || 1) : (o as { width?: number }).width || 0;
    const h = o.type === 'image' ? 200 * (o.scaleY || 1) : (o as { height?: number }).height || 40;
    maxR = Math.max(maxR, (o.left || 0) + w);
    maxB = Math.max(maxB, (o.top || 0) + h);
  }
  if (maxR > dw * 1.15 || maxB > dh * 1.15) return objects;

  return objects.map((o) => {
    if (o.type === 'textbox') {
      return {
        ...o,
        left: (o.left || 0) * sx,
        top: (o.top || 0) * sy,
        width: (o.width || 200) * sx,
        fontSize: Math.round((o.fontSize || 36) * sx),
      };
    }
    if (o.type === 'rect') {
      return {
        ...o,
        left: (o.left || 0) * sx,
        top: (o.top || 0) * sy,
        width: (o.width || 100) * sx,
        height: (o.height || 100) * sy,
      };
    }
    return {
      ...o,
      left: (o.left || 0) * sx,
      top: (o.top || 0) * sy,
      scaleX: (o.scaleX || 1) * sx,
      scaleY: (o.scaleY || 1) * sy,
    };
  });
}

export function serializeSceneFromTemplate(template: IScene): StudioScene {
  const objects: SceneObject[] = [];
  for (const layer of template.layers || []) {
    const type = String(layer.type || '');
    if (type === 'Frame' || type === 'Background' || type === 'BackgroundImage') continue;

    if (type === 'StaticText') {
      const text = layer as {
        text?: string;
        left?: number;
        top?: number;
        width?: number;
        scaleX?: number;
        fontSize?: number;
        fontFamily?: string;
        fontWeight?: string | number;
        fill?: string;
        textAlign?: string;
      };
      objects.push({
        type: 'textbox',
        text: String(text.text || ''),
        left: text.left || 0,
        top: text.top || 0,
        width: (text.width || 200) * (text.scaleX || 1),
        fontSize: text.fontSize || 36,
        fontFamily: String(text.fontFamily || resolveFontFamily('Inter')),
        fontWeight: text.fontWeight || '400',
        fill: String(text.fill || '#111827'),
        textAlign: text.textAlign || 'left',
      });
      continue;
    }

    if (type === 'StaticPath') {
      const path = layer as {
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        scaleX?: number;
        scaleY?: number;
        fill?: string;
      };
      objects.push({
        type: 'rect',
        left: path.left || 0,
        top: path.top || 0,
        width: (path.width || 100) * (path.scaleX || 1),
        height: (path.height || 100) * (path.scaleY || 1),
        fill: String(path.fill || '#2563eb'),
        rx: 0,
        ry: 0,
      });
      continue;
    }

    if (type === 'StaticImage') {
      const img = layer as {
        left?: number;
        top?: number;
        scaleX?: number;
        scaleY?: number;
        angle?: number;
        metadata?: Record<string, string | number | boolean>;
      };
      const contentId = img.metadata?.contentId;
      if (typeof contentId !== 'string' || !contentId) continue;
      objects.push({
        type: 'image',
        contentId,
        left: img.left || 0,
        top: img.top || 0,
        scaleX: img.scaleX || 1,
        scaleY: img.scaleY || 1,
        angle: img.angle || 0,
      });
    }
  }
  return { version: 2, objects };
}

/** Build a Layerhub template (logical frame) from compact scene objects. */
export async function buildTemplateFromScene(
  objects: SceneObject[],
  frameW: number,
  frameH: number,
  opts?: { name?: string },
): Promise<IScene> {
  const layers: IScene['layers'] = [
    {
      id: 'background',
      name: 'Background',
      type: 'Background',
      width: frameW,
      height: frameH,
      fill: '#ffffff',
    },
  ];

  for (const o of objects || []) {
    if (o.type === 'textbox') {
      layers.push({
        id: `text-${layers.length}`,
        name: 'Text',
        type: 'StaticText',
        text: o.text,
        left: o.left,
        top: o.top,
        width: o.width,
        fontSize: o.fontSize,
        fontFamily: resolveFontFamily(o.fontFamily),
        fontWeight: o.fontWeight || '400',
        fill: o.fill || '#111827',
        textAlign: o.textAlign || 'left',
      } as IScene['layers'][number]);
    } else if (o.type === 'rect') {
      layers.push({
        id: `rect-${layers.length}`,
        name: 'Rectangle',
        type: 'StaticPath',
        left: o.left,
        top: o.top,
        width: o.width,
        height: o.height,
        fill: o.fill || '#2563eb',
        path: rectPath(o.width, o.height),
      } as IScene['layers'][number]);
    } else if (o.type === 'image' && o.contentId) {
      try {
        const src = await fetchImageBlobUrl(o.contentId);
        layers.push({
          id: `img-${layers.length}`,
          name: 'Image',
          type: 'StaticImage',
          src,
          left: o.left,
          top: o.top,
          scaleX: o.scaleX,
          scaleY: o.scaleY,
          angle: o.angle || 0,
          metadata: { contentId: o.contentId },
        } as IScene['layers'][number]);
      } catch {
        // Skip missing library images rather than failing the whole re-edit.
      }
    }
  }

  return {
    id: 'studio-scene',
    name: opts?.name || 'Poster',
    frame: { width: frameW, height: frameH },
    layers,
    metadata: {},
  };
}

export function seedDefaultObjects(logicalW: number, logicalH: number): SceneObject[] {
  return [
    {
      type: 'textbox',
      text: 'SALE -30%',
      left: 40,
      top: Math.round(logicalH * 0.28),
      width: logicalW - 80,
      fontFamily: resolveFontFamily('Inter'),
      fontWeight: '700',
      fontSize: Math.round(logicalW * 0.075),
      fill: '#111827',
      textAlign: 'center',
    },
    {
      type: 'textbox',
      text: 'Poster editor — not a slide',
      left: 40,
      top: Math.round(logicalH * 0.48),
      width: logicalW - 80,
      fontFamily: resolveFontFamily('Inter'),
      fontWeight: '400',
      fontSize: Math.round(logicalW * 0.03),
      fill: '#4b5563',
      textAlign: 'center',
    },
    {
      type: 'rect',
      left: logicalW / 2 - 90,
      top: Math.round(logicalH * 0.62),
      width: 180,
      height: 48,
      fill: '#2563eb',
      rx: 8,
      ry: 8,
    },
  ];
}
