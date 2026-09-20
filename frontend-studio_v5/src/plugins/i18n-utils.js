
import _set from 'lodash.set';

export const DEFAULT_LOCALE = 'en';

export const detectBestLanguage = (langs) => {
    const urlCode = window.location.pathname.replace(/^\/([^\/]+).*/i, '$1');
    if (langs.find((l) => l === urlCode)) return { initLocale: urlCode, isDefault: false };

    const navigatorLanguages = window.navigator.languages;
    for (let k = 0; k < navigatorLanguages.length; ++k) {
        if (langs.find((l) => l == navigatorLanguages[k]))
            if (langs.find((l) => l == navigatorLanguages[k])) return { initLocale: navigatorLanguages[k], isDefault: false };
    }
    if (!langs.map((lang) => lang).includes(DEFAULT_LOCALE)) return { initLocale: langs[0], isDefault: !window.__prerender };

    return { initLocale: DEFAULT_LOCALE, isDefault: !window.__prerender };

}

export const overrideWithConfig = (locale, messages, config) => {
    if (config.i18n === undefined)
        return messages;

    // Erase the current translations as soon as a key is overriden
    // in default locale
    // Might be optimized
    if (locale !== DEFAULT_LOCALE) {
        for (const k of Object.keys(config.i18n[DEFAULT_LOCALE])) {
            _set(messages, k, undefined);
        }
    }

    if (config.i18n[locale] === undefined)
        return;

    for (const k of Object.keys(config.i18n[locale])) {
        _set(messages, k, config.i18n[locale][k]);
    }
    return messages;
}

export const getLocalizedConfig = (locale, config) => {
    const localizedKeys = ['about', 'description', 'name'];
    const localizedConfig = {};
    for (const key of localizedKeys) {
        const value = config[key];

        // value might not have been localized
        if (typeof value === 'string') {
            localizedConfig[key] = value;
            continue;
        }

        if (value[locale] !== undefined) {
            localizedConfig[key] = value[locale];
        } else if (value[DEFAULT_LOCALE] !== undefined) {
            localizedConfig[key] = value[DEFAULT_LOCALE];
        } else {
            localizedConfig[key] = value[Object.keys(value)[0]];
        }
    }
    return localizedConfig;
};
