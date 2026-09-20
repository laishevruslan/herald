<script setup>
import { useStore } from '@datastore';
const store = useStore();
store.fetchConfig();
</script>

<template>
    <b-dropdown aria-role="list" :triggers="['hover', 'click']" expanded position="is-bottom-left" :mobile-modal="true">
        <template #trigger="{ active }">
            <b-button type="is-complete-ghost" :icon-right="active ? 'menu-up' : 'menu-down'" :key="$i18n.locale"> {{ flag }} {{ lang }} </b-button>
        </template>

        <b-dropdown-item v-for="l in store.langs" :key="l.code" aria-role="listitem" :disabled="l.code === lang" @click="onChangeLang(l.code)">
            <span class="mr-2">{{ l.flag }}</span
            >{{ l.text }}
        </b-dropdown-item>
        <b-dropdown-item separator></b-dropdown-item>
        <b-dropdown-item has-link hre>
            <a href="https://framagit.org/aktivisda/aktivisda/-/wikis/Internationalization" target="_blank"> More? </a>
        </b-dropdown-item>
    </b-dropdown>
</template>

<script>
import { loadAndSetLanguage } from '@/plugins/i18n';

export default {
    name: 'lang-picker',
    computed: {
        lang() {
            return this.$i18n.locale;
        },
        flag() {
            const store = useStore();
            return store.langs.find((obj) => obj.code === this.$i18n.locale).flag;
        },
    },
    methods: {
        async onChangeLang(newLang) {
            this.$router.push({ params: { lang: newLang } });
            const store = useStore();
            await store.fetchConfig();
            loadAndSetLanguage(newLang, store.config);
        },
    },
};
</script>
