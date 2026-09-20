import { MimeType } from "../typing";

//@ts-ignore
import * as jpegConverter from './converters/jpegconverter.js';
//@ts-ignore
import * as pngConverter from './converters/pngconverter.js';

// read input image as a buffer

const JPEG_MIME_TYPE = 'image/jpeg';
const PNG_MIME_TYPE = 'image/png';

interface MimeTypesDict {
    [key: string]: any | undefined
}

const converters = <MimeTypesDict>{};

function dataURItoBlob(dataURI: string) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    const ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    const blob = new Blob([ab], { type: mimeString });
    return blob;
}

// eslint-disable-next-line no-unused-vars
// @ts-ignore
async function emptyConverter(data) {
    const resultData = new Uint8Array(data);
    const resultSize = undefined;
    return { resultData, resultSize };
}

function converter(mimeType: MimeType) {
    return new Promise((resolve) => {
        if (converters[mimeType] !== undefined) resolve(converters[mimeType]);

        if (mimeType === JPEG_MIME_TYPE) {
            jpegConverter.init().then(() => {
                converters[mimeType] = jpegConverter.convert;
                resolve(converters[mimeType]);
            });
        } else if (mimeType === PNG_MIME_TYPE) {
            pngConverter.init().then(() => {
                converters[mimeType] = pngConverter.convert;
                resolve(converters[mimeType]);
            });
        } else {
            throw new Error(`Undefined converters for ${mimeType}`);
        }
    });
}

// Use promises ? Be careful with concurrent access
export default async function compressImage(dataURI: string, mimeType: MimeType, quality: number) {
    // @ts-ignore
    if (import.meta.env.MODE === 'headless') {
        throw new Error('Compress Image does not work in headless mode.')
    }

    return new Promise<string>((resolve, reject) => {
        converter(mimeType)
            .then((conv: any) => {
                dataURItoBlob(dataURI)
                    .arrayBuffer()
                    .then((data) => {
                        conv(data, { orientations: -2, quality: quality })
                            .then((r: string) => {
                                resolve(r);
                            })
                            .catch((err: any) => {
                                reject(err);
                            });
                    });
            })
            .catch((err: any) => {
                reject(err);
            });
    });
}
