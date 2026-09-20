<template>
    <b-dropdown :disabled="disabled" id="export-menu" :triggers="['hover']" aria-role="list" style="text-align: left">
        <template #trigger>
            <b-button :label="$t('EDIT.EXPORT.MAIN')" icon-right="menu-down" icon-left="download" />
        </template>
        <b-dropdown-item aria-role="listitem" has-link>
            <router-link id="export-png-button" :to="{ name: route, params: { templateId: templateId, lang: $i18n.locale, exportType: 'png' } }">
                {{ $t('EDIT.EXPORT.PNG') }}
            </router-link>
        </b-dropdown-item>
        <b-dropdown-item aria-role="listitem" has-link>
            <router-link id="export-jpg-button" :to="{ name: route, params: { templateId: templateId, lang: $i18n.locale, exportType: 'jpg' } }">
                {{ $t('EDIT.EXPORT.JPG') }}
            </router-link>
        </b-dropdown-item>
        <b-dropdown-item aria-role="listitem" has-link>
            <router-link id="export-pdf-button" :to="{ name: route, params: { templateId: templateId, lang: $i18n.locale, exportType: 'pdf' } }">
                {{ $t('EDIT.EXPORT.PDF') }}
            </router-link>
        </b-dropdown-item>
        <b-dropdown-item aria-role="listitem" has-link>
            <router-link
                id="export-template-button"
                :to="{ name: route, params: { templateId: templateId, lang: $i18n.locale, exportType: 'template' } }">
                {{ $t('EDIT.EXPORT.TEMPLATE') }}
            </router-link>
        </b-dropdown-item>
        <b-dropdown-item aria-role="listitem" has-link>
            <router-link id="export-link-button" :to="{ name: route, params: { templateId: templateId, lang: $i18n.locale, exportType: 'link' } }">
                {{ $t('EDIT.EXPORT.LINK') }}
            </router-link>
        </b-dropdown-item>
        <b-dropdown-item v-if="$isBacktivisda" aria-role="listitem" has-link>
            <router-link
                id="export-link-button"
                :to="{ name: route, params: { templateId: templateId, lang: $i18n.locale, exportType: 'database' } }">
                Enregistrer en base de données
            </router-link>
        </b-dropdown-item>
    </b-dropdown>
</template>

<script>
export default {
    name: 'export-menu',
    computed: {
        route: function () {
            if (this.templateId) return 'editor';
            else return 'editorNew';
        },
    },
    props: {
        advanced: Boolean,
        disabled: Boolean,
        templateId: String,
    },
};
</script>
