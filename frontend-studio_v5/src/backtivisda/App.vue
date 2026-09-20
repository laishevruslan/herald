<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchConfig();
</script>


<template>
    <div id="app">
        <!-- <v-app fluid class="ma-0 pa-0"> -->
        <router-view />
        <font-loader />
        <!-- </v-app> -->
    </div>
</template>

<script>
import FontLoader from '@/components/fontloader.vue';

export default {
    name: 'Backtivisda',
    metaInfo: function () {
        const store = useStore();
        return {
            title: store.config.id,
            titleTemplate: '%s | Aktivisda.earth',
            htmlAttrs: {
                lang: 'fr',
            },
            meta: [
                { charset: 'utf-8' },
                { vmid: 'description', name: 'description', content: this.$t('META.DESCRIPTION', { localdesc: this.$i18n.t('CONFIG.description') }) },
                { property: 'og:title', vmid: 'og:title', content: this.$t('META.TITLE', { instance: store.config.id}) },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: store.config.url },
                { property: 'og:image', vmid: 'og:image', content: `${store.config.url}/static/rs-preview.png` },
                {
                    property: 'og:description',
                    vmid: 'og:description',
                    content: this.$t('META.DESCRIPTION', { localdesc: this.$i18n.t('CONFIG.description') }),
                },
                { property: 'og:site_name', vmid: 'og:site_name', content: this.$t('META.SITE_NAME', { instance: store.config.id}) },
            ],
        };
    },
    components: { FontLoader },
    mounted: () => document.dispatchEvent(new Event('x-app-rendered')),
};
</script>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin-top: 60px;
}
</style>
