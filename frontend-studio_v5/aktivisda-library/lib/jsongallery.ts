import { Uuid, ImageGallery, GalleryInternalPhoto, GalleryInternalSvg } from "./typing";
import { validateGallery } from '../lib/validation/index.js';
import InvalidDataError from "./invaliddataerror";

// @ts-ignore
if (import.meta.env.MODE === 'headless') {
    //@ts-ignore
    var fs = (await import('node:fs'));
    //@ts-ignore
    URL = (await import('node:url')).URL;
    //@ts-ignore
    var Blob = (await import('node:buffer')).Blob;
}

export interface ElementsDict {
    [key: string]: GalleryInternalPhoto | GalleryInternalSvg;
}

export default class JsonGallery implements ImageGallery {
    
    _elements: ElementsDict
    _path_to_images: string

    constructor(data: any, path_to_images: string) {
        if (!validateGallery(data))
        {
            console.error(validateGallery.errors)
            throw new InvalidDataError(`Please provide valid json data`)
        }

        this._elements = {};
        for (const element of <any>data.elements) {
            this._elements[element.id] = element;
        }

        this._path_to_images = path_to_images;
    }

    /**
     * Return one element from the list
     *
     * @param elementId
     * @returns
     */
    elementById(elementId: Uuid): GalleryInternalPhoto | GalleryInternalSvg {
        return this._elements[elementId];
    }

    fileUrl(elementId: Uuid): Promise<string> {
        // @ts-ignore
        if (import.meta.env.MODE === 'headless') {
            return new Promise<string>((resolve) => {
                const filename = this.elementById(elementId).filename;
                // @ts-ignore
                resolve(URL.createObjectURL(new Blob([fs.readFileSync(this._path_to_images + filename)])));
            })
        } else {
            throw new Error('Not implemented method in non headless mode')
        }
    }

    randomInternalPhoto(): GalleryInternalPhoto {
        const values = Object.values(this._elements).filter((x) => x.type === 'internalphoto')
        return <GalleryInternalPhoto>values[Math.floor(Math.random() * values.length)]
    }

    randomInternalSvg(): GalleryInternalSvg {
        const values = Object.values(this._elements).filter((x) => x.type === 'internalsvg')
        return <GalleryInternalSvg>values[Math.floor(Math.random() * values.length)]
    }
}