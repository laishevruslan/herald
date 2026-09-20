<template>
    <picker-container :label="$t('COMMON.POSITION')" :rule="rule">
        <template v-slot:enabled-switch>
            <rule-picker v-if="!resettable" labelI18nKey="POSITION" tipPosition="is-left" :value="rule" @input="(r) => $emit('updateRule', r)"
            :number="false" />
        </template>

        <template v-slot:pickers>

            <template v-if="!rule.fixed">
                <rule-picker v-if="!resettable" :value="subRuleX"
                @input="(r) => $emit('updateRule', { properties: { x: toPercentRule(r, width) } })"
                :number="true" />
                <number-picker v-if="!subRuleX.fixed" :min="minX" :max="maxX" v-model="xValue" unit="px" :prepend="$t('COMMON.LEFT')"
                :append="$t('COMMON.RIGHT')" :disabled="disabled" :resettable="resettable" :rule="subRuleX" />

                <div style="margin: 12px; width: 100%; height: 1px"></div>
                <rule-picker v-if="!resettable" :value="subRuleY"
                    @input="(r) => $emit('updateRule', { properties: { y: toPercentRule(r, height) } })"
                    :number="true" />
                <number-picker v-if="!subRuleY.fixed" :min="minY" :max="maxY" v-model="yValue" unit="px" :prepend="$t('COMMON.TOP')"
                    :append="$t('COMMON.BOTTOM')" :disabled="disabled" :resettable="resettable" :rule="subRuleY" />
            </template>
        </template>
    </picker-container>
</template>

<script>
import NumberPicker from '@/components/pickers/NumberPicker.vue';
import RulePicker from '@/components/pickers/RulePicker.vue';
import PickerContainer from '@/components/pickers/PickerContainer.vue';

export default {
    name: 'position-picker',
    components: { NumberPicker, PickerContainer, RulePicker },
    props: {
        width: Number,
        height: Number,
        value: {
            x: Number,
            y: Number,
        },
        disabled: { type: Boolean, default: false },
        resettable: { type: Boolean, default: false },
        rule: { type: Object, default: () => ({})}
    },
    computed: {
        subRuleX: function() {
            if (this.rule !== undefined && this.rule.properties !== undefined && this.rule.properties.x !== undefined) {
                let result = { ...this.rule.properties.x };
                if (result.min !== undefined) {
                    result.min = this.fromPercent(result.min, this.width);
                }
                if (result.max !== undefined) {
                    result.max = this.fromPercent(result.max, this.width);
                }
                return result;
            }
            return {};
        },
        subRuleY: function() {
            if (this.rule !== undefined && this.rule.properties !== undefined && this.rule.properties.y !== undefined) {
                let result = { ...this.rule.properties.y };
                if (result.min !== undefined) {
                    result.min = this.fromPercent(result.min, this.height);
                }
                if (result.max !== undefined) {
                    result.max = this.fromPercent(result.max, this.height);
                }
                return result;
            }
            return {};
        },
        xValue: {
            get: function () {
                if (this.value === undefined || this.value.x === undefined) return undefined;
                return this.fromPercent(this.value.x, this.width);
            },
            set: function (newValue) {
                if (this.disabled) return;
                if (newValue === null) {
                    this.$emit('input', { x: null });
                    return
                }
                const newX = this.toPercent(newValue, this.width);
                if (newX == this.value.x) return;
                this.$emit('input', { x: newX });
            },
        },
        yValue: {
            get: function () {
                if (this.value === undefined || this.value.y === undefined) return undefined;
                return this.fromPercent(this.value.y, this.height);
            },
            set: function (newValue) {
                if (this.disabled) return;
                if (newValue === null) {
                    this.$emit('input', { y: null });
                    return
                }
                const newY = this.toPercent(newValue, this.height);
                if (newY == this.value.y) return;

                this.$emit('input', { y: newY });
            },
        },
        minX: function () {
            if (this.xValue === undefined) return -this.width;
            return Math.min(-this.width / 2, this.xValue);
        },
        maxX: function () {
            if (this.xValue === undefined) return this.width;
            return Math.max(this.width / 2, this.xValue);
        },
        minY: function () {
            if (this.yValue === undefined) return -this.height;
            return Math.min(-this.height / 2, this.yValue);
        },
        maxY: function () {
            if (this.yValue === undefined) return this.height;
            return Math.max(this.height / 2, this.yValue);
        },
    },
    methods: {
        toPercent(value, dimension) {
            return value / dimension + 0.5;
        },
        fromPercent(value, dimension) {
            return (value - 0.5) * dimension;
        },
        toPercentRule(rule, dimension) {
            if (rule.min !== undefined) {
                rule.min = this.toPercent(rule.min, dimension);
            }
            if (rule.max !== undefined) {
                rule.max = this.toPercent(rule.max, dimension);
            }
            return rule;
        }
    },
};
</script>
