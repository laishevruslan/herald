'use strict';
import InvalidDataError from '../invaliddataerror.ts';
import { ColorsDict, Dimensions } from '../typing.ts';
import pako from 'pako';

// @ts-ignore
if (import.meta.env.MODE === 'headless') {
    //@ts-ignore
    URL = (await import('node:url')).URL;
    //@ts-ignore
    Blob = (await import('node:buffer')).Blob;
}


function colorsChanged(previousColors: ColorsDict, newColors: ColorsDict) {
    if (!newColors) return false;
    if (!previousColors && newColors) return true;
    for (let colorKey in previousColors) {
        if (previousColors[colorKey] != newColors[colorKey]) return true;
    }
    return false;
}

/**
 * prepareSvgString is the output of 'prepareColors'
 *
 * @param preparedSvgString
 * @param colors
 * @returns
 */
function colorSvgString(preparedSvgString: string, colors: ColorsDict) {
    if (preparedSvgString === undefined)
        throw new InvalidDataError('A defined svg string is required in preparecolors');


    let coloredString = preparedSvgString;
    for (const colorKey in colors) {
        const regex = new RegExp('CC' + colorKey.slice(1), 'g');
        coloredString = coloredString.replace(regex, colors[colorKey]);
    }

    const blob = new Blob([coloredString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    return { url, string: coloredString };
}

/**
 *
 * Prepare a svg string for color replacement.
 * Replace all html colors #03ef39 to CC03ef39
 * Only works for 6-chars HTML colors
 *
 *
 * @param svgString
 * @returns string
 */
function prepareColors(svgString: string): string {
    svgString = svgString.replace(/"#([0-9a-fA-F]{3})"/g, '"#$1$1"');

    svgString = svgString.replace(/#([0-9a-fA-F]{6})/g, 'CC$1');
    return svgString;
}

/**
 *
 * Parse an svg string and find all html colors (except for page/border color)
 * and retun the set of this colors.
 * Used by backtivisda when a new svn is uploaded.
 * Works with a regex
 *
 * @param svgString
 * @returns
 */
/*  Find all hex colors in svg string except page/bordercolor and return the set of this colors */
function extractColors(svgString: string): Set<String> {
    svgString = svgString.replace(/(page|border|desk)color="#([a-f]|\d)*/g, '');
    const results = svgString.match(/#([0-9a-fA-F]{6})/g);
    return new Set(results);
}

/* Parse width and height in svg (could also parse viewBox) */
function extractDimensions(svgString: string): Dimensions {
    const widthMatch = svgString.match(/width="(\d*(.\d+)?(pt)?)"/);
    const heightMatch = svgString.match(/height="(\d*(.\d+)?(pt)?)"/);

    if (widthMatch != null && heightMatch != null) return { width: parseFloat(widthMatch[1]), height: parseFloat(heightMatch[1]) };

    const viewBox = svgString.match(/viewBox="0 0 (\d*\.?\d+) (\d*\.?\d+)"/);
    if (viewBox === null) throw new Error('Exitract dimensions view box is null')
    return { width: parseFloat(viewBox[1]), height: parseFloat(viewBox[2]) };
}

/*
  Load a svg from a svgurl (possiblity a object url). Can handle binary svg (svgz).
  Prepare the colors.
  Options: { prepareColors: true/false }
*/
function loadSvg(svgUrl: string, options: any): Promise<string> {
    return new Promise((resolve, reject) => {
        fetch(svgUrl).then((response) => {
            response.blob().then((blob) => {
                // In aktivisda, urls points to svg(z)
                // But in backtivisda we use blob files
                // TODO: Am I required? || (blob && blob.name.endsWith('.svgz')
                if (svgUrl.endsWith('.svgz')) {
                    blob.arrayBuffer()
                        .then((buffer) => {
                            const data = new Uint8Array(buffer);
                            let svgString = pako.inflate(data, { to: 'string' });
                            if (options.prepareColors) svgString = prepareColors(svgString);
                            resolve(svgString);
                        })
                        .catch((err) => {
                            reject(err);
                        });
                } else {
                    blob.text()
                        .then((svgString) => {
                            if (options.prepareColors) svgString = prepareColors(svgString);
                            resolve(svgString);
                        })
                        .catch((err) => reject(err));
                }
            });
        });
    });
}

function svgToDom(svgString: string): Document {
    if (svgString === undefined) throw new Error('svg to dom error')
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    return doc;
}

function computeCoverSize(imageWidth:number, imageHeight:number, documentWidth:number, documentHeight:number) {
    const ratioWidth = documentWidth / imageWidth;
    const ratioHeight = documentHeight / imageHeight;
    const ratio = Math.max(ratioWidth, ratioHeight);

    const width = Math.round(ratio * imageWidth);
    const height = Math.round(ratio * imageHeight);

    return { width, height };
}

function makeHitformFunction(hitformString: string, scale: number) {
    if (hitformString === undefined) return undefined;
    const commands = [...hitformString.matchAll(/(m|M|v|V|h|H|z|Z|l|L|c|C)(( |,)-?\d*(\.\d+)?)*/g)].map((x) => x[0]);
    // We need access to this
    return function(ctx: any) {
        ctx.beginPath();
        let x = 0;
        let y = 0;

        let debugPath = '';
        for (let k = 0; k < commands.length; ++k) {
            const command = commands[k][0];
            if (command === 'z' || command === 'Z') {
                debugPath += ` Z`
                ctx.closePath();
                continue;
            }
            const numbers = [...commands[k].matchAll(/-?\d+\.?\d*e?-?\d*?/g)].map((x) => parseFloat(x[0]));
            let numberIndex = 0;
            while (numberIndex < numbers.length) {
                switch (command) {
                    case 'M': {
                        x = numbers[numberIndex];
                        ++numberIndex;
                        y = numbers[numberIndex];
                        ++numberIndex;
                        ctx.moveTo(scale * x, scale * y);
                        debugPath += ` M ${x} ${y}`
                        break;
                    }
                    case 'm': {
                        const dx = numbers[numberIndex];
                        ++numberIndex;
                        const dy = numbers[numberIndex];
                        ++numberIndex;
                        x += dx;
                        y += dy;
                        ctx.moveTo(scale * x, scale * y);
                        debugPath += ` m ${dx} ${dy}`
                        break;
                    }

                    case 'L': {
                        x = numbers[numberIndex];
                        ++numberIndex;
                        y = numbers[numberIndex];
                        ++numberIndex;
                        ctx.lineTo(scale * x, scale * y);
                        debugPath += ` L ${x} ${y}`
                        break;
                    }

                    case 'l': {
                        const dx = numbers[numberIndex];
                        ++numberIndex;
                        const dy = numbers[numberIndex];
                        ++numberIndex;
                        x += dx;
                        y += dy;
                        ctx.lineTo(scale * x, scale * y);
                        debugPath += ` l ${dx} ${dy}`
                        break;
                    }

                    case 'C': {
                        // cp1x, cp1y, cp2x, cp2y, x, y
                        const cp1x = numbers[numberIndex];
                        ++numberIndex;
                        const cp1y = numbers[numberIndex];
                        ++numberIndex;
                        const cp2x = numbers[numberIndex];
                        ++numberIndex;
                        const cp2y = numbers[numberIndex];
                        ++numberIndex;
                        x = numbers[numberIndex];
                        ++numberIndex;
                        y = numbers[numberIndex];
                        ++numberIndex;
                        ctx.bezierCurveTo(scale * cp1x, scale * cp1y, scale * cp2x, scale * cp2y, scale * x, scale * y);
                        debugPath += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y}`
                        break;
                    }

                    case 'c': {
                        const dcp1x = numbers[numberIndex];
                        ++numberIndex;
                        const dcp1y = numbers[numberIndex];
                        ++numberIndex;
                        const dcp2x = numbers[numberIndex];
                        ++numberIndex;
                        const dcp2y = numbers[numberIndex];
                        ++numberIndex;
                        const dx = numbers[numberIndex];
                        ++numberIndex;
                        const dy = numbers[numberIndex];
                        ++numberIndex;
                        ctx.bezierCurveTo(
                            scale * (x + dcp1x),
                            scale * (y + dcp1y),
                            scale * (x + dcp2x),
                            scale * (y + dcp2y),
                            scale * (x + dx),
                            scale * (y + dy),
                        );
                        debugPath += ` c ${dcp1x} ${dcp1y} ${dcp2x} ${dcp2y} ${dx} ${dy}`
                        x += dx;
                        y += dy;
                        break;
                    }

                    case 'v': {
                        const dy = numbers[numberIndex];
                        ++numberIndex;
                        y += dy;
                        ctx.lineTo(scale * x, scale * y);
                        debugPath += ` v ${dy}`
                        break;
                    }

                    case 'h': {
                        const dx = numbers[numberIndex];
                        ++numberIndex;
                        x += dx;
                        ctx.lineTo(scale * x, scale * y);
                        debugPath += ` h ${dx}`
                        break;
                    }

                    case 'V': {
                        y = numbers[numberIndex];
                        ++numberIndex;
                        ctx.lineTo(scale * x, scale * y);
                        debugPath += ` V ${y}`
                        break;
                    }

                    case 'H': {
                        x = numbers[numberIndex];
                        ++numberIndex;
                        ctx.lineTo(scale * x, scale * y);
                        debugPath += ` H ${x}`
                        break;
                    }

                    case 'A': {
                        // TODO: wip
                        // const rx = numbers[numberIndex];
                        // ++numberIndex;
                        // const ry = numbers[numberIndex];
                        // ++numberIndex;
                        // const xrotation = numbers[numberIndex];
                        // ++numberIndex;
                        // const largearcflag = numbers[numberIndex];
                        // ++numberIndex;
                        // const sweepflag = numbers[numberIndex];
                        // ++numberIndex;
                        // x = numbers[numberIndex];
                        // ++numberIndex;
                        // y = numbers[numberIndex];
                        // ++numberIndex;

                        // ctx.ellipse(x, y, rx, ry, xrotation)
                    }
                }
            }
        }
        // WARNING, this?
        // TODO: possibliy a bug here
        // hitformFunc is called in konva environment where this is defined
        // @ts-ignore
        ctx.fillStrokeShape(this);

        // console.log(debugPath)
        // if (numberIndex < numbers.length) {
        //     console.log('Unused numbers ', numbers.length - numberIndex)
        // }
    };
}

export { colorsChanged, colorSvgString, loadSvg, computeCoverSize, makeHitformFunction, svgToDom, extractColors, prepareColors, extractDimensions };
