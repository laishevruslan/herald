<template>
    <b-field v-if="$isBacktivisda" class="rules-toolbar" grouped :type="minMaxError ? 'is-danger' : ''"
        :message="minMaxError ? 'Min value should be less than max value' : ''">
        <b-tooltip :position="tipPosition" :label="$t(`ADMIN.RULES.${labelI18nKey}.${!fixedValue ? 'FREE' : 'FIXED'}`) ">
            <b-field>
                <b-button :icon-left="!fixedValue ? 'lock-open-variant' : 'lock'" type="is-ghost"
                    @click="fixedValue = !fixedValue"></b-button>
            </b-field>
        </b-tooltip>
        <template v-if="number && !fixedValue">
            <b-tooltip :label="$t(`ADMIN.RULES.${labelI18nKey}.MIN`)">
                <b-field expanded>
                    <b-input type="number" v-model="minValue" :disabled="fixedValue"
                    :placeholder="$t(`ADMIN.RULES.${labelI18nKey}.MIN`) "></b-input>
                </b-field>
            </b-tooltip>
            <b-tooltip :label="$t(`ADMIN.RULES.${labelI18nKey}.MAX`)">
                <b-field expanded>
                    <b-input type="number" v-model="maxValue" :disabled="fixedValue"
                        :placeholder="$t(`ADMIN.RULES.${labelI18nKey}.MAX`)"></b-input>
                </b-field>
            </b-tooltip>
        </template>
    </b-field>
</template>

<script>


export default {
    name: 'rule-picker',
    props: {
        value: Object,
        number: { type: Boolean, default: false },
        labelI18nKey: { type: String, default: "DEFAULT" },
        tipPosition: { type: String, default: "is-bottom"},
    },
    data: function(){
        return {
            fixedCopyValue: !!this.value.fixed
        }
    }
    ,
    computed: {
        minMaxError:function() {
            if (this.minValue === undefined || this.maxValue === undefined) return false;
            return this.minValue > this.maxValue;
        },
        fixedValue: {
            get: function () {
                return this.fixedCopyValue
            },
            set: function (newValue) {
                this.fixedCopyValue = newValue;
                this.$emit('input', { fixed: newValue});
            },
        },
        minValue: {
            get: function () {
                return Math.round(this.value.min);
            },
            set: function (newValue) {
                if (newValue === '') newValue = null;
                this.$emit('input', { min: newValue});
        },
    },
    maxValue: {
        get: function () {
            return Math.round(this.value.max);
        },
        set: function (newValue) {
                if (newValue === '') newValue = null;
                this.$emit('input', { max: newValue});
            },
        },
    },
};
</script>

<style scoped lang="scss">
.rules-toolbar {
    display: inline-block;
}
</style>
