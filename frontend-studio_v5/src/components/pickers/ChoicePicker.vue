<template>
    <div class="mt-3 is-flex is-justify-content-center" style="margin-bottom: -0.8rem">
        <b-tabs :disabled="disabled" v-model="tabsValue"
            type="is-toggle-rounded">
            <b-tab-item v-for="(choice, index) in choices"
                :label="$t(choice.label)" :key="index"></b-tab-item>
        </b-tabs>
    </div>

</template>

<script>
export default {
    name: 'choice-picker',
    props: {
        value: String,
        choices: Array,
        disabled: Boolean
    },
    data: function () {
        return {
            copyValue: this.value,
        };
    },
    computed: {
        tabsValue: {
            get: function () {
                return this.choices.map((choice) => choice.value).indexOf(this.copyValue);
            },
            set: function (newValue) {
                if (this.disabled) return;
                this.copyValue = newValue;
                this.$emit('input', this.choices[newValue].value);
            },
        },
    },
    watch: {
        value: function (newValue) {
            this.copyValue = newValue;
        },
    },
};
</script>
