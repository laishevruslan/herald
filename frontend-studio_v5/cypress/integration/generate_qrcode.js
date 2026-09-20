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

describe('Test qrcode ', () => {
    const downloadsFolder = Cypress.config('downloadsFolder');

    it('Test input', () => {
        cy.viewport(1280, 720);
        const url = `fr/qrcode`;
        cy.visit(url);
        cy.get('#qrcode-input-url').type('hello world');

        cy.get('#export-qrcode-png').click();
        cy.get('#export-qrcode-svg').click();
        cy.get('#export-qrcode-link').click();
        cy.get('[role="copyLinkModal"] .is-primary').click();
    });
});
