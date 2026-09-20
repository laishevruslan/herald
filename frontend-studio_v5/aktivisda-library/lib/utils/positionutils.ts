'use strict';

import { Point, Dimensions } from '../typing'

function fromPercent(value: number, dimension: number): number {
    return (value - 0.5) * dimension;
}

function toPercent(value: number, dimension: number): number {
    return value / dimension + 0.5;
}

function computeAbsoluteX(x: number, documentWidth: number): number {
    const xPx = fromPercent(x, documentWidth);
    const anchorLocation = documentWidth / 2;
    return anchorLocation + xPx;
}

function computeAbsoluteY(y: number, documentHeight: number): number {
    const yPy = fromPercent(y, documentHeight);
    const anchorLocation = documentHeight / 2;
    return anchorLocation + yPy;
}

/**
 * Compute the absolute position in the document given its relative position and
 * the documentsize.
 * Relative position is such that 0, 0 means: "center"
 *
 * @param relativePosition
 * @param documentSize
 * @returns absolutePosition
 */
function computeAbsolutePosition(relativePosition: Point, documentSize: Dimensions): Point{
    return { x: computeAbsoluteX(relativePosition.x, documentSize.width), y: computeAbsoluteY(relativePosition.y, documentSize.height) };
}

/**
 * Compute the relative position in the document given its absolute position
 * and the documentSize
 *
 * @param absolutePosition
 * @param documentSize
 * @returns
 */
function computeRelativePosition(absolutePosition: Point, documentSize: Dimensions): Point {
    const anchorLocation = { x: documentSize.width / 2, y: documentSize.height / 2 };
    const xPx = absolutePosition.x - anchorLocation.x;
    const yPx = absolutePosition.y - anchorLocation.y;
    return { x: toPercent(xPx, documentSize.width), y: toPercent(yPx, documentSize.height) };
}

/**
 * Convert px value to pt value
 * Required by pdfMake (all coordinates are in pt)
 * 1pt = 0.75px
 *
 * @param value (in px)
 * @returns value in pt
 */
function pxToPt(value: number): number {
    return value/0.75;
}

export { computeAbsolutePosition, computeRelativePosition, pxToPt };
