import { expect, test, onTestFailed } from 'vitest';

import fs from 'node:fs';

import JsonGallery from '../lib/jsongallery'
import InvalidDataError from '../lib/invaliddataerror';

const galleries = fs.readdirSync(`${__dirname}/assets/galleries`).filter((file) => file.endsWith('.json'))
test.each(galleries)('Create Jsongalleries %s', (file) => {
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/${file}`, 'utf-8'));
    try {
        new JsonGallery(data, `${__dirname}/assets/images/`);
        expect(file.indexOf('.fail') == -1).toBeTruthy();

    } catch (e) {
        if (e instanceof InvalidDataError) {
            expect(file.indexOf('.fail') != -1).toBeTruthy();
        } else {
            expect(false);
        }
    }
});


test('access gallery elements', () => {
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    const element = gallery.elementById('8a226461');
    expect(element.id).toBe('8a226461');
    expect(element.type).toBe('internalphoto');
    expect(element.filename).toBe('8a226461.png');
    expect(element.preview).toBe('previews/8a226461.png');

    const element2 = gallery.elementById('d45c5360');
    expect(element2.id).toBe('d45c5360');
    expect(element2.type).toBe('internalphoto');
    expect(element2.filename).toBe('d45c5360.jpg');
    expect(element2.preview).toBe('previews/d45c5360.jpg');
    expect(element2.thumbnail).toBe('thumbnails/d45c5360.webp');

    const element3 = gallery.elementById('cf470748');
    expect(element3.id).toBe('cf470748');
    expect(element3.type).toBe('internalsvg');
    expect(element3.filename).toBe('cf470748.svg');
    expect(element3.preview).toBe('previews/cf470748.png');
    expect(element3.thumbnail).toBe('thumbnails/cf470748.webp');
    expect(element3.width).toBe(477.7);
    expect(element3.height).toBe(419.7);

    const element4 = gallery.elementById('xxx');
    expect(element4).toBeUndefined();
})

test('access random elements', () => {
    const data = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/gallery.json`, 'utf-8'));
    const gallery = new JsonGallery(data, `${__dirname}/assets/images/`);

    const distribution = { '161d5de7': 0, '83060a9e': 0 };

    for (let k=0; k<200; ++k) {
        const element = gallery.randomInternalPhoto();
        expect(element.type).toBe('internalphoto')
        distribution[element.id] += 1;
    }
    expect(Math.abs(distribution['8a226461'] - distribution['d45c5360']) < 30);

    for (let k=0; k<200; ++k) {
        const element = gallery.randomInternalSvg();
        expect(element.type).toBe('internalsvg')
        distribution[element.id] += 1;
    }

    expect(Math.abs(distribution['cf470748'] - distribution['f8ea7741-1242-4368-882b-0394696719cd']) < 30);


})