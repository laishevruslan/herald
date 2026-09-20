<script setup>
import { useStore } from '@datastore';
// eslint-disable-next-line no-unused-vars
const store = useStore();
store.fetchConfig();
</script>

<template>
    <div>
        <b-loading :is-full-page="true" :active="isLoading" class="primary-loading"></b-loading>
        <div class="row is-justify-content-center" style="margin-top: 20px">
            <div class="symbol-preview">
                <div
                    class="mask-container"
                    v-if="mask"
                    :style="{
                        width: Math.round(svgMask.scaledWidth * svgMask.scale) + 'px',
                        height: Math.round(svgMask.scaledHeight * svgMask.scale) + 'px',
                    }">
                    <svg
                        :viewBox="maskViewBox"
                        :width="Math.round(svgMask.scaledWidth * svgMask.scale)"
                        :height="Math.round(svgMask.scaledHeight * svgMask.scale)">
                        <path
                            :d="maskLeftRectangle"
                            style="opacity: 1; fill: #000000; fill-opacity: 1; stroke: none; stroke-width: 0.99999994; stroke-opacity: 1" />
                        <path
                            :d="maskRightRectangle"
                            style="opacity: 1; fill: #000000; fill-opacity: 1; stroke: none; stroke-width: 0.99999994; stroke-opacity: 1" />
                        <path
                            :d="maskTopRectangle"
                            style="opacity: 1; fill: #000000; fill-opacity: 1; stroke: none; stroke-width: 0.99999994; stroke-opacity: 1" />
                        <path
                            :d="maskBottomRectangle"
                            style="opacity: 1; fill: #000000; fill-opacity: 1; stroke: none; stroke-width: 0.99999994; stroke-opacity: 1" />
                    </svg>
                </div>
                <img v-if="selectedSymbol" :src="store.imagePreview(selectedSymbol.id, galleryType)" @click="openGallery" />
                <img v-else-if="copyValue.url" :src="`${copyValue.url}`" />
                <div class="empty-image" v-else @click="openGallery">
                    <b-icon icon="magnify" size="is-large" />
                </div>
            </div>
            <b-tooltip v-if="downloadSymbolUrl" :label="$t('EDIT.TIPS.DOWNLOAD')" style="align-self: self-end">
                <b-button
                    type="is-text"
                    tag="a"
                    :href="downloadSymbolUrl"
                    target="_blank"
                    download
                    class="download-symbol-button"
                    icon
                    size="is-medium"
                    icon-left="download">
                </b-button>
            </b-tooltip>
        </div>
        <p class="preview-label" v-if="selectedSymbolLabel">{{ selectedSymbolLabel }}</p>

        <div class="row is-justify-content-center">
            <b-button style="margin: 3px" @click="openGallery" icon-left="magnify" id="open-gallery-button">
                {{ $t('BUTTONS.OPEN_GALLERY') }}
            </b-button>

            <b-tooltip :label="$t('EDIT.TIPS.RANDOM_SELECTION')">
                <b-button style="margin: 3px" @click="randomSymbol()" icon-left="dice-multiple" outlined />
            </b-tooltip>
            <b-tooltip v-if="allowEmptyImage" :label="$t('EDIT.TIPS.REMOVE_IMAGE')">
                <b-button :disabled="!copyValue.url && !copyValue.id" style="margin: 3px" @click="undefinedImage()" icon-left="delete" outlined />
            </b-tooltip>
            <!-- TODO print filename -->
            <b-tooltip :label="$t('EDIT.TIPS.UPLOAD_PHOTO')" position="is-left" v-if="allowCustomPhoto">
                <b-field style="margin: 3px">
                    <b-upload @input="customImageUploaded" class="button" accept=".jpeg,.jpg,.png">
                        <span class="file-cta" style="background-color: unset; border: unset">
                            <b-icon class="file-icon" icon="upload"></b-icon>
                            <span class="file-label">{{ $t('BUTTONS.UPLOAD') }}</span>
                        </span>
                    </b-upload>
                </b-field>
            </b-tooltip>
        </div>

        <div class="row" v-if="symbolInputColors && Object.keys(symbolInputColors).length > 0">
            <palette-picker v-model="symbolInputColors" :key="rerenderColors" :dropColorEnabled="true" />
        </div>
    </div>
</template>

<script>

import { computeCoverSize, compressImage, extractBestTranslation } from 'aktivisda-library';

import PalettePicker from '@/components/pickers/PalettePicker.vue';
import SymbolsGallery from '@/components/pickers/ModalGallery.vue';
import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';

export default {
    name: 'symbol-picker',
    components: { PalettePicker },
    props: {
        value: { id: String, colors: Object, /*type: String, */ url: String, file: Object, width: Number, height: Number },
        colors: {},
        symbolPicker: { type: Boolean, default: true },
        allowCustomPhoto: { type: Boolean, default: true },
        allowEmptyImage: { type: Boolean, default: false },
        mask: { type: Boolean, default: false },
        documentWidth: { type: Number, required: false },
        documentHeight: { type: Number, required: false },
    },
    data() {
        return {
            previewSize: 120,
            copyValue: this.value,
            rerenderColors: 0,
            isLoading: false,
            downloadSymbolUrl: undefined,
        };
    },
    computed: {
        svgMask: function () {
            if (!this.value.width || !this.value.height) {
                return { cropWidth: 0, cropHeight: 0, scaledWidth: 0, scaledHeight: 0, scale: 0 };
            }

            const width = this.value.width;
            const height = this.value.height;

            const newSize = computeCoverSize(width, height, this.documentWidth, this.documentHeight);
            const scale = newSize.width > this.documentWidth ? newSize.width / width : newSize.height / height;

            const cropWidth = newSize.width - this.documentWidth;
            const cropHeight = newSize.height - this.documentHeight;
            const scaledHeight = height * scale;
            const scaledWidth = width * scale;
            const svgScale = scaledHeight > scaledWidth ? this.previewSize / scaledHeight : this.previewSize / scaledWidth;
            return { cropWidth, cropHeight, scaledWidth, scaledHeight, scale: svgScale };
        },
        maskLeftRectangle: function () {
            const { scale, scaledHeight, cropWidth } = this.svgMask;
            return `M 0,0 v ${scale * scaledHeight} h ${(scale * cropWidth) / 2} v ${-scale * scaledHeight} Z`;
        },
        maskBottomRectangle: function () {
            const { scale, scaledWidth, scaledHeight, cropHeight } = this.svgMask;
            return `M 0, ${scale * (scaledHeight - cropHeight / 2)} h ${scale * scaledWidth} v ${(scale * cropHeight) / 2} h ${
                -scale * scaledWidth
            } Z`;
        },
        maskTopRectangle: function () {
            const { scale, scaledWidth, cropHeight } = this.svgMask;
            return `M 0,0 h ${scale * scaledWidth} v ${(scale * cropHeight) / 2} h ${-scale * scaledWidth} Z`;
        },
        maskRightRectangle: function () {
            const { scale, scaledHeight, scaledWidth, cropWidth } = this.svgMask;
            return `M ${scale * (scaledWidth - cropWidth / 2)}, 0 v ${scale * scaledHeight} h${(scale * cropWidth) / 2} v ${-scale * scaledHeight} Z`;
        },
        maskViewBox: function () {
            const { scale, scaledHeight, scaledWidth } = this.svgMask;
            return `0 0 ${Math.round(scale * scaledWidth)}${Math.round(scale * scaledHeight)}`;
        },
        list: function () {
            const store = useStore();
            if (this.symbolPicker) {
                store.fetchImages();
                return store.images;
            } else {
                store.fetchBackgrounds();
                return store.backgrounds;
            }
        },
        galleryItemId: {
            get: function () {
                return this.copyValue.id;
            },
            set: function (newValue) {
                if (newValue === this.copyValue.id) return;
                this.copyValue.id = newValue;
                this.copyValue.url = undefined;
                this.copyValue.type = 'internalsvg'; // Ou photo todo
                const element = this.list.find((s) => s.id == newValue);

                this.copyValue.colors = element.colors;
                ++this.rerenderColors;
                // TODO add this in templates
                if (this.symbolPicker) element['gallery'] = 'images';
                else element['gallery'] = 'backgrounds';

                this.downloadSymbolUrl = undefined;
                useStore()
                    .imageFile(element.id, this.galleryType)
                    .then((url) => {
                        this.downloadSymbolUrl = url;
                    });
                this.$emit('input', element);
            },
        },
        symbolInputColors: {
            get: function () {
                return this.copyValue.colors;
            },
            set: function (newValue) {
                if (!this.copyValue.colors) return;
                let changed = false;
                for (let key in newValue) {
                    if (this.copyValue.colors[key] && this.copyValue.colors[key] === newValue[key]) continue;
                    changed = true;
                }
                if (!changed) return;
                this.copyValue.colors = newValue;
                // todo ou internalphoto ?
                this.$emit('input', { id: this.value.id, colors: newValue });
            },
        },
        selectedSymbol: function () {
            if (!this.value.id) return undefined;
            return this.list.find((s) => s.id == this.value.id);
        },
        selectedSymbolLabel: function () {
            if (!this.selectedSymbol) return undefined;
            return extractBestTranslation(this.selectedSymbol.label, this.$i18n.locale, DEFAULT_LOCALE);
        },
        galleryType: function () {
            if (this.symbolPicker) return 'images';
            else return 'backgrounds';
        },
    },
    methods: {
        undefinedImage() {
            this.copyValue.id = undefined;
            this.copyValue.url = undefined;
            this.copyValue.type = 'undefinedimage';
            this.$emit('input', {});
        },
        randomSymbol() {
            const randomIndex = Math.floor(Math.random() * this.list.length);
            this.galleryItemId = this.list[randomIndex].id;
        },
        openGallery() {
            const store = useStore();
            this.$buefy.modal.open({
                parent: this,
                component: SymbolsGallery,
                hasModalCard: true,
                trapFocus: true,
                width: 1080,
                props: {
                    title: this.symbolPicker
                        ? this.$tc('EDIT.COMPONENTS.SVGS', this.list.length)
                        : this.$tc('BACKGROUND_IMAGES.LABEL', this.list.length),
                    message: this.$t('SVGS.CONTRIBUTE', { email: store.config.email }),
                    list: this.list,
                    category: this.galleryType,
                },
                events: {
                    input: (value) => (this.galleryItemId = value),
                },
                canCancel: ['escape', 'outside'],
            });
        },
        customImageUploaded(image) {
            const reader = new FileReader();
            this.isLoading = true;
            let mimeType = image.type;

            reader.onload = () => {
                this.compressionToast = this.$buefy.toast.open({
                    indefinite: true,
                    message: `Compression de l'image en cours...`,
                    type: 'is-black',
                    position: 'is-bottom',
                });

                compressImage(reader.result, mimeType, 75)
                    .then((r) => {
                        const compressedImage = r['resultData'];
                        const compressedBlob = new Blob([compressedImage], { type: mimeType });

                        const base64Reader = new FileReader();
                        base64Reader.readAsDataURL(compressedBlob);
                        base64Reader.onloadend = () => {
                            const base64Data = base64Reader.result;
                            this.copyValue.url = base64Data;
                            this.copyValue.id = undefined;
                            this.copyValue.type = 'urlphoto';
                            this.isLoading = false;
                            this.compressionToast.close();
                            this.$emit('input', {
                                type: 'urlphoto',
                                url: base64Data,
                            });
                        };
                    })
                    .catch((err) => {
                        this.indefinteToast.close();
                        console.error(`Compressed image failed: ${err}`);
                        console.error(err);
                        this.copyValue.url = reader.result;
                        this.copyValue.id = undefined;
                        this.copyValue.type = 'urlphoto';
                        this.isLoading = false;
                        this.$emit('input', {
                            type: 'urlphoto',
                            url: reader.result,
                        });
                    });
            };
            reader.readAsDataURL(image);
        },
    },
    beforeMount() {
        // useStore().imageFile(this.value.id, this.galleryType).then((url) => {
        // 	this.downloadSymbolUrl = url;
        // });
    },
};
</script>

<style lang="scss">
@import '@/assets/local/buefy.scss';

.symbol-preview {
    position: relative;
}

.symbol-preview {
    img,
    div {
        width: 120px;
        height: 120px;
    }

    img {
        object-fit: contain;
    }

    div.empty-image {
        background-color: $primary-light;
        display: flex;
        justify-content: left;
        flex-direction: row;
        cursor: pointer;
        border-radius: 8px;
        border: 1px solid hsl(0deg, 0%, 86%);
        &:hover {
            border-color: hsl(0deg, 0%, 71%);
        }

        .icon {
            margin: auto;
        }
    }
}

.mask-container {
    position: absolute;
    top: -7px;
    bottom: 0;
    right: 0;
    left: 0;
    margin: auto;
    overflow: hidden;
    opacity: 0.5;
}

.preview-label {
    font-style: italic;
    color: var(--primary-color);
}
</style>
