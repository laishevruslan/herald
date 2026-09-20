<script setup>
import { useVidaStore} from '@/vida/store.js'

const vStore = useVidaStore();
</script>

<template>
    <div class="input-components image-input-components">
        <template v-if="!isUndefined">
            <component-toolbar :componentId="componentId"
                @remove="removeComponent" @forward="++zIndexValue" @backward="--zIndexValue"
                @duplicate="$emit('duplicate')" @undo="$emit('undo')" @redo="$emit('redo')"
                :forwardEnabled="options.zIndex < nbComponents" :backwardEnabled="options.zIndex > 1"
                :zIndexRule="rule('zIndex')" :presenceRule="rule('presence')" :unicityRule="rule('unicity')" />

            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="SELF" :value="rule('self')"
                @input="(r) => $emit('update', { rules: { self: r } })" :number="false" />
            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="ZINDEX" :value="rule('zIndex')"
                @input="(r) => $emit('update', { rules: { zIndex: r } })" :number="false" />
            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="UNICITY"
                :value="rule('unicity')" @input="(r) => $emit('update', { rules: { unicity: r } })" :number="false" />
            <rule-picker v-if="!inTranslationMode" tipPosition="is-bottom" labelI18nKey="PRESENCE"
                :value="rule('presence')" @input="(r) => $emit('update', { rules: { presence: r } }) "
                :number="false" />

            <template v-if="!rule('self').fixed">
                <picker-container :label="$t('COMMON.IMAGE')" :rule="rule('image')">
                    <template v-slot:enabled-switch>
                        <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('image')"
                            @input="(r) => $emit('update', { rules: { image: r } }) " :number="false" />
                    </template>
                    <template v-slot:pickers>
                        <image-picker :value="optionValue('image')" @input="(e) => emitValue('image')(e)"
                            :resettable="inTranslationMode" :defaultValue="options.image" />
                    </template>
                </picker-container>

                <picker-container :label="$t('COMMON.SIZE')" :rule="rule('size')">
                    <template v-slot:enabled-switch>
                        <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('size')"
                            @input="(r) => $emit('update', { rules: { size: r } }) " :number="true" />
                    </template>
                    <template v-slot:pickers>
                        <number-picker :min="0" :max="200" :value="optionValue('scale')" unit="%"
                            :prepend="$t('COMMON.SMALL')" :append="$t('COMMON.BIG')" :rule="rule('scale')"
                            @input="(e) => emitValue('scale')(e)" :resettable="inTranslationMode" />
                    </template>
                </picker-container>

                <position-picker :width="vStore.document.width" :height="vStore.document.height" :value="optionValue('position')"
                    :rule="rule('position') " @updateRule="(r) => $emit('update', { rules: { position: r } }) "
                    @input="(e) => emitValue('position')(e) " :resettable="inTranslationMode" />

                <picker-container :label="$t('COMMON.ANGLE')">
                    <template v-slot:enabled-switch>
                        <rule-picker v-if="!inTranslationMode" tipPosition="is-left" :value="rule('angle')"
                            @input="(r) => $emit('update', { rules: { angle: r } }) " :number="true" />
                    </template>
                    <template v-slot:pickers>
                        <number-picker :rule="rule('angle')" :min="-180" :max="180" :value="optionValue('angle')"
                            unit="°" :prepend="'-180°'" :append="'+180°'" @input="(e) => emitValue('angle')(e)"
                            :resettable="inTranslationMode" />
                    </template>
                </picker-container>
            </template>
        </template>
    </div>
</template>

<script>
import ImagePicker from '@/components/pickers/ImagePicker.vue';
import PositionPicker from '@/components/pickers/PositionPicker.vue';
import NumberPicker from '@/components/pickers/NumberPicker.vue';
import PickerContainer from '@/components/pickers/PickerContainer.vue';
import ComponentToolbar from '@/components/pickers/ComponentToolbar.vue';
import RulePicker from '@/components/pickers/RulePicker.vue';

import _get from 'lodash.get'
import _set from 'lodash.set'

export default {
    name: 'image-input-component',
    components: { ImagePicker, PositionPicker, NumberPicker, PickerContainer, ComponentToolbar, RulePicker },
    props: {
        componentId: String,
        fieldLabel: String,
        type: String, // internalsvg or qrcode
        // TODO add values validators
        options: {
            image: Object,
            scale: { type: Number, default: 10 },
            position: {
                x: { type: Number, default: 1 },
                y: { type: Number, default: 1 },
            },
            angle: { type: Number, default: 0 },
            zIndex: { type: Number, default: 1 },
        },
        nbComponents: { type: Number, defalut: 1 },
        editingLang: Object
    },
    computed: {
        zIndexValue: {
            get() {
                return this.options.zIndex;
            },
            set(newValue) {
                newValue = Math.max(newValue, 1);
                newValue = Math.min(newValue, this.nbComponents);
                if (newValue === this.options.zIndex) return;
                this.$emit('update', { zIndex: newValue });
                this.options.zIndex = newValue;
            },
        },
        optionValue: function () {
            if (!this.inTranslationMode) {
                return (key) => _get(this.options, key);
            } else {
                return (key) => _get(this.options.i18n[this.editingLang.code], key);
            }
        },
        isUndefined: function () {
            return Object.keys(this.options).length === 1;
        },
        rule: function () {
            return (key) => { let r = _get(this.options.rules, key); return r === undefined ? {} : r };
        },
        inTranslationMode: function () {
            return this.editingLang != undefined;
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
                const _key = this.inTranslationMode ? `i18n.${this.editingLang.code}.${key}` : key;
                this.$emit('update', _set({}, _key, newValue));
            }
        },

    },
};
</script>
