<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchConfig();
</script>

<template>
    <div>
        <vida-navbar active="about" />
        <section class="hero">
            <div>
                <vida-transformer-title :content="$tc('ABOUT.LABEL', 2)" size="medium"
                    textAlign="center"></vida-transformer-title>
                <p class="subtitle">{{ $t('ABOUT.PAGE_DESCRIPTION') }}</p>
            </div>
        </section>

        <section style="margin-top: 50px">
            <h2 class="title"><instance-name /></h2>
            <p v-html="$t('CONFIG.about')"></p>
        </section>

        <section style="margin-top: 50px">
            <div class="container padding-30">
                <h2 class="title">{{ $t('ABOUT.AKTIVISDA.HEADER') }}</h2>
                <p v-html="$t('ABOUT.AKTIVISDA.FIRST_PARAGRAPH')"></p>
                <p style="margin-top: 10px" v-html="$t('ABOUT.AKTIVISDA.SECOND_PARAGRAPH')"></p>
            </div>
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title.vue';

import InstanceName from '@/components/ui/instance-name';

import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'About',
    metaInfo: function () {
        const store = useStore();
        return {
            title: `${this.$t('ABOUT.LABEL')}`,
            titleTemplate: '%s | Aktivisda.earth',
            meta: [
                { vmid: 'description', name: 'description', content: this.$t('ABOUT.PAGE_DESCRIPTION') },
                { property: 'og:title', vmid: 'og:title', content: `${this.$t('ABOUT.LABEL')} | ${store.config.id}.aktivisda` },
                { property: 'og:type', vmid: 'og:type', content: 'website' },
                { property: 'og:url', vmid: 'og:url', content: store.config.url },
                { property: 'og:description', vmid: 'og:description', content: `${this.$t('ABOUT.PAGE_DESCRIPTION')}` },
            ],
        };
    },
    components: { VidaNavbar, InstanceName, VidaTransformerTitle },
    mounted() {
        showSnackbarOnRedirection(this);
        document.dispatchEvent(new Event('x-app-rendered'));
    },
    data() {
        return {
            expandOnHover: false,
            mobile: 'reduce',
            reduce: false,
        };
    },
};
</script>

<style lang="scss">
.p-1 {
    padding: 1em;
}

.sidebar-page {
    display: flex;
    flex-direction: column;
    width: 100%;
    // min-height: 100%;
    min-height: 100vh;

    .sidebar-layout {
        display: flex;
        flex-direction: row;
        // min-height: 100%;
        min-height: 100vh;
    }
}

@media screen and (max-width: 1023px) {
    .b-sidebar {
        .sidebar-content {
            &.is-mini-mobile {

                &:not(.is-mini-expand),
                &.is-mini-expand:not(:hover) {
                    .menu-list {
                        li {
                            a {
                                span:nth-child(2) {
                                    display: none;
                                }
                            }

                            ul {
                                padding-left: 0;

                                li {
                                    a {
                                        display: inline-block;
                                    }
                                }
                            }
                        }
                    }

                    .menu-label:not(:last-child) {
                        margin-bottom: 0;
                    }
                }
            }
        }
    }
}

@media screen and (min-width: 1024px) {
    .b-sidebar {
        .sidebar-content {
            &.is-mini {

                &:not(.is-mini-expand),
                &.is-mini-expand:not(:hover) {
                    .menu-list {
                        li {
                            a {
                                span:nth-child(2) {
                                    display: none;
                                }
                            }

                            ul {
                                padding-left: 0;

                                li {
                                    a {
                                        display: inline-block;
                                    }
                                }
                            }
                        }
                    }

                    .menu-label:not(:last-child) {
                        margin-bottom: 0;
                    }
                }
            }
        }
    }
}

.is-mini-expand {
    .menu-list a {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
}
</style>
