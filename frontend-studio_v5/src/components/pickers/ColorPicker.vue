<script setup>
import ResetPicker from '@/components/pickers/ResetPicker.vue';

import { useStore } from '@datastore';
const store = useStore();

store.fetchColors();
</script>

<template>
    <div style="flex-grow: 1">
        <reset-picker v-if="resettable" :defaultValue="store.randomElement('colors').html" v-model="inputValue" />
        <template v-if="inputValue !== undefined">
            <b-modal v-model="openedModal" :width="640" scroll="keep" has-modal-card>
                <div class="modal-card">
                    <header class="modal-card-head">
                        <div class="modal-card-title capitalize">
                            {{ $tc('COLORS.LABEL', 1) }}
                        </div>
                        <button class="delete" aria-label="close" @click="openedModal = false" />
                    </header>
                    <div class="modal-card-body">
                        <div class="content">
                            <div class="container">
                                <div class="row">
                                    <div :class="{ thumb: true, white: c.html === '#ffffff' }" v-for="c in store.colors"
                                        :key="c.name" :title="c.name" :style="{ backgroundColor: c.html }"
                                        @click="update(c)" />
                                </div>

                                <div class="row" style="margin-top: 20px">
                                    <div>
                                        <div class="overview" :style="style"></div>

                                        <b-field>
                                            <b-input type="text" required v-model="inputValue"
                                                :validation-message="$t('COLORS.ERRORS.NOT_VALID_HTML')"
                                                pattern="^#[0-9A-Fa-f]{6}|()$">
                                            </b-input>
                                        </b-field>
                                    </div>
                                    <div v-if="rgb" class="container" style="flex-grow: 1; padding: 0 20px">
                                        <b-slider type="is-red" key="slider-red" :min="0" :max="255" v-model="r"
                                            :custom-formatter="(val) => $t('COLORS.RED') + ' ' + val">
                                        </b-slider>
                                        <b-slider type="is-blue" key="slider-blue" :min="0" :max="255" v-model="b"
                                            :custom-formatter="(val) => $t('COLORS.BLUE') + ' ' + val">
                                        </b-slider>
                                        <b-slider type="is-green" key="slider-green" :min="0" :max="255" v-model="g"
                                            :custom-formatter="(val) => $t('COLORS.GREEN') + ' ' + val">
                                        </b-slider>
                                    </div>
                                </div>
                            </div>
                            <div class="row is-justify-content-center toolbar">
                                <b-tooltip :label="$t('EDIT.TIPS.RANDOM_SELECTION')">
                                    <b-button id="random-color-modal-button" @click="randomColor" icon size="is-medium"
                                        icon-left="dice-multiple"></b-button>
                                </b-tooltip>
                                <b-tooltip :label="$t('COLORS.TIPS.DROP_COLOR')" v-if="dropColorEnabled">
                                    <b-button @click="initDropColor" icon size="is-medium"
                                        icon-left="eyedropper"></b-button>
                                </b-tooltip>
                                <b-tooltip :label="$t('COLORS.TIPS.LIGHTEN')">
                                    <b-button @click="lighten" icon size="is-medium"
                                        icon-left="brightness-5"></b-button>
                                </b-tooltip>
                                <b-tooltip :label="$t('COLORS.TIPS.DARKEN')">
                                    <b-button @click="darken" icon size="is-medium" icon-left="brightness-7"></b-button>
                                </b-tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </b-modal>

            <div class="row" style="width: 100%">
                <div class="overview" :style="style" @click="openModalIfEnabled" :class="{ disabled: disabled }"></div>
                <div>
                    <b-tooltip v-if="randomShortcut" :label="$t('EDIT.TIPS.RANDOM_SELECTION')"
                        style="padding: 0px 10px">
                        <b-button id="random-color-button" @click="randomColor()" icon icon-left="dice-multiple"
                            :disabled="disabled"></b-button>
                    </b-tooltip>
                </div>
            </div>

            <div v-show="eyeDropMode" class="eye-drop-preview-wrapper">
                <div class="eye-drop-preview"
                    :style="'background-color:' + previewDropColor.color + ';top:' + previewDropColor.y + 'px;left:' + previewDropColor.x + 'px'">
                </div>
            </div>
        </template>
    </div>
</template>

<script>
import { HEX2RGB, grayScale } from '@/plugins/utils.js';
import { pSBC} from 'aktivisda-library';

export const toHex = (v) => ('0' + v.toString(16)).slice(-2);
const toRGB = (r, g, b) => ['#', toHex(r), toHex(g), toHex(b)].join('');

export default {
    name: 'color-picker',
    props: {
        value: {
            type: undefined,
            // default: '#ffc11e'
            // validator: (value) => undefined || /^#[0-9A-Fa-f]{6}$/.test(value),
        },
        randomShortcut: {
            type: Boolean,
            default: true,
        },
        dropColorEnabled: { type: Boolean, default: false },
        disabled: { type: Boolean, default: false },
        resettable: { type: Boolean, default: false },
    },
    data() {
        return {
            openedModal: false,
            copyValue: this.value,
            previewDropColor: {
                color: '#FFFFFF',
                x: 0,
                y: 0,
            },
            eyeDropMode: false,
        };
    },
    computed: {
        r: {
            set: function (r) {
                if (r === this.rgb.r) return;
                this.rgb = { r, g: this.rgb.g, b: this.rgb.b };
                this.$emit('input', toRGB(r, this.rgb.g, this.rgb.b));
            },
            get: function () {
                return this.rgb.r;
            },
        },
        g: {
            set: function (g) {
                if (g === this.rgb.g) return;
                this.rgb = { g, r: this.rgb.r, b: this.rgb.b };
                this.$emit('input', toRGB(this.rgb.r, g, this.rgb.b));
            },
            get: function () {
                return this.rgb.g;
            },
        },
        b: {
            set: function (b) {
                if (b === this.rgb.b) return;
                this.rgb = { b, r: this.rgb.r, g: this.rgb.g };
                this.$emit('input', toRGB(this.rgb.r, this.rgb.g, b));
            },
            get: function () {
                return this.rgb.b;
            },
        },
        rgb: {
            set: function ({ r, g, b }) {
                const newValue = toRGB(r, g, b);
                if (newValue === this.copyValue) return;
                this.copyValue = newValue;
                this.$emit('input', this.copyValue);
            },
            get: function () {
                return {
                    r: parseInt(this.copyValue.slice(1, 3), 16),
                    g: parseInt(this.copyValue.slice(3, 5), 16),
                    b: parseInt(this.copyValue.slice(5, 7), 16),
                };
            },
        },
        style() {
            if (!this.disabled) {
                return { 'background-color': this.copyValue };
            }
            let gray = grayScale(this.rgb.r, this.rgb.g, this.rgb.b);
            if (gray <= 128) {
                gray = (gray + 30) * 1.3;
            } else {
                gray = (gray - 30) * 0.7;
            }
            const grayStr = `rgb(${gray}, ${gray}, ${gray})`;
            return {
                background: `repeating-linear-gradient( 45deg, ${this.copyValue}, ${this.copyValue} 10px, ${grayStr} 10px, ${grayStr} 20px )`,
            };
        },
        inputValue: {
            set: function (newValue) {
                if (newValue === null) {
                    this.copyValue = undefined;
                    this.$emit('input', null);
                    return;
                }
                if (!/^#[0-9A-Fa-f]{6}$/.test(newValue)) return;
                this.copyValue = newValue;
                this.$emit('input', newValue);
            },
            get: function () {
                return this.copyValue;
            },
        },
    },
    methods: {
        update({ html }) {
            this.rgb = HEX2RGB(html);
        },
        randomColor() {
            const randomHtmlColor = useStore().randomElement('colors').html;
            this.rgb = HEX2RGB(randomHtmlColor);
        },
        readDropColor(evt) {
            let x = 0;
            let y = 0;
            let canvas = document.getElementById('whiteboard').getElementsByTagName('canvas')[0];
            let o = canvas;
            while (o.offsetParent) {
                x += o.offsetLeft;
                y += o.offsetTop;
                o = o.offsetParent;
            }
            x = evt.pageX - x; // 36 = border width
            y = evt.pageY - y; // 36 = border width
            const imagesdata = canvas.getContext('2d').getImageData(x, y, 1, 1);
            let newColor = [imagesdata.data[0], imagesdata.data[1], imagesdata.data[2]];
            return { r: newColor[0], g: newColor[1], b: newColor[2] };
        },
        displayDropColor(evt) {
            const { r, g, b } = this.readDropColor(evt);
            this.previewDropColor.color = toRGB(r, g, b);
            this.previewDropColor.x = evt.x;
            this.previewDropColor.y = evt.y;
        },
        dropColor(evt) {
            this.rgb = this.readDropColor(evt);
            document.removeEventListener('click', this.dropColor);
            document.removeEventListener('mousemove', this.displayDropColor);
            document.body.style.cursor = 'unset';
            this.openedModal = true;
            this.eyeDropMode = false;
        },
        initDropColor(evt) {
            evt.stopPropagation();
            document.body.style.cursor = 'pointer';
            this.openedModal = false;
            this.eyeDropMode = true;
            document.addEventListener('click', this.dropColor);
            document.addEventListener('mousemove', this.displayDropColor);
        },
        darken() {
            this.copyValue = pSBC(-0.05, this.copyValue);
            this.$emit('input', this.copyValue);
        },
        lighten() {
            this.copyValue = pSBC(0.05, this.copyValue);
            this.$emit('input', this.copyValue);
        },
        openModalIfEnabled() {
            if (this.disabled) return;
            this.openedModal = true;
        },
    },
    mounted() {},
    unmounted() {},
    watch: {
        value: {
            immediate: true,
            handler(newValue) {
                this.copyValue = newValue;
            },
        },
    },
};
</script>

<style scoped>
.thumb {
    cursor: pointer;
    height: 40px;
    width: 40px;
    margin: 3px;
    border-radius: 20%;
}

.thumb.white {
    border: 1px solid #aaa;
}

.thumb:hover {
    transform: scale(1.05);
    box-shadow: 0px 3px 10px -5px rgba(19, 19, 19, 0.3);
}

.overview {
    flex-grow: 1;
    height: 35px;
    border: 1px solid #aaa;
    cursor: pointer;
}

.eye-drop-preview-wrapper {
    width: 100vw;
    height: 100vw;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 50;
}

.eye-drop-preview {
    width: 30px;
    height: 30px;
    border: 1px solid gray;
    position: absolute;
    top: 100px;
    left: 300px;
}

.row.toolbar span {
    padding: 0px 10px;
}
</style>
