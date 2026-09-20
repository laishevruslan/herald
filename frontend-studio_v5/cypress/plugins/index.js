/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
const fs = require('fs');

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
    // `on` is used to hook into various events Cypress emits
    // `config` is the resolved Cypress config
    // cypress/plugins/index.ts

    on('task', {
        async 'file:delete'(filename) {
            // seed database with test data
            fs.unlinkSync(filename);
            return true;
        },

        async 'file:rename'({ oldPath, newPath }) {
            fs.renameSync(oldPath, newPath);
            return true;
        },

        async 'file:exist'(filename) {
            return fs.existsSync(filename);
        },

        async 'file:listdir'(path) {
            return fs.readdirSync(path);
        },
    });
    // ..
};
