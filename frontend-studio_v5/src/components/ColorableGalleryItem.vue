<script setup>
import { useStore } from '@datastore';
// eslint-disable-next-line no-unused-vars
const store = useStore();
</script>

<template>
    <div
        :class="{
            'gallery-card': true,
            card: true,
            box: true,
            'is-flex': true,
            'is-flex-direction-column': true,
            'is-justify-content-space-between': true,
            [element['status']]: true,
        }"
        style="width: 120px; margin: 5px"
        @click="handleClick"
        :data-symbol-preview="element.id">
        <div
            class="card-image"
            :data-badge="element['status'] && element['status'] !== 'unchanged' ? element['status'] : element['isNew'] ? $t('BUTTONS.NEW') : ''">
            <figure class="image contain-image">
                <lazy-load-image :src="store.imageThumbnail(element.id, path)" :alt="element.description" />
            </figure>
        </div>
        <div class="card-content">
            {{ element.localLabel }}
        </div>
    </div>
</template>

<script>
import LazyLoadImage from '@/components/lazyloadimage.vue';

export default {
    name: 'ColorableGalleryItem',
    components: { LazyLoadImage },
    props: {
        element: {
            type: Object,
            default: () => {
                [];
            },
        },
        path: {
            type: String,
            default: '',
        },
    },
    methods: {
        handleClick() {
            this.$emit('click');
        },
    },
};
</script>

<style lang="scss">
.changed,
.deleted {
    border: 1px dashed var(--primary-color);
}

.deleted::before {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
    z-index: 2;
    content: '';
    opacity: 0.2;
    background: linear-gradient(
        45deg,
        var(--primary-color) 12.5%,
        #fff 12.5%,
        #fff 37.5%,
        var(--primary-color) 37.5%,
        var(--primary-color) 62.5%,
        #fff 62.5%,
        #fff 87.5%,
        var(--primary-color) 87.5%
    );
    background-size: 100px 100px;
    background-position: 50px 50px;
}
</style>
