<template>
    <div class="card" style="padding: 15px">
        <div style="padding: 15px">
            <div
                class="checkerboard-background"
                :style="{
                    top: (100 - displayedDimensions.height) / 2 + '%',
                    left: (100 - displayedDimensions.width) / 2 + '%',
                    width: displayedDimensions.heidth + '%',
                    height: displayedDimensions.width + '%',
                }">
                <img :src="coloredSvgPreviewUrl.url" style="width: 100%" />
            </div>
        </div>
        <div class="card-content">
            <div class="content"></div>
            <palette-picker v-model="colorsValue" />
        </div>
        <footer class="card-footer"></footer>
    </div>
</template>

<script>
import { colorSvgString, prepareColors } from 'aktivisda-library';

import PalettePicker from '@/components/pickers/PalettePicker.vue';

export default {
    name: 'svg-color-picker',
    components: { PalettePicker },
    props: {
        value: { type: Object },
        svgString: { type: String },
        width: { type: Number },
        height: { type: Number },
    },
    computed: {
        displayedDimensions() {
            const ratio = this.width / this.height;
            const _dimensions = { width: 0, height: 0 };

            if (ratio < 4 / 3) {
                // portrait
                _dimensions.height = 100;
                _dimensions.width = (100 * ratio * 3) / 4;
            } else {
                // paysage
                _dimensions.height = ((100 / ratio) * 4) / 3;
                _dimensions.width = 100;
            }
            return _dimensions;
        },
        preparedSvgString() {
            return prepareColors(this.svgString);
        },
        coloredSvgPreviewUrl() {
            return colorSvgString(this.preparedSvgString, this.value);
        },
        colorsValue: {
            get: function () {
                return this.value;
            },
            set: function (newValue) {
                this.$emit('input', newValue);
            },
        },
    },
};
</script>

<style lang="scss">
.checkerboard-background {
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%);
    background-size: 25px 25px;
    background-position:
        0 0,
        12.5px 0,
        12.5px -12.5px,
        0px 12.5px;
    background-repeat: repeat;
}
</style>
