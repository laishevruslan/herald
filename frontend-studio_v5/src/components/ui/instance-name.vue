<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchConfig();
</script>
<template>
    <span :class="{ 'instance-name-header': true, 'primary-background': primaryBackground }">
        <span>{{ store.config.id }}</span>
        <span>.aktivisda</span>
    </span>
</template>

<script>
export default {
    name: 'instance-name',
    props: {
        primaryBackground: {
            type: Boolean,
            default: true,
        },
    },
};
</script>

<style lang="scss" scoped>
span.instance-name-header {
    span {
        display: inline-block;
        font-weight: bold;
    }

    &.primary-background {
        :last-child {
            color: var(--secondary-color);
        }
    }
}
</style>
