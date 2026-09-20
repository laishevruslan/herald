import ffi from '@neslinesli93/mozjpeg-wasm/lib/mozjpeg-wasm.js';

// https://stackoverflow.com/questions/60987493/h3-js-in-a-web-worker-document-is-not-defined
// global.document = {};

// This code should be moved away in an external worker
class JpegConverter {
    constructor() {
        this.Module = null;
        this.initialized = false;
    }

    async init() {
        if (!this.initialized) {
            const Module = await ffi();

            this.Module = Module;
            this.initialized = true;
        }
    }

    async convert(data, orientation, quality) {
        const input = new Uint8Array(data);
        const inputBuffer = this.Module._malloc(input.length * input.BYTES_PER_ELEMENT);
        this.Module.HEAPU8.set(input, inputBuffer);

        // Returns a struct with two u32 fields: pointer and size
        const convert = this.Module.cwrap('new_convert', 'number', ['number', 'number', 'number', 'number']);
        const result = convert(inputBuffer, input.length, quality, orientation);
        const outputBuffer = this.Module.HEAPU32[result / 4];
        const resultSize = this.Module.HEAPU32[result / 4 + 1];

        const resultData = new Uint8Array(this.Module.HEAPU8.subarray(outputBuffer, outputBuffer + resultSize));

        this.Module._free(inputBuffer);
        this.Module._free(outputBuffer);
        return { resultData, resultSize };
    }
}

// Interface with the code
let instance = null;

export async function init() {
    if (instance === null) {
        const converter = await new JpegConverter();
        await converter.init();
        instance = converter;
    }
}

export async function convert(data, { orientation, quality }) {
    const r = await instance.convert(data, orientation, quality);
    return r;
}
