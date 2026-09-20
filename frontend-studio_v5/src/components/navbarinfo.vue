<template>
    <b-dropdown aria-role="list" :triggers="['hover', 'click']" expanded position="is-bottom-left" mobile-modal>
        <template #trigger="{ active }">
            <b-button type="is-complete-ghost" :icon-right="active ? 'menu-up' : 'menu-down'" icon-left="information-outline" />
        </template>

        <b-dropdown-item class="is-version" :custom="true">
            <span class="has-text-primary">{{ $t('CHANGELOG.VERSION') }}</span>
            <span class="has-text-grey">{{ version }}</span>
            <!-- <span class='has-text-grey' style='font-weight:normal; font-size:small'>(2021-07-08)</span> -->
        </b-dropdown-item>
        <b-dropdown-item class="is-version" :custom="true">
            <span class="has-text-secondary">{{ $t('CHANGELOG.LAST_UPDATE') }}</span>
            <span class="has-text-grey">{{ buildUpdate }}</span>
            <!-- <span class='has-text-grey' style='font-weight:normal; font-size:small'>(2021-07-08)</span> -->
        </b-dropdown-item>
        <b-dropdown-item has-link>
            <a href="https://framagit.org/aktivisda/aktivisda" target="_blank">
                {{ $t('CHANGELOG.CONTRIBUTE') }}
            </a>
        </b-dropdown-item>
    </b-dropdown>
</template>

<script>
import packageFile from '../../package.json';

export default {
    name: 'navbar-info',
    data() {
        return {
            version: packageFile.version,
        };
    },
    computed: {
        buildUpdate() {
            const date = new Date(BUILD_UPDATE);
            const dateStr = date.toLocaleDateString(`${this.$i18n.locale}`, { year: 'numeric', month: 'numeric', day: 'numeric' });
            return dateStr;
        },
    },
    methods: {},
};
</script>

<style lang="scss" scoped>
.is-version {
    flex-direction: column;
    align-items: flex-start;
    display: flex;
    font-weight: bold;
}
</style>
