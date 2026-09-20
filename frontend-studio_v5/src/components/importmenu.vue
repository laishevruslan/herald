<template>
    <b-upload id="import-menu" :disabled="disabled" class="file-label" accept=".json" v-model="importedFile">
        <span class="file-cta">
            <b-icon class="file-icon" icon="upload"></b-icon>
            <span class="file-label">{{ $t('EDIT.IMPORT.TEMPLATE') }} </span>
        </span>
    </b-upload>
</template>

<script>
export default {
    name: 'import-menu',
    computed: {
        importedFile: {
            get: function () {
                return this.file;
            },
            set: function (newValue) {
                this.$emit('input', newValue);
            },
        },
    },
    props: {
        disabled: Boolean,
        advanced: Boolean,
        file: Object,
    },
    data: () => ({}),
};
</script>
