<script setup>
import { useStore } from '@datastore';
const store = useStore();
store.fetchConfig();
store.fetchImages();
</script>

<template>
    <div>
        <vida-navbar active="symbols" />
        <section class="hero">
            <div>
                <vida-transformer-title :content="$tc('SVGS.LABEL', 2)" size="medium" textAlign="center"></vida-transformer-title>
            </div>
        </section>

        <section class="container">
            <symbol-uploader @new-image="addImage" :skipHitform="false" />
        </section>
        <section>
            <colorable-gallery :key="refreshGallery" path="symbols" :elements="store.images" routePrefix="symbol" />
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title';
import SymbolUploader from '@/backtivisda/components/symboluploader.vue';

import ColorableGallery from '@/components/ColorableGallery';
import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'symbols',
    metaInfo: function () {
        const store = useStore();
        return {
            title: `${this.$t('NAVBAR.SYMBOLS')} - ${store.config.id}`,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                { vmid: 'description', name: 'description', content: `${this.$t('SVGS.PAGE_DESCRIPTION')}` },
                { property: 'og:title', vmid: 'og:title', content: `${this.$t('NAVBAR.SYMBOLS')} | ${store.config.id}.aktivisda` },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: store.config.url },
                { property: 'og:description', vmid: 'og:description', content: `${this.$t('SVGS.PAGE_DESCRIPTION')}` },
            ],
        };
    },
    components: { VidaNavbar, VidaTransformerTitle, ColorableGallery, SymbolUploader },
    data: () => ({
        refreshGallery: 0,
    }),
    mounted() {
        showSnackbarOnRedirection(this);
    },
    methods: {
        addImage(image) {
            const store = useStore();
            ++this.refreshGallery;
            store.addNewImage(image['data'], image['image'], image['preview'], image['thumbnail']);
        },
    },
};
</script>
