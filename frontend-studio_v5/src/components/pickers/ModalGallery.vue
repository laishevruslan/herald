<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchImages();
</script>

<template>
    <div class="modal-card" style="width: auto">
        <header class="modal-card-head">
            <p class="modal-card-title">
                {{ title }}
            </p>
            <button class="delete" aria-label="close" @click="$emit('close')" />
        </header>

        <section class="modal-card-body">
            <article class="message is-primary">
                <div class="message-body" v-html="message"></div>
            </article>

            <b-tabs type="is-toggle" expanded multiline class="sticky-tabs-modal">
                <b-tab-item :label="store.tagTranslation('all', $i18n.locale)" :key="-1">
                    <div class="container is-flex is-flex-wrap-wrap is-justify-content-space-around">
                        <div
                            class="gallery-card card box is-flex is-flex-direction-column is-justify-content-space-between"
                            style="width: 150px; margin: 5px"
                            v-for="(element, index) in elements['all']"
                            :key="'gallery-' + index"
                            @click="
                                $emit('input', element.id);
                                $emit('close');
                            "
                            :data-symbol-preview="element.id">
                            <div class="card-image" :data-badge="element['isNew'] ? $t('BUTTONS.NEW') : ''">
                                <figure class="image contain-image">
                                    <lazy-load-image :src="store.imageThumbnail(element.id, category)" :alt="element.description" />
                                </figure>
                            </div>
                            <div class="card-content">
                                {{ element.localLabel }}
                            </div>
                        </div>
                    </div>
                </b-tab-item>
                <b-tab-item v-for="(tag, index) in availableTags" :label="store.tagTranslation(tag, $i18n.locale)" :key="index">
                    <div class="container is-flex is-flex-wrap-wrap is-justify-content-space-around">
                        <div
                            class="gallery-card card box is-flex is-flex-direction-column is-justify-content-space-between"
                            style="width: 150px; margin: 5px"
                            v-for="(element, index) in elements[tag]"
                            :key="'gallery-' + index"
                            @click="
                                $emit('input', element.id);
                                $emit('close');
                            "
                            :data-symbol-preview="element.id">
                            <div class="card-image">
                                <figure class="image contain-image">
                                    <lazy-load-image :src="store.imageThumbnail(element.id, category)" :alt="element.description" />
                                </figure>
                            </div>
                            <div class="card-content">
                                {{ element.localLabel }}
                            </div>
                        </div>
                    </div>
                </b-tab-item>
            </b-tabs>
            <!-- <div class='row is-justify-content-center is-flex-wrap' style='padding: 20px 0px' v-if='availableTags'>
                <b-field>
                    <b-checkbox-button

                        v-model='choosenTags'
                        :key='index'
                        :native-value="tag">
                        <span>{{ $t('TAGS.' + tag ) }}</span>
                    </b-checkbox-button>
                </b-field>
            </div> -->
        </section>
    </div>
</template>

<script>
import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';
import { extractBestTranslation } from 'aktivisda-library';

import LazyLoadImage from '@/components/lazyloadimage.vue';

export default {
    name: 'gallery',
    components: { LazyLoadImage },
    props: {
        value: { type: String },
        title: { type: String },
        message: { type: String },
        category: { type: String },
        list: { type: Array },
    },
    data: () => ({
        choosenTagsIndex: 2,
        x: undefined,
    }),
    computed: {
        choosenTags() {
            return this.availableTags[this.choosenTagsIndex];
        },
        elements() {
            const results = { all: [] };
            for (const tag of this.availableTags) {
                results[tag] = [];
            }

            this.augmentedElements.map((element) => {
                results['all'].push(element);
                if (element['tags'] === '') {
                    return;
                }

                const tags = element['tags'].split(',');
                for (const tag of tags) {
                    results[tag].push(element);
                }
            });
            return results;
        },
        augmentedElements() {
            return this.list.map((element) => {
                return { ...element, localLabel: extractBestTranslation(element.label, this.$i18n.locale, DEFAULT_LOCALE) };
            });
        },
        availableTags() {
            const all_tags = [];
            for (let k = 0; k < this.list.length; ++k) {
                const element = this.list[k];
                let tags = element['tags'];
                if (!tags) continue;
                tags = tags.split(',');
                for (let t of tags) {
                    if (all_tags.includes(t)) continue;
                    all_tags.push(t);
                }
            }
            return all_tags;
        },
    },
};
</script>

<style lang="scss">
.sticky-tabs-modal nav {
    position: sticky;
    top: -20px;
    position: -webkit-sticky;
    z-index: 30; // b-loader in lazy-load-image has z-index: 29
    background: white;
    padding: 30px 0px 20px 0px;
}
</style>
