'use strict';

export const uriToJSON = (urijson) => JSON.parse(decodeURIComponent(urijson));

function luminance(r, g, b) {
    var a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function grayScale(r, g, b) {
    return 0.3 * r + 0.59 * g + 0.11 * b;
}

export function contrast(rgb1, rgb2) {
    var lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
    var lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);
    var brightest = Math.max(lum1, lum2);
    var darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
}

// From https://gist.github.com/comficker/871d378c535854c1c460f7867a191a5a#file-hex2rgb-jsà
export function HEX2RGB(hex) {
    if (hex.charAt(0) === '#') hex = hex.substr(1);

    if (hex.length < 2 || hex.length > 6) return false;
    let values = hex.split('');
    let color = { r: 0, g: 0, b: 0 };

    if (hex.length === 2) {
        color.r = parseInt(values[0].toString() + values[1].toString(), 16);
        color.g = color.r;
        color.b = color.r;
    } else if (hex.length === 3) {
        color.r = parseInt(values[0].toString() + values[0].toString(), 16);
        color.g = parseInt(values[1].toString() + values[1].toString(), 16);
        color.b = parseInt(values[2].toString() + values[2].toString(), 16);
    } else if (hex.length === 6) {
        color.r = parseInt(values[0].toString() + values[1].toString(), 16);
        color.g = parseInt(values[2].toString() + values[3].toString(), 16);
        color.b = parseInt(values[4].toString() + values[5].toString(), 16);
    } else {
        return false;
    }
    return color;
}

export const showSnackbarOnRedirection = (self) => {
    if (window.__prerender) return;

    const query = self.$router.currentRoute.query;
    if (query && query.unknown_lang === 'true') {
        self.$buefy.snackbar.open({
            indefinite: true,
            message: self.$t('SNACKBARS.CONTRIBUTE_LANG'),
            position: 'is-bottom',
            actionText: null,
            cancelText: self.$t('BUTTONS.CANCEL'),
        });
    }

    // It does not work well and it's maybe useless
    // //  https://stackoverflow.com/questions/62462276/how-to-solve-avoided-redundant-navigation-to-current-location-error-in-vue
    // self.$router.replace({ 'query': query }).catch(()=>{});
};

export const toBase64 = (file) =>
    new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');

            resolve(base64String);
        };
        reader.readAsDataURL(file);
    });

/**
 * Create a humain readable json file containing the json
 * representation of the input object
 *
 * @param Object object
 * @param String filename
 * @returns File
 */
export const objectToJsonFile = (object, filename) => {
    const jsonStr = JSON.stringify(object, null, 4);
    const jsonBytes = new TextEncoder().encode(jsonStr);
    const jsonBlob = new Blob([jsonBytes], {
        type: 'application/json;charset=utf-8',
    });
    return new File([jsonBlob], filename);
};
