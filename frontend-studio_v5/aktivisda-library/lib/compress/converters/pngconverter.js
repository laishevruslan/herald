import ffi, { optimise } from './oxipng/squoosh_oxipng.js';

// https://stackoverflow.com/questions/60987493/h3-js-in-a-web-worker-document-is-not-defined
// global.document = {};

// This code should be moved away in an external worker
class OxipngConverter {
    constructor() {
        this.Module = null;
        this.initialized = false;
    }

    async init() {
        if (!this.initialized) {
            await ffi();
            this.initialized = true;
        }
    }

    // eslint-disable-next-line no-unused-vars
    async convert(data, orientation, quality) {
        const input = new Uint8Array(data);
        const resultData = optimise(input, 1, false);
        const resultSize = undefined;
        return { resultData, resultSize };
    }
}

// Interface with the code
let instance = null;

export async function init() {
    if (instance === null) {
        const converter = await new OxipngConverter();
        await converter.init();
        instance = converter;
    }
}

export async function convert(data, orientation, quality) {
    const r = await instance.convert(data, orientation, quality);
    return r;
}
