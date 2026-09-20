'use strict';
import { ColorsDict, GalleryInternalSvg, ImageOptions } from '../typing.ts';

import { colorSvgString, colorsChanged, makeHitformFunction, loadSvg } from '../utils/svgutils.ts';

import ImageVidaSubComponent from './imagevidasubcomponent.ts';
import Vida from '../vida.ts'
import { Canvg } from 'canvg';
import InvalidDataError from '../invaliddataerror.ts';
import { assignValues, overrideValues } from '../utils/utils.ts';

export default class InternalSvgVidaSubComponent extends ImageVidaSubComponent {

    colors: ColorsDict | undefined;
    coloredString: string | undefined;
    canvas: HTMLCanvasElement | undefined;
    canvgElement: Canvg | undefined;
    svgString: string | undefined;
    hitform: string | undefined;

    inPromise: boolean;
    type: 'internalsvg';
    recomputeColorSvg: boolean;

    constructor(vida: Vida) {
        super(vida);
        this.type = 'internalsvg';
        this.colors = {};
        this.inPromise = false;
        this.mimeType = 'image/svg+xml';
        this.recomputeColorSvg = false;

    }

    randomOptions(): Partial<ImageOptions> {
        if (this.vida.gallery === undefined) {
            throw new InvalidDataError('Please provide a gallery if you use internalsvg!')
        }

        const element = this.vida.gallery.randomInternalSvg();
        return {
            type: this.type,
            id: element.id,
            colors: element.colors, // todo random colors
        };
    }

    toJson(): any {
        return {
            type: this.type,
            id: this.id,
            colors: this.colors,
            width: this.originalSize.width,
            height: this.originalSize.height,
        };
    }

    imageToSvg(): any {
        return this.coloredString;
    }

    update(options: ImageOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!options) resolve();

            if (options !== undefined && (this.id === undefined || (options.id !== undefined && this.id != options.id))) {
                if (this.vida.gallery === undefined) {
                    throw new InvalidDataError('Please provide a gallery if you use internalsvg!')
                }
                const image = <GalleryInternalSvg>this.vida.gallery.elementById(options.id);
                if (image === undefined || image.type !== 'internalsvg') {

                    throw new InvalidDataError(`Image ${ options.id } does not exist or is not an internalsvg.`)
                }

                this.hitform = image.hitform; // maybe undefined
                this.originalSize = { width: image.width, height: image.height };

                const colors = {};
                assignValues(colors, image.colors, undefined);
                // If some colors are defined by options.colors
                // Replaced them
                overrideValues(colors, options.colors);
                options.colors = colors;
                this.inPromise = true;
                this.recomputeColorSvg = true;
                this.vida.gallery.fileUrl(options.id).then((symbolUrl: string) => {
                    loadSvg(symbolUrl, { prepareColors: true })
                        .then((svgString: string) => {
                            this.svgString = svgString;
                            this.id = options.id!;
                            this.inPromise = false;
                            this.update(options)
                                .then(() => resolve())
                                .catch((err) => reject(err));
                        })
                        .catch((err: any) => reject(err));
                });
                return;
            }

            if (this.recomputeColorSvg ||
                (options !== undefined && (!this.canvas || colorsChanged(this.colors!, options.colors!)))) {
                this.recomputeImage = true;
                this.recomputeColorSvg = false;
                this.recomputePosition = true;
                this.colors = options.colors;
                console.assert(this.svgString);
                this.coloredString = colorSvgString(this.svgString!, options.colors!).string;
            }
            resolve();
        });
    }

    makeImage(imageWidth: number, imageHeight: number): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.inResize) reject();

            this.inResize = true;
            if (!this.canvas) this.canvas = window.document.createElement('canvas');
            const ctx = this.canvas.getContext('2d');
            try {
                this.canvgElement = Canvg.fromString(ctx!, this.coloredString!);
            } catch (e) {
                console.error(e);
                reject();
                return;
            }

            this.canvgElement.resize(imageWidth, imageHeight, 'xMidYMid meet');
            this.canvgElement
                .render()
                .then(() => {
                    this.inResize = false;
                    resolve();
                })
                .catch((err) => {
                    console.error(err);
                    reject(err);
                });
        });
    }

    image(): HTMLCanvasElement | undefined {
        console.assert(this.canvas);
        return this.canvas;
    }

    makeHitformFunction(scale: number) {
        return makeHitformFunction(this.hitform!, scale);
    }
}
