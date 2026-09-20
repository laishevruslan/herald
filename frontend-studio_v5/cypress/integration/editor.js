Cypress.on('window:before:load', (win) => {
    cy.spy(win.console, 'error');
    cy.spy(win.console, 'warn');
});

afterEach(() => {
    cy.window().then((win) => {
        expect(win.console.error).to.have.callCount(0);
        expect(win.console.warn).to.have.callCount(0);
    });
});

Cypress.on('fail', (err, runnable) => {
    return true;
});

describe('Editor manipulations', () => {
    it('Create New Symbol', () => {
        cy.visit('/edit');
        cy.viewport(1280, 720);

        cy.wait(3000); // tmp hack for loading

        // https://framagit.org/aktivisda/aktivisda/-/issues/127
        cy.get('#new-symbol-button').click({ force: true });

        cy.get('.image-input-components').then((elements) => {
            expect(elements.length).to.be.equal(1);
        });
        cy.wait(3000); // tmp hack for loading

        // Download a symbol
        // https://framagit.org/aktivisda/aktivisda/-/issues/171
        cy.get('.download-symbol-button').should('have.attr', 'href').and('not.equal', '[object Promise]');
        cy.wait(3000); // tmp hack for loading
    });
});
