<script setup>
import { useStore } from '@datastore';
// eslint-disable-next-line no-unused-vars
const store = useStore();
</script>

<template>
    <div class="container">
        <div v-if="element">
            <!-- TODO: use svgcolorpicker here -->
            <div class="card" style="padding: 15px">
                <div class="card-image" style="padding: 15px, position: relative">
                    <div
                        v-if="!isLoading"
                        class="checkerboard-background"
                        :style="{
                            position: 'absolute',
                            top: (!isLoading ? (100 - displayedDimensions.height) / 2 : 0) + '%',
                            left: (!isLoading ? (100 - displayedDimensions.width) / 2 : 0) + '%',
                            width: (!isLoading ? displayedDimensions.width : 100) + '%',
                            height: (!isLoading ? displayedDimensions.height : 100) + '%',
                        }">
                        <img :src="coloredSvgPreviewUrl ? coloredSvgPreviewUrl : imageFileUrl" :alt="element.description" style="width: 100%" />
                    </div>
                    <b-loading :is-full-page="false" :active="isLoading" class="primary-loading"></b-loading>

                    <div style="padding-top: 75%"></div>
                </div>
                <div class="card-content">
                    <div class="content">
                        {{ localLabel }}
                        <b-taglist>
                            <b-tag v-for="(tag, index) in tags" type="is-primary" :key="index">{{ store.tagTranslation(tag, $i18n.locale) }}</b-tag>
                        </b-taglist>
                    </div>
                    <hr v-if="isSvg" />
                    <palette-picker v-if="isSvg && colors" v-model="colors" />
                </div>
                <footer class="card-footer">
                    <a v-if="isSvg" class="card-footer-item" @click="downloadPng">{{ $t('EDIT.EXPORT.PNG') }}</a>
                    <a v-if="isPhoto" class="card-footer-item" @click="downloadPhoto">{{ $t('EDIT.EXPORT.PHOTO') }}</a>
                    <a v-if="isSvg" :href="coloredSvgPreviewUrl" class="card-footer-item" :download="elementId + '.svg'">{{
                        $t('EDIT.EXPORT.SVG')
                    }}</a>
                    <router-link
                        v-if="isTemplate"
                        :to="{ name: 'editor', params: { lang: $i18n.locale, templateId: elementId } }"
                        class="card-footer-item primary"
                        :download="elementId + '.svg'"
                        >{{ $t('BUTTONS.START_EDITION') }}</router-link
                    >
                    <a v-if="$isBacktivisda" class="card-footer-item" @click="deleteOrRestoreImage">
                        {{ element.status === 'deleted' ? 'Restaurer' : 'Supprimer' }}
                    </a>
                </footer>
            </div>
        </div>
    </div>
</template>

<script>
import PalettePicker from '@/components/pickers/PalettePicker.vue';

import { loadSvg, colorSvgString, extractBestTranslation } from 'aktivisda-library';
import { Canvg } from 'canvg';
import { DEFAULT_LOCALE } from '../plugins/i18n-utils';

export default {
    name: 'ColorableGalleryModal',
    components: { PalettePicker },
    props: {
        elementId: {
            type: String,
        },
        galleryType: String,
    },
    data: () => ({
        svgString: {},
        isLoading: false,
        colors: {},
        isSvgLoading: false,
        coloredSvgPreview: {},
        canvas: undefined,
        store: useStore(),
        imageFileUrl: undefined,
    }),
    mounted() {
        this.loadSelectedElement();
    },
    methods: {
        loadSelectedElement() {
            this.isLoading = true;

            const store = useStore();
            store.imageFile(this.elementId, this.galleryType).then((imageUrl) => {
                if (this.galleryType === 'templates') this.imageFileUrl = store.imagePreview(this.elementId, this.galleryType);
                else this.imageFileUrl = imageUrl;

                if (this.isSvg) {
                    loadSvg(imageUrl, { prepareColors: true }).then((svgString) => {
                        const colors = {};
                        for (let color of Object.keys(this.element.colors)) {
                            colors[color] = this.element.colors[color];
                        }
                        this.isLoading = false;
                        this.svgString = svgString;
                        this.colors = colors;
                    });
                } else {
                    this.isLoading = false;
                }
            });
        },
        downloadPng() {
            console.assert(this.isSvg);
            if (!this.isSvg) return;
            if (!this.coloredSvgPreview) return;
            if (!this.canvas) this.canvas = window.document.createElement('canvas');

            const ctx = this.canvas.getContext('2d');
            const canvgElement = Canvg.fromString(ctx, this.coloredSvgPreview.string);

            const widthRatio = 1000 / this.element.width;
            const heightRatio = 1000 / this.element.height;
            const ratio = Math.max(widthRatio, heightRatio);
            canvgElement.resize(this.element.width * ratio, this.element.height * ratio, 'xMidYMid meet');
            canvgElement.render().then(() => {
                const url = this.canvas.toDataURL({ mimeType: 'image/png', quality: 1 });
                const link = document.createElement('a');
                link.download = `${this.elementId}.png`;
                link.href = url;
                document.body.appendChild(link);
                link.click();

                // // cleanup temporary elements
                document.body.removeChild(link);
            });
        },
        downloadPhoto() {
            console.assert(this.isPhoto);
            if (!this.isPhoto) return;
            const link = document.createElement('a');

            if (this.element.filename.endsWith('.png'))
                link.download = `${this.elementId}.png`;
            else
                link.download = `${this.elementId}.jpg`;
            link.href = this.imageFileUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },
        deleteOrRestoreImage() {
            (this.element.status === 'deleted'
                ? this.store.restoreElement(this.elementId, this.galleryType)
                : this.store.deleteElement(this.elementId, this.galleryType)
            )
                .then(() => {
                    this.$emit('refresh');
                    this.$emit('close');
                })
                .catch((error) => {
                    this.$emit('refresh');
                    this.$emit('close');
                    this.$buefy.snackbar.open({
                        duration: 6000,
                        message: error,
                        type: 'is-danger',
                        cancelText: this.$t('BUTTONS.CANCEL'),
                        position: 'is-bottom',
                        actionText: null,
                    });
                });
        },
        addTag(elementId, tag) {
            for (let k = 0; k < this.elements.length; ++k) {
                if (this.elements[k].id !== elementId) continue;
                const tags = (this.elements[k].tags ? this.elements[k].tags + ',' : '') + tag;
                this.elements[k].tags = tags;
                this.element.tags = tags;
            }
        },
    },
    computed: {
        element() {
            return this.store.imageData(this.elementId, this.galleryType);
        },
        displayedDimensions() {
            const ratio = this.element.width / this.element.height;
            if (ratio < 4 / 3) {
                // portrait
                return { height: 100, width: (100 * ratio * 3) / 4 };
            } else {
                // paysage
                return { height: ((100 / ratio) * 4) / 3, width: 100 };
            }
        },
        availableTags() {
            return Object.keys(this.elementsByTag);
        },
        tags() {
            if (this.element.tags === '') return [];
            return this.element.tags.split(',');
        },
        isPhoto() {
            if (!this.element.filename) return false;
            return this.element.filename.endsWith('.jpg') || this.element.filename.endsWith('.jpeg') || this.element.filename.endsWith('.png');
        },
        isSvg() {
            if (!this.element.filename) return false;
            return this.element.filename.endsWith('.svg') || this.element.filename.endsWith('.svgz');
        },
        isTemplate() {
            if (!this.element.filename) return false;
            return this.element.filename.endsWith('.json');
        },
        coloredSvgPreviewUrl() {
            if (!this.isSvg) return undefined;
            if (!this.coloredSvgPreview || !this.coloredSvgPreview.url) return undefined;
            return this.coloredSvgPreview.url;
        },
        localLabel() {
            return extractBestTranslation(this.element.label, this.$i18n.locale, DEFAULT_LOCALE);
        },
    },
    watch: {
        // whenever question changes, this function will run
        colors: {
            handler: function (newColors) {
                if (!this.isSvg) return;
                if (!this.svgString) return;
                this.coloredSvgPreview = colorSvgString(this.svgString, newColors);
            },
            deep: true,
        },
    },
};
</script>

<style lang="scss">
.checkerboard-background {
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%);
    background-size: 25px 25px;
    background-position:
        0 0,
        12.5px 0,
        12.5px -12.5px,
        0px 12.5px;
    background-repeat: repeat;
}
</style>
