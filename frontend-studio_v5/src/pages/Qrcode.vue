<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchImages();
store.fetchConfig();
</script>

<template>
    <div>
        <vida-navbar active="colors" />
        <section class="hero">
            <div>
                <vida-transformer-title :content="$tc('QRCODE.LABEL', 2)" size="medium" textAlign="center"></vida-transformer-title>
                <p class="subtitle">{{ $t('QRCODE.PAGE_DESCRIPTION') }}</p>
            </div>
        </section>

        <section style="padding: 20px; display: flex; justify-content: center">
            <div class="container" style="max-width: 1000px">
                <b-loading :is-full-page="true" :active="rerenderComponent == 0" class="primary-loading"></b-loading>
                <div class="container columns" v-if="rerenderComponent > 0">
                    <div class="column">
                        <qrcode-picker v-model="qrcodeValue" :key="rerenderComponent" />
                    </div>
                    <div class="column">
                        <div v-html="qrcodeSvg"></div>
                        <div class="buttons;justify-content: center">
                            <b-button id="export-qrcode-png" @click="exportPng" style="margin: 5px" icon type="is-primary" icon-left="download">{{
                                $t('QRCODE.EXPORT.IMAGE')
                            }}</b-button>
                            <b-button id="export-qrcode-svg" @click="exportSvg" style="margin: 5px" icon icon-left="download">{{
                                $t('QRCODE.EXPORT.VECTOR')
                            }}</b-button>
                            <b-button id="export-qrcode-link" @click="shareLink" style="margin: 5px" icon icon-left="share-variant">{{
                                $t('QRCODE.EXPORT.LINK')
                            }}</b-button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title';

import QrcodePicker from '@/components/pickers/QrcodePicker.vue';
import { QrcodeVidaSubComponent, jsonToURI, stringifyQuery } from 'aktivisda-library';
import { showSnackbarOnRedirection } from '@/plugins/utils.js';
import { uriToJSON } from '@/plugins/utils.js';

import { Canvg } from 'canvg';

export default {
    name: 'qrcode',
    components: { VidaNavbar, VidaTransformerTitle, QrcodePicker },
    metaInfo: function () {
        const store = useStore();
        return {
            title: `${this.$t('NAVBAR.QRCODE')} - ${store.config.id}`,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                { vmid: 'description', name: 'description', content: `${this.$t('QRCODE.PAGE_DESCRIPTION')}` },
                { property: 'og:title', vmid: 'og:title', content: `${this.$t('NAVBAR.QRCODE')} | ${store.config.id}.aktivisda` },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: store.config.url },
                { property: 'og:description', vmid: 'og:description', content: `${this.$t('QRCODE.PAGE_DESCRIPTION')}` },
            ],
        };
    },
    data: () => ({
        rerenderComponent: 0,
        rerenderQrcode: 0,
        qrcode: new QrcodeVidaSubComponent({ gallery: useStore() }),
    }),
    computed: {
        qrcodeValue: {
            get: function () {
                this.rerenderComponent; // Used for cache update
                return this.qrcode.toJson();
            },
            set: function (options) {
                this.qrcode.update(options).then(() => {
                    if (options.symbol) ++this.rerenderComponent;
                    ++this.rerenderQrcode;
                });
            },
        },
        qrcodeSvg: function () {
            this.rerenderQrcode; // Used for cache update
            return this.qrcode.toSvg();
        },
    },
    methods: {
        exportSvg: function () {
            const blob = new Blob([this.qrcode.toSvg()], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.download = `qrcode-${this.qrcodeValue.url}.svg`;
            link.href = url;
            document.body.appendChild(link);
            link.click();

            // // cleanup temporary elements
            document.body.removeChild(link);
        },
        exportPng: function () {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 300;
            canvas.height = 300;

            this.canvgElement = Canvg.fromString(ctx, this.qrcodeSvg);
            this.canvgElement.start();

            const url = canvas.toDataURL({ mimeType: 'image/png', quality: 1 });
            const link = document.createElement('a');

            link.download = `qrcode-${this.qrcodeValue.url}.png`;
            link.href = url;
            document.body.appendChild(link);
            link.click();

            // // cleanup temporary elements
            document.body.removeChild(link);
        },
        shareLink: function () {
            const options = this.qrcode.toJson();
            options.symbol = jsonToURI(options.symbol);
            const queryString = stringifyQuery(options);

            const store = useStore();
            const link = store.config.url + this.$router.currentRoute.path + queryString;

            this.$buefy.dialog.prompt({
                message: `${this.$t('QRCODE.EXPORT.CONFIRM_LINK')} <b-input value="${link}"></b-input>`,
                inputAttrs: {
                    type: 'text',
                    value: link,
                },
                onConfirm: () => {
                    if (!navigator.clipboard) return;
                    navigator.clipboard.writeText(link);
                    this.$buefy.toast.open(this.$t('BUTTONS.COPIED_TO_CLIPBOARD'));
                },
                confirmText: this.$t('BUTTONS.COPY'),
                cancelText: this.$t('BUTTONS.CLOSE'),
                ariaRole: 'copyLinkModal',
            });
        },
        updateIfQuery(query) {
            return new Promise((resolve) => {
                if (!query) {
                    resolve();
                    return;
                }
                const options = query;
                if (options.symbol) options.symbol = uriToJSON(options.symbol);
                try {
                    this.qrcode.update(options).then(() => {
                        this.$router.replace({ query: {} }).catch(() => {});
                        resolve();
                    });
                } catch (error) {
                    this.$router.replace({ query: {} }).catch(() => {});
                    console.error(error);
                }
            });
        },
    },
    mounted: function () {
        showSnackbarOnRedirection(this);
        this.qrcode.update(this.qrcode.randomOptions()).then(() => {
            this.updateIfQuery(this.$router.currentRoute.query).then(() => {
                ++this.rerenderComponent;
            });
        });
        document.dispatchEvent(new Event('x-app-rendered'));
    },
    beforeRouteUpdate(to, from, next) {
        this.updateIfQuery(to.query).then(() => {
            next();
        });
        next();
    },
};
</script>

<style scoped lang="scss"></style>
