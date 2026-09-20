const templates = require('../../src/assets/local/data/templates.json')['templates'];
const path = require('path');
const localConfig = require('../../src/assets/local/config.json');

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
        if (exist) return;

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

describe('Export ', () => {
    const downloadsFolder = Cypress.config('downloadsFolder');

    for (const template of templates) {
        it('Generate ' + template.id, () => {
            cy.viewport(1280, 720);
            const url = `/edit/${template.id}`;
            cy.visit(url);
            cy.get('#whiteboard').as('whiteboard');

            exportTemplate(downloadsFolder, `aktivisda-${template.id}.png`, `${instanceId}/templates/png/${template.id}.png`, `png`);
            exportTemplate(downloadsFolder, `aktivisda-${template.id}.jpeg`, `${instanceId}/templates/jpeg/${template.id}.jpeg`, `jpg`);
            exportTemplate(downloadsFolder, `aktivisda-${template.id}.pdf`, `${instanceId}/templates/pdf/${template.id}.pdf`, `pdf`);
            exportTemplate(downloadsFolder, `${template.id}.json`, `${instanceId}/templates/json/${template.id}.akt`, `template`);
        });
    }
});
