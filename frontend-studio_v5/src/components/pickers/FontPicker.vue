<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchFonts();
</script>

<template>
    <div>
        <b-dropdown aria-role="list" expanded :disabled="disabled" v-if="!rule.fixed">
            <template #trigger="{ active }">
                <b-button type="is-light" :icon-right="active ? 'menu-up' : 'menu-down'" :key="selectedFont" expanded>
                    <span :style="'font-family:' + selectedFontName">{{ selectedFont }}</span>
                </b-button>
            </template>
            <b-dropdown-item
                v-for="font in store.fonts"
                :value="font.name"
                :key="font.name"
                aria-role="listitem"
                @click="selectedFontName = font.fontName"
                :disabled="font.name === selectedFont">
                <span :style="'font-family:' + font.fontName">{{ font.name }}</span>
            </b-dropdown-item>
        </b-dropdown>
    </div>
</template>

<script>

export default {
    name: 'font-picker',
    components: {},
    data() {
        return {
            copyValue: this.value,
        };
    },
    props: {
        value: { type: String, default: '' },
        disabled: { type: Boolean, default: false },
        rule: { type: Object, default: () => ({}) }
    },
    computed: {
        selectedFont: function () {
            const store = useStore();
            const font = store.fonts.find((font) => font.fontName == this.selectedFontName);
            console.assert(font !== undefined);
            if (font === undefined) return undefined;
            return font.name;
        },
        selectedFontName: {
            get: function () {
                return this.copyValue;
            },
            set: function (newValue) {
                if (this.disabled) return;
                this.copyValue = newValue;
                this.$emit('input', newValue);
            },
        },
    },
};
</script>
