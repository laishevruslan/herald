<template>
    <div class="input-group" v-if="$isBacktivisda || !rule.fixed">
        <b-collapse :open="this.open">
            <template #trigger="props">
                <h4 class="capitalize">
                    <b-icon :icon="!props.open ? 'menu-down' : 'menu-up'"></b-icon>
                    {{ label }}
                </h4>
            </template>
            <div class="enabled-switch-slot">
                <slot name="enabled-switch" />
            </div>
            <div v-if="!rule.fixed" style="margin-top: 5px">
                <slot name="pickers" />
            </div>
        </b-collapse>
    </div>
</template>

<script>
export default {
    name: 'picker-container',
    components: {},
    props: {
        label: String,
        open: { type: Boolean, default: true },
        rule: { type: Object, default: () => ({})}
    },
};
</script>

<style lang="scss">
@import '@/assets/local/buefy.scss';

.input-components {
    //padding: 0 25px;
    h4 {
        color: var(--primary-color);
        font-weight: bold;
        text-align: left;
        margin-bottom: 5px;
        margin-top: 5px;
    }

    & > div {
        padding: 10px 0;
        margin: 0px;
    }

    .input-group {
        background: $primary-light; // #f4eef4; // Todo compute
        padding: 7px 25px;
        margin: 10px 0px;
        position: relative;

        .enabled-switch-slot {
            position: absolute;
            top: 5px;
            right: 10px;
        }
    }

    .enabled-switch-slot {
        max-width: 50%;
    }
}
</style>
