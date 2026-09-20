import { v4 as uuidv4 } from 'uuid';
import { Uuid, MimeType, I18nDict } from '../typing.ts';
import InvalidDataError from '../invaliddataerror.ts';

export function generateId(): Uuid{
    return uuidv4().slice(0, 8);
}

export function jsonToURI(json: any): string {
    return encodeURIComponent(JSON.stringify(json));
}

const encodeReserveRE = /[!'()*]/g;
const encodeReserveReplacer = (c: any) => '%' + c.charCodeAt(0).toString(16);
const commaRE = /%2C/g;

// fixed encodeURIComponent which is more conformant to RFC3986:
// - escapes [!'()*]
// - preserve commas
const encode = (str: string): string => {
    return encodeURIComponent(str).replace(encodeReserveRE, encodeReserveReplacer).replace(commaRE, ',');
};


/**
 * Encode text svg by escaping some special characters
 */
export function encodeTextSvg(text: string): string {
    return text.replace('&', '&#38;').replace('<', '&#60;').replace('>', '&#62;');
}

// Copy-pasted from vuejs
export function stringifyQuery(obj: any): string {
    const res = obj
        ? Object.keys(obj)
              .map((key) => {
                  const val = obj[key];

                  if (val === undefined) {
                      return '';
                  }

                  if (val === null) {
                      return encode(key);
                  }

                  if (Array.isArray(val)) {
                      const result: Array<string> = [];
                      val.forEach((val2) => {
                          if (val2 === undefined) {
                              return;
                          }
                          if (val2 === null) {
                              result.push(encode(key));
                          } else {
                              result.push(encode(key) + '=' + encode(val2));
                          }
                      });
                      return result.join('&');
                  }

                  return encode(key) + '=' + encode(val);
              })
              .filter((x) => x.length > 0)
              .join('&')
        : null;
    return res ? `?${res}` : '';
}

export function extractMimeTypeFromFilename(filename: string): MimeType {
    if (filename.endsWith('.jpeg') || filename.endsWith('.jpg'))
        return 'image/jpeg';
    else if (filename.endsWith('.png'))
        return 'image/png';
    else if (filename.endsWith('.svg') || filename.endsWith('.svgz'))
        return 'image/svg+xml';

    throw new InvalidDataError(`Unknown mimetype for filename ${filename}`)
}

export const cleanUndefined = (obj: any) => {
    for (const key in obj) {
        if (obj[key] === undefined) {
            delete obj[key];
        } else if (typeof obj[key] === 'object') {
            cleanUndefined(obj[key])
        }
    }
}

export const assignValues = (target: any, source:any, fallback: any | undefined) => {
    for (const key in source) {
        if (source[key] === null) {
            if (fallback !== undefined) {
                target[key] = fallback[key];
            } else {
                target[key] = undefined;
            }
        } else if (typeof source[key] !== 'object') {
            target[key] = source[key];
        } else if (Array.isArray(source[key])) {
            target[key] = source[key];
        } else {
            if (!target[key]) target[key] = {};
            assignValues(target[key], source[key], fallback ? fallback[key] : undefined);
        }
    }
}

// Same as assignValues but we don't assign non existing values
// eg. overrideValues({ text: hello}, { text: world, size: 10}) --> { text: world}
// (with assignvalues: --> { text: world, size: 10 })
export const overrideValues = (target: any, source: any) => {
    for (const key in source) {
        if (target[key] === undefined) continue;
        if (source[key] === null) {
            target[key] = undefined;
        } else if (typeof source[key] !== 'object') {
            target[key] = source[key];
        } else if (Array.isArray(source[key])) {
            target[key] = source[key];
        } else {
            if (!target[key]) target[key] = {};
            overrideValues(target[key], source[key]);
        }
    }
}

// From https://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
export const pSBC = (p: number, c0: string, c1:any, l:any) => {
    let r,
        g,
        b,
        P,
        f,
        t,
        h,
        i = parseInt,
        m = Math.round,
        a = typeof c1 == 'string';
    if (typeof p != 'number' || p < -1 || p > 1 || typeof c0 != 'string' || (c0[0] != 'r' && c0[0] != '#') || (c1 && !a)) return null;
    // @ts-ignore
    const pSBCr = (d) => {
        let n = d.length,
            x = {};
        if (n > 9) {
            ([r, g, b, a] = d = d.split(',')), (n = d.length);
            if (n < 3 || n > 4) return null;
            // @ts-ignore
            (x.r = i(r[3] == 'a' ? r.slice(5) : r.slice(4))), (x.g = i(g)), (x.b = i(b)), (x.a = a ? parseFloat(a) : -1);
        } else {
            if (n == 8 || n == 6 || n < 4) return null;
            if (n < 6) d = '#' + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (n > 4 ? d[4] + d[4] : '');
            d = i(d.slice(1), 16);
            // @ts-ignore
            if (n == 9 || n == 5) (x.r = (d >> 24) & 255), (x.g = (d >> 16) & 255), (x.b = (d >> 8) & 255), (x.a = m((d & 255) / 0.255) / 1000);
            // @ts-ignore
            else (x.r = d >> 16), (x.g = (d >> 8) & 255), (x.b = d & 255), (x.a = -1);
        }
        return x;
    };
    (h = c0.length > 9),
        (h = a ? (c1.length > 9 ? true : c1 == 'c' ? !h : false) : h),
        (f = pSBCr(c0)),
        (P = p < 0),
        (t = c1 && c1 != 'c' ? pSBCr(c1) : P ? { r: 0, g: 0, b: 0, a: -1 } : { r: 255, g: 255, b: 255, a: -1 }),
        (p = P ? p * -1 : p),
        (P = 1 - p);
    if (!f || !t) return null;
    // @ts-ignore
    if (l) (r = m(P * f.r + p * t.r)), (g = m(P * f.g + p * t.g)), (b = m(P * f.b + p * t.b));
    // @ts-ignore
    else (r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5)), (g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5)), (b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5));
    // @ts-ignore
    (a = f.a), (t = t.a), (f = a >= 0 || t >= 0), (a = f ? (a < 0 ? t : t < 0 ? a : a * P + t * p) : 0);
    // @ts-ignore
    if (h) return 'rgb' + (f ? 'a(' : '(') + r + ',' + g + ',' + b + (f ? ',' + m(a * 1000) / 1000 : '') + ')';
    // @ts-ignore
    else return '#' + (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0)).toString(16).slice(1, f ? undefined : -2);
};

export const extractBestTranslation = (translations: I18nDict, locale: string, defaultLocale: string) => {
    if (translations === undefined) return undefined;
    if (translations[locale] !== undefined) return translations[locale];

    if (translations[defaultLocale] !== undefined) return translations[defaultLocale];

    return translations[Object.keys(translations)[0]];
};
