<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchFormats();
</script>

<template>
    <div class="input-components">
        <h3>{{ $t('EDIT.COMPONENTS.DOCUMENT') }}</h3>

        <rule-picker v-if="!inTranslationMode && valid" :value="rule('self')" labelI18nKey="DOCSELF"
            @input="(r) => $emit('update', { rules: { self: r } }) " />

        <rule-picker v-if="!inTranslationMode" :value="rule('components.properties.qrcode')"
            labelI18nKey="COMPQRCODE"
            @input="(r) => $emit('update', { rules: { components: { properties: { qrcode: r }}}}) "
            :number="false" />
        <rule-picker v-if="!inTranslationMode" :value="rule('components.properties.image')" labelI18nKey="COMPIMAGE"
            @input="(r) => $emit('update', { rules: { components: { properties: { image: r }}}}) "
            :number="false" />
        <rule-picker v-if="!inTranslationMode" :value="rule('components.properties.text')" labelI18nKey="COMPTEXT"
            @input="(r) => $emit('update', { rules: { components: { properties: { text: r }}}}) " :number="false" />

        <template v-if="valid && !rule('self').fixed">
            <picker-container :label="$t('COMMON.SIZE')">
                <template v-if="!inTranslationMode" v-slot:pickers>
                    <div class="is-flex is-justify-text-content-center is-align-items-center">
                        <div style="width: 100%">
                            <div>
                                <rule-picker v-if="!inTranslationMode" :value="rule('width')"
                                    labelI18nKey="DOCWIDTH"
                                    @input="(r) => $emit('update', { rules: { width: r } })" />
                                <rule-picker v-if="!inTranslationMode" :value="rule('height')"
                                    labelI18nKey="DOCHEIGHT"
                                    @input="(r) => $emit('update', { rules: { height: r } })" />
                            </div>
                            <b-numberinput v-if="!rule('width').fixed" v-model="widthValue"
                                :min="1"></b-numberinput>
                            <div style="margin: 12px; width: 100%; height: 1px"></div>
                            <b-numberinput v-if="!rule('height').fixed" v-model="heightValue"
                                :min="1"></b-numberinput>
                        </div>
                        <div v-if="!rule('width').fixed && !rule('height').fixed"
                            style="margin-top: 30px; margin-left: 20px">
                            <b-button @click="changeOrientation" icon-left="swap-vertical" type="is-primary"
                                size="is-big"></b-button>
                        </div>
                    </div>
                    <div v-if="!rule('width').fixed && !rule('height').fixed">
                        <b-button style="margin: 5px" @click="selectFormat" type="is-primary" icon-left="magnify"
                            outlined>
                            {{ $t('FORMATS.PREDEFINED_FORMATS_BUTTON') }}</b-button>
                        <b-tooltip :label="$t('EDIT.TIPS.RESTORE')">
                            <b-button style="margin: 5px" @click="resetFormat" icon-left="restore"
                                outlined></b-button>
                        </b-tooltip>
                        <b-tooltip :label="$t('BACKGROUND_IMAGES.FIT_DOCUMENT_SIZE')" position="is-left">
                            <b-button id="fit-to-background-button" style="margin: 5px" @click="fitDocumentSize"
                                icon-left="arrow-expand-all" outlined></b-button>
                        </b-tooltip>
                    </div>
                </template>
            </picker-container>

            <picker-container :rule="rule('background')" :label="$t('COMMON.IMAGE')">
                <template v-if="!inTranslationMode" v-slot:enabled-switch>
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('background')"
                        @input="(r) => $emit('update', { rules: { background: r } }) " :number="false" />
                </template>

                <template v-if="!inTranslationMode" v-slot:pickers>
                    <symbol-picker v-model="backgroundValue" :symbolPicker="false" :documentWidth="document.width"
                        :documentHeight="document.height" :mask="true" />
                </template>
            </picker-container>
        </template>
    </div>
</template>

<script>
import SymbolPicker from '@/components/pickers/SymbolPicker.vue';
import FormatPicker from '@/components/pickers/FormatPicker.vue';
import PickerContainer from '@/components/pickers/PickerContainer.vue';
import RulePicker from '@/components/pickers/RulePicker.vue';

import _get from 'lodash.get'

export default {
    name: 'document-input-component',
    components: { SymbolPicker, PickerContainer, RulePicker },
    props: {
        document: {
            format: { type: String, default: 'CANVAS_FORMAT_CUSTOM' },
            resolution: { type: Number, default: 1 },
            background: {},
            width: { type: Number, default: 10 },
            height: { type: Number, default: 10 },
            i18n: {
                defaultLocale: { type: String, default: 'fr' },
                editingLocale: undefined,
                displayedLocale: undefined,
            }
        },
        translationLang: Object
    },
    computed: {
        valid: function () {
            return (
                this.document &&
                this.document.width &&
                this.document.height &&
                this.document.background
            );
        },
        formatValue: {
            // Possibly undefined
            get: function () {
                return this.document.format;
            },
            set: function (newValue) {
                const store = useStore();
                const { width, height, resolution } = store.formats.find((f) => f.id === newValue);

                this.$emit('update', { resolution, width: width, height: height, format: newValue });
            },
        },
        widthValue: {
            get: function () {
                return this.document.width;
            },
            set: function (newValue) {
                this.$emit('update', { width: newValue });
            },
        },
        heightValue: {
            get: function () {
                return this.document.height;
            },
            set: function (newValue) {
                this.$emit('update', { height: newValue });
            },
        },
        backgroundValue: {
            get: function () {
                return this.document.background;
            },
            set: function (newValue) {
                this.$emit('update', { background: newValue });
            },
        },
        resolutionValue: {
            // TODO unused. L'utiliser.
            get: function () {
                return this.document.resolution;
            },
            set: function (newValue) {
                this.$emit('update', { resolution: newValue });
            },
        },
        isCustomFormat: function () {
            return this.document.format === 'CANVAS_FORMAT_CUSTOM';
        },
        rule: function () {
            return (key) => { let r = _get(this.document.rules, key); return r === undefined ? {} : r };
        },
        inTranslationMode: function () {
            return this.document.i18n.editingLocale !== undefined && this.document.i18n.editingLocale !== null;
        },
    },
    methods: {
        changeOrientation() {
            this.$emit('update', { height: this.document.width, width: this.document.height });
        },
        fitDocumentSize() {
            if (!this.document.background || this.document.background.width === undefined || this.document.background.height === undefined) {
                console.error('Background dimensions are undefined. Todo error handling.');
                return;
            }
            const backgroundWidth = this.document.background.width;
            const backgroundHeight = this.document.background.height;
            const ratio = backgroundWidth / backgroundHeight;
            const width = Math.round(this.document.width > this.document.height ? this.document.width : ratio * this.document.height);
            const height = Math.round(this.document.width > this.document.height ? this.document.width / ratio : this.document.height);

            this.$emit('update', { format: 'CANVAS_FORMAT_CUSTOM', height, width });
        },
        selectFormat() {
            this.$buefy.modal.open({
                parent: this,
                component: FormatPicker,
                hasModalCard: true,
                trapFocus: true,
                props: {},
                events: {
                    input: (value) => (this.formatValue = value),
                },
                canCancel: ['escape', 'outside'],
            });
        },
        resetFormat() {
            const format = this.formatValue;
            const store = useStore();
            const { width, height, resolution } = store.formats.find((f) => f.id === format);
            this.$emit('update', { resolution, width: width, height: height });
        },
    },
};
</script>
