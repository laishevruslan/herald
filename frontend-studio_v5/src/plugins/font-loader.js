'use strict';

import WebFontLoader from 'webfontloader';

export const pdfMakeFonts = (fonts) => {
    const _pdfMakeFonts = {};
    const base_url = window.location.origin;
    for (const font of fonts) {
        const format = Object.keys(font['formats'])[0];
        _pdfMakeFonts[font.fontName] = {
            normal: `${base_url}/static/fonts/${font.directory}/${font.formats[format]}`,
        };
    }
    return _pdfMakeFonts;
}

const timeout = 10000;

export const loadFonts = (fonts) =>
    new Promise((resolve, reject) => {
        // load all fonts
        WebFontLoader.load({
            custom: {
                urls: [process.env.BASE_URL + 'fonts/fonts.css'],
                families: fonts.map((f) => f.fontName),
            },

            // options
            timeout: timeout,
            active() {
                const missing = fonts.filter((f) => !f.loaded);
                !missing.length ? resolve() : reject(missing);
            },
            inactive() {
                reject(fonts);
            },
            fontactive(fontName) {
                const font = fonts.find((f) => f.fontName === fontName);
                font.loaded = true;
            },
            fontinactive(fontName) {
                console.warn(`Couldn't load font "${fontName}"`);
            },
        });
    });

function checkIfLoaded(elapsedTime, checkPeriod, timeout) {
    return new Promise((resolve, reject) => {
        if (elapsedTime >= timeout) reject();
        elapsedTime += checkPeriod;

        const html = document.getElementsByTagName('html')[0];
        if (!html.classList.contains('wf-loading')) resolve();

        setTimeout(
            () =>
                checkIfLoaded(elapsedTime, checkPeriod, timeout)
                    .then(() => resolve())
                    .catch(() => reject()),
            checkPeriod,
        );
    });
}

export const fontsLoaded = () => {
    return checkIfLoaded(0, 1000, timeout);
};
