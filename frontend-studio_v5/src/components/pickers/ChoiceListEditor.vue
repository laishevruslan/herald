<script setup>
import { DEFAULT_LOCALE } from '@/plugins/i18n-utils';
import { generateId, extractBestTranslation } from 'aktivisda-library';
import { useVidaStore } from '@/vida/store.js';
import { useStore } from '@datastore';


const store = useStore();
store.fetchConfig();

</script>

<template>
    <div class="modal-card" style="width: auto">
        <header class="modal-card-head">
            <p class="modal-card-title">Choix des options de texte
            </p>
        </header>

        <section class="modal-card-body">
            <p>
                Vous pouvez renseigner ci-dessous la liste des choix et les traduire dans les différentes langues.
            </p>
            <div class="columns">
                <div class="column">
                    <b-field :label="$t('ADMIN.BUTTONS.SELECT_LANG')">
                        <b-dropdown append-to-body aria-role="list"
                            :max-height="500" scrollable trap-focus>
                            <template #trigger>
                                <a class="navbar-item" role="button">
                                    <b-icon size="is-small" icon="translate"></b-icon>
                                    <span>{{ editingLang.flag }}</span>
                                </a>
                            </template>
                            <b-dropdown-item
                                v-for="lang, key in store.config.availableLangs"
                                :key="key" @click="editingLang = lang"
                                :disabled="lang.code === editingLang.code">
                                {{ lang.flag }} {{ lang.text }}
                            </b-dropdown-item>
                        </b-dropdown>
                    </b-field>
                </div>
                <div class="column">
                    <b-field label="Ajouter un nouveau choix">
                        <b-button icon @click="newChoice" icon-left="playlist-plus" type="is-sucess"></b-button>
                    </b-field>
                </div>

            </div>
            <div class="choices-grid" :key="Object.keys(copyChoices).length">
                <template v-for="choice, index in copyChoices">
                    <template v-if="choice !== undefined">
                        <div :key="index + 'label'" class="choice-element choice-label">
                            {{ extractBestTranslation(choice, $i18n.locale, DEFAULT_LOCALE) }}
                        </div>
                        <div :key="index + 'input'" class="choice-element choice-input">
                            <b-input :value="choice[editingLang.code]" @input="(text) => update(index, text)"/>
                        </div>
                        <div :key="index + 'toolbar'" class="choice-toolbar choice-element">
                            <b-button icon @click="() => remove(index)" icon-left="delete" type="is-danger"></b-button>
                        </div>
                    </template>
                </template>
            </div>
        </section>
    </div>
</template>

<script>
const allLangs = require('@/assets/langs.json');

export default {
    name: 'ChoicesListEditor',
    components: { },
    props: {
        choices: undefined
    },
    data: function() {

        const vStore = useVidaStore();

        const currentLocale = vStore.displayedOrEditingLang;
        const editingLang = allLangs.find((x) => x.code === currentLocale);
        return {
            editingLang,
            copyChoices: {... this.choices }
        }
    },
    methods: {
        remove(choiceIndex) {
            // Required for reactivity
            this.copyChoices[choiceIndex] = undefined;
            delete this.copyChoices[choiceIndex];
            this.$emit('input', { [choiceIndex]: null })
        },
        update(choiceIndex, text) {
            if (text === '') text = null;

            this.copyChoices[choiceIndex][this.editingLang.code] = text;

            this.$emit('input', { [choiceIndex]: { [this.editingLang.code]: text } })

        },
        newChoice() {
            const uuid = generateId();
            // Required for reactivity
            this.copyChoices = {[uuid]: {}, ...this.copyChoices};
            this.$emit('input', { [uuid]: {}})
        }
    }
};
</script>

<style lang="scss">
.choices-grid {
    display: flex;
    flex-wrap: wrap;
}

.choice-element {
    margin: 4px 0;
}

.choice-label {
    flex-basis: 30%;
}

.choice-input {
    flex-basis: 60%;
}

.choice-toolbar {
    flex-basis: 10%;
}

</style>
