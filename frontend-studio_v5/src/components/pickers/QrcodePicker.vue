<template>
    <div style="flex-grow: 1">
        <b-input id="qrcode-input-url" style="margin-top: 10px; margin-bottom: 10px" v-model="urlValue"></b-input>
        <color-picker v-model="colorValue" :dropColorEnabled="true" />
        <color-picker v-model="backgroundColorValue" :dropColorEnabled="true" />
        <symbol-picker v-model="symbolValue" :symbolPicker="true" :allowCustomPhoto="false" :allowEmptyImage="true" />
    </div>
</template>

<script>
import ColorPicker from '@/components/pickers/ColorPicker.vue';
import SymbolPicker from '@/components/pickers/SymbolPicker.vue';

export default {
    name: 'qrcode-picker',
    components: { ColorPicker, SymbolPicker },
    props: {
        value: {
            /* type: String, TODO fix me*/
            url: String,
            color: String,
            backgroundColor: String,
            symbol: {
                id: String,
                colors: { type: Object },
            },
        },
    },
    data: () => ({
        rerenderColorComponent: 0,
    }),
    computed: {
        symbolValue: {
            get: function () {
                return this.value.symbol;
            },
            set: function (newValue) {
                if (newValue === this.value.symbol) return;
                this.$emit('input', { type: 'qrcode', symbol: newValue });
            },
        },
        urlValue: {
            get: function () {
                return this.value.url;
            },
            set: function (newValue) {
                if (newValue === this.value.url) return;
                this.$emit('input', { type: 'qrcode', url: newValue });
            },
        },
        colorValue: {
            get: function () {
                return this.value.color;
            },
            set: function (newValue) {
                if (newValue === this.value.color) return;
                this.$emit('input', { type: 'qrcode', color: newValue });
            },
        },
        backgroundColorValue: {
            get: function () {
                return this.value.backgroundColor;
            },
            set: function (newValue) {
                if (newValue === this.value.backgroundColor) return;
                this.$emit('input', { type: 'qrcode', backgroundColor: newValue });
            },
        },
    },
};
</script>

<style scoped></style>
