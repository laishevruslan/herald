<script setup>
import { useVidaStore } from '@/vida/store.js';
import ResetPicker from '@/components/pickers/ResetPicker.vue';

</script>


<template>
    <div>
        <reset-picker v-if="resettable"
            :defaultValue="type === 'text' ? '' : Object.keys(choices)[0]"
            :value="copyValue" @input="(e) => emit(e)"/>

        <template v-if="!rule.fixed && copyValue !== undefined">
            <b-input v-if="type==='text'"
            :value="copyValue" @input="(e) => $emit('input', e)" type="textarea"
            :class="textJustification" :placeholder="$t('TEXTS.PLACEHOLDER')"></b-input>
            <b-dropdown v-else aria-role="list" expanded>
                <template #trigger="{ active }">
                    <b-button type="is-light" :icon-right="active ? 'menu-up' : 'menu-down'" expanded>
                        <span>{{ currentChoice }}</span>
                    </b-button>
                </template>
                <b-dropdown-item
                    v-for="choice in translatedChoices"
                    :value="choice.value"
                    :key="choice.key"
                    @click="emit(choice.key)"
                    :disabled="copyValue === choice.value"
                >{{ choice.value }}</b-dropdown-item>
            </b-dropdown>
        </template>
    </div>

</template>

<script>
import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';
import { extractBestTranslation } from 'aktivisda-library';

export default {
    name: 'text-picker',
    props: {
        value: String,
        choices: { type: Object },
        resettable: { type: Boolean },
        rule: { type: Object, default: () => ({}) },
        type: { type: String }
    },
    data: function () {
        return {
            copyValue: this.value,
            textJustification: "center",
        };
    },
    methods: {
        emit(value) {
            this.copyValue = value;
            this.$emit('input', value)
        }
    },
    computed: {
        translatedChoices() {
            if (!this.choices) return [];
            const vStore = useVidaStore();
            return Object.keys(this.choices)
                .filter((key) => this.choices[key] !== undefined)
                .map((key) => {
                    const choice = this.choices[key];
                    return {
                        key,
                        value: extractBestTranslation(choice, vStore.displayedOrEditingLang,
                            DEFAULT_LOCALE)}
                });
        },
        currentChoice() {
            const choice = this.translatedChoices.find((v) => v.key === this.copyValue);
            if (choice === undefined) return '';
            return choice.value;
        }
    },
    watch: {
        value: function (newValue) {
            this.copyValue = newValue;
        },
    },
};
</script>
