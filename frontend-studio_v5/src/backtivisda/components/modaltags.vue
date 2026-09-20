<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchTags();
store.fetchConfig();
</script>

<template>
    <div class="modal-card" style="width: auto">
        <header class="modal-card-head">
            <p class="modal-card-title capitalize">{{ $t('ADMIN.TAGS.CTA') }}</p>
            <button class="delete" aria-label="close" @click="$emit('close')" />
        </header>

        <section class="modal-card-body" style="min-height: 400px">
            <b-dropdown>
                <template #trigger>
                    <b-button icon-left="menu-down">{{ $t('ADMIN.BUTTONS.ADD_NEW_LANG') }}</b-button>
                </template>
                <b-dropdown-item
                    v-for="(lang, key) in store.langs"
                    :key="key"
                    :disabled="translations[lang.code] !== undefined"
                    @click="translations[lang.code] = ''">
                    {{ lang.text }}
                </b-dropdown-item>
            </b-dropdown>

            <b-field v-for="code in Object.keys(translations).filter((lang) => translations[lang] !== undefined)" :key="code" :label="code">
                <b-input v-model="translations[code]" :placeholder="$t('COMMON.LABEL')"></b-input>
                <b-button icon-left="close" @click="translations[code] = undefined" />
            </b-field>

            <b-field :label="$t('ADMIN.TAGS.HELP')">
                <b-input v-model="tag" placeholder=""></b-input>
            </b-field>

            <b-button
                type="is-primary"
                @click="
                    store.updateOrCreateTag(tag, translations);
                    $emit('close', tag);
                "
                >{{ $t('ADMIN.TAGS.ADD_BUTTON') }}</b-button
            >
        </section>
    </div>
</template>

<script>
export default {
    name: 'modal-tags',
    props: {},
    computed: {},
    data() {
        const store = useStore();

        return {
            tag: '',
            translations: Object.assign({}, ...store.langs.map((lang) => ({ [lang.code]: undefined }))),
        };
    },
};
</script>

<style scoped></style>
