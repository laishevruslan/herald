'use strict';

import { defineStore } from 'pinia';

import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';
import { objectToJsonFile } from '@/plugins/utils';
const allLangs = require('@/assets/langs.json');

import { mapElements, computeNbModifiedElements, computeNbNewElements, checkCategory } from '@/plugins/datastoreutils.js';
import { loadLanguage, i18n } from '../plugins/i18n';

import { createMatomo } from  '@/aktivisda/plugins/matomo.js';

export const requestFile = (url) => {
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

export const useStore = defineStore('store', {
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
                config: {
                    id: ''
                }
            },
            loaded: {
                images: false,
                backgrounds: false,
                templates: false,
                colors: false,
                formats: false
            },
            loading: {
                images: false,
                backgrounds: false,
                templates: false,
                colors: false,
                formats: false
            },
            files: {},
        };
    },
    getters: {
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
                    return new Promise((resolve) => resolve(`/static/symbols/${image['filename']}`));
                const background = state.elements['backgrounds'].find((img) => img.id === elementId)
                return new Promise((resolve) => resolve(`/static/backgrounds/${background['filename']}`));
            }
        },
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
                if (category === 'symbols') category = 'images';
                checkCategory(category);
                if (imageId === undefined) return '';

                const filename = state.elements[category].find((img) => img.id === imageId)['filename'];
                if (category === 'images') category = 'symbols';
                return new Promise((resolve) => resolve(`/static/${category}/${filename}`));
            };
        },
        imageData: (state) => {
            return (imageId, category) => {
                // category is ’background’ or ’symbol’
                if (category === 'symbols') category = 'images';
                checkCategory(category);
                if (imageId === undefined) return undefined;
                return state.elements[category].find((img) => img.id === imageId);
            };
        },
        imagePreview: (state) => {
            return (imageId, category) => {
                // category is ’background’ or ’symbol’
                if (category === 'symbols') category = 'images';
                checkCategory(category);

                if (imageId === undefined) return '';

                const element = state.elements[category].find((img) => img.id === imageId)

                if (element === undefined)
                    return ''

                const preview = element['preview'];

                if (category === 'images') category = 'symbols';
                return `/static/${category}/${preview}`;
            };
        },
        // Todo, thumbnail should be in image?
        imageThumbnail: () => {
            return (imageId, category) => {
                // category is ’background’ or ’symbol’
                if (category === 'symbols') category = 'images';
                checkCategory(category);

                if (category === 'images') category = 'symbols';
                return `/static/${category}/thumbnails/${imageId}.webp`;
            };
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
            return computeNbModifiedElements(state.elements.images) + computeNbNewElements(state.elements.images);
        },
        images: (state) => {
            return state.elements.images;
        },
        modifiedBackgroundsCount: (state) => {
            return computeNbModifiedElements(state.elements.backgrounds) + computeNbNewElements(state.elements.backgrounds);
        },
        backgrounds: (state) => {
            return state.elements.backgrounds;
        },
        templates: (state) => {
            return state.elements.templates;
        },
        config: (state) => {
            return state.elements.config;
        },
        langs: (state) => {
            return allLangs.filter((lang) => state.config['availableLangs'].indexOf(lang.code) >= 0);
        },
        modifiedTemplatesCount: (state) => {
            return computeNbModifiedElements(state.elements.templates) + computeNbNewElements(state.elements.templates);
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
        formats: (state) => {
            return state.elements.formats;
        },
        isLoading: () => {
            return false;
        },
        tags: (state) => {
            const result = { all: [], images: [] };
            for (const image of state.images) {
                let tags = image['tags'];
                if (!tags) continue;
                tags = tags.split(',');
                for (let t of tags) {
                    if (result.images.includes(t)) continue;
                    result.images.push(t);

                    if (result.all.includes(t)) continue;
                    result.all.push(t);
                }
            }
            return result;
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
    },
    actions: {
        fetchData(dataKey, options) {
            return new Promise((resolve) => {
                const url = options && options.url !== undefined ? options.url : `/local/data/${dataKey}.json`;
                const serverKey = options && options.serverKey !== undefined ? options.serverKey : dataKey;

                this.loading[dataKey] = true;
                requestFile(url).then((jsonData) => {
                    const elements = Array.isArray(jsonData) ? jsonData : jsonData[serverKey];
                    this.elements[dataKey] = Array.isArray(elements) ? mapElements(elements) : elements;
                    this.loading[dataKey] = false;
                    this.loaded[dataKey] = true;
                    resolve(this.elements[dataKey]);
                });
            });
        },
        async fetchBackgrounds() {
            if (this.loaded.backgrounds) return;
            return await this.fetchData('backgrounds');
        },
        async fetchTags() {
            if (this.loaded.tags) return;
            return await this.fetchData('tags');
        },
        async fetchImages() {
            if (this.loaded.images) return;
            // TODO: rename images.json
            return await this.fetchData('images', { url: '/local/data/symbols.json', serverKey: 'symbols' });
        },
        async fetchTemplates() {
            if (this.loaded.templates) return;
            return await this.fetchData('templates');
        },
        async fetchColors() {
            if (this.loaded.colors) return;
            return await this.fetchData('colors');
        },
        async fetchPalettes() {
            if (this.loaded.palettes) return;
            return await this.fetchData('palettes');
        },
        async fetchFonts() {
            if (this.loaded.fonts) return;
            return await this.fetchData('fonts');
        },
        async fetchFormats() {
            if (this.loaded.formats) return;
            return await this.fetchData('formats');
        },
        async fetchConfig() {
            if (this.loaded.config) return;
            await this.fetchData('config', { url: '/local/config.json' });
            loadLanguage(DEFAULT_LOCALE, this.config);
            loadLanguage(i18n.locale, this.config);
            createMatomo(this.config.matomo);
        },
        async fetchAll() {
            this.fetchBackgrounds();
            this.fetchImages();
            this.fetchTemplates();
            this.fetchFonts();
            this.fetchPalettes();
            this.fetchColors();
            this.fetchTags();
            this.fetchFormats();
            this.fetchConfig();
        },
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

                    requestFile(`/local/templates/${templateInfo.filename}`).then((templateJson) => {
                        this.files[templateInfo.filename] = objectToJsonFile(templateJson);
                        resolve(templateJson);
                    })
                });
            });
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
    },
});
