'use strict';

import { ImageOptions, Dimensions, Uuid, MimeType } from "../typing";
import Vida from '../vida.ts'

export default class ImageVidaSubComponent {
    type: string
    id: Uuid;
    mimeType: MimeType|undefined;

    recomputeImage: boolean;
    recomputePosition: boolean;
    inResize: boolean
    originalSize: Dimensions;
    vida: Vida

    constructor(vida: Vida) {
        this.recomputeImage = false;
        this.inResize = false;
        this.recomputePosition = false;
        this.originalSize = { width: 0, height: 0 };
        this.type = ''
        this.id = '';
        this.vida = vida;
    }

    randomOptions():Partial<ImageOptions> {
        throw Error('Not implemented');
    }

    toJson() {
        console.error('toJson should be overriden');
        return {};
    }

    async imageToSvg(): Promise<string> {
        console.error('toPdf should be overriden');
        return ''
    }

    makeImage(_width: number, _height: number): Promise<void> {
        console.error('make image should be overriden');
        return new Promise<void>((resolve) => resolve());
    }

    update(_options: Partial<ImageOptions> | undefined): Promise<void> {
        console.error('update should be overriden');
        return new Promise<void>((resolve) => resolve());
    }

    image(): HTMLImageElement|HTMLCanvasElement | undefined | any {
        console.error('image() should be overriden');
        return undefined;
    }


    makeHitformFunction(_scale: number): any {
        console.error('ImageVidaSubComponent::makeHitformFuction() should be overriden');
        return undefined;
    }

}
