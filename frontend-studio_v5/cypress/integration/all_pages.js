const url = 'http://localhost:8080/';

const langs = require('../../src/assets/langs.json');

console.log(langs);
const pathWithoutLang = [
    { path: '/' },
    { path: '/colors' },
    { path: '/fonts' },
    { path: '/backgrounds' },
    { path: '/symbols' },
    { path: '/about' },
    { path: '/templates' },
    { path: '/qrcode' },
];

let paths = [];
paths = paths.concat(
    pathWithoutLang.map((path) => {
        return { path: path.path };
    }),
);

for (const lang of langs) {
    describe('Test ' + lang.code, () => {
        for (const path of pathWithoutLang) {
            it('Visit the page ' + path.path, () => {
                cy.visit(`${url}/${lang.code}/${path.path}`);
            });
        }
    });
}
