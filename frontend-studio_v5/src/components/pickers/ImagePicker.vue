<script setup>
import ResetPicker from '@/components/pickers/ResetPicker.vue';
import SymbolPicker from '@/components/pickers/SymbolPicker.vue';
import QrcodePicker from '@/components/pickers/QrcodePicker.vue';
import { overrideValues } from 'aktivisda-library';

</script>

<template>
    <div>
        <reset-picker v-if="resettable" :defaultValue="defaultValue" v-model="imageValue" />

        <template v-if="imageValue !== undefined">
            <symbol-picker
                v-if="imageValue.type === 'internalsvg' || imageValue.type === 'urlphoto' || imageValue.type === 'internalphoto'"
                v-model="imageValue" />
            <qrcode-picker v-else-if="imageValue.type === 'qrcode'" v-model="imageValue" />
        </template>
    </div>
</template>

<script>

export default {
    name: 'image-picker',
    props: {
        value: Object,
        resettable: { type: Boolean, default: false },
        defaultValue: undefined
    },
    data() {
        return {
            copyValue: this.value,
        };
    },
    computed: {
        imageValue: {
            get: function () {
                return this.copyValue;
            },
            set: function (newValue) {
                if (newValue === null)
                    this.copyValue = undefined;
                else if (this.copyValue == undefined)
                    this.copyValue = newValue;
                else {
                    overrideValues(this.copyValue, newValue);
                }
                this.$emit('input', newValue);
            },
        },
    },
};
</script>

    <style></style>
