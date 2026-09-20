const localConfig = require('../../src/assets/local/config.json');
const templates = require('../../src/assets/local/data/templates.json')['templates'];

const path = require('path');

const instanceId = localConfig.id;

Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    return false;
});

// https://elaichenkov.medium.com/cypress-how-to-verify-that-file-is-downloaded-with-cy-verify-downloads-c520b7760a69

const exportTemplate = function (downloadsFolder, filename, savedFilename, extension) {
    const downloadedPath = path.join(downloadsFolder, filename);
    const savedPath = path.join(downloadsFolder, savedFilename);
    cy.task('file:exist', savedPath).then((exist) => {
        // if (exist) return; # let generation time

        cy.get(`#export-${extension}-button`).click({ force: true, timeout: 300000 });

        // null for "encoding" https://docs.cypress.io/api/commands/readfile#Arguments
        if (extension === 'template') {
            cy.readFile(downloadedPath, 'utf8', { timeout: 15000 });
            // .its('version').should('eq', '0.9.2')
        } else {
            cy.readFile(downloadedPath, 'binary', { timeout: 15000 }).should((buffer) => expect(buffer.length).to.be.gt(100));
        }

        cy.task('file:rename', { oldPath: downloadedPath, newPath: savedPath });
    });
};

// Still broken
describe('Import ', () => {
    const downloadsFolder = Cypress.config('downloadsFolder');

    for (const template of templates) {
        it(`Import template ${template.id}`, () => {
            cy.viewport(1280, 720);
            cy.visit('/en/edit');
            cy.get('#whiteboard').as('whiteboard');

            const file = template.id + '.json';
            const templatePath = downloadsFolder + `/../../src/assets/local/templates/` + file;
            cy.get('#import-menu').as('import-menu');
            console.log(templatePath);
            cy.get('@import-menu').selectFile(templatePath, { force: true, timeout: 300000 });
            const filename = file.replace('.json', '.png');
            exportTemplate(downloadsFolder, 'aktivisda-' + filename, `${instanceId}/import/${filename}`, 'png');
            cy.wait(3000);
            // attachFile(filepath)
            // cy.get('#file-submit').click()
            // cy.get('#uploaded-files').contains('evening.png')

            // exportTemplate(downloadsFolder, `aktivisda-${template.id}.png`, `${instanceId}/templates/png/${template.id}.png`, `png`);
            // exportTemplate(downloadsFolder, `aktivisda-${template.id}.jpeg`, `${instanceId}/templates/jpeg/${template.id}.jpeg`, `jpg`);
            // exportTemplate(downloadsFolder, `aktivisda-${template.id}.pdf`, `${instanceId}/templates/pdf/${template.id}.pdf`, `pdf`);
            // exportTemplate(downloadsFolder, `${template.id}.akt`, `${instanceId}/templates/akt/${template.id}.akt`, `template`);
        });
    }
});
