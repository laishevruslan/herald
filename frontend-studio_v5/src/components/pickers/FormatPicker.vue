<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchColors();
store.fetchFormats();
</script>

<template>
    <div class="modal-card" style="width: auto">
        <header class="modal-card-head">
            <p class="modal-card-title">
                {{ $tc('FORMATS.LABEL', 2) }}
            </p>
            <button class="delete" aria-label="close" @click="$emit('close')" />
        </header>

        <section class="modal-card-body formats-section">
            <div class="container is-flex is-flex-wrap-wrap is-justify-content-space-around">
                <div
                    class="card gallery-card box"
                    style="margin: 10px; width: 250px"
                    v-for="format in augmentedFormats"
                    :key="format.id"
                    @click="
                        $emit('input', format.id);
                        $emit('close');
                    ">
                    <div class="card-image">
                        <figure class="image">
                            <div
                                class="format-thumbnail"
                                :style="{
                                    backgroundColor: format.color,
                                    width: format.thumbnailWidth + 'px',
                                    height: format.thumbnailHeight + 'px',
                                }">
                                <div class="format-label" :style="{ color: format.textColor }">{{ format.width }} x {{ format.height }}</div>
                            </div>
                        </figure>
                    </div>
                    <div class="card-content">
                        {{ extractBestTranslation(format.label, $i18n.locale, DEFAULT_LOCALE) }}
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
import { contrast, HEX2RGB } from '@/plugins/utils.js';

import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';
import { extractBestTranslation } from 'aktivisda-library';


export default {
    name: 'formatpicker',
    data: () => ({
        colors: useStore().colors.filter((color) => color.html !== '#ffffff'),
    }),
    props: {
        value: { type: String },
    },
    computed: {
        augmentedFormats: function () {
            const black = { r: 0, b: 0, g: 0 };
            const white = { r: 255, b: 255, g: 255 };

            const height = 120;
            return useStore().formats.map((format) => {
                // We don't use useStore.randElement(’colors’) to avoid #ffffff
                const color = this.colors[Math.floor(Math.random() * this.colors.length)];
                const ratio = format.width / format.height;
                format.thumbnailWidth = Math.round(ratio * height);
                format.thumbnailHeight = height;
                format.color = color.html;
                format.textColor = contrast(HEX2RGB(format.color), black) > contrast(HEX2RGB(format.color), white) ? '#222' : '#eee';
                format.preview;
                return format;
            });
        },
    },
};
</script>

<style scoped>
.formats-section figure {
    display: flex;
    justify-content: center;
    padding: 10px;
}

.format-thumbnail .format-label {
    font-size: 20px;
    top: 50%;
    position: relative;
    text-align: center;
    -webkit-transform: translateY(-50%);
}
</style>
