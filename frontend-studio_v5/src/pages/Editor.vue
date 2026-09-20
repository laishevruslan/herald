<script setup>
import { useStore } from '@datastore';
import { useVidaStore } from '@/vida/store.js';

const store = useStore();
store.fetchTemplates();
store.fetchConfig();
</script>

<template>
    <div>
        <vida-navbar>
            <template v-slot:import>
                <vida-import-menu :disabled="isLoading || isExporting" @input="importFileTemplate" />
            </template>
            <template v-slot:export>
                <vida-export-menu :disabled="isLoading || isExporting" :templateId="templateId" :advanced="true" />
            </template>
        </vida-navbar>
        <section class="editor">
            <b-loading :is-full-page="true" :active="isLoading || isExporting" class="primary-loading"></b-loading>
            <aside class="options-sidebar">
                <!-- <div>
							<b-tooltip :label="$t('BUTTONS.UNDO')" style='padding: 0px 3px'>
								<b-button icon @click='$emit("undo")' size='is-small' icon-left="undo" :disabled='true'></b-button>
							</b-tooltip>
							<b-tooltip :label="$t('BUTTONS.REDO')" style='padding: 0px 3px'>
								<b-button icon @click='$emit("redo")' size='is-small' icon-left="redo" :disabled='true'></b-button>
							</b-tooltip>

							<vida-export-menu :advanced='false'/>

						</div> -->

                <nav class="navbar is-spaced">
                    <div class="navbar-brand toolbar">
                        <a class="navbar-item" role="button" @click="vida.selectComponent(cacheDocument.id)">
                            <b-icon class="left-icon" size="is-small" icon="file-document"></b-icon>
                            {{ $t('EDIT.COMPONENTS.DOCUMENT') }}
                        </a>
                        <b-dropdown append-to-body aria-role="list" :max-height="500" scrollable trap-focus
                            v-if="!isLoading" :key="'textslist-' + rerenderTextsList">
                            <template #trigger>
                                <a class="navbar-item" role="button">
                                    <b-icon class="left-icon" size="is-small" icon="format-title"></b-icon>
                                    <span>{{ $tc('EDIT.COMPONENTS.TEXTS', Object.keys(cacheTexts).length) }}</span>
                                    <b-icon size="is-small" icon="menu-down"></b-icon>
                                </a>
                            </template>
                            <b-dropdown-item v-for="(preview, key, index) in cacheTexts" :key="index"
                                @click="vida.selectComponent(key)" aria-role="listitem">{{ preview }}</b-dropdown-item>
                            <template v-if="!rule('components.properties.text').fixed">
                                <hr class="dropdown-divider" aria-role="menuitem" />
                                <b-dropdown-item @click="createComponent('text')" aria-role="listitem"
                                    id="new-text-button" :disabled="inTranslationMode">
                                    <b-icon class="left-icon" icon="plus-circle-outline" size="is-small"></b-icon>
                                    {{ $t('BUTTONS.NEW') }}
                                </b-dropdown-item>
                            </template>
                        </b-dropdown>

                        <b-dropdown append-to-body aria-role="list" :max-height="500" scrollable trap-focus
                            close-on-click v-if="!isLoading"
                            :key="'imagelist-' + rerenderImagesList + '-' + rerenderEmojisList">
                            <template #trigger>
                                <a class="navbar-item" role="button">
                                    <b-icon size="is-small" icon="file-image"></b-icon>
                                    <span>{{ $tc('EDIT.COMPONENTS.SVGS', Object.keys(cacheImage).length) }}</span>
                                    <b-icon size="is-small" icon="menu-down"></b-icon>
                                </a>
                            </template>

                            <b-dropdown-item aria-role="list-item" paddingless
                                v-for="(preview, key, index) in cacheImage" :key="index"
                                @click="vida.selectComponent(key)">
                                <figure class="image contain-image">
                                    <img :src="preview" :alt="key" />
                                </figure>
                            </b-dropdown-item>
                            <b-dropdown-item aria-role="list-item" paddingless
                                v-for="(preview, key, index) in cacheEmojis" :key="`emoji-${index}`"
                                @click="vida.selectComponent(key)">
                                <span>{{ preview }}</span>
                            </b-dropdown-item>
                            <hr v-if="!rule('components.properties.qrcode').fixed || !rule('components.properties.image').fixed"
                                class="dropdown-divider" aria-role="menuitem" />
                            <b-dropdown-item v-if="!rule('components.properties.image').fixed"
                                @click="createComponent('internalsvg')" aria-role="listitem" id="new-symbol-button"
                                :disabled="inTranslationMode">
                                <b-icon icon="plus-circle-outline" size="is-small"></b-icon>
                                {{ $t('BUTTONS.NEW') }} {{ $tc('EDIT.COMPONENTS.SVGS', 1) }}
                            </b-dropdown-item>
                            <b-dropdown-item v-if="!rule('components.properties.qrcode').fixed"
                                @click="createComponent('qrcode')" aria-role="listitem" id="new-qrcode-button"
                                :disabled="inTranslationMode">
                                <b-icon icon="plus-circle-outline" size="is-small"
                                    :data-badge="$t('BUTTONS.NEW')"></b-icon>
                                {{ $t('BUTTONS.NEW') }} {{ $t('NAVBAR.QRCODE') }}
                            </b-dropdown-item>
                            <!-- TODO: activate me -->
                            <!-- <b-dropdown-item @click="createComponent('emoji')" aria-role="listitem" id="new-emoji-button">
                                <b-icon icon="plus-circle-outline" size="is-small" :data-badge="$t('BUTTONS.NEW')"></b-icon>
                                {{ $t('BUTTONS.NEW') }} Emoji
                            </b-dropdown-item> -->
                        </b-dropdown>
                        <b-dropdown v-if="$isBacktivisda && !isLoading" append-to-body aria-role="list"
                            :max-height="500" scrollable trap-focus>
                            <template #trigger>
                                <a class="navbar-item" role="button">
                                    <b-icon size="is-small" icon="translate"></b-icon>
                                    <span v-if="inTranslationMode">{{ editingLang.flag }}</span>
                                </a>
                            </template>
                            <template v-if="inTranslationMode">
                                <b-dropdown-item @click="updateEditingLang(undefined)">
                                    🇫🇷 {{ $t('ADMIN.TRANSLATIONS.DEACTIVATE_MODE')}}
                                </b-dropdown-item>
                                <hr class="dropdown-divider" aria-role="menuitem" />
                            </template>
                            <b-dropdown-item
                                v-for="lang, key in store.langs.filter(({code}) => code != cacheDocument.i18n.defaultLocale)"
                                :key="key" @click="updateEditingLang(lang)"
                                :disabled="editingLang && lang.code === editingLang.code">
                                {{ lang.flag }} {{ lang.text }}
                            </b-dropdown-item>
                        </b-dropdown>
                        <b-dropdown v-if="!$isBacktivisda && !isLoading && availableLocales.size > 1" append-to-body
                            aria-role="list" :max-height="500" scrollable trap-focus>
                            <template #trigger>
                                <a class="navbar-item" role="button">
                                    <b-icon size="is-small" icon="translate"></b-icon>
                                    <span>{{ displayedLocale }}</span>
                                </a>
                            </template>
                            <b-dropdown-item v-for="lang, key in store.langs.filter(({code}) => availableLocales.has(code))"
                                :key="key" @click="updateDisplayedLocale(lang.code)"
                                :disabled="lang.code === displayedLocale">
                                {{ lang.flag }} {{ lang.text }}
                            </b-dropdown-item>
                            <hr />
                            <b-dropdown-item
                                @click="$buefy.dialog.alert($t('EDIT.TRANSLATIONS.HELP_MODAL', { email: store.config.email}))">
                                {{ $t('EDIT.TRANSLATIONS.HELP_CTA') }}
                            </b-dropdown-item>
                        </b-dropdown>


                    </div>
                </nav>
                <template v-if="!isLoading">
                    <span hidden id="document-id">{{ cacheDocument.id }}</span>
                    <b-message v-if="inTranslationMode" type="is-info" style="margin: 10px">
                        {{ $t('ADMIN.TRANSLATIONS.MESSAGE', { lang: editingLang.text }) }}
                    </b-message>


                    <vida-document-input-component v-if="selectedType === 'background'" :document="cacheDocument"
                        @update="updateDocument" :key="this.rerenderSelectedComponent" />
                    <vida-text-input-component v-else-if="selectedType === 'text'" :componentId="selectedComponent"
                        :width="cacheDocument.width" :height="cacheDocument.height" :options="selectedComponentOptions"
                        @update="(opts) => updateComponent(selectedComponent, opts)"
                        @remove="() => removeComponent(selectedComponent)"
                        @duplicate="() => duplicateComponent(selectedComponent)"
                        @undo="() => undoComponent(selectedComponent)" @redo="() => redoComponent(selectedComponent) "
                        :nbComponents="nbComponents" :editingLang="editingLang" :key="this.rerenderSelectedComponent" />

                    <vida-image-input-component v-else-if="selectedType === 'image'" :componentId="selectedComponent"
                        :options="selectedComponentOptions" @update="(opts) => updateComponent(selectedComponent, opts)"
                        @remove="() => removeComponent(selectedComponent)"
                        @duplicate="() => duplicateComponent(selectedComponent)"
                        @undo="() => undoComponent(selectedComponent) " @redo="() => redoComponent(selectedComponent) "
                        :nbComponents="nbComponents" :editingLang="editingLang" :key="this.rerenderSelectedComponent" />
                </template>
            </aside>
            <vida-whiteboard style="margin-left: 430px" id="whiteboard" />
        </section>
    </div>
</template>

<script>
import LZString from 'lz-string';

import { extractBestTranslation, generateId } from 'aktivisda-library';

import VidaWhiteboard from '@/components/whiteboard.vue';
import VidaNavbar from '@navbar';

import { uriToJSON, showSnackbarOnRedirection } from '@/plugins/utils.js';

import { pdfMakeFonts, fontsLoaded } from '@/plugins/font-loader.js';

import VidaDocumentInputComponent from '@/components/visual-input-components/document-input-component.vue';
import VidaTextInputComponent from '@/components/visual-input-components/text-input-component.vue';
import VidaImageInputComponent from '@/components/visual-input-components/image-input-component.vue';
import VidaExportMenu from '@/components/exportmenu.vue';
import VidaImportMenu from '@/components/importmenu.vue';


import { isMobile } from '@/plugins/is-mobile.js';
import { DEFAULT_LOCALE } from "@/plugins/i18n-utils.js";

import _get from 'lodash.get'


export default {
    name: 'editor',
    metaInfo: function () {
        return {
            title: `Édition - ${this.store.config.id}`,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                { vmid: 'description', name: 'description', content: `${this.templateDescription}. | Avec Aktivisda.` },
                { property: 'og:title', vmid: 'og:title', content: `${this.store.config.id} | Aktivisda` },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: this.store.config.url },
                { property: 'og:image', vmid: 'og:image', content: this.templatePreview },
                { property: 'og:description', vmid: 'og:description', content: `${this.templateDescription}. | Aktivisda.earth` },
                { property: 'og:site_name', vmid: 'og:site_name', content: `${this.store.config.id} | Aktivisda.earth` },
            ],
        };
    },

    components: {
        VidaWhiteboard,
        VidaNavbar,
        VidaDocumentInputComponent,
        VidaTextInputComponent,
        VidaImageInputComponent,
        VidaExportMenu,
        VidaImportMenu,
    },
    data: function () {
        return {
            cacheDocument: {},
            cacheEmojis: {},
            cacheImage: {},
            cacheTexts: {},
            hasChanged: false,
            isExporting: false,
            isLoading: true,
            rerenderEmojisList: 0,
            rerenderImagesList: 0,
            rerenderSelectedComponent: 0,
            rerenderTextsList: 0,
            selectedComponent: undefined, // Id
            selectedComponentOptions: {},
            store: useStore(),
            templateId: this.$route.params.templateId,
            editingLang: null,
            displayedLocale: undefined,// TODO does not work if locale is broken
            vidaStore: useVidaStore(),
        };
    },
    computed: {
        vida: function () {
            return this.vidaStore.vida;
        },
        locale: function() {
            return this.vidaStore.locale;
        },
        advanced: function () {
            return false || this.$route.query.advanced == 'true';
        },
        templatePreview: function () {
            if (this.templateId === undefined) return `${this.store.config.url}/static/rs-preview.png`;

            const previewUrl = this.store.imagePreview(this.templateId, 'templates');
            if (previewUrl === '' && !this.$isBacktivisda) console.error(`No image preview found for template ${this.templateId}`);

            return this.store.config.url + previewUrl;
        },
        templateDescription: function () {
            if (this.templateId === undefined) return '';
            const template = this.store.templates.find((temp) => temp.id === this.templateId);
            if (template == undefined) {
                if (!this.$isBacktivisda) console.error('No template description found, probably because you are using backtivisda?');
                return '';
            }
            return template.description;
        },
        inTranslationMode: function() {
            return this.editingLang != undefined;
        },
        selectedType: function () {
            if (this.selectedComponent === undefined) return 'background';
            if (Object.keys(this.cacheTexts).indexOf(this.selectedComponent) != -1) return 'text';
            if (Object.keys(this.cacheImage).indexOf(this.selectedComponent) != -1) return 'image';
            return 'background';
        },
        nbComponents: function () {
            this.rerenderImagesList; // for cache update
            this.rerenderTextsList; // for cache update
            return this.vida.nbComponents();
        },
        availableLocales() {
            if (this.loading) return new Set();
            return this.vida.computeAvailableLocales()
        },
        rule: function () {
            return (key) => { let r = _get(this.cacheDocument.rules, key); return r === undefined ? {} : r };
        },
    },
    methods: {
        getTemplateJson: function () {
            return new Promise((resolve) => {
                this.store
                    .fetchTemplates()
                    .then(() => this.store.fetchBackgrounds())
                    .then(() => this.store.fetchImages())
                    .then(() => {
                        if (this.$router.currentRoute.query.b64Template) {
                            const b64Template = this.$router.currentRoute.query.b64Template;
                            const template = uriToJSON(LZString.decompressFromBase64(b64Template));
                            // Maybe only remove the template param
                            this.$router.replace({ query: {} });
                            resolve(template);
                            return;
                        } else if (this.$router.currentRoute.query.template) {
                            const template = uriToJSON(this.$router.currentRoute.query.template);
                            // Maybe only remove the template param
                            this.$router.replace({ query: {} });
                            resolve(template);
                            return;
                        }

                        if (this.templateId === undefined) {
                            resolve();
                            return;
                        }
                        this.store.fetchTemplate(this.templateId).then((template) => resolve(template));
                    });
            });
        },
        textPreview(txt) {
            if (txt === undefined) return;
            txt = txt.replaceAll('\n', ' ');
            if (txt.length === 0) return '...';
            if (txt.length < 20) return txt;
            return txt.slice(0, 20) + '...';
        },
        imagePreview(imageOptions) {
            switch (imageOptions.type) {
                case 'internalphoto':
                case 'internalsvg': {
                    return this.store.imagePreview(imageOptions.id, 'images');
                }
                case 'urlphoto': {
                    return imageOptions.url;
                }
                case 'qrcode':
                    return '/qrcode.png';
            }
        },
        handleResize() {
            // Handle resize is useless while vida is not loaded.
            if (!this.vida) return;
            this.vida.handleResize();
            },
        load(templateJson) {
            this.reset();
            return new Promise((resolve) => {
                this.isLoading = true;
                this.vida
                    .loadJson(templateJson)
                    .then(() => {
                        this.cacheDocument = this.vida.documentParams();
                        const has = {
                            'text': false,
                            'emoji': false,
                            'image': false,
                            'textchoice': false,
                        }
                        for (const key of this.vida.componentsKeys()) {
                            const options = this.vida.componentParams(key);
                            if (!this.$isBacktivisda && _get(options.rules, 'self.fixed') === true) {
                                continue;
                            }
                            has[options.type] = true;

                            if (options.type === 'text') {
                                this.cacheTexts[key] = this.textPreview(options.text);
                            } else if (options.type === 'textchoice') {
                                const vStore = useVidaStore();
                                this.cacheTexts[key] = this.textPreview(
                                    extractBestTranslation(options.textChoices[options.text], vStore.displayedOrEditingLang, DEFAULT_LOCALE));
                            } else if (options.type === 'image') {
                                this.cacheImage[key] = this.imagePreview(options.image);
                            } else if (options.type === 'emoji') {
                                this.cacheImage[key] = this.textPreview(options.text);
                            }
                        }
                        if (has['text']) ++this.rerenderTextsList;
                        if (has['textchoice']) ++this.rerenderTextsList;
                        if (has['emoji']) ++this.rerenderEmojisList;
                        if (has['image']) ++this.rerenderImagesList;
                        this.editingLang = !this.$isBacktivisda ? undefined : this.store.langs.find((lang) => lang.code === this.cacheDocument.i18n.editingLocale);

                        if (!this.$isBacktivisda) {
                            if (!this.availableLocales.has(this.$i18n.locale)) {
                                if (this.availableLocales.has('en'))
                                    this.displayedLocale = 'en';
                                else
                                    this.displayedLocale = this.cacheDocument.i18n.defaultLocale;
                            } else {
                                this.displayedLocale = this.$i18n.locale;
                            }

                            this.editingLang = undefined;
                        }

                        this.updateDocument(
                            {
                                i18n: {
                                    editingLocale: this.editingLang !== undefined ? this.editingLang.code : null,
                                    displayedLocale: this.displayedLocale
                                }
                            }
                        );


                        this.vida.onSelect = (id) => {
                            this.selectedComponent = id;
                            this.selectedComponentOptions = this.vida.componentParams(id);
                            ++this.rerenderSelectedComponent;
                        };

                        this.vida.onComponentUpdated = (id) => {
                            if (this.selectedComponent !== undefined && this.selectedComponent === id) {
                                this.selectedComponentOptions = this.vida.componentParams(id);
                                ++this.rerenderSelectedComponent;
                            }

                            this.updateCache(id);
                        };

                        this.vidaStore.zoomFit();
                        if (this.exportType(this.$route) !== undefined) {
                            this.isLoading = false;
                            this.exportVida(this.exportType(this.$route)).then(() => {
                                this.isExporting = false;

                                const templateId = this.templateIdGetter(this.$route);
                                if (!templateId) {
                                    this.$router.push({ name: 'editorNew', params: { templateId: undefined, lang: this.lang } });
                                } else {
                                    this.$router.push({ name: 'editor', params: { templateId: templateId, lang: this.lang } });
                                }
                                resolve();
                            });
                        } else {
                            resolve();
                            this.isLoading = false;
                        }
                    })
                    .catch((error) => {
                        this.$buefy.dialog.alert({
                            title: 'Erreur',
                            message: `Erreur inattendue dans le chargement du modèle.`,
                            type: 'is-danger',
                            hasIcon: true,
                            icon: 'times-circle',
                            iconPack: 'fa',
                            ariaRole: 'alertdialog',
                            ariaModal: true,
                            confirmText: "Aller sur la page d'accueil",
                            onConfirm: () => this.$router.push({ name: 'welcome' }),
                        });
                        console.error(error);
                        this.isLoading = false;
                        return;
                    });
            });
        },
        exportType(route) {
            if (route.params.exportType !== undefined) return route.params.exportType;

            if (route.params.templateId !== undefined) {
                const param = route.params.templateId;
                // TODO not the same for backtivisda and aktivisda
                if (
                    param === 'png' ||
                    param === 'pdf' ||
                    param === 'jpg' ||
                    param === 'template' ||
                    param === 'link' ||
                    (this.$isBacktivisda && param === 'database')
                )
                    return param;
            }
            return undefined;
        },
        templateIdGetter(route) {
            if (route.params.exportType !== undefined) return route.params.templateId;
            if (route.params.templateId !== undefined) {
                const param = route.params.templateId;
                if (
                    param === 'png' ||
                    param === 'pdf' ||
                    param === 'jpg' ||
                    param === 'template' ||
                    param === 'link' ||
                    (this.$isBacktivisda && param === 'database')
                )
                    return undefined;
            }
            return route.params.templateId;
        },
        reset() {
            if (this.vida) this.vida.destroy();
            this.isLoading = true;
            this.isExporting = false;
            this.hasChanged = false;
            this.vidaStore.setup('whiteboard');
            this.rerenderImagesList = 0;
            this.rerenderTextsList = 0;
            this.rerenderSelectedComponent = 0;
            this.cacheDocument = {};
            this.cacheTexts = {};
            this.cacheImage = {};
            this.selectedComponent = undefined;
            this.selectedComponentptions = {};
        },
        setup() {
            return new Promise((resolve) => {
                this.getTemplateJson().then((templateJson) => {
                    fontsLoaded().then(() => {
                        if (templateJson == undefined) {
                            this.reset();

                            // This is very ugly
                            // TODO: fixme
                            this.vida.randomInit().then(() => {

                                this.store.fetchBackgrounds().then(() => {
                                    const list = this.store.backgrounds;
                                    const randomIndex = Math.floor(Math.random() * list.length);
                                    const galleryItemId = list[randomIndex].id;
                                    const element = list.find((s) => s.id == galleryItemId);

                                    this.vida.updateDocument({ background: element }).then(() => {
                                        this.isLoading = false;
                                        this.load(this.vida.toJson())
                                        .then(() => resolve())
                                    });
                                });
                            });
                        } else {
                            this.load(templateJson).then(() => resolve());
                        }
                    });
                });
            });
        },
        updateDocument(options) {
            this.hasChanged = true;
            const rerender = options.rules !== undefined || _get(options, 'i18n.editingLocale') !== undefined;
            const fitCanvas = options.width !== undefined || options.height !== undefined;
            return new Promise((resolve) => {
                this.vida.updateDocument(options)
                .then(() => {
                    this.cacheDocument = this.vida.documentParams();
                    if (rerender) ++this.rerenderSelectedComponent;
                    if (fitCanvas) this.vidaStore.zoomFit()
                    resolve();
                })
            });
        },
        updateComponent(id, options) {
            this.hasChanged = true;
            const rerender = options.zIndex !== undefined
                || (options.rules !== undefined && options.rules[Object.keys(options.rules)[0]].fixed !== undefined)
                || (this.editingLang !== undefined && _get(options.i18n[this.editingLang.code], 'text') === null)
                || (this.editingLang !== undefined && _get(options.i18n[this.editingLang.code], 'text') === '')
            this.vida.updateComponent(id, options).then(() => {
                if (this.selectedComponent === id && rerender) {
                    this.selectedComponentOptions = this.vida.componentParams(this.selectedComponent);
                    ++this.rerenderSelectedComponent;
                }
                this.updateCache(id);
            });
        },
        removeComponent(id) {
            this.hasChanged = true;
            this.vida.removeComponent(id);
            if (this.cacheImage[id]) {
                delete this.cacheImage[id];
                ++this.rerenderImagesList;
            } else if (this.cacheTexts[id]) {
                delete this.cacheTexts[id];
                ++this.rerenderTextsList;
            }
            if (this.selectedComponent === id) {
                this.selectedComponent = undefined;
            }
        },
        duplicateComponent(id) {
            this.hasChanged = true;
            const options = this.vida.componentParams(id);
            options.id = generateId();
            options.position.x *= 1.05;
            options.position.y *= 1.05;
            this.vida.createComponent(options).then(() => {
                if (options.type === 'text') {
                    this.cacheTexts[options.id] = this.textPreview(options.text);
                    ++this.rerenderTextsList;
                } else if (options.type === 'image') {
                    this.cacheImage[options.id] = this.imagePreview(options.image);
                    ++this.rerenderImagesList;
                } else if (options.type === 'emoji') {
                    this.cacheEmojis[options.id] = this.textPreview(options.text);
                    ++this.rerenderEmojisList;
                } else if (options.type === 'textchoice') {
                    this.cacheTexts[options.id] = this.cacheTexts[id];
                    ++this.rerenderTextsList;
                } else {
                    console.error(`Unknown type ${options.type}`)
                }
                this.vida.selectComponent(options.id);
            });
        },
        undoComponent(id) {
            this.hasChanged = true;
            this.vida.undoComponent(id);
            // TODO: rerender
        },
        redoComponent(id) {
            this.hasChanged = true;
            this.vida.redoComponent(id);
            // TODO: rerender
        },
        createComponent(type) {
            this.hasChanged = true;
            const randomOverride = {};
            switch(type) {
                case 'text': {        // const font = fonts[Math.floor(Math.random() * fonts.length)];
                    randomOverride['text'] = this.$i18n.t('TEXTS.DEFAULT_TEXT');
                    const fonts = this.store.fonts;
                    randomOverride['font'] = fonts[Math.floor(Math.random() * fonts.length)].fontName;
                    randomOverride['color'] = this.store.randomElement('colors').html;
                    randomOverride['background'] = { 'color': this.store.randomElement('colors').html };
                    break;
                }

            }
            this.vida.createRandomComponent(type).then((componentId) => {
                this.vida.updateComponent(componentId, randomOverride)
                .then(() => {
                    switch (type) {
                        case 'text': {
                            this.cacheTexts[componentId] = this.textPreview(this.vida.componentParams(componentId).text);
                            ++this.rerenderTextsList;
                            break;
                        }
                        case 'textchoice': {
                            const vStore = useVidaStore();
                            const options = this.vida.componentParams(componentId);
                            this.cacheTexts[componentId] = this.textPreview(
                                extractBestTranslation(options.textChoices[options.text], vStore.displayedOrEditingLang, DEFAULT_LOCALE));
                            ++this.rerenderTextsList;
                            break;
                        }
                        case 'image':
                        case 'internalsvg':
                        case 'internalphoto':
                        case 'qrcode': {
                            this.cacheImage[componentId] = this.imagePreview(this.vida.componentParams(componentId).image);
                            ++this.rerenderImagesList;
                            break;
                        }
                        case 'emoji': {
                            this.cacheEmojis[componentId] = this.textPreview(this.vida.componentParams(componentId).text);
                            ++this.rerenderEmojisList;
                        }
                    }
                    this.vida.selectComponent(componentId);
                });
            });
        },
        updateCache(id) {
            const options = this.vida.componentParams(id);
            if (options.type === 'text' || options.type === 'textchoice') {
                let preview = this.textPreview(options.text);
                if (options.type === 'textchoice') {
                    const vStore = useVidaStore();
                    if (options.text === undefined)
                        preview = '???';
                    else
                        preview = this.textPreview(
                            extractBestTranslation(options.textChoices[options.text], vStore.displayedOrEditingLang, DEFAULT_LOCALE));
                }

                if (preview !== this.cacheTexts[id]) {
                    this.cacheTexts[id] = preview;
                    ++this.rerenderTextsList;
                }
            } else if (options.type === 'image') {
                const preview = this.imagePreview(options.image);
                if (preview !== this.cacheImage[id]) {
                    this.cacheImage[id] = preview;
                    ++this.rerenderImagesList;
                }
            }
        },
        exportVida(format) {
            return new Promise((resolve, reject) => {
                if (this.isExporting || this.loading || !this.vida) {
                    reject();
                    return;
                }
                this.compressionToast = this.$buefy.toast.open({
                    indefinite: true,
                    message: `Export et compression en cours...`,
                    type: 'is-black',
                    position: 'is-bottom',
                });

                this.isExporting = true;
                switch (format) {
                    case 'pdf':
                        this.exportPdf().then(() => {
                            this.isExporting = false;
                            this.compressionToast.close();
                            resolve();
                        });
                        break;
                    case 'png':
                        this.exportImage('png').then(() => {
                            this.isExporting = false;
                            this.compressionToast.close();
                            resolve();
                        });
                        break;
                    case 'jpg':
                        this.exportImage('jpeg').then(() => {
                            this.$buefy.snackbar.open({
                                duration: 6000,
                                message: this.$t('EDIT.EXPORT.COMPRESSED_JPEG'),
                                type: 'is-danger',
                                cancelText: this.$t('BUTTONS.CANCEL'),
                                position: 'is-bottom',
                                actionText: null,
                            });
                            this.isExporting = false;
                            resolve();
                        });
                        break;
                    case 'template':
                        this.exportTemplate().then(() => {
                            this.hasChanged = false;
                            this.isExporting = false;
                            this.compressionToast.close();
                            resolve();
                        });
                        break;
                    case 'link':
                        this.exportLink().then(() => {
                            this.hasChanged = false;
                            this.compressionToast.close();
                            resolve();
                        });
                        break;
                    case 'database': {
                        this.exportDatabase()
                            .then(() => {
                                this.hasChanged = false;
                                this.compressionToast.close();
                                resolve();
                            })
                            .catch((err) => {
                                this.$buefy.snackbar.open({
                                    duration: 6000,
                                    message: `Erreur lors de la sauvegarde en base de données : ${err}. Vous pouvez écrire à dev@aktivisda.earth`,
                                    type: 'is-danger',
                                    cancelText: this.$t('BUTTONS.CANCEL'),
                                    position: 'is-bottom',
                                    actionText: null,
                                });
                                this.isExporting = false;
                                this.compressionToast.close();
                                reject();
                            });
                        break;
                    }
                    default:
                        this.isExporting = false;
                        console.warn('Export to ${format} is undefined');
                        reject();
                }
            });
        },
        exportImage(extension) {
            const mimeType = 'image/' + extension;

            return new Promise((resolve, reject) => {
                if (!this.vida) {
                    reject();
                    return;
                }

                const filename = `aktivisda-${this.vida.documentParams().id}.${extension}`;
                this.vida
                    .toImage(mimeType)
                    .then((url) => {
                        this.downloadUrl(url, filename);
                        resolve();
                    })
                    .catch((error) => reject(error));
            });
        },

        downloadUrl(url, filename) {
            const link = document.createElement('a');

            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();

            // // cleanup temporary elements
            document.body.removeChild(link);
        },

        exportTemplate() {
            this.warningExperimental();
            return new Promise((resolve) => {
                const str = JSON.stringify(this.vida.toJson(), null, 4);
                const bytes = new TextEncoder().encode(str);
                const blob = new Blob([bytes], {
                    type: 'application/json;charset=utf-8',
                });
                const url = window.URL.createObjectURL(blob);
                this.downloadUrl(url, this.vida.document.id + '.json');
                resolve();
            });
        },
        exportDatabase() {
            return new Promise((resolve, reject) => {
                if (!this.$isBacktivisda) reject();

                import('@/backtivisda/components/modaltemplate.vue').then((modaltemplate) => {
                    this.vida
                        .toImage('image/jpeg')
                        .then((jpegUrl) => {
                            this.isExporting = false;
                            this.$buefy.modal.open({
                                parent: this,
                                component: modaltemplate.default,
                                hasModalCard: true,
                                trapFocus: true,
                                width: 1080,
                                props: {
                                    json: this.vida.toJson(),
                                    jpegUrl,
                                    currentTemplateId: this.templateId,
                                },
                                events: {},
                                canCancel: true,
                                onCancel: () => {
                                    resolve();
                                },
                            });
                        })
                        .catch((error) => {
                            reject(error);
                        });
                });
            });
        },
        exportLink() {
            return new Promise((resolve) => {
                const link = this.store.config.url + 'edit' + this.vida.toLink();
                this.isExporting = false;
                this.$buefy.dialog.prompt({
                    message: `${this.$t('EDIT.EXPORT.CONFIRM_LINK')} <b-input value="${link}"></b-input>`,
                    inputAttrs: {
                        type: 'text',
                        value: link,
                    },
                    onConfirm: () => {
                        if (!navigator.clipboard) return;
                        navigator.clipboard.writeText(link);
                        this.$buefy.toast.open(this.$t('BUTTONS.COPIED_TO_CLIPBOARD'));
                        this.warningExperimental();
                        resolve();
                    },
                    onCancel: () => {
                        resolve();
                    },
                    confirmText: this.$t('BUTTONS.COPY'),
                    cancelText: this.$t('BUTTONS.CLOSE'),
                    ariaRole: 'copyLinkModal',
                });
            });
        },
        importTemplate(template) {
            return new Promise((resolve) => {
                this.$route.params.templateId = undefined;
                this.templateId = undefined;
                if (this.$router.currentRoute.name === 'editor') {
                    this.$router.push({ name: 'editorNew', params: { lang: this.lang } });
                }

                if (!this.hasChanged) {
                    this.warningExperimental();
                    this.load(template).then(() => resolve());
                    return;
                }

                this.$buefy.dialog.confirm({
                    title: this.$i18n.t('EDIT.IMPORT.CONFIRM.TITLE'),
                    message: this.$i18n.t('EDIT.IMPORT.CONFIRM.MESSAGE'),
                    confirmText: this.$i18n.t('EDIT.IMPORT.CONFIRM.CONFIRM'),
                    cancelText: this.$i18n.t('EDIT.IMPORT.CONFIRM.CANCEL'),
                    type: 'is-danger',
                    hasIcon: true,
                    onConfirm: () => {
                        this.load(template).then(() => resolve());
                        this.warningExperimental();
                    },
                    onCancel: () => {},
                });
            });
        },
        importLinkTemplate() {},
        importFileTemplate(file) {
            file.text().then((txt) => {
                window.history.replaceState({}, document.title, `/${this.$i18n.locale}/edit`);
                const template = JSON.parse(txt);

                this.importTemplate(template);
            });
        },
        warningExperimental() {
            this.$buefy.snackbar.open({
                duration: 6000,
                message: this.$t('EDIT.WARNING.EXPERIMENTAL'),
                type: 'is-danger',
                cancelText: this.$t('BUTTONS.CANCEL'),
                position: 'is-bottom',
                actionText: null,
            });
        },
        exportPdf() {
            return new Promise((resolve) => {
                // Do no load library if useless
                this.vida.toPdf(pdfMakeFonts(this.store.fonts))
                .then((url) => {
                    const link = document.createElement('a');
                    const { id } = this.vida.documentParams();
                    const filename = 'aktivisda-' + id;
                    link.download = `${filename}.pdf`;
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();

                    // // cleanup temporary elements
                    document.body.removeChild(link);
                    resolve();

                }).catch(() => {
                    this.$buefy.snackbar.open({
                        duration: 6000,
                        message: this.$t('EDIT.EXPORT.PDF_ERROR'),
                        type: 'is-danger',
                        cancelText: this.$t('BUTTONS.CANCEL'),
                        position: 'is-bottom',
                        actionText: null,
                    });
                });
            });
        },
        raiseMobileConfirm() {
            this.isLoading = false;
            this.$buefy.dialog.confirm({
                title: this.$i18n.t('EDIT.SMARTPHONE_WARNING.TITLE'),
                message: this.$i18n.t('EDIT.SMARTPHONE_WARNING.MESSAGE'),
                confirmText: this.$i18n.t('EDIT.SMARTPHONE_WARNING.CONFIRM_TEXT'),
                cancelText: this.$i18n.t('EDIT.SMARTPHONE_WARNING.CANCEL_TEXT'),
                type: 'is-info',
                hasIcon: true,
                onConfirm: () => {
                    this.isLoading = true;
                    this.setup();
                },
                onCancel: () => this.$router.push({ name: 'welcome' }),
            });
        },
        updateEditingLang: function(value) {
            this.editingLang = value;
            let options = {
                i18n: { editingLocale: value === undefined ? null : value.code }
            };
            return this.updateDocument(options).then(() => {
                if (this.selectedComponent) {
                    this.selectedComponentOptions = this.vida.componentParams(this.selectedComponent);
                    ++this.rerenderSelectedComponent;
                }
            })
        },
        updateDisplayedLocale: function(value) {
            this.displayedLocale = value
            let options = {
                i18n: { displayedLocale: value }
            };
            return this.updateDocument(options).then(() => {
                if (this.selectedComponent) {
                    this.selectedComponentOptions = this.vida.componentParams(this.selectedComponent);
                    ++this.rerenderSelectedComponent;
                }
            })
        }
    },
    mounted: function () {
        showSnackbarOnRedirection(this);
        // We don’t want to render the canvas
        document.dispatchEvent(new Event('x-app-rendered'));

        window.addEventListener('resize', this.handleResize);

        if (isMobile()) {
            this.raiseMobileConfirm();
        } else {
            this.setup();
        }

        const errorHandling = (evt) => {
            this.$buefy.dialog.alert({
                title: this.$t('COMMON.ERROR'),
                message: this.$t('EDIT.WARNING.UNEXPECTED_ERROR'),
                type: 'is-danger',
                hasIcon: true,
                icon: 'times-circle',
                iconPack: 'fa',
                ariaRole: 'alertdialog',
                ariaModal: true,
            });
            this.isExporting = false;
            evt.preventDefault();
            return true;
        };
        window.addEventListener('unhandledrejection', errorHandling);

    },
    beforeDestroy: function () {
        window.removeEventListener('resize', this.handleResize);
        this.vida.destroy();
    },
    beforeRouteUpdate(to, from, next) {
        if (to.params.templateId !== from.params.templateId) {
            this.templateId = to.params.templateId;

            next(); // todo
            this.setup();
        } else {
            if (this.exportType(to) !== undefined) {
                // Does nothing (reject) if !this.vida
                // Then export vida is done at the end of loadJson promise.
                this.exportVida(this.exportType(to))
                    .then(() => {
                        next(from);
                    })
                    .catch(() => {});
            }
        }
        next();
    },
    beforeRouteLeave(to, from, next) {
        if (!this.hasChanged) {
            next();
            return;
        }

        this.$buefy.dialog.confirm({
            title: this.$i18n.t('EDIT.UNSAVED_WORK.TITLE'),
            message: this.$i18n.t('EDIT.UNSAVED_WORK.MESSAGE'),
            confirmText: this.$i18n.t('EDIT.UNSAVED_WORK.QUIT_BUTTON'),
            cancelText: this.$i18n.t('EDIT.UNSAVED_WORK.STAY_BUTTON'),
            type: 'is-danger',
            hasIcon: true,
            onConfirm: () => next(),
            onCancel: () => next(false),
        });
    },
};
</script>

<style lang="scss">
.editor {
    min-height: calc(100vh - 100px);
}

.options-sidebar {
    height: 100%;
    width: 430px;
    position: fixed;
    z-index: 1;
    top: 0;
    left: 0;
    background-color: white;
    overflow-x: hidden;
    padding-top: 70px;
}

.preview-card {
    width: 70px;
}

.dropdown-item figure {
    height: 50px;
}

.dropdown-item figure img {
    object-fit: contain;
    height: 100%;
}

.options-sidebar nav.navbar {
    border-bottom: 2px ridge gray;
    margin: 10px 27px 20px 35px;
    padding: 10px 7px 1px 7px;
}

.options-sidebar .navbar-item .left-icon:only-child {
    margin-right: 5px;
}

</style>
