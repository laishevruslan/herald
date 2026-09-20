'use strict';
import InvalidDataError from '../invaliddataerror.ts';

import { pSBC } from '../utils/utils.ts';

function migrate_0_9_1(template) {
    console.info('> migrate to 0.9.1');

    for (let k = 0; k < template.components.length; ++k) {
        if (template.components[k].type !== 'text') continue;
        template.components[k].background = {
            enabled: false,
            color: '#ffffff',
            padding: 3,
        };
    }
    template.version = '0.9.1';
    return template;
}

function migrate_1_0_12(template) {
    console.info('> migrate to 1.0.12');
    for (let k = 0; k < template.components.length; ++k) {
        if (template.components[k].type !== 'svg') continue;
        template.components[k].type = 'image';
        template.components[k]['image'] = template.components[k]['symbol'];
        template.components[k]['image']['type'] = 'internalsvg';
        template.components[k]['symbol'] = undefined;
    }
    template.version = '1.0.12';
    return template;
}

function migrate_1_0_14(template) {
    console.info('> migrate to 1.0.14');
    template.document.background['type'] = 'internalsvg';
    template.version = '1.0.14';
    return template;
}

function migrate_1_0_18(template) {
    console.info('> migrate to 1.0.18');
    for (let k = 0; k < template.components.length; ++k) {
        if (template.components[k].type !== 'text') continue;
        template.components[k].background['distortion'] = [
            [-1, 1],
            [1, 1],
            [1, -1],
            [-1, -1],
        ];
        template.components[k].background['angleDistortion'] = 0;
    }
    template.version = '1.0.18';
    return template;
}

function migrate_1_1_0(template) {
    console.info('> migrate to 1.1.0');
    if (template.document.i18n == null) {
        template.document.i18n = {
            defaultLocale: 'fr',
            displayedLocale: 'fr'
        }
    }
    for (let k = 0; k < template.components.length; ++k) {
        // TODO: improve templates comparisons
        template.components[k].i18n = { fr: {}};
        template.components[k].rules = {};

        if (template.components[k].type === 'text') {
            if (template.components[k].background.enabled === false) {
                template.components[k].background['mode'] = 'disabled';
            } else {
                if (template.components[k].background.angleDistortion) {
                    template.components[k].background['mode'] = 'distorted';
                } else {
                    template.components[k].background['mode'] = 'normal';
                }
            }
            template.components[k].background['radius'] = 0;
            delete template.components[k].background.enabled;

            template.components[k].shadow = {
                color: pSBC(0.4, template.components[k].color),
                enabled: false,
                offsetX: 0,
                offsetY: 0,
            }
        }

    }
    template.version = '1.1.0';
    return template;
}

const migrations = {
    '0.9.1': migrate_0_9_1,
    '1.0.12': migrate_1_0_12,
    '1.0.14': migrate_1_0_14,
    '1.0.18': migrate_1_0_18,
    '1.1.0': migrate_1_1_0,
};

function extractVersion(version) {
    const versions = version.split('.');
    if (versions.length != 3) throw new InvalidDataError(`Invalid version ${version}. It should be like 1.0.0`);

    const major = versions[0];
    const minor = versions[1];
    const patch = versions[2];
    if (isNaN(major) || isNaN(minor) || isNaN(patch)) throw new InvalidDataError(`Invalid version ${version}. It should be like 1.0.0`);

    return { major: parseInt(major), minor: parseInt(minor), patch: parseInt(patch) };
}

function getVersion(template) {
    if (template.version === undefined) throw new InvalidDataError(`Invalid template. It should contain a version field`);
    return extractVersion(template.version);
}

function migrate(template) {
    let { major, minor, patch } = getVersion(template);
    for (const migration in migrations) {
        const extractedMigration = extractVersion(migration);
        if (major > extractedMigration.major) continue;
        if (major === extractedMigration.major) {
            if (minor > extractedMigration.minor) continue;
            if (minor == extractedMigration.minor) {
                if (patch >= extractedMigration.patch) continue;
            }
        }
        template = migrations[migration](template);
        major = extractedMigration.major;
        minor = extractedMigration.minor;
        patch = extractedMigration.patch;
    }
    return template;
}

export default migrate;
