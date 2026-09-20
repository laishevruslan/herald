const backgrounds = require('../../src/assets/local/data/backgrounds.json')['backgrounds'];
const path = require('path');

const localConfig = require('../../src/assets/local/config.json');

const instanceId = localConfig.id;

Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    return false;
});

// https://elaichenkov.medium.com/cypress-how-to-verify-that-file-is-downloaded-with-cy-verify-downloads-c520b7760a69

describe('Enumerate backgrounds ', () => {
    for (const background of backgrounds) {
        it(`Generate template with background ${background.id}`, () => {
            const downloadsFolder = Cypress.config('downloadsFolder');

            const newFilename = path.join(downloadsFolder, `${instanceId}/backgrounds/templatespng/${background.id}.png`);

            cy.task('file:exist', newFilename).then((exist) => {
                if (exist) return;

                cy.viewport(1280, 720);
                const url = `/edit/`;

                cy.visit(url);
                cy.get('#document-id')
                    .invoke('text')
                    .as('textFunction')
                    .then((documentId) => {
                        const downloadedFilename = path.join(downloadsFolder, `aktivisda-${documentId}.png`);

                        cy.get('#open-gallery-button').click({ force: true });
                        cy.get(`[data-symbol-preview="${background.id}"]`).first().click({ force: true });

                        cy.wait(2000); // tmp hack for loading
                        cy.get('#fit-to-background-button').click({ force: true });
                        cy.get('#random-palette-button').click({ force: true });
                        cy.wait(1000); // tmp hack for loading

                        cy.get('#export-png-button').click({ force: true, timeout: 300000 });

                        cy.readFile(downloadedFilename, 'binary', { timeout: 15000 }).should((buffer) => expect(buffer.length).to.be.gt(100));

                        cy.task('file:rename', { oldPath: downloadedFilename, newPath: newFilename });
                    });
            });
        });
    }
});
