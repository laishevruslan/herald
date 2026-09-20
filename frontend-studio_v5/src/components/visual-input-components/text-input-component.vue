<template>
    <div class="input-components">
        <template v-if="!isUndefined">
            <component-toolbar :componentId="componentId"
                @remove="removeComponent" @forward="++zIndexValue"
                @backward="--zIndexValue" @duplicate="$emit('duplicate')" @undo="$emit('undo')" @redo="$emit('redo')"
                :forwardEnabled="options.zIndex < nbComponents" :backwardEnabled="options.zIndex > 1"
                v-if="!inTranslationMode" :zIndexRule="rule('zIndex')" :presenceRule="rule('presence')"
                :unicityRule="rule('unicity')" />

            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="SELF" :value="rule('self')"
                @input="(r) => $emit('update', { rules: { self: r } }) " :number="false" />
            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="ZINDEX" :value="rule('zIndex')"
                @input="(r) => $emit('update', { rules: { zIndex: r } }) " :number="false" />
            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="UNICITY"
                :value="rule('unicity')" @input="(r) => $emit('update', { rules: { unicity: r } }) " :number="false" />
            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="PRESENCE"
                :value="rule('presence')" @input="(r) => $emit('update', { rules: { presence: r } }) "
                :number="false" />

            <picker-container :label="$t('COMMON.TEXT')"
                v-if="$isBacktivisda || !rule('font').fixed || !rule('justification').fixed || !rule('text').fixed">
                <template v-slot:enabled-switch>
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" labelI18nKey="FONT"
                        :value="rule('font')" @input="(r) => $emit('update', { rules: { font: r } })" :number="false" />
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" labelI18nKey="TEXT"
                        :value="rule('text')" @input="(r) => $emit('update', { rules: { text: r } })" :number="false" />
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" labelI18nKey="JUSTIFICATION"
                        :value="rule('justification')" @input="(r) => $emit('update', { rules: { justification: r } })"
                        :number="false" />
                </template>
                <template v-slot:pickers>
                    <font-picker v-if="!inTranslationMode" :value="optionValue('font')"
                        @input="(e) => emitValue('font')(e) " :rule="rule('font')" />

                    <b-field v-if="!inTranslationMode && $isBacktivisda">
                        <b-radio-button icon :value="optionValue('type')" native-value="text"
                            @input="(e) => emitValue('type')(e)">
                            <b-icon icon="format-list-bulleted"></b-icon>
                        </b-radio-button>
                        <b-radio-button icon :value="optionValue('type')" native-value="textchoice"
                            @input="(e) => emitValue('type')(e)">
                            <b-icon icon="text"></b-icon>
                        </b-radio-button>
                        <b-button v-if="applicableValue('type') === 'textchoice'" @click="openChoiceListEditor">
                            <b-icon icon="pencil"/>
                        </b-button>
                    </b-field>


                    <text-picker :rule="rule('text')" :value="optionValue('text')" :type="applicableValue('type')"
                        :choices="applicableValue('textChoices')"
                        @input="(e) => emitValue('text')(e)"
                        :resettable="inTranslationMode" :key="`text-picker-${rerenderTextPicker}`"/>

                    <div v-if="!rule('justification').fixed && !inTranslationMode"
                        class="row is-justify-content-center">
                        <b-field>
                            <b-radio-button v-model="justificationIndex" :native-value="0" type="is-outlined is-primary">
                                <b-icon icon="format-align-left"></b-icon>
                            </b-radio-button>
                            <b-radio-button v-model="justificationIndex" :native-value="1" type="is-outlined is-primary">
                                <b-icon icon="format-align-center"></b-icon>
                            </b-radio-button>
                            <b-radio-button v-model="justificationIndex" :native-value="2" type="is-outlined is-primary">
                                <b-icon icon="format-align-right"></b-icon>
                            </b-radio-button>
                        </b-field>
                    </div>
                </template>
            </picker-container>

            <picker-container :label="$t('COMMON.SIZE')" :rule="rule('size')">
                <template v-slot:enabled-switch>
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('size')"
                        @input="(r) => $emit('update', { rules: { size: r } })" :number="true" />
                </template>
                <template v-slot:pickers>
                    <number-picker :min="0" :max="Math.max((optionValue('size')  || 0), Math.max(width, height) / 2)"
                        :value="optionValue('size')" @input="(e) => emitValue('size')(e)" unit="px" :rule="rule('size')"
                        :prepend="$t('COMMON.SMALL')" :append="$t('COMMON.BIG')" :resettable="inTranslationMode" />
                </template>
            </picker-container>

            <position-picker :width="width" :height="height" :resettable="inTranslationMode"
                :value="optionValue('position') " @input="(e) => emitValue('position')(e)" :rule="rule('position')"
                @updateRule="(r) => $emit('update', { rules: { position: r }})" />

            <picker-container :label="$t('COMMON.COLOR')" :rule="rule('color')">
                <template v-slot:enabled-switch>
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('color')"
                        @input="(r) => $emit('update', { rules: { color: r } }) " :number="false" />
                </template>
                <template v-slot:pickers>
                    <color-picker v-if="!rule('color').fixed" :value="optionValue('color')"
                        @input="(e) => emitValue('color')(e) " :dropColorEnabled="true"
                        :resettable="inTranslationMode" />
                </template>
            </picker-container>

            <picker-container :label="$t('TEXTS.SHADOW')" :open="shadowEnabledValue" :rule="rule('shadow')">
                <template v-slot:enabled-switch>
                    <b-field style="display: inline-block">
                        <b-switch v-model="shadowEnabledValue" v-if="!inTranslationMode"></b-switch>
                    </b-field>
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('shadow')"
                        @input="(r) => $emit('update', { rules: { shadow: r } }) " :number="false" />
                </template>
                <template v-slot:pickers>
                    <template v-if="!rule('shadow').fixed && !inTranslationMode">
                        <color-picker :disabled="!shadowEnabled_" v-model="shadowColorValue" :dropColorEnabled="true" />
                        <number-picker :min="-optionValue('size')" :max="optionValue('size')"
                            v-model="shadowOffsetXValue" unit="" :disabled="!shadowEnabled_"
                            :prepend="$t('COMMON.LEFT')" :append="$t('COMMON.RIGHT')" />

                        <number-picker :min="-optionValue('size')" :max="optionValue('size')"
                            v-model="shadowOffsetYValue" unit="" :disabled="!shadowEnabled_" :prepend="$t('COMMON.TOP')"
                            :append="$t('COMMON.BOTTOM')" />
                    </template>
                </template>
            </picker-container>

            <picker-container :label="$t('COMMON.ANGLE')" :rule="rule('angle') ">
                <template v-slot:enabled-switch>
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('angle')"
                        @input="(r) => $emit('update', { rules: { angle: r } }) " :number="true" />
                </template>
                <template v-slot:pickers>
                    <number-picker :rule="rule('angle')" :min="-180" :max="180" :value="optionValue('angle')"
                        @input="(e) => emitValue('angle')(e) " unit="°" :prepend="'-180°'" :append="'+180°'"
                        :resettable="inTranslationMode" />
                </template>
            </picker-container>

            <picker-container :label="$t('COMMON.BACKGROUND')" :open="backgroundEnabled" :rule="rule('background') ">
                <template v-slot:enabled-switch>
                    <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('background')"
                        @input="(r) => $emit('update', { rules: { background: r } }) " :number="false" />
                </template>
                <template v-slot:pickers>
                    <template v-if="!inTranslationMode && !rule('background').fixed">
                        <choice-picker :value="backgroundMode" @input="(e) => emitValue('background.mode')(e)" :choices="[{ value: 'normal', label: $t('EDIT.BACKGROUND.NORMAL') },
                            { value: 'rounded', label: $t('EDIT.BACKGROUND.ROUNDED') },
                            { value: 'distorted', label: $t('EDIT.BACKGROUND.DISTORTED') },
                            { value: 'disabled', label: $t('EDIT.BACKGROUND.DISABLED') },
                            ]" />
                        <color-picker :dropColorEnabled="true" :value="optionValue('background.color')"
                            @input="(e) => emitValue('background.color')(e)" :disabled="!backgroundEnabled" />

                        <number-picker :min="-20" :max="100" unit="" :value="optionValue('background.padding')"
                            @input="(e) => emitValue('background.padding')(e) " :disabled="!backgroundEnabled"
                            :prepend="$t('COMMON.SMALL')" :append="$t('COMMON.BIG')" />

                        <!-- Use v-show instead of v-if  -->
                        <number-picker v-show="backgroundMode === 'distorted'" :min="0" :max="40"
                            v-model="angleDistortionValue" unit="" :disabled="!backgroundEnabled"
                            :prepend="$t('EDIT.BACKGROUND.LESS_DISTORTION')"
                            :append="$t('EDIT.BACKGROUND.MORE_DISTORTION')" />

                        <number-picker v-show="backgroundMode === 'rounded'" :min="0"
                            :max="optionValue('size') * (0.5 + optionValue('background.padding') / 100)" unit=""
                            :disabled="!backgroundEnabled" :value="optionValue('background.radius')"
                            @input="(e) => emitValue('background.radius')(e)"
                            :prepend="$t('EDIT.BACKGROUND.LESS_BORDER_RADIUS')"
                            :append="$t('EDIT.BACKGROUND.MORE_BORDER_RADIUS')" />
                    </template>
                </template>
            </picker-container>
        </template>
    </div>
</template>

<script>
import ColorPicker from '@/components/pickers/ColorPicker.vue';
import NumberPicker from '@/components/pickers/NumberPicker.vue';
import FontPicker from '@/components/pickers/FontPicker.vue';
import PositionPicker from '@/components/pickers/PositionPicker.vue';
import ChoicePicker from '@/components/pickers/ChoicePicker.vue';
import RulePicker from '@/components/pickers/RulePicker.vue';
import PickerContainer from '@/components/pickers/PickerContainer.vue';
import ComponentToolbar from '@/components/pickers/ComponentToolbar.vue';
import TextPicker from '@/components/pickers/TextPicker.vue';

import { computeRandomDistortedSquare, pSBC } from 'aktivisda-library';

import _get from 'lodash.get'
import _set from 'lodash.set'
import ChoiceListEditor from '../pickers/ChoiceListEditor.vue';

export default {
    name: 'text-input-component',
    components: { ColorPicker, NumberPicker, FontPicker, PositionPicker, ChoicePicker, PickerContainer, RulePicker, ComponentToolbar, TextPicker },
    props: {
        componentId: String,
        width: Number,
        height: Number,
        fieldLabel: String,
        nbComponents: { type: Number, default: 1 },
        editingLang: Object,
        options: {
            rules: Object,
            // TODO add values validators
            size: { type: Number, default: 10 },
            position: {
                x: { type: Number, default: 0 },
                y: { type: Number, default: 0 },
            },
            angle: { type: Number, default: 0 },
            text: { type: String, default: '' },
            font: { type: String, default: '' },
            color: { type: String, default: '#000000' },
            justification: { type: String, default: 'center' },
            zindex: { type: Number, default: 0 },
            background: {
                mode: { type: 'disabled' | 'rounded' | 'distorted' | 'disabled' },
                color: { type: String, default: '#000000' },
                padding: { type: Number, default: 3 }, // todo selector
                distortion: { type: Array },
                angleDistortion: { type: Number, default: 10 },
                radius: { type: Number, default: 0 },
            },
            shadow: {
                enabled: { type: Boolean, default: false },
                color: { type: String, default: '#000000' },
                offsetX: { type: Number, default: 0 },
                offsetY: { type: Number, default: 0 },
            }
        }
    },
    data: function() {
        return {
            backgroundMode: this.options.background.mode,
            shadowEnabled_: this.options.shadow.enabled,
            textJustification: this.options.justification,
            rerenderTextPicker: 0,
            modal: undefined
        }
    },
    computed: {
        backgroundEnabled: function() {
            return this.backgroundMode != 'disabled';
        },
        inTranslationMode: function() {
            return this.editingLang !== undefined;
        },
        // TODO: use optionValue
        shadowEnabledValue: {
            get: function () {
                return this.options.shadow?.enabled;
            },
            // TODO: use optionValue
            set: function (newValue) {

                this.shadowEnabled_ = newValue;
                const newOptions = { enabled: newValue };
                // I think that this should'nt be there
                // but in vidatextcomponents
                if (this.shadowColorValue === undefined) {
                    // set default shadow color and position on first enable
                    newOptions.color = pSBC(0.4, this.optionValue('color')); // 30% darker
                    this.shadowColorValue = newOptions.color;
                    const size = Math.ceil(this.optionValue('size') / 15);
                    newOptions.offsetX = size;
                    newOptions.offsetY = size;
                    this.shadowOffsetXValue = size;
                    this.shadowOffsetYValue = size;
                }
                this.$emit('update', { shadow: newOptions });
            },
        },
        // See shadowEnabledValue
        shadowColorValue: {
            get: function () {
                return this.options.shadow?.color;
            },
            set: function (newValue) {
                if (newValue === this.options.shadow.color) return;

                this.$emit('update', { shadow: { color: newValue } });
            },
        },
        // See shadowEnabledValue
        shadowOffsetXValue: {
            get: function () {
                return this.options.shadow?.offsetX;
            },
            set: function (newValue) {
                if (newValue === this.options.shadow.offsetX) return;

                this.$emit('update', { shadow: { offsetX: newValue } });
            },
        },
        // See shadowEnabledValue
        shadowOffsetYValue: {
            get: function () {
                return this.options.shadow?.offsetY;
            },
            set: function (newValue) {
                if (newValue === this.options.shadow.offsetY) return;

                this.$emit('update', { shadow: { offsetY: newValue } });
            },
        },
        optionValue: function() {
            if (!this.inTranslationMode) {
                return (key) => _get(this.options, key);
            } else {
                return (key) => {
                    return _get(this.options.i18n[this.editingLang.code], key);
                }
            }
        },
        applicableValue: function () {
            if (!this.inTranslationMode) {
                return (key) => _get(this.options, key);
            } else {
                return (key) => {
                    const i18nOption = _get(this.options.i18n[this.editingLang.code], key);
                    if (i18nOption !== undefined)
                        return i18nOption;
                    return _get(this.options, key)
                };
            }
        },
        rule: function() {
            return (key) => { let r = _get(this.options.rules, key); return r === undefined ? {} : r };
        },
        // TODO: cannot work in translation mode, maybe useless?
        justificationIndex: {
            set: function (value) {
                if (this.inTranslationMode) return;
                if (value === ['left', 'center', 'right'].indexOf(this.textJustification)) return;
                const newJustification = ['left', 'center', 'right'][value];
                this.textJustification = newJustification;
                this.$emit('update', { justification: newJustification });
            },
            get: function () {
                return ['left', 'center', 'right'].indexOf(this.textJustification);
            },
        },
        // TODO: use optionValue
        zIndexValue: {
            get() {
                return this.options.zIndex;
            },
            set(newValue) {
                newValue = Math.max(newValue, 1);
                newValue = Math.min(newValue, this.nbComponents);
                if (newValue === this.options.zIndex) return;
                this.$emit('update', { zIndex: newValue });
            },
        },
        // TODO: use optionValue
        angleDistortionValue: {
            get() {
              return this.options.background.angleDistortion;
            },
            set(newValue) {
                if (this.inTranslationMode) return;
                if (newValue === this.options.background.angleDistortion) return;
                // TODO: fixme
                this.options.background.angleDistortion = newValue;
                const newDistortion = computeRandomDistortedSquare(newValue);
                this.$emit('update', { background: { distortion: newDistortion, angleDistortion: newValue } });
            },
        },
        isUndefined: function () {
            return Object.keys(this.options).length == 1;
        },
    },
    methods: {
        removeComponent() {
            // TODO confirm box ? Oui en attendant le undo/redo
            this.$emit('remove');
        },
        emitValue: function (key) {
            // Todo check if we don’t emit this.options.value
            return (newValue) => {
                if (key === 'background.mode') {
                    this.backgroundMode = newValue;
                }
                const _key = this.inTranslationMode ? `i18n.${this.editingLang.code}.${key}` : key;
                this.$emit('update', _set({}, _key, newValue));
            }
        },
        openChoiceListEditor() {
            this.modal = this.$buefy.modal.open({
                parent: this,
                component: ChoiceListEditor,
                hasModalCard: false,
                trapFocus: true,
                width: 1080,
                canCancel: ['escape', 'outside'],
                onCancel: () => { ++this.rerenderTextPicker, this.modal = undefined },
                props: {
                    choices: this.optionValue('textChoices')
                },
                events: {
                    input: (value) => this.emitValue('textChoices')(value),
                },
            });

        }
    },
    // BeforeUnmount in Vue3
    beforeDestroy() {
        if (this.modal) this.modal.close();
    }
};
</script>

<style>
.control.left textarea {
    text-align: left;
}

.control.right textarea {
    text-align: right;
}

.control.center textarea {
    text-align: center;
}
</style>
