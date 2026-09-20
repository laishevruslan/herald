<script setup>
import { useStore } from '@datastore';
// eslint-disable-next-line no-unused-vars
const store = useStore();
</script>

<template>
    <div :class="'is-mobile columns mosaic ' + (openableElements ? 'hoverable' : '')" style="justify-content: center">
        <div
            class="column"
            :style="{ padding: '0px', 'max-width': `min(${columnWidth}px, calc(calc(100vw - 40px)/${nbColumns}))` }"
            v-for="(column, columnIndex) in columns"
            :key="columnIndex">
            <div v-for="(element, index) in column[0]" :key="'gallery-' + index + '-' + columnIndex" :data-symbol-preview="element.id">
                <router-link v-if="openableElements" :to="{ name: 'editor', params: { templateId: element.id, lang: $i18n.locale } }">
                    <div class="card-image" :data-badge="element.isNew ? $t('BUTTONS.NEW') : ''" style="margin: 4px 3px">
                        <figure class="image contain-image">
                            <lazy-load-image :src="store.imageThumbnail(element.id, path)" :alt="element.description" />
                        </figure>
                    </div>
                </router-link>
                <div v-else class="card-image" :data-badge="element.isNew ? $t('BUTTONS.NEW') : ''" style="margin: 4px 3px">
                    <figure class="image contain-image">
                        <lazy-load-image :src="store.imageThumbnail(element.id, path)" :alt="element.description" />
                    </figure>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import LazyLoadImage from '@/components/lazyloadimage.vue';

export default {
    name: 'mosaic-images',
    components: { LazyLoadImage },
    props: {
        path: {
            type: String,
            default: 'templates',
        },
        columnWidth: {
            type: Number,
            default: 100,
        },
        columnHeight: {
            type: Number,
            default: 500,
        },
        nbColumns: {
            type: Number,
            default: 3,
        },
        elements: {
            type: Array,
            default: () => {
                [];
            },
        },
        openableElements: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        columns() {
            const tt = this.elements;
            tt.sort(() => Math.random() - 0.5);
            const maxHeight = 480;
            const _columns = [];
            for (let k = 0; k < this.nbColumns; ++k) {
                _columns.push([[], 0]);
            }

            for (const t of tt) {
                const height = (t.height * 100) / t.width;
                for (const col in _columns) {
                    if (_columns[col][1] + height >= maxHeight) continue;

                    _columns[col][1] += height;
                    _columns[col][0].push(t);
                    break;
                }
            }
            return _columns;
        },
    },
};
</script>

<style lang="scss" scoped>
@import '@/assets/local/buefy.scss';

.hoverable.mosaic {
    .card-image:hover {
        /* border: 2px solid red; */
        /* margin: 3px !important; */
        box-shadow:
            0 0.5em 1em -0.125em $primary,
            0 0px 0 1px $primary-light;
        cursor: pointer;
    }
}
</style>
