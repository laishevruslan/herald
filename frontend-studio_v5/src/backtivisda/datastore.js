'use strict';

import { defineStore } from 'pinia';
import { requestFile, gitlabRawUrl, requestBlobFile } from '@/backtivisda/plugins/gitlab.js';
import { mapElements, computeNbModifiedElements, computeNbNewElements, checkCategory, sortDatedElementsFunction } from '@/plugins/datastoreutils.js';
import packageFile from '../../package.json';
import { loadLanguage, i18n } from '@/plugins/i18n';
import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';
import { toBase64, objectToJsonFile } from '@/plugins/utils';
const allLangs = require('@/assets/langs.json');

import { createMatomo } from  '@/aktivisda/plugins/matomo.js';

export const requestLocalFile = (url) => {
    return new Promise((resolve, reject) => {
        fetch(url, { method: 'GET' })
        .then((response) => {
            if (!response.ok)
                reject(response.status);
            else
                return response.json();
        })
        .then((response) => resolve(response))
        .catch((error) => reject(error));
    })
}

export const useStore = defineStore('gitlab', {
    state: () => {
        return {
            elements: {
                // Elements
                images: [],
                backgrounds: [],
                templates: [],
                colors: [],
                formats: [],
                fonts: [],
                palettes: [],
                tags: [],
                config: {}
            },
            loading: {
                images: false,
                backgrounds: false,
                templates: false,
                colors: false,
                formats: false,
                config: false
            },
            loaded: {
                images: false,
                backgrounds: false,
                templates: false,
                colors: false,
                formats: false,
                config: false
            },
            files: {},
            changedCategories: [],
            changed: {
                images: 0,
                backgrounds: 0,
                templates: 0,
                colors: 0,
                formats: 0,
                fonts: 0,
                palettes: 0,
                tags: 0,
            },
        };
    },
    getters: {
        imageMimeType: (state) => {
            return (imageId, category) => {
                if (category === 'symbols') category = 'images';
                checkCategory(category);

                const image = state.elements[category].find((img) => img.id === imageId);
                if (!image) return undefined;

                const filename = image.filename;
                if (filename.endsWith('.jpeg') || filename.endsWith('.jpg')) return 'image/jpeg';
                else if (filename.endsWith('.png')) return 'image/png';
                else if (filename.endsWith('.svg')) return 'image/svg+xml';
            };
        },
        imageFile: (state) => {
            return (imageId, category) => {
                // category is ’background’ or ’symbol’
                return new Promise((resolve) => {
                    if (category === 'symbols') category = 'images';
                    checkCategory(category);

                    if (imageId === undefined) resolve('');

                    const filename = state.elements[category].find((img) => img.id === imageId)['filename'];

                    if (state.files[filename] !== undefined) {
                        resolve(URL.createObjectURL(state.files[filename]));
                        return;
                    }

                    if (category === 'images') category = 'symbols';

                    requestBlobFile(`static/${category}/${filename}`).then((blob) => {
                        const url = URL.createObjectURL(new File([blob], filename));
                        resolve(url);
                    });
                });
            };
        },
        imageData: (state) => {
            return (imageId, category) => {
                // category is ’background’ or ’symbol’
                if (category === 'symbols') category = 'images';
                checkCategory(category);
                if (imageId === undefined) return '';
                return state.elements[category].find((img) => img.id === imageId);
            };
        },
        imagePreview: (state) => {
            return (imageId, category) => {
                // category is ’background’ or ’symbol’
                if (imageId === undefined) return '';
                if (category === 'symbols') category = 'images';
                checkCategory(category);
                const element = state.elements[category].find((img) => img.id === imageId);
                if (element === undefined) {
                    return '';
                }
                const preview = element['preview'];
                if (state.files[preview] !== undefined) {
                    return URL.createObjectURL(state.files[preview]);
                }
                if (category === 'images') category = 'symbols';
                return gitlabRawUrl(`static/${category}/${preview}`, state.elements.config.gitlab);
            };
        },
        imageThumbnail: (state) => {
            return (imageId, category) => {
                // category is ’background’ or ’symbol’
                if (category === 'symbols') category = 'images';
                checkCategory(category);

                if (state.files[`thumbnails/${imageId}.webp`] !== undefined) {
                    return URL.createObjectURL(state.files[`thumbnails/${imageId}.webp`]);
                }
                if (category === 'images') category = 'symbols';
                return gitlabRawUrl(`static/${category}/thumbnails/${imageId}.webp`, state.elements.config.gitlab);
            };
        },
        templateById: (state) => {
            // category is ’background’ or ’symbol’
            return (elementId) => {
                return state.elements['templates'].find((element) => element.id === elementId);
            };
        },
        // Return image or backround with given id if exists
        // Implementation of ImageGallery::elementById
        elementById: (state) => {
            return (elementId) => {
                const image = state.elements['images'].find((img) => img.id === elementId)
                if (image !== undefined)
                    return image;
                return state.elements['backgrounds'].find((img) => img.id === elementId)
            }
        },

        // Return image or backround with given id if exists
        // Implementation of ImageGallery::fileUrl
        fileUrl: (state) => {
            return (elementId) => {
                const image = state.elements['images'].find((img) => img.id === elementId)
                if (image !== undefined)
                    return state.imageFile(elementId, 'images');
                return state.imageFile(elementId, 'backgrounds');
            }
        },

        tagTranslation: (state) => {
            return (tag, locale) => {
                const tagElement = state.elements.tags[tag];
                if (tagElement === undefined) return undefined;

                if (tagElement[locale] !== undefined) return tagElement[locale];

                if (tagElement[DEFAULT_LOCALE] !== undefined) return tagElement[DEFAULT_LOCALE];

                return tagElement[Object.keys(tagElement)[0]];
            };
        },
        modifiedImagesCount: (state) => {
            state.changed['images'];
            return computeNbModifiedElements(state.elements.images) + computeNbNewElements(state.elements.images);
        },
        images: (state) => {
            state.changed['images'];
            return state.elements.images;
        },
        deletedImages: (state) => {
            return state.images.filter((image) => image.status === 'deleted');
        },
        modifiedBackgroundsCount: (state) => {
            state.changed['backgrounds'];
            return computeNbModifiedElements(state.elements.backgrounds) + computeNbNewElements(state.elements.backgrounds);
        },
        backgrounds: (state) => {
            state.changed['backgrounds'];
            return state.elements.backgrounds;
        },
        deletedBackgrounds: (state) => {
            return state.backgrounds.filter((background) => background.status === 'deleted');
        },
        templates: (state) => {
            state.changed['templates'];
            return state.elements.templates;
        },
        deletedTemplates: (state) => {
            return state.templates.filter((template) => template.status === 'deleted');
        },
        modifiedTemplatesCount: (state) => {
            state.changed['templates'];
            return computeNbModifiedElements(state.elements.templates) + computeNbNewElements(state.elements.templates);
        },
        modifiedElementsCount: (state) => {
            state.changed['templates'];
            state.changed['backgrounds'];
            state.changed['images'];
            return (
                computeNbModifiedElements(state.templates) + computeNbModifiedElements(state.backgrounds) + computeNbModifiedElements(state.images)
            );
        },
        fonts: (state) => {
            return state.elements.fonts;
        },
        colors: (state) => {
            return state.elements.colors;
        },
        palettes: (state) => {
            return state.elements.palettes;
        },
        tags: (state) => {
            return state.elements.tags;
        },
        formats: (state) => {
            return state.elements.formats;
        },
        elementsWithTag: (state) => {
            return (tag, category) => {
                if (category !== 'colors') throw new Error(`Elements with tag not defined for category ${category}`);
                if (tag === '') return state.elements[category];
                return state.elements[category].filter((x) => x.tags.includes(tag));
            };
        },
        availableTags: (state) => {
            return (category) => {
                const tags = new Set();
                for (let element of state.elements[category]) {
                    for (let tag of element.tags) {
                        tags.add(tag);
                    }
                }
                return tags;
            };
        },
        isLoading: (state) => {
            return state.loading.backgrounds;
        },
        symbolsjson: (state) => {
            const elements = state.elements.images.filter((element) => element.status !== 'deleted');
            elements.sort(sortDatedElementsFunction);

            const elementsWithVersion = {
                version: packageFile.version,
                // We don’t want 'changed' field
                symbols: elements.map((s) => ({
                    id: s.id,
                    type: s.type,
                    creation_date: s.creation_date,
                    filename: s.filename,
                    preview: s.preview,
                    thumbnail: s.thumbnail,
                    tags: s.tags,
                    width: s.width,
                    height: s.height,
                    colors: s.colors,
                    label: s.label,
                    backgroundHull: s.backgroundHull,
                    hitform: s.hitform,
                })),
            };
            return JSON.stringify(elementsWithVersion, null, 4);
        },
        backgroundsJson: (state) => {
            const elements = state.elements.backgrounds.filter((element) => element.status !== 'deleted');
            elements.sort(sortDatedElementsFunction);

            const elementsWithVersion = {
                version: packageFile.version,
                // We don’t want 'changed' field
                backgrounds: elements.map((s) => ({
                    id: s.id,
                    type: s.type,
                    creation_date: s.creation_date,
                    filename: s.filename,
                    preview: s.preview,
                    thumbnail: s.thumbnail,
                    tags: s.tags,
                    width: s.width,
                    height: s.height,
                    colors: s.colors,
                    label: s.label,
                })),
            };
            return JSON.stringify(elementsWithVersion, null, 4);
        },
        templatesJson: (state) => {
            const elements = state.elements.templates.filter((element) => element.status !== 'deleted');
            elements.sort(sortDatedElementsFunction);

            const elementsWithVersion = {
                version: packageFile.version,
                // We don’t want 'changed' field
                templates: elements.map((s) => ({
                    id: s.id,
                    creation_date: s.creation_date,
                    filename: s.filename,
                    preview: s.preview,
                    thumbnail: s.thumbnail,
                    tags: s.tags,
                    width: s.width,
                    height: s.height,
                    label: s.label,
                })),
            };
            return JSON.stringify(elementsWithVersion, null, 4);
        },
        tagsJson: (state) => {
            const elementsWithVersion = {
                version: packageFile.version,
                // We don’t want 'changed' field
                tags: state.elements.tags,
            };
            return JSON.stringify(elementsWithVersion, null, 4);
        },
        config: (state) => {
            return state.elements.config;
        },
        langs: (state) => {
            return allLangs.filter((lang) => state.config['availableLangs'].indexOf(lang.code) >= 0);
        },
        listModifiedFiles: (state) => {
            return async (category) => {
                const modifiedFiles = [];
                for (const element of state.elements[category]) {
                    let path = category;
                    if (category === 'images') path = 'symbols';

                    let file_path = category === 'templates' ? `local/templates/${element.filename}` : `static/${path}/${element.filename}`;

                    switch (element.status) {
                        case 'added':
                        case 'modified': {
                            const action = element.status === 'added' ? 'create' : 'update';
                            if (state.files[element.filename]) {
                                modifiedFiles.push({
                                    action: action,
                                    file_path: file_path,
                                    content: await toBase64(state.files[element.filename]),
                                    encoding: 'base64',
                                });
                            }

                            if (state.files[element.preview]) {
                                modifiedFiles.push({
                                    action: action,
                                    file_path: `static/${path}/${element.preview}`,
                                    content: await toBase64(state.files[element.preview]),
                                    encoding: 'base64',
                                });
                            }

                            if (state.files[element.thumbnail]) {
                                modifiedFiles.push({
                                    action: action,
                                    file_path: `static/${path}/${element.thumbnail}`,
                                    content: await toBase64(state.files[element.thumbnail]),
                                    encoding: 'base64',
                                });
                            }
                            break;
                        }
                        case 'deleted':
                            {
                                if (element.filename) {
                                    modifiedFiles.push({
                                        action: 'delete',
                                        file_path: file_path,
                                    });
                                }

                                if (element.preview) {
                                    modifiedFiles.push({
                                        action: 'delete',
                                        file_path: `static/${path}/${element.preview}`,
                                    });
                                }

                                // Non mandatory
                                if (element.thumbnail) {
                                    modifiedFiles.push({
                                        action: 'delete',
                                        file_path: `static/${path}/${element.thumbnail}`,
                                    });
                                }
                            }
                            break;
                    }
                }
                return modifiedFiles;
            };
        },
    },
    actions: {
        fetchData(dataKey, options) {
            return new Promise((resolve) => {
                const url = options && options.url !== undefined ? options.url : `local/data/${dataKey}.json`;
                const serverKey = options && options.serverKey !== undefined ? options.serverKey : dataKey;

                this.loading[dataKey] = true;
                requestFile(url).then((jsonData) => {
                    const elements = Array.isArray(jsonData) ? jsonData : jsonData[serverKey];
                    this.elements[dataKey] = Array.isArray(elements) ? mapElements(elements) : elements;
                    this.loading[dataKey] = false;
                    this.loaded[dataKey] = true;
                    resolve();
                });
            });
        },
        fetchLocalData(dataKey, options) {
            return new Promise((resolve) => {
                const url = options && options.url !== undefined ? options.url : `local/data/${dataKey}.json`;
                const serverKey = options && options.serverKey !== undefined ? options.serverKey : dataKey;

                this.loading[dataKey] = true;
                requestLocalFile(url).then((jsonData) => {
                    const elements = Array.isArray(jsonData) ? jsonData : jsonData[serverKey];
                    this.elements[dataKey] = Array.isArray(elements) ? mapElements(elements) : elements;
                    this.loading[dataKey] = false;
                    this.loaded[dataKey] = true;
                    resolve();
                });
            });
        },
        async fetchBackgrounds() {
            await this.fetchConfig();
            if (this.loaded.backgrounds) return;
            return await this.fetchData('backgrounds');
        },
        async fetchTags() {
            await this.fetchConfig();
            if (this.loaded.backgrounds) return;
            return await this.fetchData('tags');
        },
        async fetchImages() {
            await this.fetchConfig();
            if (this.loaded.images) return;
            return await this.fetchData('images', { url: 'local/data/symbols.json', serverKey: 'symbols' });
        },
        async fetchTemplates() {
            await this.fetchConfig();
            if (this.loaded.templates) return;
            return await this.fetchData('templates');
        },
        async fetchColors() {
            await this.fetchConfig();
            if (this.loaded.colors) return;
            return await this.fetchData('colors');
        },
        async fetchPalettes() {
            await this.fetchConfig();
            if (this.loaded.palettes) return;
            return await this.fetchData('palettes');
        },
        async fetchFonts() {
            await this.fetchConfig();
            if (this.loaded.fonts) return this.fonts;
            return await this.fetchData('fonts');
        },
        async fetchFormats() {
            await this.fetchConfig();
            if (this.loaded.formats) return;
            return await this.fetchData('formats');
        },
        // Fetch config is diffferent because we fetch
        // the real (not the gitlab) config.json
        async fetchConfig() {
            if (this.loaded.config) return;
            await this.fetchLocalData('config', { url: '/backtivisda/local/config.json' });
            loadLanguage(DEFAULT_LOCALE, this.config);
            loadLanguage(i18n.locale, this.config);
            createMatomo(this.config.matomo);
        },
        async fetchAll() {
            await this.fetchConfig();
            this.fetchBackgrounds();
            this.fetchImages();
            this.fetchTemplates();
            this.fetchFonts();
            this.fetchPalettes();
            this.fetchColors();
            this.fetchTags();
            this.fetchFormats();
        },
        // Return the json template
        fetchTemplate(templateId) {
            return new Promise((resolve, reject) => {
                this.fetchTemplates().then(() => {
                    const templateInfo = this.templates.find((temp) => temp.id === templateId);

                    if (templateInfo === undefined) {
                        reject();
                        return;
                    }

                    if (this.files[templateInfo.filename] !== undefined) {
                        const reader = new FileReader();
                        reader.readAsText(this.files[templateInfo.filename]);
                        reader.onloadend = function () {
                            resolve(JSON.parse(reader.result));
                        };
                        return;
                    }

                    requestFile(`local/templates/${templateInfo.filename}`).then((templateJson) => {
                        this.files[templateInfo.filename] = objectToJsonFile(templateJson);
                        resolve(templateJson);
                    });
                });
            });
        },
        async reset() {
            this.files = {};
            this.loaded = {
                images: false,
                backgrounds: false,
                templates: false,
                colors: false,
                formats: false,
                config: false
            };

            this.fetchAll();
        },
        randomElement(category) {
            const elements = this.elements[category];
            return elements[Math.floor(Math.random() * elements.length)];
        },
        randomInternalSvg() {
            const elements = this.elements['images'].filter((x) => x.type === 'internalsvg');
            return elements[Math.floor(Math.random() * elements.length)];
        },
        randomInternalPhoto() {
            const elements = this.elements['images'].filter((x) => x.type === 'internalphoto');
            return elements[Math.floor(Math.random() * elements.length)];
        },
        deleteElement(imageId, category) {
            return new Promise((resolve, reject) => {
                this.computeTemplatesUsingThisElement(imageId, category).then((templates) => {
                    // TODO ignore if category === 'tempaltes
                    // Todo use custom error type
                    if (templates.length > 0) {
                        reject(`Element ${imageId} (${category}) is used in template(s)
                        (at least ${templates[0]}). Please remove it first.`);
                        return;
                    }

                    if (category === 'symbols') category = 'images';
                    ++this.changed[category];

                    const index = this.elements[category].findIndex((img) => img.id === imageId);
                    const element = this.elements[category][index];
                    if (element['status'] === 'added') {
                        delete this.files[element.filename];
                        delete this.files[element.preview];
                        delete this.files[element.thumbnail];
                        this.elements[category].splice(index, 1);
                        resolve();
                        return;
                    } else {
                        // TODO check
                        console.assert(element['status'] !== 'deleted');
                        this.elements[category][index]['status'] = 'deleted';
                        resolve();
                        return;
                    }
                });
            });
        },
        restoreElement(elementId, category) {
            if (category === 'symbols') category = 'images';
            // TODO check

            return new Promise((resolve, reject) => {
                this.computeDeletedElementInTemplate(elementId, category).then((elements) => {
                    if (elements.length > 0) {
                        reject(`Element ${elementId} (${category}) cannot be restored
                        (uses element ${elements[0]})`);
                        return;
                    }
                    const index = this.elements[category].findIndex((img) => img.id === elementId);
                    console.assert(this.elements[category][index]['status'] === 'deleted');
                    this.elements[category][index]['status'] = 'modified';
                    ++this.changed[category];
                    resolve();
                });
            });
        },
        addNewImage(image, file, preview, thumbnail) {
            image['status'] = 'added';
            this.files[image.filename] = file;
            this.files[image.preview] = preview;
            this.files[image.thumbnail] = thumbnail;
            this.elements.images.unshift(image);
            ++this.changed['images'];
        },
        addNewBackground(background, file, preview, thumbnail) {
            background['status'] = 'added';
            this.files[background.filename] = file;
            this.files[background.preview] = preview;
            this.files[background.thumbnail] = thumbnail;
            this.elements.backgrounds.unshift(background);
            ++this.changed['backgrounds'];
        },
        createOrReplaceTemplate(template, templateFile, jpgPreview, thumbnail) {
            this.files[template.filename] = templateFile;
            this.files[template.preview] = jpgPreview;
            this.files[template.thumbnail] = thumbnail;

            const isNew = this.templateById(template.id) === undefined;
            if (isNew) {
                template['status'] = 'added';
                this.elements.templates.unshift(template);
            } else {
                for (const k in this.elements.templates) {
                    if (template.id !== this.elements.templates[k].id) continue;
                    template['status'] = 'modified';
                    this.elements.templates[k] = template;
                }
            }

            ++this.changed['templates'];
        },
        updateOrCreateTag(tag, translations) {
            this.changedCategories.unshift(tag);
            this.elements.tags[tag] = translations;
            ++this.changed['tags'];
        },
        // Return the list of templates using this element
        // (not exhaustive, currently only one template)
        // Useful to detect if we can safely remove this element
        async computeTemplatesUsingThisElement(elementId, category) {
            if (category === 'templates') return [];
            await this.fetchTemplates();
            for (const template of this.elements.templates) {
                if (template.status === 'deleted') continue;

                const jsonStr = JSON.stringify(await this.fetchTemplate(template.id));
                if (jsonStr.includes(elementId)) return [template.id];
            }
            return [];
        },
        // Return the list of deleted elements (image or background)
        // used by this template (not exhausive, currently only one element)
        // It means that we cannot restore this template without breaking it
        // Kind of dual of computeTemplatesUsingThisElement
        async computeDeletedElementInTemplate(templateId, category) {
            if (category !== 'templates') return [];
            const template = await this.fetchTemplate(templateId);
            const templateStr = JSON.stringify(template);
            for (const element of this.deletedImages.concat(this.deletedBackgrounds)) {
                if (templateStr.includes(element.id)) return [element.id];
            }
            return [];
        },
    },
});
