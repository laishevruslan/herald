/// <reference types="vite/client" />

/*
 * fabric@5 is CJS. We treat the namespace as `any` so Vite/tsc do not confuse
 * DOM Canvas with fabric.Canvas (both named Canvas in loose typings).
 */
declare module 'fabric' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const fabric: any;
}

declare module '@layerhub-io/core';
