import fs from 'node:fs';
import path from 'node:path';
import Jimp from 'jimp';
import { generateId } from '../lib/utils/utils.ts';
import looksSame from 'looks-same';
import pdf2img from 'pdf-img-convert';
import Vida from '../lib/vida.js';

/**
 * Return the complete filepath to the asset filename
 * Asset are supposed to be in tests/assets *
 *
 * @param filename
 * @returns
 */
export function asset(filename: string): string {
    return `${__dirname}/assets/${ filename }`
}

/**
 * Return the complete filepath to a temporary filename
 * Temporary filename ared saved in unversioned tests/tmp
 * directory
 *
 * @param filename
 * @returns
 */
export function tempfile(filename: string): string {
    if (!fs.existsSync(`${__dirname}/tmp/`))
        fs.mkdirSync(`${__dirname}/tmp/`);
    return `${__dirname}/tmp/${filename}`;
}

/**
 * Remove a file if it exists. Useful to clean temporary
 * files before testing
 *
 * @param filename
 */
export function cleanFileIfExists(filepath: string) {
    if (fs.existsSync(filepath))
        fs.rmSync(filepath);
}

export async function convertJpegToPng(pngFilepath: string) {
    const tempFilepath = tempfile(generateId() + '.png');
    const pngImage = await Jimp.read(pngFilepath);
    await pngImage.writeAsync(tempFilepath);
    return tempFilepath;
}

export async function rewriteJpeg(jpegFilepath: string) {
    const jpegImage = await Jimp.read(jpegFilepath);
    await jpegImage.writeAsync(jpegFilepath);
}

/**
 *
 * Compute if the two images in parameters are similar or not
 * using looksSame library.
 *
 * The Jpeg images should be rewritten in jpeg using "rewriteJpeg"
 * because comparison of lossless jpeg does not work.
 *
 * @param reference
 * @param current
 * @returns
 */
export async function compareImages(reference: string, current: string) {

    const out = await looksSame(
        reference, current,
        {
            strict: false,
            tolerance: 20,
            ignoreAntialiasing: true,
            antialiasingTolerance: 9,
            ignoreCaret: true,
        });
    return out;
}

/**
 *
 * Compare two pdfs and return True iff the two pdfs looks
 * the same.
 *
 * Compare pdf sizes (difference should be < 5% if pdg > 10 kB)
 * AND looks if the png exports are the same
 * (you will find these pngs in tests/tmp directory)
 *
 *
 * @param reference path to pdf used as refernce
 * @param current path to the pdf to compare
 * @returns
 */
export async function comparePdfs(reference: string, current: string) {
    const refSize = fs.statSync(reference).size;
    const currentSize = fs.statSync(current).size;

    if (currentSize > 10000 && Math.abs(refSize - currentSize) > 5000 && Math.abs(refSize - currentSize) / refSize > 0.2)
        return { equal: false };

    const referenceImages = await pdf2img.convert(reference);
    const currentImages = await pdf2img.convert(current);

    const id = generateId();
    const tempReferenceFilepath = tempfile(id + '_ref.png');
    const tempCurrentFilepath = tempfile(id + '_current.png');

    fs.writeFileSync(tempReferenceFilepath, referenceImages[0]);
    fs.writeFileSync(tempCurrentFilepath, currentImages[0]);

    return await compareImages(tempReferenceFilepath, tempCurrentFilepath);;
}

/**
 *
 * Compare a pdf with a png
 * Returns true iff pdf and png are similar
 *
 */
export async function comparePdfPng(pdf: string, png: string) {
    const pdfImage = await pdf2img.convert(pdf, { scale: 0.75});

    const id = generateId();
    const tempPdfImageFilepath = tempfile(id + '.png')

    fs.writeFileSync(tempPdfImageFilepath, pdfImage[0]);

    return await compareImages(tempPdfImageFilepath, png);
}

/**
 *
 * Save data url to a temporary file using base64 encoding.
 * directory containing filename is created if it does
 * not exist
 *
 * @param dataUrl
 * @param filename
 */
export function saveDataUrl(dataUrl: string, filename: string) {
    fs.mkdirSync(path.dirname(tempfile(filename)), { recursive: true });

    fs.writeFileSync(tempfile(filename),
        dataUrl.split(';base64,').pop()!, { 'encoding': 'base64' })
}

/**
 * Export the content of the canvas containing the vida
 * to given filename
 * MimeType is png.
 *
 * @param vida
 * @param filename
 */
function exportCanvas(vida: Vida, filename: string) {
    const dataUrl = vida.stage.toDataURL();
    saveDataUrl(dataUrl, filename);
    return true;
}

export async function checkStep(vida: Vida, testId: string, step: string) {
    const filename = `steps/${testId}/${step}.png`;
    exportCanvas(vida, filename);
    return await compareImages(asset(filename), tempfile(filename));
}

/**
 * Do not use "registerFont" from canvas. It does not work well
 * (or at least I don't understand how it works)
 * It's better to install fonts on your system first
 * Use npm run serve:assets in order to make fonts available on localhost:5050
 */
export const pdfMakeFonts = {};
pdfMakeFonts['Roboto'] = {
    normal: 'http://localhost:5050/fonts/Roboto-Regular.ttf',
};

pdfMakeFonts['Roboto Medium'] = {
    normal: 'http://localhost:5050/fonts/Roboto-Medium.ttf'
};

pdfMakeFonts['Raleway Thin'] = {
    normal: 'http://localhost:5050/fonts/Raleway-Thin.ttf'
};
pdfMakeFonts['Raleway'] = {
    normal: 'http://localhost:5050/fonts/Raleway.ttf'
};

pdfMakeFonts['GillSans-Light'] = {
    normal: 'http://localhost:5050/fonts/GillSans-Light.ttf'
};