<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchTemplates();
store.fetchConfig();
</script>

<template>
    <div>
        <vida-navbar active="templates" />
        <section class="hero">
            <div>
                <vida-transformer-title :content="$tc('TEMPLATES.LABEL', 2)" size="medium" textAlign="center"></vida-transformer-title>
                <p class="subtitle">{{ $t('TEMPLATES.PAGE_DESCRIPTION') }}</p>
                <p style="font-style: italic" v-html="$t('TEMPLATES.CONTRIBUTE', { email: store.config.email })">
                </p>
            </div>
        </section>

        <section>
            <colorable-gallery path="templates" :elements="store.templates" routePrefix="template" />
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title';

import ColorableGallery from '../components/ColorableGallery.vue';

import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'welcome',
    metaInfo: function () {
        const store = useStore();
        return {
            title: store.config.id,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                {
                    vmid: 'description',
                    name: 'description',
                    content: this.$t('META.DESCRIPTION', { localdesc: this.$i18n.t('CONFIG.description') }),
                },
            ],
        };
    },
    components: { VidaNavbar, ColorableGallery, VidaTransformerTitle },
    methods: {
        openEditor(templateId) {
            if (this.$router.currentRoute.name === 'editor') return;
            this.$router.push({ name: 'editor', params: { lang: this.$i18n.locale, templateId } });
        },
    },
    mounted: function () {
        showSnackbarOnRedirection(this);
        document.dispatchEvent(new Event('x-app-rendered'));
    },
};
</script>

<style scoped>
.container.padding-30 {
    padding: 20px;
}
</style>
