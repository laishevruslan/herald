<script setup>
import { useStore } from '@datastore';
// eslint-disable-next-line no-unused-vars
import { useCredentialsStore } from '@/backtivisda/credentials';

const store = useStore();

store.fetchImages();
store.fetchConfig();
</script>

<template>
    <b-steps v-model="activeStep" :animated="true" :rounded="false" :has-navigation="false">
        <b-step-item step="1" :label="$t('ADMIN.UPLOADER.LOAD_IMAGE')" :type="{ 'is-image': isUploaded }">
            <h2 class="title has-text-centered">{{ $t('ADMIN.UPLOADER.LOAD_IMAGE') }}</h2>

            <p>{{ $t('ADMIN.UPLOADER.IMAGE_FORMATS_STRING') }}</p>

            <b-upload @input="imageUploaded" id="import-menu" class="file-label" accept=".png,.svg,.jpg,.jpeg">
                <span class="file-cta">
                    <b-icon class="file-icon" icon="upload"></b-icon>
                    <span class="file-label">{{ $t('BUTTONS.UPLOAD') }}</span>
                </span>
            </b-upload>
            <b-message type="is-danger" has-icon v-if="errors.compression">
                {{ errors.compression }}
            </b-message>
            <b-message type="is-danger" has-icon v-if="errors.canonize">
                {{ errors.canonize }}
            </b-message>

            <div class="columns" style="margin-top: 50px" v-if="rawImage.url">
                <div class="column">
                    <img :src="rawImage.url" style="max-width: 200px; max-height: 200px; margin: auto" />
                </div>
                <div class="column">
                    <b-message type="is-info" has-icon v-if="isPhoto">
                        {{ $t('ADMIN.UPLOADER.WARNING_PHOTO_UPLOADED') }}
                    </b-message>
                    <b-message type="is-warning" has-icon v-if="rawImage.type === 'image/svg+xml'">
                        {{ $t('ADMIN.UPLOADER.WARNING_SVG_UPLOADED') }}
                    </b-message>
                    <div class="buttons" style="justify-content: center">
                        <b-button @click="posterize();activeStep = 1" type="is-primary"
                            :loading="this.loading.compress"
                            :disabled="rawImage.type === 'image/svg+xml'">{{ $t('ADMIN.UPLOADER.BUTTON_VECTOR')
                            }}</b-button>
                        <b-button @click="
                                activeStep = 5;
                                computePreview();
                            " type="is-primary"
                            :loading="this.loading.compress"
                            :disabled="rawImage.type === 'image/svg+xml'">{{
                            $t('ADMIN.UPLOADER.BUTTON_SKIP_VECTORIZATION') }}</b-button>
                        <b-button @click="activeStep = 2" type="is-primary" :loading="this.loading.canonize"
                            :disabled="rawImage.type !== 'image/svg+xml'">{{ $t('ADMIN.UPLOADER.BUTTON_USE_VECTOR')
                            }}</b-button>
                        <!-- <b-button v-if="isPhoto" @click="activeStep = 3">Considérer mon image comme une photo</b-button> -->
                    </div>
                </div>
            </div>
            <div></div>
        </b-step-item>

        <b-step-item step="2" :label="$t('ADMIN.UPLOADER.REDUCE_COLORS.TITLE')" :type="{ 'is-success': true }">
            <h2 class="title has-text-centered">{{ $t('ADMIN.UPLOADER.REDUCE_COLORS.TITLE') }}</h2>

            <div class="columns">
                <div class="column">
                    <p>{{ $t('ADMIN.UPLOADER.REDUCE_COLORS.EXPLANATIONS') }}</p>
                    <b-field :label="$t('ADMIN.UPLOADER.REDUCE_COLORS.NB_COLORS_LABEL')">
                        <b-numberinput v-model="options.nbExpectedColors" min="1" @input="posterize"></b-numberinput>
                    </b-field>
                    <b-checkbox v-model="options.whiteIsAlpha" @input="posterize">{{
                        $t('ADMIN.UPLOADER.REDUCE_COLORS.USE_WHITE_AS_ALPHA') }}</b-checkbox>
                    <b-message type="is-warning" has-icon v-if="options.nbExpectedColors > 5">
                        {{ $t('ADMIN.UPLOADER.REDUCE_COLORS.WARNING_TOO_MANY_COLORS') }}
                    </b-message>

                    <div class="buttons" style="justify-content: center">
                        <b-button type="is-primary" :disabled="!isPosterized" @click="
                                activeStep = 2;
                                vectorize(options.nbExpectedColors);
                            ">{{ $t('ADMIN.UPLOADER.NEXT_STEP') }}</b-button>
                        <!-- <b-button type="is-danger is-light" @click="activeStep = 3">Considérer mon image comme une photo</b-button> -->
                    </div>
                </div>
                <div class="column" style="max-width: 480px">
                    <b-message v-if="errors.posterize" type="is-danger" has-icon>
                        {{ errors.posterize }}
                    </b-message>
                    <b-loading :active="loading.posterize" :is-full-page="false" class="primary-loading"></b-loading>
                    <h3>{{ $t('ADMIN.UPLOADER.REDUCE_COLORS.BEFORE_AFTER_LABEL') }}</h3>
                    <BeforeAfterImage v-if="isPosterized" :beforeImage="rawImage.url"
                        :afterImage="rawImage.posterizedUrl" />
                </div>
            </div>
        </b-step-item>

        <b-step-item step="3" :label="$t('ADMIN.UPLOADER.VECTORIZATION.TITLE')" :type="{ 'is-success': true }">
            <h2 class="title has-text-centered">{{ $t('ADMIN.UPLOADER.VECTORIZATION.TITLE') }}</h2>

            <b-loading :active="loading.vectorize" :is-full-page="false" class="primary-loading"></b-loading>
            <div v-if="!loading.vectorize" class="columns">
                <div class="column">
                    <b-message v-if="errors.vectorize" type="is-danger" has-icon>
                        {{ errors.vectorize }}
                    </b-message>
                    <div v-if="isVectorized">
                        <p>
                            {{ $t('ADMIN.UPLOADER.VECTORIZATION.COLORS_EDITOR') }}
                            <br />
                            {{ $t('ADMIN.UPLOADER.IMAGE_WEIGHT_DESCRIPTION', { weight: svgWeight }) }}
                            <br />
                            {{ $t('ADMIN.UPLOADER.IMAGE_DIMENSIONS_DESCRIPTION',
                            { width: imageDimensions.width, height: imageDimensions.height }) }}
                        </p>
                    </div>
                    <b-message type="is-warning" has-icon v-if="svgWeight > 500000">
                        {{ $t('ADMIN.UPLOADER.VECTORIZATION.WARNING_HEAVY_VECTOR') }}
                    </b-message>
                    <b-message type="is-error" has-icon v-else-if="svgWeight > 1000000">
                        {{ $t('ADMIN.UPLOADER.VECTORIZATION.WARNING_VERY_HEAVY_VECTOR') }}
                    </b-message>

                    <div class="buttons" style="justify-content: center">
                        <b-button v-if="skipHitform" type="is-primary" :disabled="!isVectorized" @click="
                                activeStep = 4;
                                computePreview();
                            ">{{ $t('ADMIN.UPLOADER.NEXT_STEP') }}</b-button>
                        <b-button v-else type="is-primary" :disabled="!isVectorized" @click="
                                activeStep = 3;
                                computeHitform();
                            ">{{ $t('ADMIN.UPLOADER.NEXT_STEP') }}</b-button>
                    </div>
                </div>
                <div class="column" style="max-width: 480px">
                    <svg-color-picker v-if="this.rawImage.svgString" :svgString="this.rawImage.svgString"
                        v-model="image.colors" :width="this.imageDimensions.width"
                        :height="this.imageDimensions.height" />
                </div>
            </div>
        </b-step-item>

        <b-step-item step="4" :label="$t('ADMIN.UPLOADER.BACKGROUND_ZONES.TITTLE')">
            <h2 class="title has-text-centered">{{ $t('ADMIN.UPLOADER.BACKGROUND_ZONES.TITTLE') }}</h2>

            <div class="columns">
                <div class="column">
                    <b-loading :active="loading.hitform" :is-full-page="false" class="primary-loading"></b-loading>
                    <h3>{{ $t('ADMIN.UPLOADER.BACKGROUND_ZONES.CLICKABLE_ZONE_LABEL') }}</h3>
                    <p>
                        {{ $t('ADMIN.UPLOADER.BACKGROUND_ZONES.CLICKABLE_ZONE_EXPLANATIONS') }}
                    </p>
                    <b-message v-if="errors.hitform" type="is-danger" has-icon>
                        {{ errors.hitform }}
                    </b-message>
                    <img :src="hitformUrl" />
                </div>
                <div class="column">
                    <b-loading :active="loading.backgroundHull" :is-full-page="false"
                        class="primary-loading"></b-loading>
                    <h3>{{ $t('ADMIN.UPLOADER.BACKGROUND_ZONES.BACKGROUND_LABEL') }}</h3>
                    <p>
                        {{ $t('ADMIN.UPLOADER.BACKGROUND_ZONES.BACKGROUND_EXPLANATIONS') }}
                    </p>
                    <b-message v-if="errors.hull" type="is-danger" has-icon>
                        {{ errors.backgroundHull }}
                    </b-message>
                    <img :src="backgroundHullUrl" />
                </div>
                <div class="column">
                    <div class="buttons" style="justify-content: center">
                        <b-button type="is-primary" :disabled="!isVectorized" @click="
                                activeStep = 4;
                                computePreview();
                            ">{{ $t('ADMIN.UPLOADER.NEXT_STEP') }}</b-button>
                        <!-- <b-button type="is-danger is-light" @click="activeStep = 5">Considérer mon image comme une photo</b-button> -->
                    </div>
                </div>
            </div>
        </b-step-item>

        <b-step-item step="5" :label="$t('ADMIN.UPLOADER.TITLE_AND_TAGS.TITLE')">
            <h2 class="title has-text-centered">{{ $t('ADMIN.UPLOADER.TITLE_AND_TAGS.TITLE') }}</h2>
            <b-message type="is-danger" has-icon v-if="errors.preview">
                {{ errors.preview }}
            </b-message>

            <div class="columns">
                <div class="column">
                    <h3>{{ $t('ADMIN.UPLOADER.TITLE_AND_TAGS.LABEL_TITLE') }}</h3>
                    <label-picker v-model="image.label" />
                </div>
                <div class="column">
                    <h3>{{ $t('ADMIN.UPLOADER.TITLE_AND_TAGS.LABEL_CATEGORIES') }}</h3>
                    <b-field :label="$t('ADMIN.UPLOADER.TITLE_AND_TAGS.CATEGORIES_BUTTON')">
                        <b-select multiple native-size="8" v-model="tags">
                            <option v-for="(_, tag) in store.tags" :key="tag" :value="tag">{{ store.tagTranslation(tag,
                                $i18n.locale) }}</option>
                        </b-select>
                    </b-field>
                    <b-button @click="createTag">{{ $t('ADMIN.BUTTONS.CREATE_TAG') }}</b-button>
                </div>

                <div class="column" v-if="rawImage.image">
                    <div>
                        <b-loading :active="loading.preview" :is-full-page="false" class="primary-loading"></b-loading>
                        <img :src="previewUrl" />
                    </div>
                    <div>
                        <b-loading :active="loading.thumbnail" :is-full-page="false"
                            class="primary-loading"></b-loading>
                        <img :src="thumbnailUrl" />
                    </div>
                    {{ $t('ADMIN.UPLOADER.IMAGE_DIMENSIONS_DESCRIPTION', imageDimensions) }}
                    <b-button @click="saveLocally" type="is-primary" :disabled="this.isBroken">{{
                        $t('ADMIN.UPLOADER.SUBMIT_BUTTON') }}</b-button>
                </div>
            </div>
        </b-step-item>
    </b-steps>
</template>

<script>
import BeforeAfterImage from '@/backtivisda/components/beforeafterimage';
import LabelPicker from '@/backtivisda/components/labelpicker';

import { extractColors, extractDimensions, svgToDom, loadSvg, compressImage, generateId } from 'aktivisda-library';
import SvgColorPicker from '@/components/pickers/SvgColorPicker';

import ModalTags from '@/backtivisda/components/modaltags.vue';

function undefinedImage() {
    const store = useStore();
    return {
        id: generateId(),
        type: undefined,
        creation_date: new Date().toISOString().slice(0, 19),
        tags: '',
        hitform: undefined,
        backgroundHull: undefined,
        colors: undefined,
        changed: true,
        label: Object.assign({}, ...store.langs.map((lang) => ({ [lang.code]: undefined }))),
    };
}
function undefinedRawImage() {
    return {
        url: undefined,
        type: undefined,
        posterizedUrl: undefined,
        file: undefined,
        svgString: undefined,
        previewBlob: undefined,
        thumbnailBlob: undefined,
        width: undefined,
        height: undefined,
    };
}

export default {
    name: 'symbol-uploader',
    components: { BeforeAfterImage, SvgColorPicker, LabelPicker },
    props: {
        skipHitform: Boolean,
    },
    data: () => {
        return {
            activeStep: 0,
            rawImage: undefinedRawImage(),
            options: {
                whiteIsAlpha: true,
                nbExpectedColors: 1,
            },
            loading: {
                posterize: false,
                vectorize: false,
                canonize: false,
                hitform: false,
                backgroundHull: false,
                preview: false,
                thumbnail: false,
                compress: false,
            },
            errors: {
                posterize: undefined,
                vectorize: undefined,
                canonize: undefined,
                hitform: undefined,
                backgroundHull: undefined,
            },
            image: undefinedImage(),
            credentialsStore: useCredentialsStore(),
        };
    },
    computed: {
        isPhoto() {
            // todo remove ?
            return this.image.type === 'internalphoto';
        },
        svgWeight() {
            if (!this.rawImage.svgString) return 0;
            return this.rawImage.svgString.length;
        },
        isUploaded() {
            return !this.rawImage.url;
        },
        isPosterized() {
            return !this.loading.posterize && !this.errors.posterize;
        },
        isVectorized() {
            return !this.loading.vectorize && !this.errors.vectorize & (this.rawImage.svgString != undefined);
        },
        imageDimensions() {
            if (this.rawImage.svgString) {
                return extractDimensions(this.rawImage.svgString);
            } else {
                // Todo. error if rawImage.image not loaded
                return { width: this.rawImage.width, height: this.rawImage.height };
            }
            // Dimensions does not change between coloredSvgString and svgString
        },
        hitformUrl() {
            if (!this.isVectorized || !this.image.hitform) return;
            const symbolDom = svgToDom(this.rawImage.svgString);

            const path = document.createElement('path');
            path.setAttribute('d', this.image.hitform);
            path.setAttribute(
                'style',
                'fill:#ffff00;stroke:#000000;stroke-width:0.75px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;fill-opacity:1;opacity:0.29881376',
            );
            symbolDom.getElementsByTagName('svg')[0].appendChild(path);

            const container = document.createElement('div');
            container.appendChild(symbolDom.rootElement);
            const blob = new Blob([container.innerHTML], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            return url;
        },
        backgroundHullUrl() {
            if (!this.isVectorized || !this.image.backgroundHull) return;
            const symbolDom = svgToDom(this.rawImage.svgString);

            const path = document.createElement('path');
            path.setAttribute('d', this.image.backgroundHull);
            path.setAttribute(
                'style',
                'fill:#0000ff;stroke:#000000;stroke-width:0.75px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;fill-opacity:1;opacity:0.29881376',
            );
            symbolDom.getElementsByTagName('svg')[0].appendChild(path);

            const container = document.createElement('div');
            container.appendChild(symbolDom.rootElement);
            const blob = new Blob([container.innerHTML], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            return url;
        },
        previewUrl() {
            if (!this.rawImage.previewBlob) return;
            return URL.createObjectURL(this.rawImage.previewBlob);
        },
        thumbnailUrl() {
            if (!this.rawImage.thumbnailBlob) return;
            return URL.createObjectURL(this.rawImage.thumbnailBlob);
        },
        previewFile() {
            if (!this.rawImage.previewBlob) return;
            return new File([this.rawImage.previewBlob], `previews/${this.image.id}.png`);
        },
        thumbnailFile() {
            if (!this.rawImage.thumbnailBlob) return;
            return new File([this.rawImage.thumbnailBlob], `thumbnails/${this.image.id}.png`);
        },
        imageFile() {
            if (this.rawImage.svgString) {
                return new File([new Blob([this.rawImage.svgString], { type: 'image/svg+xml' })], this.imageFilename);
            } else {
                return new File([new Blob([this.rawImage.file], { type: this.rawImage.type })], this.imageFilename);
            }
        },
        imageFilename() {
            if (this.rawImage.svgString) {
                return `${this.image.id}.svg`;
            } else {
                return `${this.image.id}.${this.extension(this.rawImage.type)}`;
            }
        },
        tags: {
            get() {
                if (this.image.tags === '') return [];
                return this.image.tags.split(',');
            },
            set(newValue) {
                this.image.tags = newValue.join(',');
            },
        },
        isBroken() {
            for (const key in this.errors) {
                if (this.errors[key]) return true;
            }
            return false;
        },
    },
    methods: {
        createTag() {
            this.$buefy.modal.open({
                parent: this,
                component: ModalTags,
                hasModalCard: true,
                trapFocus: true,
                events: {
                    close: (tag) => {
                        this.tags = this.tags.concat(tag)
                    }
                },
            });
        },
        extension(mimeType) {
            switch (mimeType) {
                case 'image/jpeg':
                case 'image/jpg':
                    return 'jpg';
                case 'image/png':
                    return 'png';
                case 'image/svg+xml':
                    return 'svg';
                default:
                    this.raiseError(this.$t('COMMON.NOT_IMPLEMENTED_ERROR'));
                    return '';
            }
        },
        raiseError(error) {
            alert(error);
        },
        imageUploaded(image) {
            this.loading.compress = true;
            const reader = new FileReader();
            reader.onload = () => {
                this.rawImage.url = reader.result;
                this.rawImage.type = image.type;
                this.rawImage.file = image;
                this.rawImage.image = new Image();
                this.rawImage.image.onload = () => {
                    this.rawImage.width = this.rawImage.image.width;
                    this.rawImage.height = this.rawImage.image.height;
                };
                this.rawImage.image.src = this.rawImage.url;

                if (this.rawImage.type === 'image/svg+xml') {
                    this.image.type = 'internalsvg';
                    loadSvg(this.rawImage.url, { prepareColors: false }).then((svgString) => {
                        this.canonize(svgString).then(() => {
                            this.loading.canonize = false;
                        })
                    });
                    // TODO compress png images?
                } else if (this.rawImage.type === 'image/jpg' || this.rawImage.type === 'image/jpeg' || this.rawImage.type === 'image/png') {
                    this.errors.compression = undefined;
                    this.image.type = 'internalphoto';

                    this.rawImage.width = this.rawImage.image.width;
                    this.rawImage.height = this.rawImage.image.height;
                    compressImage(reader.result, this.rawImage.type, 75)
                    .then((r) => {
                        const compressedImage = r['resultData'];
                        const compressedBlob = new Blob([compressedImage], { type: this.rawImage.type });
                        const base64Reader = new FileReader();
                        base64Reader.readAsDataURL(compressedBlob);
                        base64Reader.onloadend = () => {
                            this.loading.compress = false;
                            const base64Data = base64Reader.result;
                            this.rawImage.url = base64Data;
                            this.rawImage.file = new File([compressedBlob], image.name, { type: this.rawImage.type });
                        };
                    })
                    .catch((err) => {
                        this.errors.compression = this.$t('ADMIN.UPLOADER.ERRORS.COMPRESSION_FAILED', { err });
                        console.error(this.errors.compression);
                    });
                }
            };

            reader.readAsDataURL(image);
        },
        posterize() {
            if (this.loading.posterize) return new Promise((resolve) => resolve());
            console.assert(this.rawImage.type === 'image/png');
            this.loading.posterize = true;
            this.errors.posterize = undefined;
            this.rawImage.svgString = undefined;

            const data = new FormData();
            data.append('image', this.rawImage.file);

            return new Promise((resolve, reject) => {
                this.credentialsStore
                .post(`/posterize?nb_colors=${this.options.nbExpectedColors}&white_is_alpha=${this.options.whiteIsAlpha}`, data)
                .then((response) => response.blob())
                .then((imageBlob) => {
                    this.rawImage.posterizedUrl = URL.createObjectURL(imageBlob);
                    this.loading.posterize = false;
                    resolve();
                })
                .catch((error) => {
                    this.loading.posterize = false;
                    this.errors.posterize = error;
                    reject();
                });
            })
        },
        vectorize(nbColors) {
            this.loading.vectorize = true;
            const data = new FormData();
            data.append('image', this.rawImage.file);

            this.credentialsStore
                .post(`/vectorize?nb_colors=${nbColors}&white_is_alpha=${this.options.whiteIsAlpha}`, data)
                .then((response) => response.blob())
                .then((imageBlob) => {
                    imageBlob.text().then((svgString) => {
                        this.image.type = 'internalsvg';
                        this.rawImage.svgString = svgString;
                        const uniqueColors = extractColors(svgString);
                        this.image.colors = {};
                        for (let color of uniqueColors) {
                            this.image.colors[color] = color;
                        }
                        this.loading.vectorize = false;
                    });
                    // this.posterizedUrl = URL.createObjectURL(imageBlob);
                })
                .catch((error) => {
                    this.loading.vectorize = false;
                    this.errors.vectorize = error;
                });
        },
        // Only if already an svg string
        canonize(svgString) {
            this.loading.canonize = true;
            const data = new FormData();
            data.append('image', new File([new Blob([svgString], { type: 'image/svg+xml' })], 'myfile.svg'));

            return new Promise((resolve) => {
                this.credentialsStore
                .post('/canonize', data)
                .then((response) => {
                    return response.blob();
                })
                .then((imageBlob) => {
                    imageBlob.text().then((canonizedSvgString) => {
                        this.rawImage.svgString = canonizedSvgString;
                        const uniqueColors = extractColors(canonizedSvgString);
                        this.image.colors = {};
                        for (let color of uniqueColors) {
                            this.image.colors[color] = color;
                        }
                        resolve();
                    });
                })
                .catch((error) => {
                    console.error('error')
                    this.loading.canonize = false;
                    this.errors.canonize = error;
                });
            });
        },
        computeHitform() {
            if (this.skipHitform) return;

            this.loading.hitform = true;
            const data = new FormData();
            data.append('image', new File([new Blob([this.rawImage.svgString], { type: 'image/svg+xml' })], 'myfile.svg'));

            this.credentialsStore
                .post('/hitform', data)
                .then((response) => {
                    return response.json();
                })
                .then((hitform) => {
                    this.loading.hitform = false;
                    this.image.hitform = hitform['hitpath'];
                    this.computeHull();
                })
                .catch((error) => {
                    this.loading.hitform = false;
                    this.errors.hitform = error;
                });
        },
        computeHull() {
            if (this.skipHitform) return;

            if (!this.image.hitform) {
                console.warn('No hitfom available. Impossility to compute hull');
                return;
            }
            this.loading.backgroundHull = true;
            const style =
                'fill:#000000;stroke:#000000;stroke-width:0.75px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1;fill-opacity:1;opacity:1';

            const hitpathSvgString = `<svg><path d="${this.image.hitform}" style="${style}"/></svg>`;
            const data = new FormData();
            data.append('image', new File([new Blob([hitpathSvgString], { type: 'image/svg+xml' })], 'myfile.svg'));

            this.credentialsStore
                .post('/hull', data)
                .then((response) => {
                    return response.json();
                })
                .then((hull) => {
                    this.loading.backgroundHull = false;
                    this.image.backgroundHull = hull['hull'];
                })
                .catch((error) => {
                    this.loading.backgroundHull = false;
                    this.errors.backgroundHull = error;
                });
        },
        computePreview() {
            if (!this.imageFile) {
                console.warn('compute preview is impossible. No image file');
                return;
            }

            this.loading.preview = true;

            const data = new FormData();
            data.append('image', this.imageFile);

            this.credentialsStore
                .post('/preview', data)
                .then((response) => {
                        return response.blob();
                    })
                    .then((imageBlob) => {
                        this.rawImage.previewBlob = imageBlob;
                        this.loading.preview = false;
                        this.computeThumbnail();
                    })
                    .catch((error) => {
                        this.loading.preview = false;
                        this.errors.preview = this.$t('ADMIN.UPLOADER.ERRORS.PREVIEW_FAILED', { err: error });
                });
        },
        computeThumbnail() {
            if (!this.imageFile) {
                console.warn('compute preview is impossible. No image file');
                return;
            }
            this.loading.thumbnail = true;

            const data = new FormData();
            data.append('image', new File([this.rawImage.previewBlob], `${this.image.id}.png`));

            this.credentialsStore
                .post('/thumbnail', data)
                .then((response) => response.blob())
                .then((imageBlob) => {
                    this.rawImage.thumbnailBlob = imageBlob;
                    this.loading.thumbnail = false;
                })
                .catch((error) => {
                    this.loading.thumbnail = false;
                    this.errors.thumbnail = error;
                });
        },
        saveLocally() {
            this.$emit('new-image', {
                data: {
                    width: this.imageDimensions.width,
                    height: this.imageDimensions.height,
                    filename: this.imageFilename,
                    preview: 'previews/' + this.image.id + '.png',
                    thumbnail: 'thumbnails/' + this.image.id + '.webp',
                    ...this.image,
                },
                image: this.imageFile,
                preview: this.previewFile,
                thumbnail: this.thumbnailFile,
            });
            this.image = undefinedImage();
            this.rawImage = undefinedRawImage();
            this.activeStep = 0;
        },
    },
};
</script>
