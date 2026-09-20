<template>
    <b-field v-if="value === undefined">
        <b-tooltip position="is-bottom" :label="$t('ADMIN.TRANSLATIONS.OVERRIDE_VALUE')">
            <b-button type="is-ghost" icon-left="pencil-plus" @click="$emit('input', defaultValue)"></b-button>
        </b-tooltip>
    </b-field>
    <b-field class="right-position" v-else>
        <b-tooltip position="is-left" multilined :label="$t('ADMIN.TRANSLATIONS.USE_DEFAULT_VALUE') ">
            <b-button type="is-ghost" icon-left="pencil-off" @click="$emit('input', null)"></b-button>
        </b-tooltip>
    </b-field>
</template>

<script>
export default {
    name: 'reset-picker',
    props: {
        value: undefined,
        defaultValue: undefined,
    },
};
</script>

<style scoped>
.right-position {
    position: absolute;
    right: 0px;
}

</style>