'use strict';

import Vue from 'vue';
import Router from 'vue-router';

import WelcomePage from '@/pages/Welcome.vue';
import TemplatesPage from '@/pages/Templates.vue';
import FontsPage from '@/pages/Fonts.vue';
import ColorsPage from '@/pages/Colors.vue';
import AboutPage from '@/pages/About.vue';
import EditorPage from '@/pages/Editor.vue';
import Error404Page from '@/pages/Error404.vue';
import QrcodePage from '@/pages/Qrcode.vue';

import SymbolsPage from '@/backtivisda/pages/Symbols.vue';
import BackgroundsPage from '@/backtivisda/pages/Backgrounds.vue';

import LoginPage from '@/backtivisda/pages/Login.vue';
import SyncReviewPage from '@/backtivisda/pages/SyncReview.vue';

import RouterView from '@/components/routerview.vue';
import { useStore } from '@datastore';

Vue.use(Router);

import { loadAndSetLanguage, isDefault } from '@/plugins/i18n';
import { detectBestLanguage } from '@/plugins/i18n-utils';

const router = new Router({
    mode: 'hash', // Vue3: Will become createWebHistory()
    routes: [
        {
            path: '/:lang?/',
            component: RouterView,
            async beforeEnter(to, from, next) {
                const store = useStore();
                await store.fetchConfig();
                const langsArray = store.langs.map((lang) => lang.code);

                const newPath = to.path.replace(/\/\//g, '/');
                if (newPath !== to.path) {
                    next({ path: newPath, query: to.query });
                    return;
                }
                const langCandidate = to.params.lang;
                if (!langCandidate || !langsArray.includes(langCandidate)) {
                    const lang = langCandidate && langCandidate.length == 2 ? langCandidate : undefined;
                    const newPathWithoutLang = lang ? newPath.slice(1 + lang.length) : newPath; // Remove /en
                    const initLocale = detectBestLanguage(langsArray).initLocale;
                    return next({ path: `${initLocale}/${newPathWithoutLang}`, query: { ...to.query, unknown_lang: isDefault ? true : undefined } });
                }
                loadAndSetLanguage(langCandidate, store.config);
                return next();
            },
            children: [
                {
                    path: '/',
                    name: 'welcome',
                    component: WelcomePage,
                },
                {
                    path: 'symbols',
                    name: 'symbols',
                    component: SymbolsPage,
                },
                {
                    path: 'login',
                    name: 'login',
                    component: LoginPage,
                },
                {
                    path: 'sync',
                    name: 'sync',
                    component: SyncReviewPage,
                },
                {
                    path: 'symbols/:symbolId',
                    name: 'symbol',
                    component: SymbolsPage,
                },
                {
                    path: 'backgrounds',
                    name: 'backgrounds',
                    component: BackgroundsPage,
                },
                {
                    path: 'backgrounds/:symbolId',
                    name: 'background',
                    component: BackgroundsPage,
                },
                {
                    path: 'templates',
                    name: 'templates',
                    component: TemplatesPage,
                },
                {
                    path: 'templates/:symbolId',
                    name: 'template',
                    component: TemplatesPage,
                },
                {
                    path: 'colors',
                    name: 'colors',
                    component: ColorsPage,
                },
                {
                    path: 'fonts',
                    name: 'fonts',
                    component: FontsPage,
                },
                {
                    path: 'qrcode',
                    name: 'qrcode',
                    component: QrcodePage,
                },
                {
                    path: 'about',
                    name: 'about',
                    component: AboutPage,
                },
                {
                    path: 'edit/:exportType(png|jpg|template|pdf|link|database)?',
                    name: 'editorNew',
                    component: EditorPage,
                },
                {
                    path: 'edit/:templateId?/:exportType(png|jpg|template|pdf|link|database)?',
                    name: 'editor',
                    component: EditorPage,
                },
                {
                    path: '*',
                    component: Error404Page,
                },
            ],
        },
    ],
});

router.beforeEach((to, from, next) => {
    next();
});

export default router;
