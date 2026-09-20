import * as pdfMake from 'pdfmake/build/pdfmake.js';
import { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';

/**
 *
 * @param pdfDescription
 * @returns
 */
export function toPdfDataUrl(pdfDescription: TDocumentDefinitions, fonts: TFontDictionary): Promise<string> {
    return new Promise((resolve, reject) => {
        try {

            const pdfDocGenerator = pdfMake.createPdf(pdfDescription, undefined, fonts);

            // Pdfdocgenerator getDataUrl callback
            // sucks because it doesn’t catch
            // errors during callback
            // It will change in v3.x
            pdfDocGenerator.getDataUrl((url: string) => {
                resolve(url);
            });
        } catch (err) {
            reject(err);
        }
    });
}