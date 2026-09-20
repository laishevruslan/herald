<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchBackgrounds();
store.fetchConfig();
</script>

<template>
    <div>
        <vida-navbar active="backgrounds" />
        <section class="hero">
            <div>
                <vida-transformer-title :content="$tc('BACKGROUND_IMAGES.LABEL', 2)" size="medium" textAlign="center"></vida-transformer-title>
                <p class="subtitle">{{ $t('BACKGROUND_IMAGES.PAGE_DESCRIPTION') }}</p>
                <p style="font-style: italic" v-html="$t('SVGS.CONTRIBUTE', { email: store.config.email })"></p>
            </div>
        </section>
        <section>
            <b-loading :active="store.isLoading" :is-full-page="false"></b-loading>
            <colorable-gallery path="backgrounds" :elements="store.backgrounds" routePrefix="background" />
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title';

import ColorableGallery from '@/components/ColorableGallery.vue';
import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'backgrounds',
    metaInfo: function () {
        const store = useStore();
        return {
            title: `${this.$t('NAVBAR.BACKGROUNDS')} - ${store.config.id}`,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                { vmid: 'description', name: 'description', content: `${this.$t('BACKGROUNDS_IMAGES.PAGE_DESCRIPTION')}` },
                { property: 'og:title', vmid: 'og:title', content: `${this.$t('NAVBAR.BACKGROUNDS')} | ${store.config.id}.aktivisda` },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: store.config.url },
                { property: 'og:description', vmid: 'og:description', content: `${this.$t('BACKGROUNDS_IMAGES.PAGE_DESCRIPTION')}` },
            ],
        };
    },
    components: { VidaNavbar, ColorableGallery, VidaTransformerTitle },
    mounted: function () {
        showSnackbarOnRedirection(this);
        document.dispatchEvent(new Event('x-app-rendered'));
    },
};
</script>
