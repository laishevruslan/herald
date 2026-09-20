<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchAll();
// eslint-disable-next-line no-unused-vars
const appName = process.env.VUE_APP_NAME;
</script>

<template>
    <div>
        <vida-navbar active="welcome" />
        <section
            style="min-height: calc(-50px + 100vh); display: flex; flex-direction: column; justify-content: center; /*! padding-bottom: 55px; */">
            <div class="columns" style="justify-content: center">
                <div class="column is-two-thirds-widescreen" style="max-width: 600px">
                    <vida-transformer-title :content="appName" size="large" textAlign="left"></vida-transformer-title>
                    <div style="margin-left: 35px">
                        <h2 class="title" style="text-align: left">{{ $i18n.t('CONFIG.name') }}</h2>
                        <p style="margin-top: 20px; text-align: left">
                            {{
                                $t('WELCOME.DESCRIPTION', {
                                    org: $t('CONFIG.name'),
                                    nbsymbols: store.images.length,
                                    nbfonts: store.fonts.length,
                                    nbbackgrounds: store.backgrounds.length,
                                })
                            }}
                        </p>
                        <p style="margin-top: 10px; text-align: left; font-size: small; font-style: italic"
                            v-html="$t('WELCOME.CONTACT', { email: store.config.email })">
                        </p>
                        <p style="text-align: left; margin-top: 15px; font-weight: bold">👉 {{ $t('WELCOME.START_NOW') }}</p>
                    </div>
                </div>
                <div class="column is-one-third" style="max-width: 600px">
                    <vida-mosaic
                        :elements="store.templates"
                        path="templates"
                        :columnHeight="500"
                        :columnWidth="100"
                        :nbColumns="4"
                        :openableElements="true" />
                    <p style="text-align: center">
                        <router-link :to="{ name: 'templates', params: { lang: $i18n.locale } }">
                            <b-button style="margin: 5px">{{ $t('WELCOME.SHOW_ALL_TEMPLATES') }}</b-button>
                        </router-link>
                    </p>
                </div>
            </div>
        </section>
        <section class="colored-section" style="padding: 0 50px" v-lazyload>
            <div class="columns" style="justify-content: center; padding: 50px 0px">
                <div class="column">
                    <router-link class="box feature-box" :to="{ name: 'symbols', params: { lang: $i18n.locale } }">
                        <div style="display: flex; flex-wrap: wrap; justify-content: center">
                            <vida-mosaic path="symbols" :elements="store.images" :nbColumns="4" :columnWidth="50" :heightColumn="180" />
                        </div>
                        <div
                            style="
                                position: absolute;
                                background: rgba(255, 255, 255, 0.9);
                                padding: 1px 6px;
                                border-radius: 4px;
                                max-width: inherit;
                            ">
                            <h3 class="title" style="color: var(--primary-color); margin-bottom: 0px">{{ $t('NAVBAR.SYMBOLS') }}</h3>
                            <p>
                                {{ $t('WELCOME.FEATURES.SYMBOLS', { nbsymbols: store.images.length }) }}
                            </p>
                        </div>
                    </router-link>
                </div>
                <div class="column">
                    <router-link class="box feature-box" :to="{ name: 'qrcode', params: { lang: $i18n.locale } }">
                        <svg
                            viewBox="0 0 300 300"
                            width="300"
                            height="300"
                            style="background-color: #ffffff; height: 200px; width: 200px"
                            xmlns:dc="http://purl.org/dc/elements/1.1/"
                            xmlns:cc="http://creativecommons.org/ns#"
                            xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
                            xmlns:svg="http://www.w3.org/2000/svg"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlns:xlink="http://www.w3.org/1999/xlink"
                            xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
                            xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
                            xml:space="preserve"
                            version="1.1">
                            <rect style="fill: #ffffff" width="300" height="300" x="0" y="0"></rect>
                            <g transform="scale(10.344827586206897)" style="fill: #000000">
                                <rect y="0" x="0" height="1.1" width="7.1"></rect>
                                <rect y="0" x="8" height="1.1" width="4.1"></rect>
                                <rect y="0" x="13" height="1.1" width="2.1"></rect>
                                <rect y="0" x="16" height="1.1" width="1.1"></rect>
                                <rect y="0" x="18" height="1.1" width="3.1"></rect>
                                <rect y="0" x="22" height="1.1" width="7.1"></rect>
                                <rect y="1" x="0" height="1.1" width="1.1"></rect>
                                <rect y="1" x="6" height="1.1" width="1.1"></rect>
                                <rect y="1" x="8" height="1.1" width="1.1"></rect>
                                <rect y="1" x="13" height="1.1" width="1.1"></rect>
                                <rect y="1" x="17" height="1.1" width="2.1"></rect>
                                <rect y="1" x="22" height="1.1" width="1.1"></rect>
                                <rect y="1" x="28" height="1.1" width="1.1"></rect>
                                <rect y="2" x="0" height="1.1" width="1.1"></rect>
                                <rect y="2" x="2" height="1.1" width="3.1"></rect>
                                <rect y="2" x="6" height="1.1" width="1.1"></rect>
                                <rect y="2" x="9" height="1.1" width="3.1"></rect>
                                <rect y="2" x="15" height="1.1" width="4.1"></rect>
                                <rect y="2" x="22" height="1.1" width="1.1"></rect>
                                <rect y="2" x="24" height="1.1" width="3.1"></rect>
                                <rect y="2" x="28" height="1.1" width="1.1"></rect>
                                <rect y="3" x="0" height="1.1" width="1.1"></rect>
                                <rect y="3" x="2" height="1.1" width="3.1"></rect>
                                <rect y="3" x="6" height="1.1" width="1.1"></rect>
                                <rect y="3" x="8" height="1.1" width="3.1"></rect>
                                <rect y="3" x="14" height="1.1" width="1.1"></rect>
                                <rect y="3" x="16" height="1.1" width="1.1"></rect>
                                <rect y="3" x="18" height="1.1" width="1.1"></rect>
                                <rect y="3" x="20" height="1.1" width="1.1"></rect>
                                <rect y="3" x="22" height="1.1" width="1.1"></rect>
                                <rect y="3" x="24" height="1.1" width="3.1"></rect>
                                <rect y="3" x="28" height="1.1" width="1.1"></rect>
                                <rect y="4" x="0" height="1.1" width="1.1"></rect>
                                <rect y="4" x="2" height="1.1" width="3.1"></rect>
                                <rect y="4" x="6" height="1.1" width="1.1"></rect>
                                <rect y="4" x="8" height="1.1" width="4.1"></rect>
                                <rect y="4" x="15" height="1.1" width="4.1"></rect>
                                <rect y="4" x="22" height="1.1" width="1.1"></rect>
                                <rect y="4" x="24" height="1.1" width="3.1"></rect>
                                <rect y="4" x="28" height="1.1" width="1.1"></rect>
                                <rect y="5" x="0" height="1.1" width="1.1"></rect>
                                <rect y="5" x="6" height="1.1" width="1.1"></rect>
                                <rect y="5" x="8" height="1.1" width="2.1"></rect>
                                <rect y="5" x="12" height="1.1" width="1.1"></rect>
                                <rect y="5" x="15" height="1.1" width="5.1"></rect>
                                <rect y="5" x="22" height="1.1" width="1.1"></rect>
                                <rect y="5" x="28" height="1.1" width="1.1"></rect>
                                <rect y="6" x="0" height="1.1" width="7.1"></rect>
                                <rect y="6" x="8" height="1.1" width="1.1"></rect>
                                <rect y="6" x="10" height="1.1" width="1.1"></rect>
                                <rect y="6" x="12" height="1.1" width="1.1"></rect>
                                <rect y="6" x="14" height="1.1" width="1.1"></rect>
                                <rect y="6" x="16" height="1.1" width="1.1"></rect>
                                <rect y="6" x="18" height="1.1" width="1.1"></rect>
                                <rect y="6" x="20" height="1.1" width="1.1"></rect>
                                <rect y="6" x="22" height="1.1" width="7.1"></rect>
                                <rect y="7" x="10" height="1.1" width="1.1"></rect>
                                <rect y="7" x="17" height="1.1" width="3.1"></rect>
                                <rect y="8" x="3" height="1.1" width="1.1"></rect>
                                <rect y="8" x="6" height="1.1" width="1.1"></rect>
                                <rect y="8" x="9" height="1.1" width="1.1"></rect>
                                <rect y="8" x="11" height="1.1" width="3.1"></rect>
                                <rect y="8" x="17" height="1.1" width="3.1"></rect>
                                <rect y="8" x="23" height="1.1" width="3.1"></rect>
                                <rect y="8" x="27" height="1.1" width="2.1"></rect>
                                <rect y="9" x="1" height="1.1" width="1.1"></rect>
                                <rect y="9" x="8" height="1.1" width="1.1"></rect>
                                <rect y="9" x="11" height="1.1" width="1.1"></rect>
                                <rect y="9" x="14" height="1.1" width="1.1"></rect>
                                <rect y="9" x="16" height="1.1" width="1.1"></rect>
                                <rect y="9" x="20" height="1.1" width="3.1"></rect>
                                <rect y="9" x="25" height="1.1" width="2.1"></rect>
                                <rect y="9" x="28" height="1.1" width="1.1"></rect>
                                <rect y="10" x="1" height="1.1" width="4.1"></rect>
                                <rect y="10" x="6" height="1.1" width="1.1"></rect>
                                <rect y="10" x="8" height="1.1" width="3.1"></rect>
                                <rect y="10" x="12" height="1.1" width="1.1"></rect>
                                <rect y="10" x="15" height="1.1" width="1.1"></rect>
                                <rect y="10" x="17" height="1.1" width="4.1"></rect>
                                <rect y="10" x="22" height="1.1" width="1.1"></rect>
                                <rect y="10" x="26" height="1.1" width="2.1"></rect>
                                <rect y="11" x="0" height="1.1" width="1.1"></rect>
                                <rect y="11" x="2" height="1.1" width="1.1"></rect>
                                <rect y="11" x="4" height="1.1" width="2.1"></rect>
                                <rect y="11" x="8" height="1.1" width="3.1"></rect>
                                <rect y="11" x="16" height="1.1" width="1.1"></rect>
                                <rect y="11" x="19" height="1.1" width="1.1"></rect>
                                <rect y="11" x="21" height="1.1" width="4.1"></rect>
                                <rect y="11" x="26" height="1.1" width="2.1"></rect>
                                <rect y="12" x="1" height="1.1" width="1.1"></rect>
                                <rect y="12" x="6" height="1.1" width="2.1"></rect>
                                <rect y="12" x="12" height="1.1" width="2.1"></rect>
                                <rect y="12" x="17" height="1.1" width="1.1"></rect>
                                <rect y="12" x="20" height="1.1" width="1.1"></rect>
                                <rect y="12" x="22" height="1.1" width="2.1"></rect>
                                <rect y="12" x="25" height="1.1" width="1.1"></rect>
                                <rect y="13" x="3" height="1.1" width="3.1"></rect>
                                <rect y="13" x="8" height="1.1" width="1.1"></rect>
                                <rect y="13" x="10" height="1.1" width="6.1"></rect>
                                <rect y="13" x="19" height="1.1" width="3.1"></rect>
                                <rect y="13" x="23" height="1.1" width="1.1"></rect>
                                <rect y="13" x="25" height="1.1" width="1.1"></rect>
                                <rect y="13" x="27" height="1.1" width="1.1"></rect>
                                <rect y="14" x="0" height="1.1" width="1.1"></rect>
                                <rect y="14" x="2" height="1.1" width="1.1"></rect>
                                <rect y="14" x="4" height="1.1" width="1.1"></rect>
                                <rect y="14" x="6" height="1.1" width="1.1"></rect>
                                <rect y="14" x="8" height="1.1" width="1.1"></rect>
                                <rect y="14" x="10" height="1.1" width="2.1"></rect>
                                <rect y="14" x="13" height="1.1" width="2.1"></rect>
                                <rect y="14" x="18" height="1.1" width="1.1"></rect>
                                <rect y="14" x="20" height="1.1" width="3.1"></rect>
                                <rect y="14" x="27" height="1.1" width="2.1"></rect>
                                <rect y="15" x="2" height="1.1" width="1.1"></rect>
                                <rect y="15" x="4" height="1.1" width="1.1"></rect>
                                <rect y="15" x="8" height="1.1" width="1.1"></rect>
                                <rect y="15" x="11" height="1.1" width="1.1"></rect>
                                <rect y="15" x="13" height="1.1" width="1.1"></rect>
                                <rect y="15" x="15" height="1.1" width="1.1"></rect>
                                <rect y="15" x="18" height="1.1" width="2.1"></rect>
                                <rect y="15" x="23" height="1.1" width="1.1"></rect>
                                <rect y="15" x="27" height="1.1" width="2.1"></rect>
                                <rect y="16" x="0" height="1.1" width="1.1"></rect>
                                <rect y="16" x="2" height="1.1" width="3.1"></rect>
                                <rect y="16" x="6" height="1.1" width="2.1"></rect>
                                <rect y="16" x="11" height="1.1" width="1.1"></rect>
                                <rect y="16" x="15" height="1.1" width="2.1"></rect>
                                <rect y="16" x="18" height="1.1" width="2.1"></rect>
                                <rect y="16" x="21" height="1.1" width="1.1"></rect>
                                <rect y="16" x="27" height="1.1" width="1.1"></rect>
                                <rect y="17" x="2" height="1.1" width="4.1"></rect>
                                <rect y="17" x="7" height="1.1" width="3.1"></rect>
                                <rect y="17" x="14" height="1.1" width="2.1"></rect>
                                <rect y="17" x="21" height="1.1" width="2.1"></rect>
                                <rect y="17" x="25" height="1.1" width="4.1"></rect>
                                <rect y="18" x="0" height="1.1" width="1.1"></rect>
                                <rect y="18" x="5" height="1.1" width="2.1"></rect>
                                <rect y="18" x="8" height="1.1" width="3.1"></rect>
                                <rect y="18" x="12" height="1.1" width="2.1"></rect>
                                <rect y="18" x="16" height="1.1" width="3.1"></rect>
                                <rect y="18" x="20" height="1.1" width="2.1"></rect>
                                <rect y="18" x="23" height="1.1" width="3.1"></rect>
                                <rect y="18" x="27" height="1.1" width="2.1"></rect>
                                <rect y="19" x="3" height="1.1" width="1.1"></rect>
                                <rect y="19" x="5" height="1.1" width="1.1"></rect>
                                <rect y="19" x="7" height="1.1" width="3.1"></rect>
                                <rect y="19" x="11" height="1.1" width="1.1"></rect>
                                <rect y="19" x="13" height="1.1" width="2.1"></rect>
                                <rect y="19" x="16" height="1.1" width="1.1"></rect>
                                <rect y="19" x="19" height="1.1" width="1.1"></rect>
                                <rect y="19" x="23" height="1.1" width="1.1"></rect>
                                <rect y="19" x="25" height="1.1" width="1.1"></rect>
                                <rect y="19" x="27" height="1.1" width="2.1"></rect>
                                <rect y="20" x="0" height="1.1" width="1.1"></rect>
                                <rect y="20" x="2" height="1.1" width="3.1"></rect>
                                <rect y="20" x="6" height="1.1" width="1.1"></rect>
                                <rect y="20" x="8" height="1.1" width="1.1"></rect>
                                <rect y="20" x="10" height="1.1" width="3.1"></rect>
                                <rect y="20" x="14" height="1.1" width="5.1"></rect>
                                <rect y="20" x="20" height="1.1" width="5.1"></rect>
                                <rect y="20" x="26" height="1.1" width="1.1"></rect>
                                <rect y="21" x="8" height="1.1" width="1.1"></rect>
                                <rect y="21" x="11" height="1.1" width="2.1"></rect>
                                <rect y="21" x="17" height="1.1" width="4.1"></rect>
                                <rect y="21" x="24" height="1.1" width="1.1"></rect>
                                <rect y="21" x="28" height="1.1" width="1.1"></rect>
                                <rect y="22" x="0" height="1.1" width="7.1"></rect>
                                <rect y="22" x="10" height="1.1" width="4.1"></rect>
                                <rect y="22" x="15" height="1.1" width="1.1"></rect>
                                <rect y="22" x="18" height="1.1" width="1.1"></rect>
                                <rect y="22" x="20" height="1.1" width="1.1"></rect>
                                <rect y="22" x="22" height="1.1" width="1.1"></rect>
                                <rect y="22" x="24" height="1.1" width="4.1"></rect>
                                <rect y="23" x="0" height="1.1" width="1.1"></rect>
                                <rect y="23" x="6" height="1.1" width="1.1"></rect>
                                <rect y="23" x="11" height="1.1" width="6.1"></rect>
                                <rect y="23" x="20" height="1.1" width="1.1"></rect>
                                <rect y="23" x="24" height="1.1" width="1.1"></rect>
                                <rect y="23" x="26" height="1.1" width="1.1"></rect>
                                <rect y="24" x="0" height="1.1" width="1.1"></rect>
                                <rect y="24" x="2" height="1.1" width="3.1"></rect>
                                <rect y="24" x="6" height="1.1" width="1.1"></rect>
                                <rect y="24" x="9" height="1.1" width="1.1"></rect>
                                <rect y="24" x="12" height="1.1" width="2.1"></rect>
                                <rect y="24" x="15" height="1.1" width="4.1"></rect>
                                <rect y="24" x="20" height="1.1" width="6.1"></rect>
                                <rect y="25" x="0" height="1.1" width="1.1"></rect>
                                <rect y="25" x="2" height="1.1" width="3.1"></rect>
                                <rect y="25" x="6" height="1.1" width="1.1"></rect>
                                <rect y="25" x="8" height="1.1" width="2.1"></rect>
                                <rect y="25" x="11" height="1.1" width="1.1"></rect>
                                <rect y="25" x="14" height="1.1" width="2.1"></rect>
                                <rect y="25" x="17" height="1.1" width="6.1"></rect>
                                <rect y="25" x="24" height="1.1" width="2.1"></rect>
                                <rect y="25" x="28" height="1.1" width="1.1"></rect>
                                <rect y="26" x="0" height="1.1" width="1.1"></rect>
                                <rect y="26" x="2" height="1.1" width="3.1"></rect>
                                <rect y="26" x="6" height="1.1" width="1.1"></rect>
                                <rect y="26" x="9" height="1.1" width="1.1"></rect>
                                <rect y="26" x="13" height="1.1" width="3.1"></rect>
                                <rect y="26" x="18" height="1.1" width="3.1"></rect>
                                <rect y="26" x="24" height="1.1" width="1.1"></rect>
                                <rect y="26" x="28" height="1.1" width="1.1"></rect>
                                <rect y="27" x="0" height="1.1" width="1.1"></rect>
                                <rect y="27" x="6" height="1.1" width="1.1"></rect>
                                <rect y="27" x="9" height="1.1" width="1.1"></rect>
                                <rect y="27" x="11" height="1.1" width="1.1"></rect>
                                <rect y="27" x="13" height="1.1" width="2.1"></rect>
                                <rect y="27" x="16" height="1.1" width="3.1"></rect>
                                <rect y="27" x="20" height="1.1" width="2.1"></rect>
                                <rect y="27" x="23" height="1.1" width="1.1"></rect>
                                <rect y="27" x="27" height="1.1" width="1.1"></rect>
                                <rect y="28" x="0" height="1.1" width="7.1"></rect>
                                <rect y="28" x="9" height="1.1" width="3.1"></rect>
                                <rect y="28" x="13" height="1.1" width="1.1"></rect>
                                <rect y="28" x="15" height="1.1" width="3.1"></rect>
                                <rect y="28" x="20" height="1.1" width="2.1"></rect>
                                <rect y="28" x="24" height="1.1" width="2.1"></rect>
                                <rect y="28" x="27" height="1.1" width="1.1"></rect>
                            </g>
                        </svg>
                        <div
                            style="
                                position: absolute;
                                background: rgba(255, 255, 255, 0.9);
                                padding: 1px 6px;
                                border-radius: 4px;
                                max-width: inherit;
                            ">
                            <h3 class="title" style="color: var(--primary-color); margin-bottom: 0px">{{ $t('NAVBAR.QRCODE') }}</h3>
                            <p>
                                {{ $t('WELCOME.FEATURES.QRCODE') }}
                            </p>
                        </div>
                    </router-link>
                </div>
                <div class="column">
                    <router-link class="box feature-box" :to="{ name: 'colors', params: { lang: $i18n.locale } }">
                        <div style="display: flex; flex-wrap: wrap; justify-content: center">
                            <div
                                class="color-small-preview"
                                v-for="(color, index) in colors"
                                :key="index"
                                :style="{ background: color['html'] }"></div>
                        </div>
                        <div
                            style="
                                position: absolute;
                                background: rgba(255, 255, 255, 0.9);
                                padding: 1px 6px;
                                border-radius: 4px;
                                max-width: inherit;
                            ">
                            <h3 class="title" style="color: var(--primary-color); margin-bottom: 0px">{{ $t('NAVBAR.COLORS') }}</h3>
                            <p>
                                {{ $t('WELCOME.FEATURES.COLORS', { nbcolors: store.colors.length, nbpalettes: store.palettes.length }) }}
                            </p>
                        </div>
                    </router-link>
                </div>
                <div class="column">
                    <router-link class="box feature-box" :to="{ name: 'backgrounds', params: { lang: $i18n.locale } }">
                        <div style="display: flex; flex-wrap: wrap; justify-content: center">
                            <vida-mosaic path="backgrounds" :elements="store.backgrounds" :nbColumns="4" :columnWidth="50" :heightColumn="180" />
                        </div>
                        <div
                            style="
                                position: absolute;
                                background: rgba(255, 255, 255, 0.9);
                                padding: 1px 6px;
                                border-radius: 4px;
                                max-width: inherit;
                            ">
                            <h3 class="title" style="color: var(--primary-color); margin-bottom: 0px">{{ $t('NAVBAR.BACKGROUNDS') }}</h3>
                            <p>
                                {{ $t('WELCOME.FEATURES.BACKGROUNDS', { nbbackgrounds: store.backgrounds.length }) }}
                            </p>
                        </div>
                    </router-link>
                </div>
                <div class="column">
                    <router-link class="box feature-box" :to="{ name: 'fonts', params: { lang: $i18n.locale } }">
                        <div style="display: flex; flex-wrap: wrap; justify-content: center; font-size: 3rem">
                            <div v-for="(font, index) in fonts" :key="index" :style="{ padding: '3px', 'font-family': font['fontName'] }">
                                {{ alphabet[index] }}
                            </div>
                        </div>

                        <div
                            style="
                                position: absolute;
                                background: rgba(255, 255, 255, 0.9);
                                padding: 1px 6px;
                                border-radius: 4px;
                                max-width: inherit;
                            ">
                            <h3 class="title" style="color: var(--primary-color); margin-bottom: 0px">{{ $t('NAVBAR.FONTS') }}</h3>
                            <p>
                                {{ $t('WELCOME.FEATURES.FONTS', { nbfonts: store.fonts.length }) }}
                            </p>
                        </div>
                    </router-link>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import VidaMosaic from '@/components/ui/mosaic.vue';

import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title';

import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'welcome',
    metaInfo: function () {
        const store = useStore();
        return {
            title: store.config.id,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                {
                    vmid: 'description',
                    name: 'description',
                    content: this.$t('META.DESCRIPTION', { localdesc: this.$i18n.t('CONFIG.description') }),
                },
            ],
        };
    },
    components: { VidaNavbar, VidaTransformerTitle, VidaMosaic },
    methods: {},
    computed: {
        colors() {
            const store = useStore();
            const c = [...store.colors];
            if (c.length === 0) return c;

            c.sort(() => Math.random() - 0.5);
            while (c.length < 36) {
                for (const cc of c) {
                    if (c.length > 36) break;
                    c.push(cc);
                }
                c.sort(() => Math.random() - 0.5);
            }
            return c;
        },
        fonts() {
            const store = useStore();
            const f = [...store.fonts];
            if (f.length === 0) return f;
            f.sort(() => Math.random() - 0.5);
            while (f.length < 15) {
                for (const ff of f) {
                    if (f.length > 15) break;
                    f.push(ff);
                }
                f.sort(() => Math.random() - 0.5);
            }
            return f;
        },
        alphabet() {
            const chars = [
                'A',
                'B',
                'C',
                'D',
                'E',
                'F',
                'G',
                'H',
                'I',
                'J',
                'K',
                'L',
                'M',
                'N',
                'O',
                'P',
                'Q',
                'R',
                'S',
                'T',
                'U',
                'V',
                'W',
                'X',
                'Y',
                'Z',
                'a',
                'b',
                'c',
                'd',
                'e',
                'f',
                'g',
                'h',
                'i',
                'j',
                'k',
                'l',
                'm',
                'n',
                'o',
                'p',
                'q',
                'r',
                's',
                't',
                'u',
                'v',
                'w',
                'x',
                'y',
                'z',
                '0',
                '1',
                '2',
                '3',
                '4',
                '5',
                '6',
                '7',
                '8',
                '9',
            ];
            return chars.sort(() => Math.random() - 0.5);
        },
    },
    beforeMount: () => {},
    mounted: function () {
        showSnackbarOnRedirection(this);
        document.dispatchEvent(new Event('x-app-rendered'));
    },
};
</script>

<style lang="scss" scoped>
@import '@/assets/local/buefy.scss';

.colored-section {
    background: $primary-light; // #f4eef4; // Todo compute
}
a.feature-box {
    aspect-ratio: 1;
    padding-inline: 0rem;
    padding: 0px;
    border-radius: 1rem;
    display: grid;
    place-items: center;
    max-width: 200px;
    overflow: hidden;
    margin: auto;
    h3 {
        text-align: center;
    }

    .color-small-preview {
        height: 16px;
        border-radius: 3px;
        margin: 1px;
        border: 1px solid #f3f3f3;

        &:nth-child(2n + 1) {
            flex-basis: 58px;
            width: 60px;
            flex-grow: 3;
        }
        &:nth-child(2n) {
            flex-basis: 38px;
            width: 40px;
            flex-grow: 2;
        }
        &:nth-child(6n + 5) {
            flex-basis: 78px;
            width: 80px;
            flex-grow: 4;
        }
    }
}
</style>
