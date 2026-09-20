<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchImages();
</script>

<template>
    <div>
        <vida-navbar active="about" />
        <section class="hero">
            <div>
                <vida-transformer-title content="Synchroniser avec le dossier du projet" size="medium" textAlign="center"></vida-transformer-title>
            </div>
        </section>
        <section class="container">
            <div class="columns">
                <div class="column">
                    <h3>
                        {{ $tc('SVGS.LABEL', 2) }}
                    </h3>
                    <div class="container is-flex is-flex-wrap-wrap is-justify-content-space-around">
                        <colorable-gallery-item
                            v-for="(element, index) in store.images.filter((element) => element.status === 'added' || element.status === 'deleted')"
                            :key="'gallery-' + index"
                            :element="element"
                            @click="openModal(element.id, 'images')"
                            path="images" />
                    </div>
                </div>
                <div class="column">
                    <h3>
                        {{ $tc('BACKGROUND_IMAGES.LABEL', 2) }}
                    </h3>
                    <div class="container is-flex is-flex-wrap-wrap is-justify-content-space-around">
                        <colorable-gallery-item
                            v-for="(element, index) in store.backgrounds.filter(
                                (element) => element.status === 'added' || element.status === 'deleted',
                            )"
                            :key="'gallery-' + index"
                            :element="element"
                            @click="openModal(element.id, 'backgrounds')"
                            path="backgrounds" />
                    </div>
                </div>
                <div class="column">
                    <h3>
                        {{ $tc('TEMPLATES.LABEL', 2) }}
                    </h3>
                    <div class="container is-flex is-flex-wrap-wrap is-justify-content-space-around">
                        <colorable-gallery-item
                            v-for="(element, index) in store.templates.filter(
                                (element) => element.status === 'added' || element.status === 'deleted' || element.status === 'modified',
                            )"
                            :key="'gallery-' + index"
                            :element="element"
                            @click="openModal(element.id, 'templates')"
                            path="templates" />
                    </div>
                </div>
            </div>

            <b-loading :active="synchronizing" :is-full-page="false" class="primary-loading"></b-loading>

            <b-input v-model="commitMessage" :placeholder="$t('ADMIN.SYNC_REVIEW.COMMIT_PLACEHOLDER')"></b-input><br />
            <b-button type="is-primary" @click="synchronize" :disabled="synchronizing || store.modifiedElementsCount === 0">{{ $t('ADMIN.SYNC_REVIEW.PUBLISH_BUTTON') }}</b-button>
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title.vue';
import ColorableGalleryModal from '@/components/ColorableGalleryModal.vue';
import ColorableGalleryItem from '@/components/ColorableGalleryItem.vue';

import { showSnackbarOnRedirection } from '@/plugins/utils.js';
import { commit } from '@/backtivisda/plugins/gitlab.js';

export default {
    name: 'SyncReviewPage',
    components: { VidaNavbar, VidaTransformerTitle, ColorableGalleryItem },
    data: function() {
        return {
            commitMessage: this.$t('ADMIN.SYNC_REVIEW.DEFAULT_COMMIT_MESSAGE'),
            synchronizing: false,
        }
    },
    mounted() {
        showSnackbarOnRedirection(this);
    },
    methods: {
        openModal(imageId, category) {
            this.$buefy.modal.open({
                parent: this,
                component: ColorableGalleryModal,
                hasModalCard: true,
                trapFocus: true,
                width: 640,
                props: {
                    elementId: imageId,
                    galleryType: category,
                },
            });
        },

        async synchronize() {
            this.synchronizing = true;
            const store = useStore();

            let modifiedFiles = [];
            modifiedFiles = modifiedFiles.concat(await store.listModifiedFiles('images'));
            modifiedFiles = modifiedFiles.concat(await store.listModifiedFiles('backgrounds'));
            modifiedFiles = modifiedFiles.concat(await store.listModifiedFiles('templates'));

            modifiedFiles.push({
                action: 'update',
                file_path: 'local/data/symbols.json',
                content: store.symbolsjson,
            });

            modifiedFiles.push({
                action: 'update',
                file_path: 'local/data/backgrounds.json',
                content: store.backgroundsJson,
            });

            modifiedFiles.push({
                action: 'update',
                file_path: 'local/data/tags.json',
                content: store.tagsJson,
            });

            modifiedFiles.push({
                action: 'update',
                file_path: 'local/data/templates.json',
                content: store.templatesJson,
            });

            commit(modifiedFiles, this.commitMessage)
                .then(() => {
                    this.synchronizing = false;
                    store.reset();
                    this.$buefy.snackbar.open({
                        duration: 6000,
                        message: this.$t('ADMIN.SYNC_REVIEW.SUCCESS_MESSAGE'),
                        type: 'is-danger',
                        cancelText: this.$t('BUTTONS.CANCEL'),
                        position: 'is-bottom',
                        actionText: null,
                    });
                })
                .catch((error) => {
                    console.error(error);
                    this.synchronizing = false;
                    this.$buefy.snackbar.open({
                        duration: 6000,
                        message: this.$t('ADMIN.SYNC_REVIEW.ERROR'),
                        type: 'is-danger',
                        cancelText: this.$t('BUTTONS.CANCEL'),
                        position: 'is-bottom',
                        actionText: null,
                    });
                });
        },
    },
};
</script>
