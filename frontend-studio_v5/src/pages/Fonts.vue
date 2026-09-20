<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchFonts();
store.fetchConfig();
</script>

<template>
    <div>
        <vida-navbar active="fonts" />
        <section class="hero">
            <div>
                <vida-transformer-title :content="$t('NAVBAR.FONTS')" size="medium" textAlign="center"></vida-transformer-title>
                <p class="subtitle">{{ $t('FONTS.PAGE_DESCRIPTION') }}</p>
            </div>
        </section>

        <section style="padding: 20px">
            <div class="card font-card" v-for="(font, key) in store.fonts" :key="key">
                <header class="card-header">
                    <p class="card-header-title" :style="{ fontFamily: font.fontName }">{{ font.name }}</p>
                </header>
                <div class="card-content" :style="{ fontFamily: font.fontName }">
                    <p class="font-pangram">{{ $t('FONTS.PANGRAM') }}</p>
                    <p class="font-numbers">{{ $t('FONTS.NUMBERS') }}</p>
                    <p class="font-special">{{ $t('FONTS.SPECIAL') }}</p>
                </div>
                <footer class="card-footer">
                    <a
                        v-for="(filename, format) in font.formats"
                        :key="format"
                        :href="`/static/fonts/${font.directory}/${filename}`"
                        class="card-footer-item"
                        download
                        >{{ $t('BUTTONS.DOWNLOAD') + ' .' + format }}</a
                    >
                </footer>
            </div>
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title';

import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'FontsPage',
    metaInfo: function () {
        const store = useStore();
        return {
            title: `${this.$t('NAVBAR.FONTS')} - ${store.config.id}`,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                { vmid: 'description', name: 'description', content: `${this.$t('FONTS.PAGE_DESCRIPTION')}` },
                { property: 'og:title', vmid: 'og:title', content: `${this.$t('NAVBAR.FONTS')} | ${store.config.id}.aktivisda` },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: store.config.url },
                { property: 'og:description', vmid: 'og:description', content: `${this.$t('FONTS.PAGE_DESCRIPTION')}` },
            ],
        };
    },
    components: { VidaNavbar, VidaTransformerTitle },
    mounted: function () {
        showSnackbarOnRedirection(this);
        document.dispatchEvent(new Event('x-app-rendered'));
    },
};
</script>

<style scoped lang="scss">
.font-card {
    // background-color: black;
    // color: white;
    margin: 20px 0px;
    // text-align: left;
    // padding: 20px;
    .card-header-title {
        text-transform: uppercase;
    }

    .card-content p {
        padding: 5px;
    }

    .font-numbers {
        background-color: var(--primary-color);
        color: var(--primary-text-color);
    }
    .font-special {
        background-color: var(--secondary-color);
        color: var(--secondary-text-color);
    }
}
</style>
