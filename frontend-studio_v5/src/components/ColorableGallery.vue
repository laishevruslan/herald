<script setup>
import { useStore } from '@datastore';
// eslint-disable-next-line no-unused-vars
const store = useStore();
</script>

<template>
    <div class="container">
        <p style="padding: 10px 0px" />

        <div class="row" style="margin: auto">
            <b-tabs type="is-toggle" expanded multiline class="sticky-tabs-page" v-model="selectedTag">
                <b-tab-item
                    v-for="tag in availableTags"
                    :label="tag == '' ? store.tagTranslation('all', $i18n.locale) : store.tagTranslation(tag, $i18n.locale)"
                    :key="tag"
                    :value="tag">
                    <div class="container is-flex is-flex-wrap-wrap is-justify-content-space-around">
                        <colorable-gallery-item
                            v-for="(element, index) in elementsByTag[tag]"
                            :key="'gallery-' + index + '-' + refreshElementsByTag"
                            :element="element"
                            @click="openModal(element)"
                            :path="path" />
                    </div>
                </b-tab-item>
            </b-tabs>
        </div>

        <b-loading :is-full-page="false" v-model="isLoading" :can-cancel="false"></b-loading>
        <b-modal v-if="selectedElement && !isLoading" v-model="isModalActive" :width="640" scroll="keep" :on-cancel="handleCancelModal">
            <colorable-gallery-modal
                :elementId="selectedElement.id"
                :galleryType="path"
                @close="isModalActive = false"
                @refresh="refreshElementsByTag++" />
        </b-modal>
    </div>
</template>

<script>
import ColorableGalleryModal from '@/components/ColorableGalleryModal.vue';
import ColorableGalleryItem from '@/components/ColorableGalleryItem.vue';

import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';
import { extractBestTranslation } from 'aktivisda-library';

export default {
    name: 'ColorableGallery',
    components: { ColorableGalleryModal, ColorableGalleryItem },
    props: {
        elements: {
            type: Array,
            default: () => {
                [];
            },
        },
        path: {
            type: String,
            default: '',
        },
        routePrefix: {
            type: String,
            default: '',
        },
        tagsQuery: {
            type: String,
        },
    },
    data: () => ({
        isModalActive: false,
        selectedElement: {},
        isLoading: false,
        refreshElementsByTag: 0,
    }),
    mounted() {
        if (!this.$route.params.symbolId) return;

        const element = this.elementsByTag[''].find((element) => element.id == this.$route.params.symbolId);
        if (!element) this.$router.push({ name: this.routePrefix + 's', params: { lang: this.$i18n.locale } });

        this.openModal(element);
    },
    methods: {
        openModal(element) {
            if (!this.$route.params.symbolId) {
                this.$router.push({ name: this.routePrefix, params: { symbolId: element.id, lang: this.$i18n.locale } });
            }
            if (this.isLoading) return;
            this.isModalActive = true;
            if (this.selectedElement.id === element.id) return;

            this.selectedElement = element;
        },
        handleCancelModal() {
            this.$router.push({ name: this.routePrefix + 's', params: { lang: this.$i18n.locale } });
        },
        defaultTag() {
            if (this.availableTags.length > 0) return this.availableTags[0];
            return undefined;
        },
    },
    computed: {
        selectedTag: {
            get: function () {
                const query = this.$router.currentRoute.query;
                if (!query) return this.defaultTag();

                const tag = this.$router.currentRoute.query.tag;
                if (tag !== undefined && !this.availableTags.includes(tag)) {
                    this.$router.replace({ query: { tag: undefined } });
                    return this.defaultTag();
                }
                return tag;
            },
            set: function (newValue) {
                this.$router.replace({ query: { tag: newValue } });
            },
        },
        elementsByTag() {
            this.refreshElementsByTag;
            const results = {};
            results[''] = [];
            this.elements.map((element) => {
                const augmentedElement = { ...element, localLabel: extractBestTranslation(element.label, this.$i18n.locale, DEFAULT_LOCALE) };
                results[''].push(augmentedElement);
                if (element['tags'] === '') return;
                const tags = element['tags'].split(',');
                for (const tag of tags) {
                    if (!results[tag]) results[tag] = [];
                    results[tag].push(augmentedElement);
                }
            });
            return results;
        },
        availableTags() {
            return Object.keys(this.elementsByTag);
        },
    },
};
</script>

<style lang="scss">
.sticky-tabs-page nav {
    position: sticky;
    top: 38px;
    position: -webkit-sticky;
    z-index: 30; // b-loader has z-index: 29
    background: white;
    padding: 20px 0px 20px 0px;
}
</style>
