<template>
    <img-comparison-slider class="slider-image-split rendered" tabindex="0">
        <img slot="first" :src="beforeImage" width="100%" />
        <img slot="second" :src="afterImage" width="100%" />
    </img-comparison-slider>
</template>

<script>
export default {
    name: 'BeforeAfterImage',
    props: {
        value: {
            type: Number,
            default: 50,
        },
        beforeImage: {
            type: String,
            default: '',
        },
        afterImage: {
            type: String,
            default: '',
        },
        step: {
            type: Number,
            default: 0.1,
        },
    },
    data() {
        return {
            width: null,
            compareWidth: this.value,
        };
    },
};
</script>

<style scoped lang="scss">
@import '@/assets/local/buefy.scss';
.slider-image-split {
    --divider-width: 4px;
    --divider-color: #{$primary};

    border: 1px solid $primary;
}
</style>
