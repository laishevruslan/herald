<script setup>
import { useStore } from '@datastore';

import { useCredentialsStore } from '@/backtivisda/credentials';

const store = useStore();

store.fetchTags();
store.fetchConfig();
</script>

<template>
    <div class="modal-card" style="width: auto">
        <header class="modal-card-head">
            <p class="modal-card-title capitalize">{{ $t('ADMIN.TEMPLATES.MODAL.TITLE') }}</p>
            <button class="delete" aria-label="close" @click="$emit('close')" />
        </header>

        <section class="modal-card-body" style="min-height: 400px">
            <p>{{ $t('ADMIN.TEMPLATES.MODAL.WARNING') }}</p>
            <div class="container columns">
                <div class="column">
                    <b-field label="$t('COMMON.LABEL')">
                        <label-picker v-model="label" />
                    </b-field>
                    <b-field :label="$t('ADMIN.TEMPLATES.MODAL.TAGS_SELECTION')">
                        <b-select multiple native-size="8" v-model="tags">
                            <option v-for="(_, tag) in store.tags" :key="tag" :value="tag">{{ store.tagTranslation(tag, $i18n.locale) }}</option>
                        </b-select>
                    </b-field>
                </div>
                <div class="column">
                    <img :src="jpegUrl" class="template-preview" />
                </div>
            </div>

            <b-loading :active="loading" :is-full-page="false" class="primary-loading"></b-loading>

            <b-button v-if="currentTemplateId !== undefined" type="is-primary" :disabled="loading" style="margin: 0 10px" @click="replaceTemplate">
                {{ $t('ADMIN.TEMPLATES.MODAL.UPDATE') }}
            </b-button>

            <b-button type="is-danger" :disabled="loading" style="margin: 0 10px" @click="addNewTemplate">{{ $t('ADMIN.TEMPLATES.MODAL.CREATE') }}</b-button>
        </section>
    </div>
</template>

<script>
import { objectToJsonFile } from '@/plugins/utils';

import LabelPicker from '@/backtivisda/components/labelpicker';
import { generateId } from 'aktivisda-library';

export default {
    name: 'modal-template',
    components: { LabelPicker },
    computed: {
        tags: {
            get() {
                if (this.tagsStr === '') return [];
                return this.tagsStr.split(',');
            },
            set(newValue) {
                this.tagsStr = newValue.join(',');
            },
        },
        currentTemplate() {
            return useStore().templateById(this.currentTemplateId);
        },
    },
    props: {
        json: Object,
        jpegUrl: String,
        currentTemplateId: String,
    },
    data() {
        const langs = useStore().langs;
        return {
            tagsStr: '',
            label: Object.assign({}, ...langs.map((lang) => ({ [lang.code]: undefined }))),
            loading: false,
        };
    },
    mounted: function () {
        if (this.currentTemplate !== undefined) {
            this.tagsStr = this.currentTemplate.tags;
            this.label = this.currentTemplate.label;
        }
    },

    methods: {
        replaceTemplate() {
            return this.createOrReplaceTemplate(this.currentTemplateId);
        },
        addNewTemplate() {
            return this.createOrReplaceTemplate(generateId());
        },
        createOrReplaceTemplate(templateId) {
            this.loading = true;

            fetch(this.jpegUrl)
                .then((res) => res.blob()) // Gets the response and returns it as a blob
                .then((previewBlob) => {
                    const data = new FormData();
                    const previewFile = new File([previewBlob], `previews/${this.id}.jpg`);
                    data.append('image', previewFile);

                    useCredentialsStore()
                        .post('/thumbnail', data)
                        .then((response) => {
                            if (!response.ok) {
                                this.$buefy.snackbar.open({
                                    duration: 6000,
                                    message: this.$t('ADMIN.TEMPLATES.MODAL.ERRORS.THUMBNAILING'),
                                    type: 'is-danger',
                                    cancelText: this.$t('BUTTONS.CANCEL'),
                                    position: 'is-bottom',
                                    actionText: null,
                                });
                                this.loading = false;
                                this.$emit('close');
                                throw new Error(this.$t('ADMIN.TEMPLATES.MODAL.ERRORS.THUMBNAILING'));
                            }
                            return response.blob();
                        })
                        .then((thumbnailBlob) => {
                            const thumbnailFile = new File([thumbnailBlob], `thumbnails/${this.id}.webp`);

                            const templateFile = objectToJsonFile(this.json);

                            this.json['document']['id'] = templateId;
                            useStore().createOrReplaceTemplate(
                                {
                                    id: templateId,
                                    changed: true,
                                    width: this.json['document']['width'],
                                    height: this.json['document']['height'],
                                    filename: `${templateId}.json`,
                                    preview: 'previews/' + templateId + '.jpeg',
                                    thumbnail: 'thumbnails/' + templateId + '.webp',
                                    tags: this.tagsStr,
                                    label: this.label,
                                },
                                templateFile,
                                previewFile,
                                thumbnailFile,
                            );

                            this.loading = false;
                            this.$emit('close');
                        })
                        .catch((error) => {
                            this.$buefy.snackbar.open({
                                duration: 6000,
                                message: this.$t('ADMIN.TEMPLATES.MODAL.ERRORS.THUMBNAILING'),
                                type: 'is-danger',
                                cancelText: this.$t('BUTTONS.CANCEL'),
                                position: 'is-bottom',
                                actionText: null,
                            });

                            console.error(error);
                            this.loading = false;
                        });
                });
        },
    },
};
</script>

<style scoped>
img.template-preview {
    max-width: 300px;
    max-height: 300px;
    display: block;
    margin: 20px auto;
}
</style>
