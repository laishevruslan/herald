<template>
    <div class="modal-card" style="width: auto">
        <header class="modal-card-head">
            <p class="modal-card-title capitalize">
                {{ title }}
            </p>
            <button class="delete" aria-label="close" @click="$emit('close')" />
        </header>

        <section class="modal-card-body">
            <div class="row is-justify-content-space-between">
                <section class="palette-box" v-for="(palette, key) in palettes" :key="key">
                    <figure
                        class="palette-figure"
                        @click="
                            $emit('input', palette);
                            $emit('close');
                        ">
                        <div
                            :class="{ 'palette-color': true, tight: palette.length > 5 }"
                            v-for="(color, colorIndex) in palette"
                            :key="colorIndex"
                            :style="{ backgroundColor: color }">
                            <h4 class="color-name" :style="{ color: opposite[color] + '!important' }">
                                <span class="html-color">{{ color }}</span>
                            </h4>
                        </div>
                    </figure>
                </section>
            </div>
        </section>
    </div>
</template>

<script>
import { contrast, HEX2RGB } from '@/plugins/utils.js';

export default {
    name: 'modal-palettes',
    props: {
        palettes: { type: Array },
        title: { type: String },
    },
    computed: {
        opposite: function () {
            const oppositeColors = {};
            const black = { r: 0, b: 0, g: 0 };
            const white = { r: 255, b: 255, g: 255 };

            for (const palette of this.palettes) {
                for (const color of palette) {
                    if (oppositeColors[color]) continue;
                    oppositeColors[color] = contrast(HEX2RGB(color), black) > contrast(HEX2RGB(color), white) ? 'black' : 'white';
                }
            }
            return oppositeColors;
        },
    },
};
</script>

<style scoped>
.html-color {
    letter-spacing: 0.6px;
    text-transform: uppercase;
    font-weight: bold;
}

.palette-figure {
    display: flex;
    height: 13.5vw;
    max-height: 60px;
    width: 100%;
    border-radius: 4px;
    margin-left: 0px;
    border: 2px solid #eee;
    overflow: hidden;
    width: auto;
}

.palette-color {
    height: 100%;
    flex-grow: 1;
}

.palette-color.palette-color.tight .html-color {
    display: none;
}

.palette-color .color-name .html-color {
    font-size: small;
}

.palette-box {
    display: inline-block;
    vertical-align: top;
    margin-bottom: 2.5vw;
    background-color: #e2e2e2;
    border-radius: 0.75vw;
    box-shadow: 0 1px 0 0 rgba(19, 19, 19, 0.1);
    transition:
        transform 100ms,
        box-shadow 150ms;
    margin-left: 13px;
    margin-right: 13px;
    flex-grow: 1;
}

.palette-box:hover,
.color-box:hover {
    transform: scale(1.05);
    box-shadow: 0px 3px 10px -5px rgba(19, 19, 19, 0.3);
    cursor: pointer;
}

.html-color {
    letter-spacing: 0.6px;
    text-transform: uppercase;
    font-weight: bold;
}

.color-name {
    position: relative;
    top: 50%;
    text-align: center;
    color: inherit;
    padding: 0 10px;
    -webkit-transform: translateY(-50%);
}
</style>
