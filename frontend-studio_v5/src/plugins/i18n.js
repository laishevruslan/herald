'use strict';

import Vue from 'vue';
import VueI18n from 'vue-i18n';
const allLangs = require('@/assets/langs.json');
import { DEFAULT_LOCALE, detectBestLanguage, overrideWithConfig, getLocalizedConfig } from './i18n-utils';
Vue.use(VueI18n);


export const { initLocale, isDefault } = detectBestLanguage(allLangs.map((l) => l.code));

const loadedLanguages = [];

export const i18n = new VueI18n({
    locale: initLocale,
    fallbackLocale: DEFAULT_LOCALE,
    silentFallbackWarn: true,
    messages: {},
});

export const loadLanguage = async (lang, config) => {
    const langs = config.availableLangs;

    // requested lang is not available
    const isLangAvailable = langs.find((l) => l === lang);
    if (!isLangAvailable) {
        return;
    }

    // load locale if needed
    if (!loadedLanguages.includes(lang)) {
        const messages = require(/* webpackChunkName: "i18n-[request]" */ `@/assets/i18n/${lang}.json`);

        overrideWithConfig(lang, messages, config);
        i18n.setLocaleMessage(lang, messages);
        i18n.mergeLocaleMessage(lang, { CONFIG: getLocalizedConfig(lang, config) });
        loadedLanguages.push(lang);
    }
};

export const loadAndSetLanguage = (lang, config) => {

    loadLanguage(lang, config);
    // set locale globally
    i18n.locale = lang;
};

