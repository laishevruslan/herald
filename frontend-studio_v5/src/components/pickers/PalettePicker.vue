<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchPalettes();
</script>

<template>
    <div class="row">
        <div class="row" style="flex-grow: 1; margin-right: 5px; margin-top: auto; margin-bottom: auto">
            <color-picker
                v-for="(c, index) in selectedPalette"
                :randomShortcut="false"
                :key="index + '-' + rerenderColors"
                :value="selectedPalette[index]"
                @input="($event) => updateColor(index, $event)"
                :dropColorEnabled="dropColorEnabled" />
        </div>
        <div>
            <b-tooltip :label="$t('PALETTES.CHOOSE')" style="margin: 2px">
                <b-button @click="editPallet" icon icon-left="square-edit-outline"></b-button>
            </b-tooltip>

            <b-tooltip :label="$t('PALETTES.SHUFFLE')" style="margin: 2px">
                <b-button @click="shufflePallet" icon icon-left="sync" :disabled="paletteSize === 1"></b-button>
            </b-tooltip>

            <b-tooltip :label="$t('EDIT.TIPS.RANDOM_SELECTION')" style="margin: 2px" position="is-left">
                <b-button
                    id="random-palette-button"
                    @click="randomPallet"
                    icon
                    icon-left="dice-multiple"
                    :disabled="availablePalettes.length === 0"></b-button>
            </b-tooltip>
        </div>
    </div>
</template>

<script>
import ColorPicker from '@/components/pickers/ColorPicker.vue';
import ModalPalettes from '@/components/pickers/ModalPalettes.vue';

export default {
    name: 'palette-picker',
    components: { ColorPicker },
    props: {
        value: Object,
        dropColorEnabled: { type: Boolean, default: false },
    },
    data() {
        return {
            openedModal: false,
            copyValue: this.value,
            rerenderColors: 0,
        };
    },
    computed: {
        selectedPalette() {
            if (!this.copyValue) return [];
            return Object.values(this.copyValue);
        },
        selectedKeys() {
            if (!this.copyValue) return [];
            return Object.keys(this.copyValue);
        },
        availablePalettes() {
            const av = useStore().palettes
                .filter((pallet) => pallet.length >= this.selectedPalette.length)
                .map((palette) => palette.slice(0, this.paletteSize));

            const av_string = av.map((palette) => palette.join(','));
            return [...new Set(av_string)].map((str) => str.split(','));
        },
        paletteSize() {
            return this.selectedPalette.length;
        },
    },
    methods: {
        shufflePallet() {
            if (this.paletteSize == 2) {
                this.emitPalette([this.selectedPalette[1], this.selectedPalette[0]]);
                return;
            }

            this.selectedPalette.sort(() => Math.random() - 0.5);
            this.emitPalette(this.selectedPalette);
        },
        editPallet() {
            const store = useStore();
            this.$buefy.modal.open({
                parent: this,
                component: ModalPalettes,
                hasModalCard: true,
                trapFocus: true,
                props: {
                    title: this.$tc('PALETTES.LABEL', store.palettes.length),
                    palettes: this.availablePalettes,
                },
                events: {
                    input: (palette) => this.selectPalette(palette),
                },
                canCancel: false,
            });
        },
        randomPallet() {
            if (this.availablePalettes.length === 0) return;

            let randomPalletIndex = Math.floor(Math.random() * this.availablePalettes.length);
            let newPalette = this.availablePalettes[randomPalletIndex];

            if (this.availablePalettes.length === 1 && newPalette.join(',') === this.selectedPalette.join(',')) {
                console.warn('Try to find an available palette but no new ones available.');
                return;
            }
            while (this.availablePalettes.length > 0 && newPalette.join(',') === this.selectedPalette.join(',')) {
                randomPalletIndex = Math.floor(Math.random() * this.availablePalettes.length);
                newPalette = this.availablePalettes[randomPalletIndex];
            }
            this.emitPalette(newPalette);
        },
        selectPalette(palette) {
            this.emitPalette(palette);
        },
        emitPalette(pallet) {
            const output = {};
            for (let k = 0; k < this.selectedKeys.length; ++k) {
                output[this.selectedKeys[k]] = pallet[k];
            }
            this.copyValue = output;
            this.$emit('input', this.copyValue);
            // ++this.rerenderColors;
        },
        updateColor(index, evt) {
            const pallet = this.selectedPalette;
            pallet[index] = evt;
            const output = {};
            for (let k = 0; k < this.selectedKeys.length; ++k) {
                output[this.selectedKeys[k]] = pallet[k];
            }
            this.copyValue = output;
            this.$emit('input', this.copyValue);
        },
    },
    mounted() {},
    watch: {
        value: {
            immediate: true,
            deep: true,
            handler(newValue) {
                this.copyValue = newValue;
            },
        },
    },
};
</script>

<style scoped>
.pallet-list-thumb {
    cursor: pointer;
    height: 40px;
    width: auto;
    border: 1px solid #aaa;
    margin: 3px 1px;
}

.pallet-list-thumb .label {
    text-align: center;
    font-size: 20px;
    text-transform: uppercase;
    font-weight: bold;
    line-height: 38px;
    color: white;
    opacity: 0;
}

.pallet-list-thumb .label:hover {
    opacity: 1;
    mix-blend-mode: exclusion;
}
</style>
