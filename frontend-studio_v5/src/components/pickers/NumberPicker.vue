<script setup>
import ResetPicker from '@/components/pickers/ResetPicker.vue';
</script>

<template>
    <div class="position-relative" v-if="!rule.fixed" style="margin-top: 10px; margin-bottom: 10px">
        <reset-picker v-if="resettable" :defaultValue="(intMin + intMax)/2" v-model="sliderValue" />

        <template v-if="sliderValue !== undefined">
            <b-field>
                <p class="control">
                    <b-button v-if="intMin < 0" @click="center" icon icon-left="format-horizontal-align-center"
                        :disabled="disabled"></b-button>
                </p>
                <b-numberinput :min="intMin" :max="intMax" v-model="sliderValue" :disabled="disabled"
                    controls-position="compact" exponential />
            </b-field>
            <b-field>
                <b-slider style="margin: 0.6em 0; padding-bottom: 12px" size="small" :tooltip="false" :min="intMin"
                    :max="intMax" v-model="sliderValue" :disabled="disabled">
                    <b-slider-tick :value="intMin" ticks>{{ prepend }}</b-slider-tick>
                    <b-slider-tick :value="intMin / 4" ticks></b-slider-tick>
                    <b-slider-tick :value="intMin / 2" ticks></b-slider-tick>
                    <b-slider-tick :value="(3 * intMin) / 4" ticks></b-slider-tick>

                    <b-slider-tick v-if="intMin < 0" :value="0" ticks>{{ $t('COMMON.CENTER') }}</b-slider-tick>

                    <b-slider-tick :value="intMax / 4" ticks></b-slider-tick>
                    <b-slider-tick :value="intMax / 2" ticks></b-slider-tick>
                    <b-slider-tick :value="(3 * intMax) / 4" ticks></b-slider-tick>
                    <b-slider-tick :value="intMax" ticks>{{ append }}</b-slider-tick>
                </b-slider>
            </b-field>
        </template>
    </div>
</template>

<script>
export default {
    name: 'number-picker',
    props: {
        value: Number,
        min: { type: Number, default: 0 },
        max: { type: Number, default: 100 },
        unit: { type: String, default: '' },
        prepend: { type: String, default: '' },
        append: { type: String, default: '' },
        disabled: { type: Boolean, default: false },
        resettable: { type: Boolean, default: false },
        rule: { type: Object, default: () => ({})}
    },
    data: function () {
        return {
            copyValue: this.value,
        };
    },
    methods: {
        increment() {
            this.sliderValue += 1;
        },
        decrement() {
            this.sliderValue -= 1;
        },
        center() {
            this.sliderValue = 0;
        },
        reset() {
            this.sliderValue = null;
        }
    },
    computed: {
        size: function () {
            return Math.ceil(Math.log10(1 + Math.max(Math.abs(this.intMin), Math.abs(this.intMax)))) + (this.intMin < 0);
        },
        sliderValue: {
            get: function () {
                if (this.copyValue === undefined) return this.copyValue;
                return Math.round(this.copyValue);
            },
            set: function (newValue) {
                if (newValue === undefined || newValue === Math.round(this.copyValue)) return;
                if (newValue === null) {
                    this.copyValue = undefined;
                    this.$emit('input', null);
                    return;
                }
                if (this.disabled) return;
                this.copyValue = newValue;
                this.$emit('input', Math.max(Math.min(newValue, this.intMax), this.intMin));
            },
        },
        intMax: function () {
            if (this.rule.max !== undefined)
                return Math.min(Math.ceil(this.max), this.rule.max);
            return Math.ceil(this.max);
        },
        intMin: function () {
            if (this.rule.min !== undefined)
                return Math.max(Math.floor(this.min), this.rule.min);
            return Math.floor(this.min);
        },
    },
    watch: {
        value: function (newValue) {
            this.copyValue = newValue;
        },
    },
};
</script>

<style>
/* Chrome, Safari, Edge, Opera */
input.custom-input-number::-webkit-outer-spin-button,
input.custom-input-number::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}

/* Firefox */
input.custom-input-number[type='number'] {
    -moz-appearance: textfield;
}

input.custom-input-number {
    text-align: center;
}
input.custom-input-number:focus {
    border-bottom: 2px solid #f6c24a;
}
</style>
