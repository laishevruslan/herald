<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchColors();
store.fetchPalettes();
store.fetchConfig();
</script>

<template>
    <div>
        <vida-navbar active="colors" />

        <section class="hero">
            <div>
                <vida-transformer-title :content="$tc('COLORS.LABEL', 2)" size="medium" textAlign="center"></vida-transformer-title>
                <p class="subtitle">{{ $t('COLORS.PAGE_DESCRIPTION') }}</p>
            </div>
        </section>
        <div class="container">
            <div class="row" style="margin: auto">
                <b-tabs type="is-toggle" expanded multiline class="sticky-tabs-page" v-model="selectedTag">
                    <b-tab-item
                        v-for="tag in store.availableTags('colors').add('')"
                        :label="tag == '' ? store.tagTranslation('all', $i18n.locale) : store.tagTranslation(tag, $i18n.locale)"
                        :key="tag"
                        :value="tag">
                        <div class="container" style="margin-top: 30px">
                            <div class="row">
                                <section v-for="(color, key) in colors[tag]" class="color-box" :key="key">
                                    <figure class="color-figure" :style="{ backgroundColor: color['html'] }">
                                        <h4 class="color-name" :style="{ color: color['opposite'] + '!important' }">
                                            <span class="html-color">{{ color['html'] }}</span>
                                        </h4>
                                    </figure>
                                </section>
                            </div>
                        </div>
                    </b-tab-item>
                </b-tabs>
            </div>
        </div>

        <section v-if="palettesBySize.length > 0">
            <h2 class="title">{{ $tc('PALETTES.LABEL', 2) }}</h2>
            <section v-for="(palettes, sizeIndex) in palettesBySize" :key="sizeIndex">
                <h3>{{ $t('PALETTES.TITLE_SIZE', { nb: palettes[0].length }) }}</h3>
                <div class="container">
                    <div class="row">
                        <section class="palette-box" v-for="(palette, key) in palettes" :key="key">
                            <figure class="palette-figure">
                                <div
                                    :class="{ 'palette-color': true, tight: palette.length > 5 }"
                                    v-for="(color, colorIndex) in palette"
                                    :key="colorIndex"
                                    :style="{ backgroundColor: '#' + color['html'] }">
                                    <h4 class="color-name" :style="{ color: color['opposite'] + '!important' }">
                                        <span class="html-color">{{ color['html'] }}</span>
                                    </h4>
                                </div>
                            </figure>
                        </section>
                    </div>
                </div>
            </section>
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title';

import { contrast, HEX2RGB } from '@/plugins/utils.js';
import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'fonts',
    metaInfo: function () {
        const store = useStore();
        return {
            title: `${this.$t('NAVBAR.COLORS')} - ${store.config.id}`,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                { vmid: 'description', name: 'description', content: `${this.$t('COLORS.PAGE_DESCRIPTION')}` },
                { property: 'og:title', vmid: 'og:title', content: `${this.$t('NAVBAR.COLORS')} | ${store.config.id}.aktivisda` },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: store.config.url },
                { property: 'og:description', vmid: 'og:description', content: `${this.$t('COLORS.PAGE_DESCRIPTION')}` },
            ],
        };
    },
    components: { VidaNavbar, VidaTransformerTitle },
    computed: {
        selectedTag: {
            get: function () {
                const query = this.$router.currentRoute.query;
                if (!query) return this.defaultTag();

                const tag = this.$router.currentRoute.query.tag;
                if (tag !== undefined && !useStore().availableTags('colors').includes(tag)) {
                    this.$router.replace({ query: { tag: undefined } });
                    return this.defaultTag();
                }
                return tag;
            },
            set: function (newValue) {
                this.$router.replace({ query: { tag: newValue } });
            },
        },
        colors: function () {
            const result = {};
            const black = { r: 0, b: 0, g: 0 };
            const white = { r: 255, b: 255, g: 255 };
            const store = useStore();
            for (const tag of store.availableTags('colors').add('')) {
                result[tag] = store.elementsWithTag(tag, 'colors').map((color) => {
                    const rgb = HEX2RGB(color.html);
                    color['opposite'] = contrast(rgb, black) > contrast(rgb, white) ? 'black' : 'white';
                    return color;
                });
            }
            return result;
        },
        palettesBySize: function () {
            const black = { r: 0, b: 0, g: 0 };
            const white = { r: 255, b: 255, g: 255 };

            const results = {};

            const store = useStore();
            store.palettes.map((palette) => {
                const newPalette = palette.map((color) => ({
                    html: color.slice(1),
                    opposite: contrast(HEX2RGB(color), black) > contrast(HEX2RGB(color), white) ? 'black' : 'white',
                }));
                const size = newPalette.length;
                if (results[size] === undefined) results[size] = [];
                results[size].push(newPalette);
            });
            const tab = Object.values(results);
            tab.sort((a, b) => a[0].length > b[0].length);
            return tab;
        },
    },
    mounted: function () {
        showSnackbarOnRedirection(this);
        document.dispatchEvent(new Event('x-app-rendered'));
    },
};
</script>

<style scoped lang="scss">
.palette-box,
.color-box {
    display: inline-block;
    vertical-align: top;
    margin-bottom: 2.5vw;
    background-color: #e2e2e2;
    border-radius: 0.75vw;
    box-shadow: 0 1px 0 0 rgba(19, 19, 19, 0.1);
    transition:
        transform 100ms,
        box-shadow 150ms;
    margin-left: 13px;
    margin-right: 13px;
}

.color-box {
    width: 22.5vw;
    max-width: 233px;
    @media screen and (max-width: 768px) {
        width: 100%;
        max-width: none;
    }
}

.palette-box:hover,
.color-box:hover {
    transform: scale(1.05);
    box-shadow: 0px 3px 10px -5px rgba(19, 19, 19, 0.3);
}

.color-box .color-figure {
    height: 13.5vw;
    max-height: 130px;
    width: 100%;
    display: inline-block;
    border-radius: 4px;
    margin-left: 0px;

    @media screen and (max-width: 768px) {
        min-height: 90px;
        max-height: none;
    }
}

.color-name {
    position: relative;
    top: 50%;
    text-align: center;
    color: inherit;
    padding: 0 10px;
    -webkit-transform: translateY(-50%);
    margin-top: 0px;
    margin-bottom: 0px;
}

.html-color {
    letter-spacing: 0.6px;
    text-transform: uppercase;
    font-weight: bold;
}

.palette-figure {
    display: flex;
    height: 13.5vw;
    max-height: 130px;
    width: 100%;
    border-radius: 4px;
    margin-left: 0px;
    border: 2px solid #eee;
    overflow: hidden;
    max-width: 430px;
}

.palette-color {
    height: 100%;
    width: 85px;
}

.palette-color.palette-color.tight .html-color {
    display: none;
}

.palette-color .color-name .html-color {
    font-size: small;
}
</style>
