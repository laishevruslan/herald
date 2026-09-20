// Test the users data from the data repository
// npm run test:data

import { expect, test, onTestFailed } from 'vitest';
import { validateTemplate } from '../aktivisda-core/src/validation';
const fs = require('fs');

test('All data files are present', () => {
    expect(fs.existsSync('src/assets/local/data/templates.json'))
    expect(fs.existsSync('src/assets/local/data/colors.json'))
    expect(fs.existsSync('src/assets/local/data/backgrounds.json'))
    expect(fs.existsSync('src/assets/local/data/fonts.json'))
    expect(fs.existsSync('src/assets/local/data/formats.json'))
    expect(fs.existsSync('src/assets/local/data/palettes.json'))
    expect(fs.existsSync('src/assets/local/data/symbols.json'))
    expect(fs.existsSync('src/assets/local/data/tags.json'))
    expect(fs.existsSync('src/assets/local/config.json'))
})

const files = fs.readdirSync('src/assets/local/templates')

test.each(files)('Validate template %s', (file) => {
    if (file === '.gitkeep') return;
    const template = JSON.parse(fs.readFileSync(`src/assets/local/templates/${file}`), 'utf-8');

    onTestFailed(() => {
        console.log(validateTemplate.errors)
    });

    expect(validateTemplate(template)).toBe(true)
});


