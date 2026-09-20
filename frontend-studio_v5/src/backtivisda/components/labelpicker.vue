<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchTags();
store.fetchConfig();
</script>

<template>
    <div>
        <b-field v-for="code in Object.keys(labels).filter((lang) => labels[lang] !== undefined)" :key="code" :label="code">
            <b-input v-model="labels[code]" :placeholder="$t('COMMON.LABEL')"></b-input>
            <b-button icon-left="close" @click="labels[code] = undefined" />
        </b-field>
        <b-dropdown>
            <template #trigger>
                <b-button icon-left="menu-down">{{ $t('ADMIN.BUTTONS.ADD_NEW_LANG') }}</b-button>
            </template>

            <b-dropdown-item v-for="(lang, key) in store.langs" :key="key" :disabled="labels[lang.code] !== undefined" @click="labels[lang.code] = ''">
                {{ lang.text }}
            </b-dropdown-item>
        </b-dropdown>
    </div>
</template>

<script>

export default {
    name: 'label-picker',
    props: {
        value: {
            type: Object,
        },
    },
    computed: {
        labels: {
            set: function (labels) {
                this.$emit('input', labels);
            },
            get: function () {
                return this.value;
            },
        },
    },
};
</script>

<style scoped></style>
