'use strict';
import { GalleryInternalPhoto, ImageOptions, MimeType } from '../typing.ts';

import ImageVidaSubComponent from './imagevidasubcomponent.ts';

// @ts-ignore
if (import.meta.env.MODE === 'headless') {
    var Image = (await import('canvas')).Image;
    var createCanvas = (await import('canvas')).createCanvas;
    var resolveObjectURL = (await import('node:buffer')).resolveObjectURL;
}
import Vida from '../vida.ts';
import InvalidDataError from '../invaliddataerror.ts';
import { extractMimeTypeFromFilename } from '../utils/utils.ts';

export default class PhotoSubComponent extends ImageVidaSubComponent {

    photoUrl: string | undefined;
    _photo: any | undefined;
    mimeType: MimeType;
    type: 'internalphoto' | 'urlphoto';

    constructor(vida: Vida, type: 'internalphoto' | 'urlphoto') {
        super(vida);
        this.type = type;
        this.originalSize = { width: 0, height: 0 };
        this.id = ''
        this.mimeType = 'image/jpeg';

    }

    randomOptions(): Partial<ImageOptions> {
        if (this.vida.gallery === undefined) {
            throw new InvalidDataError('Please provide a gallery if you use internalsvg!')
        }

        const element = this.vida.gallery.randomInternalPhoto();
        return {
            type: this.type,
            id: element.id,
        };
    }

    toJson() {
        if (this.type === 'internalphoto') {
            return {
                type: this.type,
                id: this.id,
                width: this.originalSize.width,
                height: this.originalSize.height,
            };
        } else if (this.type === 'urlphoto') {
            return {
                type: this.type,
                url: this.photoUrl,
                width: this.originalSize.width,
                height: this.originalSize.height,
            };
        } else {
            throw Error(`toJson not implemented for type ${this.type}`);
        }
    }

    /**
     * Loads a base64 photoUrl locally in a HTMLImageElement.
     * Image can be accessed throug image() method
     *
     * @param photoUrl
     * @returns Promise<void>. Resolved once the image is loaded
     */
    loadPhoto(photoUrl: string): Promise<void>{
        return new Promise((resolve, reject) => {
            this.photoUrl = photoUrl;
            this.recomputeImage = true;
            if (this._photo !== undefined) delete this._photo;

            // @ts-ignore
            if (import.meta.env.MODE === 'headless')
                this._photo = new Image();
            else
                // Equivalent to this._photo = new Image() in plain JS
                this._photo = document.createElement('img')

            this._photo.onload = () => {
                this.originalSize = { width: this._photo!.width, height: this._photo!.height };
                resolve();
            };

            this._photo.onerror = (err: any) => reject(err);
            // @ts-ignore
            if (this.photoUrl.startsWith('blob:') && import.meta.env.MODE === 'headless') {
                // @ts-ignore
                resolveObjectURL(this.photoUrl)?.arrayBuffer()
                // @ts-ignore
                .then((arrayBuffer) => {
                    this._photo.src = Buffer.from(arrayBuffer);
                    resolve();
                });
            } else {
                this._photo.src = this.photoUrl;
            }
        });
    }

    update(options: ImageOptions): Promise<void> {
        return new Promise<void>((resolve) => {
            if (!options) {
                resolve();
                return;
            }
            if (options.id !== undefined && this.id !== options.id) {
                if (this.vida.gallery === undefined) {
                    throw new InvalidDataError('Please provide a gallery if you use internalphoto!')
                }

                const image = <GalleryInternalPhoto>this.vida.gallery.elementById(options.id);
                if (image === undefined || image.type !== 'internalphoto') {
                    throw new InvalidDataError(`Image ${ options.id } does not exist or is not an internalphoto.`)
                }

                this.mimeType = extractMimeTypeFromFilename(image.filename);
                this.id = options.id;
                this.originalSize = { width: 0, height: 0 };
                const self = this;
                this.vida.gallery.fileUrl(image.id).then((photoUrl: string) => {
                    self.loadPhoto(photoUrl).then(() => resolve());
                });
                return;
            } else if (options.url !== undefined && this.photoUrl !== options.url) {
                this.mimeType = 'image/jpeg'; //

                // Don't know if required
                // this.id = undefined;
                this.loadPhoto(options.url).then(() => resolve());
            } else {
                resolve();
                return;
            }

            return;
        });
    }

    makeImage(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.inResize = false;
            resolve();
        });
    }

    image(): HTMLImageElement|undefined | any{
        return this._photo;
    }

    async imageToSvg(): Promise<string | undefined | any> {
        let href:string = '';

        if (this.type === 'internalphoto') {
            if (this.vida.gallery === undefined) {
                throw new InvalidDataError('Please provide a gallery if you use internalphoto!')
            }

            // @ts-ignore
            if (import.meta.env.MODE === 'headless') {
                const canvas = createCanvas(this._photo.width, this._photo.height);
                canvas.getContext('2d').drawImage(this._photo, 0, 0);
                // @ts-ignore
                href = canvas.toDataURL(this.mimeType);
            } else {
                const canvas = document.createElement('canvas');
                canvas.height = this._photo.height;
                canvas.width = this._photo.width;
                document.body.appendChild(canvas);
                canvas.getContext('2d')!.drawImage(this._photo, 0, 0);
                // @ts-ignore
                href = canvas.toDataURL(this.mimeType);
                document.body.removeChild(canvas);
                canvas.remove();
            }
        } else if (this.type === 'urlphoto') {
            href =  this.photoUrl!;
        }

        return `<svg width="${this.originalSize.width}" height="${this.originalSize.height}" viewBox="0 0 ${this.originalSize.width} ${this.originalSize.height}">
        <image href="${href}"/></svg>`
    }

    makeHitformFunction() {
        return undefined;
    }
}
