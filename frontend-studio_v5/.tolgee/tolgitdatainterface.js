import { flatten } from 'flat';
import * as fs from 'fs';

export const listI18nCodes = () => {
    const config = JSON.parse(fs.readFileSync('local/config.json'));
    return config.config.availableLangs;
}

/**
 * Push function reads the repository and creates localized translations
 * @return { [i18ncode]: { [key]: value }}
 */
export const push = () => {

    const translationsByCode = {};
    const tags = {};

    const categories = JSON.parse(fs.readFileSync('local/data/tags.json'))['tags'];
    const translatedTag = (t) => {
        const translations = categories[t];
        if (translations['fr'] !== undefined && translations['en'] !== undefined) {
            return `# ${translations['fr']} (${translations['en']})`
        }
        return `#{${translations['en']}}`
    };

    const codes = listI18nCodes();
    for (const code of codes) {
        translationsByCode[code] = {};
    }

    // config
    const config = JSON.parse(fs.readFileSync('local/config.json'));
    tags['config.name'] = ['cat:config']
    for (const code in config['name']) {
        translationsByCode[code]['config.name'] = config.config['name'][code];
    }
    tags['config.about'] = ['cat:config']
    for (const code in config['about']) {
        translationsByCode[code]['config.about'] = config.config['about'][code];
    }
    tags['config.description'] = ['cat:config']
    for (const code in config['description']) {
        translationsByCode[code]['config.description'] = config.config['description'][code];
    }

    if (config.config.i18n !== undefined) {
        for (const code in config.config.i18n) {
            for (const k of Object.keys(config.config.i18n[code])) {
                tags['config.i18n.' + k] = ['cat:i18n']
                translationsByCode[code]['config.i18n.' + k] = config.config.i18n[code][k];
            }
        }
    }

    tags['config.description'] = ['cat:config']
    // symbols
    const symbols = JSON.parse(fs.readFileSync('local/data/symbols.json')).symbols;
    for (const k in symbols) {
        const symbol = symbols[k];
        for (const code in symbol.label) {
            translationsByCode[code][`symbol.label.${symbol.id}`] = symbol.label[code];
        }
        if (Object.keys(symbol.label).length === 0) {
            console.warn(`No translation defined for symbol ${symbol.id}`)
        } else {
            tags[`symbol.label.${symbol.id}`] = ['cat:symbols']
            if (symbol.tags !== '')
                tags[`symbol.label.${symbol.id}`]  = tags[`symbol.label.${symbol.id}`].concat(symbol.tags.split(',').map((t) => translatedTag(t)))
        }
    }

    // backgrounds
    const backgrounds = JSON.parse(fs.readFileSync('local/data/backgrounds.json')).backgrounds;
    for (const k in backgrounds) {
        const background = backgrounds[k];
        for (const code in background.label) {
            translationsByCode[code][`background.label.${background.id}`] = background.label[code];
        }
        if (Object.keys(background.label).length === 0) {
            console.warn(`No translation defined for background ${background.id}`)
        } else {
            tags[`background.label.${background.id}`] = ['cat:backgrounds']
            if (background.tags !== '')
                tags[`background.label.${background.id}`]  = tags[`background.label.${background.id}`].concat(background.tags.split(',').map((t) => translatedTag(t)))
        }
    }

    // Tags
    const aktivisdatags = JSON.parse(fs.readFileSync('local/data/tags.json')).tags;
    for (const tagid in aktivisdatags) {
        const tag = aktivisdatags[tagid];
        for (const code in tag) {
            translationsByCode[code][`tag.${tagid}`] = tag[code];
        }
        tags[`tag.${tagid}`] = ['cat:tags']
    }

    // Templates
    const templates = JSON.parse(fs.readFileSync('local/data/templates.json')).templates;
    for (const k in templates) {
        const template = templates[k];
        for (const code in template.label) {
            translationsByCode[code][`template:${template.id}.label`] = template.label[code];
        }
        if (Object.keys(template.label).length === 0) {
            console.warn(`No translation defined for template ${template.id}`)
        } else {
            tags[`template:${template.id}.label`] = ['cat:templates', `template:${template.id}`]
            if (template.tags !== '')
                tags[`template:${template.id}.label`]  = tags[`template:${template.id}.label`].concat(template.tags.split(',').map((t) => translatedTag(t)))
        }

        const templateContent = JSON.parse(fs.readFileSync(`local/templates/${template.filename}`))
        const defaultLocale = templateContent.document.i18n.defaultLocale;
        for (const component of templateContent.components) {

            if (component.type === 'text') {
                    translationsByCode[defaultLocale][`template:${template.id}.text:${component.id}`] = component.text;

                for (const code in component.i18n) {
                    if (code === defaultLocale) continue;
                    if (component.i18n[code].text !== undefined && component.i18n[code].text !== null)
                        translationsByCode[code][`template:${template.id}.text:${component.id}`] = component.i18n[code].text;
                }

                tags[`template:${template.id}.text:${component.id}`] = ['cat:templates', 'cat:texts', `template:${template.id}`]
                if (template.tags !== '')
                    tags[`template:${template.id}.text:${component.id}`]  = tags[`template:${template.id}.text:${component.id}`].concat(template.tags.split(',').map((t) => translatedTag(t)))
            }

            if (component.type === "textchoice") {
                const choices = component.textChoices;

                for (const key in choices) {
                    for (const code in choices[key]) {
                        translationsByCode[code][`template:${template.id}.choices:${component.id}/${key}`] = choices[key][code]

                    }
                    tags[`template:${template.id}.choices:${component.id}/${key}`] = ['cat:templates', 'cat:choices', `template:${template.id}`]
                    if (template.tags !== '')
                        tags[`template:${template.id}.choices:${component.id}/${key}`]  = tags[`template:${template.id}.choices:${component.id}/${key}`].concat(template.tags.split(',').map((t) => translatedTag(t)))

                }
            }
        }
    }
    return { translationsByCode, tags };
}

/**
 * Pull function receives an object of localized translations
 * and update local files
 *
 * { [i18code]: { [key]: value } }.
 *
 */
export const pull = (translations) => {
    // config
    const config = JSON.parse(fs.readFileSync('local/config.json'));
    for (const code in translations) {
        if (translations[code].config === undefined) continue;

        if (translations[code].config.name !== undefined && translations[code].config.name !== null)
            config.config['name'][code] = translations[code].config.name;

        if (translations[code].config.about !== undefined && translations[code].config.about !== null)
            config.config['about'][code] = translations[code].config.about;

        if (translations[code].config.description !== undefined && translations[code].config.description !== null)
            config.config['description'][code] = translations[code].config.description;

        if (translations[code].config.i18n !== undefined) {
            const flattenTranslations = flatten(translations[code].config.i18n)
            if (config.config['i18n'][code] !== undefined)
                config.config['i18n'][code] = {};
            for (const key in flattenTranslations) {
                if (!config.config.i18n[code]) config.config.i18n[code] = {}
                config.config.i18n[code][key] = flattenTranslations[key];
            }
        }
    }
    fs.writeFileSync('local/config.json', JSON.stringify(config, null, 4));

    // Symbols
    const symbols = JSON.parse(fs.readFileSync('local/data/symbols.json'));
    for (const code in translations) {
        if (translations[code].symbol === undefined || translations[code].symbol.label === undefined) continue;
        const labels = translations[code].symbol.label;
        for (const k in symbols.symbols) {
            const symbolId = symbols.symbols[k].id;
            if (labels[symbolId] !== undefined && labels[symbolId] !== null)
                symbols.symbols[k].label[code] = labels[symbolId];
        }
    }
    fs.writeFileSync('local/data/symbols.json', JSON.stringify(symbols, null, 4));

    // Backgrounds
    const backgrounds = JSON.parse(fs.readFileSync('local/data/backgrounds.json'));
    for (const code in translations) {
        if (translations[code].background === undefined || translations[code].background.label === undefined) continue;
        const labels = translations[code].background.label;
        for (const k in backgrounds.backgrounds) {
            const backgroundId = backgrounds.backgrounds[k].id;
            if (labels[backgroundId] !== undefined && labels[backgroundId] !== null)
                backgrounds.backgrounds[k].label[code] = labels[backgroundId];
        }
    }
    fs.writeFileSync('local/data/backgrounds.json', JSON.stringify(backgrounds, null, 4));

    // Tags
    const tags = JSON.parse(fs.readFileSync('local/data/tags.json'));
    for (const code in translations) {
        if (translations[code].tag === undefined) continue;
        for (const tagId in translations[code].tag) {
            if (tags.tags[tagId] === undefined) {
                console.warn(`Tag "${tagId}" does not exist anymore`)
                continue;
            }
            if (translations[code].tag[tagId] === null) continue;
            tags.tags[tagId][code] = translations[code].tag[tagId];
        }
    }
    fs.writeFileSync('local/data/tags.json', JSON.stringify(tags, null, 4));

    // templates
    const templates = JSON.parse(fs.readFileSync('local/data/templates.json'));
    for (const k in templates.templates) {
        const template = templates.templates[k];

        const templateContent = JSON.parse(fs.readFileSync(`local/templates/${template.filename}`))
        const defaultLocale = templateContent.document.i18n.defaultLocale;

        for (const code in translations) {
            const templateTranslations = translations[code][`template:${template.id}`];
            if (templateTranslations === undefined) continue;

            if (translations[code][`template:${template.id}`].label !== undefined && translations[code][`template:${template.id}`].label !== null)
                templates.templates[k].label[code] = translations[code][`template:${template.id}`].label

            for (let k = 0; k< templateContent.components.length; ++k) {
                const component = templateContent.components[k];
                if (component.type === 'text') {
                    const translatedText = templateTranslations[`text:${component.id}`];
                    if (translatedText === null) continue;
                    if (code !== defaultLocale) {
                        if (translatedText !== undefined && translatedText !== null) {
                            if (templateContent.components[k].i18n[code] === undefined)
                                templateContent.components[k].i18n[code] = {};
                            templateContent.components[k].i18n[code].text = translatedText;
                        }
                    } else {
                        if (translatedText !== undefined && translatedText !== null)
                            templateContent.components[k].text = translatedText;
                    }
                }
                if (component.type === 'textchoice') {
                    for (const key in templateTranslations) {
                        if (!key.startsWith(`choices:${component.id}`)) continue;
                        const choice = key.split('/')[1]
                        templateContent.components[k].textChoices[choice][code] = templateTranslations[key]
                    }
                }
            }
        }
        fs.writeFileSync(`local/templates/${template.filename}`, JSON.stringify(templateContent, null, 4));
    }
    fs.writeFileSync('local/data/templates.json', JSON.stringify(templates, null, 4));

}

