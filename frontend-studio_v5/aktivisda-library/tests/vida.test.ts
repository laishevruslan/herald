import { expect, test, beforeEach, afterEach, describe } from 'vitest';
import { asset, tempfile, cleanFileIfExists, compareImages, rewriteJpeg, comparePdfs, comparePdfPng, checkStep, saveDataUrl, pdfMakeFonts } from './utils.ts'

import { validateTemplate } from '../lib/validation/index.ts';
import Konva from 'konva';
import { Image, createCanvas } from 'canvas'

import Vida from '../lib/vida.js';
import JsonGallery from '../lib/jsongallery.js';
import TextVidaComponent from '../lib/components/textvidacomponent.ts';

import fs from 'node:fs';

let canvas: any;

test('jsdom configuration', () => {
    const element = document.createElement('div')
    expect(element).not.toBeNull()
})

beforeEach(() => {
    canvas = document.createElement('div');
    canvas.id = 'canvascontainer'
    document.body.append(canvas)
    canvas.width = 400;
    canvas.height = 300;
});

afterEach(() => {
    canvas.remove();
})

test.each(Object.keys(pdfMakeFonts))('Testing if font is installed exports: (%s)',
    async (font: string) => {

    const width = 1000, height = 200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#FF0000';
    ctx.font = `50px ${font}`
    ctx.fillText('Portons dix bons whiskys à l\'avocat\ngoujat qui fumait au zoo.', 50, 100)

    const outputFilepath = tempfile(`${font}.jpeg`);

    saveDataUrl(canvas.toDataURL('image/jpeg'), `${font}.jpeg`);

    const imageComparisonResult = await compareImages(outputFilepath, asset(`fonts/${font}.jpeg`));
    expect(imageComparisonResult.equal).toBeTruthy();
});

test('Recrate template18 by hand', async () => {
    const width = 1619, height = 1080;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffc11e';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(818.5 - 452.6201171875/2, 522 - 263/2, 452.6201171875, 263);


    ctx.fillStyle = '#000000';
    ctx.font = `263px Raleway Thin`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'

    ctx.fillText('asic', 818.5, 522)

    saveDataUrl(canvas.toDataURL('image/png'), `template18_byhand.png`);
    const imageComparisonResult = await compareImages(asset('templates/template18.png'), tempfile('template18_byhand.png'));
    expect(imageComparisonResult.equal).toBeTruthy();

});

test('Text position in canvas', async () => {

    function drawHLine(y: number) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    const width = 1500, height = 200;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1;
    drawHLine(62);
    drawHLine(109.5);
    drawHLine(62.5);
    drawHLine(125);
    drawHLine(73);
    ctx.lineWidth = 2;
    drawHLine(100);


    ctx.fillStyle = '#FF0000';
    ctx.font = `50px Roboto`
    ctx.fillText('nothing', 50, 100)

    ctx.textBaseline = 'top'
    ctx.fillText('top', 250, 100)

    ctx.textBaseline = 'bottom'
    ctx.fillText('bottom', 325, 100)

    ctx.textBaseline = 'middle'
    ctx.fillText('middle', 500, 100)

    ctx.textBaseline = 'alphabetic'
    ctx.fillText('alphabetic', 660, 100)

    ctx.textBaseline = 'hanging'
    ctx.fillText('hanging', 900, 100)

    ctx.textBaseline = 'ideographic'
    ctx.fillText('ideographic', 1150, 100)

    saveDataUrl(canvas.toDataURL('image/jpeg'), `testposition.jpeg`);

    // const imageComparisonResult = await compareImages(outputFilepath, asset(`fonts/${font}.jpeg`));
    // expect(imageComparisonResult.equal).toBeTruthy();

});

// TODO not robust
test('Create canvas image',  async () => {
    const loadingPromise = new Promise<void>((resolve) => {
        const image = new Image();

        image.onload = () => {
            expect(image).not.toBe(null);
            resolve();
        }
        image.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAGXRFWHRDb21tZW50AENyZWF0ZWQgd2l0aCBHSU1QV4EOFwAAAYRpQ0NQSUNDIHByb2ZpbGUAACiRfZE9SMNAGIbfpkqlVDvYQcQhQ3WyICriqFUoQoVQK7TqYHLpHzQxJCkujoJrwcGfxaqDi7OuDq6CIPgD4uripOgiJX6XFFrEeHB3D+9978vdd4DQqDLN6hoDNN02M6mkmMuviKFXhBFFH62CzCxjVpLS8B1f9wjw/S7Bs/zr/hy9asFiQEAknmGGaROvE09t2gbnfeIYK8sq8TnxqEkXJH7kuuLxG+eSywLPjJnZzBxxjFgsdbDSwaxsasSTxHFV0ylfyHmsct7irFVrrHVP/sJIQV9e4jrNIaSwgEVIEKGghgqqsJGgXSfFQobOkz7+QdcvkUshVwWMHPPYgAbZ9YP/we/eWsWJcS8pkgS6XxznYxgI7QLNuuN8HztO8wQIPgNXetu/0QCmP0mvt7X4ERDdBi6u25qyB1zuAANPhmzKrhSkKRSLwPsZfVMe6L8Fwqte31rnOH0AstSr9A1wcAiMlCh7zefdPZ19+7em1b8f8YJyc1f3LdwAAAAJcEhZcwAALiMAAC4jAXilP3YAAAAHdElNRQfnCg8OCh1GMSA0AAAAFUlEQVQY02P8//8/A27AxIAXjFRpAKXjAxH/0Dm5AAAAAElFTkSuQmCC';
    });
    await loadingPromise;
});

test('Create a konva image using canvas image', () => {
    const image = new Image();

    const konvaImage = new Konva.Image({ draggable: false, image: <any>image });
    expect(konvaImage).not.toBe(null);
});

test('Create empty konva stage', () => {
    const stage = new Konva.Stage({
        container: canvas.id,
        width: 100,
        height: 200,
    });

    expect(stage).not.toBe(null);
});

test('Konva stage to dataurl', () => {
    const stage = new Konva.Stage({
        container: canvas.id,
        width: 100,
        height: 200,
    });
    const layer = new Konva.Layer({ draggable: true });
    stage.add(layer);
    layer.draw();

    const image = stage.toDataURL({ mimeType: 'image/jpeg', quality: 1});
    expect(image.length).toBeGreaterThan(100);
});

test('Create empty vida', () => {
    const vida = new Vida(canvas.id);

    expect(vida).not.toBe(null);
});

// Test to create a vida on a non-existing canvas id
test('Test no canva', async () => {
    // Given
    try {
        new Vida(canvas.id + 'doesnotexist');
    } catch (err) {
        expect(true).toBeTruthy();
        return;
    }
    expect(true).toBeFalsy();
})

// Load template5.json (only one background as photourl) and check its output
test('Test loadjson', async () => {
    // Given
    const vida = new Vida(canvas.id);
    const template = JSON.parse(fs.readFileSync(asset(`templates/template5.json`), 'utf-8'));

    // When
    await vida.loadJson(template);

    // Then
    expect(vida.toJson()).toStrictEqual(template);
})


const templates = [
    ['template5', 'White image, only a photoUrl background', undefined, ['image/jpeg', 'image/png', 'application/pdf', 'application/json']],
    ['template6', 'Colorful image, only a photoUrl background', undefined, ['image/jpeg', 'image/png', 'application/pdf', 'application/json']],
    ['template7', 'Colorful image with many internalsvgs as background and foreground', 'gallery.json', ['image/jpeg', 'image/png', 'application/pdf', 'application/json']],
    ['template8', 'An elephant internalphoto png image on a green background', 'gallery.json', ['image/jpeg', 'image/png', 'application/pdf', 'application/json']],
    ['template9', 'An elephant internalphoto jpeg as background', 'gallery.json', ['image/jpeg', 'image/png', 'application/pdf', 'application/json']],
    // TODO this test is broken (timeout) if gallery.json. Should fail.
    // Probably error in exception/catch management for backgroundcomponent
    ['template10', 'A basic roboto text', 'gallery.json', ['image/jpeg', 'image/png', 'application/json', 'application/pdf']],
    ['template11', 'Many Raleway texts (different colors, alignments, rotations and sizes)', 'gallery.json', ['image/jpeg', 'image/png', 'application/json', 'application/pdf']],
    ['template12', 'Text background distortions and rounded', 'gallery.json', ['image/jpeg', 'image/png', 'application/json', 'application/pdf']],
    ['template13', 'Many qrcodes with and without internalsvg inside', 'gallery.json', ['application/json', 'image/png', 'image/jpeg', 'application/pdf']],
    ['template14', 'Internalsvg and rotation (test pdf export) and zindex (should be red, then black then green)', 'gallery.json', ['application/json', 'image/png', 'image/jpeg', 'application/pdf']],
    ['template15', 'Same than template 8 but with -180 rotation', 'gallery.json', ['application/json', 'image/png', 'image/jpeg', 'application/pdf']],
    // ['template16', 'Same than template 10. Try with emoji using text component', 'gallery.json', ['application/json', 'image/png', 'image/jpeg']],
    // ['template17', 'Same than template 10. Try with emoji using text component', 'gallery.json', ['application/json', 'image/png', 'image/jpeg']],
    ['template18', 'A simple text with a rectangular background', 'gallery.json', ['application/json', 'image/png', 'image/jpeg', 'application/pdf']],
    ['template19', 'Same as template 9 but with blur', 'gallery.json', ['image/png', 'image/jpeg', 'application/json']],
    ['template20', 'Test for shadow, different colors and offsets', 'gallery.json', ['image/png', 'image/jpeg', 'application/json', 'application/pdf']],
    ['template22', 'Test pdf export with special characters (non valid for xmldoc)', 'gallery.json', ['application/pdf']], // Issue #257
];

describe.each(templates)('Testing templates exports: (%s, %s) %s',
    (input: string, comment: string, galleryPath: string | undefined, mimeTypes: Array<string>) => {


    test.each(mimeTypes)('Export to %s',
    async (mimeType) => {


        expect(galleryPath === undefined || galleryPath.endsWith('.json')).toBeTruthy();


        const inputFilepath = asset(`templates/${ input }.json`)
        let target;
        switch (mimeType) {
        case 'image/jpeg':
            target = input + '.jpeg';
            break;
        case 'image/png':
            target = input + '.png';
            break;
        case 'application/pdf':
            target = input + '.pdf';
            break;
        case 'application/json':
            target = input + '.json';
            break;
        }
        const targetFilepath = asset(`templates/${ target }`)

        const outputFilepath = tempfile(target);
        cleanFileIfExists(outputFilepath)

        // Given
        const vida = new Vida(canvas.id);
        if (galleryPath !== undefined) {
            const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/${ galleryPath }`, 'utf-8'));
            const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

            vida.setGallery(gallery);
        }

        const template = JSON.parse(fs.readFileSync(inputFilepath, 'utf-8'));
        await vida.loadJson(template);

        switch (mimeType) {
        case 'image/jpeg':
        case 'image/png':
            const imageData = await vida.toImage(mimeType);
            saveDataUrl(imageData, target);
            break;
            case 'application/json':
            break;
        case 'application/pdf':
            const pdfData = await vida.toPdf(pdfMakeFonts);
            saveDataUrl(pdfData, target);
            break;
        };

        // Then
        switch (mimeType) {
        case 'image/jpeg':
            await rewriteJpeg(outputFilepath)
        case 'image/png':
            const imageComparisonResult = await compareImages(outputFilepath, targetFilepath);
            expect(imageComparisonResult.equal).toBeTruthy();
            break;
        case 'application/json':
            expect(vida.toJson()).toStrictEqual(template);
            break;
        case 'application/pdf':
            const pdfComparisonResult = await comparePdfs(outputFilepath, targetFilepath);
            expect(pdfComparisonResult.equal).toBeTruthy();

            if (mimeTypes.includes('application/png')) {
                const pdfPngComparisonResult = await comparePdfPng(outputFilepath, asset(`templates/${input}.png`));
                if (!pdfPngComparisonResult.equal)
                    console.warn(`Pdf and png are not the same for template ${input}`)
            }
            break;
        }
    });
});


test('Test toImage2', async () => {
    cleanFileIfExists(tempfile('myimage6.jpeg'))
    // Given
    const vida = new Vida(canvas.id);
    const template = JSON.parse(fs.readFileSync(asset('templates/template6.json'), 'utf-8'));
    await vida.loadJson(template);
});

test('createComponent', async () => {
    // Given
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    vida.setGallery(gallery);
    // When
    await vida.createComponent({
        id: 'mytext',
        position: { x: 0.5, y: 0.5 },
        type: 'text',
        text: '🐘',
        size: 0.9,
        color: '#ffffff'
    });
    await vida.updateDocument({
        background: {
            type: 'internalphoto',
            id: 'd45c5360'
        }
    });
    await vida.updateDocument({ i18n: { defaultLocale: 'en' }})
    await vida.updateDocument({
        width: 200,
        height: 200
    });
    const imageData = await vida.toImage('image/jpeg');
    fs.writeFileSync(tempfile('createcomponenttest.jpeg'), imageData.split(';base64,').pop()!, { 'encoding': 'base64' })

    await vida.updateComponent('mytext', {
        'text': 'it fails'
    });

})

test('Change document dimensions', async () => {
        // Given
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));

    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);
    vida.setGallery(gallery);

    const inputFilepath = asset(`templates/template13.json`)

    const template = JSON.parse(fs.readFileSync(inputFilepath, 'utf-8'));

    await vida.loadJson(template);
    vida.zoom(null);


    expect(await checkStep(vida, 'crop', '1')).toBeTruthy();
    await vida.updateDocument({
        width: 50,
    });
    expect(await checkStep(vida, 'crop', '2')).toBeTruthy();

    // exportCanvas(vida, 'step2.png');

    // const imageData = await vida.toImage('image/png');
    // fs.writeFileSync(tempfile('outtemplate.png'), imageData.split(';base64,').pop()!, { 'encoding': 'base64' })

});

test('Random template', async () => {
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    vida.setGallery(gallery);

    // vida.updateDocument({width: 1080, height: 700});

    await vida.createRandomComponent('internalsvg');
    await vida.createRandomComponent('internalphoto');
    await vida.createRandomComponent('qrcode');
    await vida.createRandomComponent('text');
    await vida.createRandomComponent('emoji');

    await vida.createRandomComponent('internalsvg');
    await vida.createRandomComponent('internalphoto');
    await vida.createRandomComponent('qrcode');
    await vida.createRandomComponent('text');
    await vida.createRandomComponent('emoji');

    const template = vida.toJson();
    expect(template.components.length).toBe(10);
    expect(template.components[0].type).toBe('image');
    expect(template.components[0]!.image!.type).toBe('internalsvg');

    expect(template.components[1].type).toBe('image');
    expect(template.components[1]!.image!.type).toBe('internalphoto');

    expect(template.components[2].type).toBe('image');
    expect(template.components[2]!.image!.type).toBe('qrcode');

    expect(template.components[3].type).toBe('text');
    expect(template.components[3].text).not.toBe('');

    expect(template.components[4].type).toBe('emoji');
    expect(template.components[4].text).not.toBe('');

    expect(template.components[5].type).toBe('image');
    expect(template.components[5]!.image!.type).toBe('internalsvg');
    expect(template.components[5]).not.toStrictEqual(template.components[0]);

    expect(template.components[6].type).toBe('image');
    expect(template.components[6]!.image!.type).toBe('internalphoto');
    expect(template.components[6]).not.toStrictEqual(template.components[1]);

    expect(template.components[7].type).toBe('image');
    expect(template.components[7]!.image!.type).toBe('qrcode');
    expect(template.components[7]).not.toStrictEqual(template.components[2]);

    expect(template.components[8].type).toBe('text');
    expect(template.components[8]!.text).not.toBe('');
    expect(template.components[8]).not.toStrictEqual(template.components[3]);

    expect(template.components[9].type).toBe('emoji');
    expect(template.components[9].text).not.toBe('');
    expect(template.components[9]).not.toStrictEqual(template.components[4]);
})

test('Random images updates', async () => {
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);
    vida.setGallery(gallery);

    await vida.randomInit();
    await vida.updateDocument({
        background: {
            id: 'f8ea7741-1242-4368-882b-0394696719cd',
            type: 'internalsvg',
            colors: {
                '#ffc11e': '#ffccee',
                },
            width: 305.4,
            height: 375,
        },
        // same as canvas dimensions
        width: 400,
        height: 300
    });
    const componentId = await vida.createRandomComponent('internalsvg');

    let previousImageId = vida.componentParams(componentId).image.id;

    // Do not use toImage because this method will rerender the image
    saveDataUrl(vida.stage.toDataURL({ mimeType: 'image/png', quality: 1}), 'random-updates-0.png');

    for (let k = 1; k <15; ++k) {
        const randomImage = Math.random() < 0.2 ? vida.gallery?.randomInternalPhoto() : vida.gallery?.randomInternalSvg();
        await vida.updateComponent(componentId, { image: randomImage })
        saveDataUrl(vida.stage.toDataURL({ mimeType: 'image/png', quality: 1}), `random-updates-${k}.png`);

        expect(vida.componentParams(componentId).image.id === randomImage!.id);
        const pngComparisonResult = await compareImages(tempfile(`random-updates-${k - 1}.png`), tempfile(`random-updates-${k}.png`));
        if (previousImageId === randomImage!.id) {
            expect(pngComparisonResult.equal).toBeTruthy();
        } else {
            expect(pngComparisonResult.equal).toBeFalsy();
        }

        previousImageId = randomImage!.id;
    }
});

test('Translation template, displayedLocale', { timeout: 20000 }, async () => {
    const vida = new Vida(canvas.id);
    const galleryData = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(galleryData, `${__dirname}/assets/images/`);

    vida.setGallery(gallery);

    const template = JSON.parse(fs.readFileSync(asset(`templates/template21.json`), 'utf-8'));
    await vida.loadJson(template);

    expect(vida.computeAvailableLocales()).toEqual(new Set(['fr', 'en', 'de', 'it','pl', 'no']));

    for (const locale of vida.computeAvailableLocales()) {
        await vida.updateDocument({ i18n: { displayedLocale: locale } });
        const translatedTemplate = vida.toJson();
        expect(validateTemplate(translatedTemplate)).toBeTruthy();
        expect(translatedTemplate.document.i18n!.displayedLocale).toBe(locale);
        const imageData = await vida.toImage('image/png');
        const target = `template21.${locale}.png`;
        saveDataUrl(imageData, target);
        const imageComparisonResult = await compareImages(tempfile(`template21.${locale}.png`), asset(`templates/${target}`));
        expect(imageComparisonResult.equal).toBeTruthy();

        const pdfData = await vida.toPdf(pdfMakeFonts);
        const pdfTarget = `template21.${locale}.pdf`;

        saveDataUrl(pdfData, pdfTarget);

        const pdfComparisonResult = await comparePdfs(tempfile(pdfTarget), asset(`templates/${pdfTarget}`));
        expect(pdfComparisonResult.equal).toBeTruthy();
    }
})

test('Text background is not reactive', async() => {
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));

    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);
    vida.setGallery(gallery);

    await vida.randomInit();
    await vida.updateDocument({
        background: {
            id: 'f8ea7741-1242-4368-882b-0394696719cd',
            type: 'internalsvg',
            colors: {
                '#ffc11e': '#feeedd',
            },
            width: 305.4,
            height: 375,
        },
        // same as canvas dimensions
        width: 200,
        height: 200,
    });
    vida.zoom(null);

    expect((await checkStep(vida, 'paddingupdate', '1')).equal).toBeTruthy();
    await vida.updateDocument({
        background: {
            colors: {
                "#ffc11e": "#fe99dd",
            },
        },
    });
    expect((await checkStep(vida, 'paddingupdate', '2')).equal).toBeTruthy();

    await vida.createComponent({
        id: 'mytext',
        type: 'text',
        position: {
            x: 0.4,
            y: 0.4,
        },
        color: '#000000',
        justification: ' center',
        size: 40,
        font: 'Roboto',
        angle: 0,
        text: 'Padding'
    });
    expect((await checkStep(vida, 'paddingupdate', '3')).equal).toBeTruthy();

    // Activate background
    await vida.updateComponent('mytext',{
        color: "#0404cc",
        background: {
            mode: 'rounded',
            padding: 10,
            radius: 10,
            color: "#aaeeee",
            distortion: undefined,
            angleDistortion: undefined
        }
    })
    expect((await checkStep(vida, 'paddingupdate', '4')).equal).toBeTruthy();

    // Increase padding
    await vida.updateComponent('mytext',{
        // @ts-ignore
        background: {
            padding: 50,
        }
    })
    expect((await checkStep(vida, 'paddingupdate', '5')).equal).toBeTruthy();

    // Increase text
    await vida.updateComponent('mytext',{
        // @ts-ignore
        size: 20
    })
    expect((await checkStep(vida, 'paddingupdate', '6')).equal).toBeTruthy();

    // Turn text
    await vida.updateComponent('mytext',{
        // @ts-ignore
        angle: 50
    })
    expect((await checkStep(vida, 'paddingupdate', '7')).equal).toBeTruthy();

    // Change text
    await vida.updateComponent('mytext',{
        // @ts-ignore
        text: "Very long text now"
    })
    expect((await checkStep(vida, 'paddingupdate', '8')).equal).toBeTruthy();

    // Change font
    await vida.updateComponent('mytext',{
        // @ts-ignore
        font: "Raleway Thin"
    })
    expect((await checkStep(vida, 'paddingupdate', '9')).equal).toBeTruthy();
})

test('Test bring forward/backward', async() => {
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));

    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);
    vida.setGallery(gallery);

    await vida.randomInit();
    await vida.updateDocument({
        background: {
            id: 'f8ea7741-1242-4368-882b-0394696719cd',
            type: 'internalsvg',
            colors: {
                '#ffc11e': '#fee9dd',
            },
            width: 305.4,
            height: 375,
        },
        // same as canvas dimensions
        width: 200,
        height: 200,
    });
    vida.zoom(null);

    await vida.createComponent({
        id: 'mytext',
        type: 'text',
        position: {
            x: 0.5,
            y: 0.5,
        },
        color: '#000000',
        justification: ' center',
        size: 40,
        font: 'Roboto',
        angle: 0,
        text: 'Texte 1',
        background: {
            mode: 'rounded',
            padding: 10,
            radius: 10,
            color: '#aaeeee',
            distortion: undefined,
            angleDistortion: undefined,
        },
    });
    await vida.createComponent({
        id: 'mytext2',
        type: 'text',
        position: {
            x: 0.45,
            y: 0.45,
        },
        color: '#000000',
        justification: ' center',
        size: 40,
        font: 'Roboto',
        angle: 0,
        text: 'Texte2',
        background: {
            mode: 'normal',
            padding: 10,
            radius: 10,
            color: '#eeeeaa',
            distortion: undefined,
            angleDistortion: undefined,
        },
    });

    // 2, 1
    expect((await checkStep(vida, 'forward', '1')).equal).toBeTruthy();

    // 1 renvoyé devant: 1, 2
    await vida.updateComponent('mytext', {
        zIndex: vida.componentParams('mytext').zIndex + 1
    });

    expect((await checkStep(vida, 'forward', '2')).equal).toBeTruthy();

    // 2 envoyé devant : 2, 1
    await vida.updateComponent('mytext2', {
        zIndex: vida.componentParams('mytext2').zIndex + 1
    });
    expect((await checkStep(vida, 'forward', '1')).equal).toBeTruthy();

    // 1 envoyé derrière, aucun changement : 2, 1
    await vida.updateComponent('mytext', {
        zIndex: vida.componentParams('mytext').zIndex - 1,
    });
    expect((await checkStep(vida, 'forward', '1')).equal).toBeTruthy();

    // 2 envoyé derrière : 1, 2
    await vida.updateComponent('mytext2', {
        zIndex: vida.componentParams('mytext2').zIndex - 1,
    });
    expect((await checkStep(vida, 'forward', '2'    )).equal).toBeTruthy();
})

test('Test "undo"', async () => {
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    vida.setGallery(gallery);

    // vida.updateDocument({width: 1080, height: 700});

    const internalSvgId = await vida.createRandomComponent('internalsvg');
    const internalPhotoId = await vida.createRandomComponent('internalphoto');
    const qrCodeId = await vida.createRandomComponent('qrcode');
    const textId = await vida.createRandomComponent('text');
    const emojiId = await vida.createRandomComponent('emoji');

    const internalSvgParams = vida.componentParams(internalSvgId);
    await vida.updateComponent(internalSvgId, { scale: 30 })
    expect(vida.componentParams(internalSvgId).scale).toBe(30);
    await vida.undoComponent(internalSvgId);
    expect(vida.componentParams(internalSvgId)).toStrictEqual(internalSvgParams);

    await vida.updateComponent(internalSvgId, { scale: 10 })
    await vida.updateComponent(internalSvgId, { position: { x: 0.3} })
    expect(vida.componentParams(internalSvgId).scale).toBe(10);
    expect(vida.componentParams(internalSvgId).position.x).toBe(0.3);

    await vida.undoComponent(internalSvgId);
    expect(vida.componentParams(internalSvgId).scale).toBe(10);
    await vida.undoComponent(internalSvgId);
    expect(vida.componentParams(internalSvgId)).toStrictEqual(internalSvgParams);
});

// Issue #264 https://framagit.org/aktivisda/aktivisda/-/issues/264
test('Saving translation template', async() => {
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));

    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);
    vida.setGallery(gallery);

    await vida.randomInit();
    await vida.updateDocument({
        background: {
            id: 'f8ea7741-1242-4368-882b-0394696719cd',
            type: 'internalsvg',
            colors: {
                '#ffc11e': '#feeedd',
            },
            width: 305.4,
            height: 375,
        },
        // same as canvas dimensions
        width: 200,
        height: 200,
    });

    await vida.createComponent({
        id: 'mytext',
        type: 'text',
        position: {
            x: 0.5,
            y: 0.5,
        },
        color: '#000000',
        justification: ' center',
        size: 40,
        font: 'Roboto',
        angle: 0,
        text: 'Padding',
        i18n: {}
    });
    expect(vida.componentParams('mytext').position).toStrictEqual({ x: 0.5, y: 0.5});
    await vida.updateComponent('mytext', { i18n: { en: { position: { x: 0.2 }}}})
    expect(vida.componentParams('mytext').position).toStrictEqual({ x: 0.5, y: 0.5});
    expect(vida.componentParams('mytext').i18n.en.position).toStrictEqual({ x: 0.2});
    await vida.updateDocument({ i18n: { editingLocale: 'en' }})
    expect(vida.componentParams('mytext').position).toStrictEqual({ x: 0.5, y: 0.5});
    expect(vida.componentParams('mytext').i18n.en.position).toStrictEqual({ x: 0.2});

    const json = vida.toJson();

    expect(json.document.i18n.editingLocale).toStrictEqual('en');
    await vida.loadJson(json);
    expect(vida.components.length).toBe(1);
    expect(vida.componentParams('mytext').position).toStrictEqual({ x: 0.5, y: 0.5});
    expect(vida.componentParams('mytext').i18n.en.position).toStrictEqual({ x: 0.2});

    await vida.toImage('image/jpeg');
    expect(vida.components.length).toBe(1);
    expect(vida.componentParams('mytext').position).toStrictEqual({ x: 0.5, y: 0.5});
    expect(vida.componentParams('mytext').i18n.en.position).toStrictEqual({ x: 0.2});

    await vida.updateDocument({ i18n: { editingLocale: null, displayedLocale: 'en' }})
    await vida.toImage('image/jpeg');
    expect(vida.components.length).toBe(1);
    expect(vida.componentParams('mytext').position).toStrictEqual({ x: 0.5, y: 0.5});
    expect(vida.componentParams('mytext').i18n.en.position).toStrictEqual({ x: 0.2});
});

test('Manipulating textchoice component', async () => {
    const vida = new Vida(canvas.id);
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));

    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);
    vida.setGallery(gallery);

    await vida.randomInit();
    await vida.updateDocument({
        background: {
            id: 'f8ea7741-1242-4368-882b-0394696719cd',
            type: 'internalsvg',
            colors: {
                '#ffc11e': '#feeedd',
            },
            width: 305.4,
            height: 375,
        },
        i18n: {
            defaultLocale: 'fr',
            editingLocale: null,
            displayedLocale: null
        },
        // same as canvas dimensions
        width: 200,
        height: 200,
    });

    await vida.createComponent({
        id: 'mytext',
        type: 'textchoice',
        text: "0",
        textChoices: {
            "0": {
                fr: "francais", en: "anglais"
            }
        }
    });
    const component = <TextVidaComponent>vida._findComponent('mytext')!;

    // // Basic test: add choices, change (add, edit, remove) text, change displayedLocale
    expect(component.konvaElementText!.text()).toBe('francais')
    vida.updateDocument({ i18n: { displayedLocale: 'en' }})
    expect(component.konvaElementText!.text()).toBe('anglais')
    vida.updateComponent('mytext', { textChoices: {
        "0": { en: "nouveau anglais" } }
    })
    expect(component.konvaElementText!.text()).toBe('nouveau anglais')
    vida.updateComponent('mytext', { textChoices: {
        "1": { fr: "le 1 en fr" } }, text: "1"
    })
    expect(component.konvaElementText!.text()).toBe('le 1 en fr')
    vida.updateComponent('mytext', { textChoices: {
        "1": { en: "une version anglaise" } }
    })
    expect(component.konvaElementText!.text()).toBe('une version anglaise')
    expect(component.textChoices).toStrictEqual({ "0": { fr: "francais", en: "nouveau anglais"}, "1": { fr: "le 1 en fr", en: "une version anglaise"}})
    vida.updateDocument({ i18n: { displayedLocale: 'fr' } });
    expect(component.konvaElementText!.text()).toBe('le 1 en fr')

    vida.updateComponent('mytext', {
        textChoices: {
            '1': { fr: null },
        },
    });
    expect(component.textChoices).toStrictEqual({ "0": { fr: "francais", en: "nouveau anglais"}, "1": { en: "une version anglaise"}})
    expect(component.konvaElementText!.text()).toBe('une version anglaise')
    vida.updateComponent('mytext', {
        textChoices: {
            '1': { en: null },
        },
    });
    expect(component.konvaElementText!.text()).toBe('francais')
    vida.updateComponent('mytext', {
        textChoices: {
            '1': null,
        },
    });
    expect(component.konvaElementText!.text()).toBe('francais')
    expect(component.textChoices).toStrictEqual({ '0': { fr: 'francais', en: 'nouveau anglais' } });

    vida.updateComponent('mytext', {
        text: '0'
    });
    expect(component.konvaElementText!.text()).toBe('francais')

    // Translation mode tests
    vida.updateDocument({ i18n: { displayedLocale: null, editingLocale: 'en' }})
    expect(component.konvaElementText!.text()).toBe('nouveau anglais');
    vida.updateDocument({ i18n: { editingLocale: 'fr' }})
    expect(component.konvaElementText!.text()).toBe('francais');

    vida.updateComponent('mytext', {
        textChoices: {
            '1': { en: 'une nouvelle option mais seulement en anglais' },
        },
    });
    await vida.updateComponent('mytext', {i18n: { 'fr': { text: '1' }}});
    expect(component.konvaElementText!.text()).toBe('une nouvelle option mais seulement en anglais');

    // Switch type to text
    vida.updateComponent('mytext', {type: 'text'});
    // No change
    expect(component.konvaElementText!.text()).toBe('une nouvelle option mais seulement en anglais');
    vida.updateComponent('mytext', {text: 'this is the text'});
    expect(component.konvaElementText!.text()).toBe('this is the text');
});