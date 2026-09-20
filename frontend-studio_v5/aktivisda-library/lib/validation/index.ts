'use strict';

import Ajv from 'ajv';
import { VersionObject } from '../typing';

import templateSchema1_0 from './schemas/template1.0.json'
import templateSchema1_1 from './schemas/template1.1.json'

import gallerySchema from './schemas/gallery.json'

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

// Everychange change in template should upgrade
// at least the minor
// It wasn't the case in the past.
const validateTemplate1_0 = ajv.compile(templateSchema1_0);
const validateTemplate1_1 = ajv.compile(templateSchema1_1);

export const validateTemplate = function(template: VersionObject) {
    let x = undefined;

    if (template.version.startsWith("1.0"))
        x = validateTemplate1_0(template);
    else
        x = validateTemplate1_1(template);

    if (!x) {
        console.error(validateTemplate1_1.errors)
    } else {
        // @ts-ignore
        const ids = new Set(template.components.map((comp) => comp.id));
        // @ts-ignore
        if (ids.size < template.components.length) {
            console.error('Component ids should be differents');
            return false;
        }
    }
    return x
}
console.log(ajv.errors)

export const validateGallery = ajv.compile(gallerySchema);

