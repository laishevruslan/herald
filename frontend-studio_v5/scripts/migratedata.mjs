// Update all templates
import migrate from '../src/vida/versions/migrater.mjs';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const files = fs.readdirSync(`${__dirname}/../src/assets/local/templates`)
files.forEach((file) => {
    const template = JSON.parse(fs.readFileSync(`${__dirname}/../src/assets/local/templates/${file}`), 'utf-8');

    const updatedTemplate = migrate(template);
    const str = JSON.stringify(updatedTemplate, null, 4);
    fs.writeFileSync(`${__dirname}/../src/assets/local/templates/${file}`, str)
});
