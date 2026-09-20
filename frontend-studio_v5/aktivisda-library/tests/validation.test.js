// test if validation/schemas are correct

import { expect, test, onTestFailed } from 'vitest';
import { validateGallery, validateTemplate } from '../lib/validation';
const fs = require('fs');


const templates = fs.readdirSync(`${__dirname}/assets/templates`).filter((file) => file.endsWith('.json'))
test.each(templates)('Validate template %s', (file) => {
    const template = JSON.parse(fs.readFileSync(`${__dirname}/assets/templates/${file}`, 'utf-8'));

    onTestFailed(() => {
        console.log(validateTemplate.errors)
    });

    // If filename contains .fail, validation should fail )
    expect(validateTemplate(template)).toBe(file.indexOf('.fail') == -1)
});

const galleries = fs.readdirSync(`${__dirname}/assets/galleries`).filter((file) => file.endsWith('.json'))
test.each(galleries)('Validate gallery %s', (file) => {
    const gallery = JSON.parse(fs.readFileSync(`${__dirname}/assets/galleries/${file}`, 'utf-8'));

    onTestFailed(() => {
        console.log(validateGallery.errors)
    });

    // If filename contains .fail, validation should fail )
    expect(validateGallery(gallery)).toBe(file.indexOf('.fail') == -1)
});
