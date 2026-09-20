<script setup>
import { useStore } from '@datastore';
import { useCredentialsStore } from '@/backtivisda/credentials';
const store = useStore();

store.fetchAll();
</script>

<template>
    <nav class="navbar is-fixed-top" role="navigation" :aria-label="$t('ADMIN.NAVBAR.ARIA-LABEL')">
        <div class="navbar-brand">
            <b-navbar-item tag="router-link" :to="{ name: 'welcome' }" style="font-size: 15px">
                <instance-name :primaryBackground="false" />
                <div style="font-weight: bold; margin-left: 5px">{{ $t('ADMIN.NAVBAR.LABEL') }}</div>
            </b-navbar-item>

            <a
                role="button"
                :class="{ 'navbar-burger': true, 'is-active': expanded }"
                aria-label="menu"
                aria-expanded="false"
                data-target="vidaNavbar"
                @click="expanded = !expanded">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </a>
        </div>

        <div id="vidaNavbar" :class="{ 'navbar-menu': true, 'is-active': expanded }">
            <div class="navbar-start">
                <b-navbar-item
                    tag="router-link"
                    :class="{ 'is-active': active === 'templates' }"
                    :to="{ name: 'templates', params: { lang: $i18n.locale } }"
                    :data-badge="store.modifiedTemplatesCount">
                    {{ $t('NAVBAR.TEMPLATES') }}
                </b-navbar-item>
                <b-navbar-item
                    tag="router-link"
                    :class="{ 'is-active': active == 'symbols' }"
                    :to="{ name: 'symbols', params: { lang: $i18n.locale } }"
                    :data-badge="store.modifiedImagesCount">
                    {{ $t('NAVBAR.SYMBOLS') }}
                </b-navbar-item>
                <b-navbar-item
                    tag="router-link"
                    :class="{ 'is-active': active === 'backgrounds' }"
                    :to="{ name: 'backgrounds', params: { lang: $i18n.locale } }"
                    :data-badge="store.modifiedBackgroundsCount">
                    {{ $t('NAVBAR.BACKGROUNDS') }}
                </b-navbar-item>
                <b-navbar-item
                    tag="router-link"
                    :class="{ 'is-active': active === 'colors' }"
                    :to="{ name: 'colors', params: { lang: $i18n.locale } }"
                    :data-badge="0">
                    {{ $t('NAVBAR.COLORS') }}
                </b-navbar-item>
                <b-navbar-item tag="router-link" :class="{ 'is-active': active === 'fonts' }" :to="{ name: 'fonts', params: { lang: $i18n.locale } }">
                    {{ $t('NAVBAR.FONTS') }}
                </b-navbar-item>
                <b-navbar-item
                    tag="router-link"
                    :class="{ 'is-active': active === 'qrcode' }"
                    :to="{ name: 'qrcode', params: { lang: $i18n.locale } }">
                    {{ $t('NAVBAR.QRCODE') }}
                </b-navbar-item>

                <b-navbar-item
                    tag="router-link"
                    :class="{ 'is-active': active === 'sync' }"
                    :to="{ name: 'sync', params: { lang: $i18n.locale } }"
                    :data-badge="store.modifiedElementsCount">
                    <b-loading :active="store.isLoading" :is-full-page="false" class="primary-loading"></b-loading>
                    {{ $t('ADMIN.NAVBAR.SYNC') }}
                </b-navbar-item>

                <b-navbar-item tag="router-link" :class="{ 'is-active': active === 'login' }" :to="{ name: 'login', params: { lang: $i18n.locale } }">
                    {{ $t('ADMIN.NAVBAR.LOGIN') }}
                </b-navbar-item>

                <b-navbar-item tag="router-link" :class="{ 'is-active': active === 'about' }" :to="{ name: 'about', params: { lang: $i18n.locale } }">
                    {{ $t('NAVBAR.ABOUT') }}
                </b-navbar-item>
            </div>

            <div class="navbar-end">
                <div class="navbar-item">
                    <slot name="import" />
                </div>
                <div class="navbar-item">
                    <slot name="export" />
                </div>
                <div class="navbar-item">
                    <a :href="`https://framagit.org/aktivisda/${store.config.id}`">
                        <img :src="`https://framagit.org/aktivisda/${store.config.id}/badges/main/pipeline.svg`" />
                    </a>
                </div>
                <div class="navbar-item">
                    <lang-picker />
                </div>
                <div class="navbar-item">
                    <navbar-info />
                </div>
            </div>
        </div>
    </nav>
</template>

<script>
import LangPicker from '@/components/pickers/LangPicker.vue';
import InstanceName from '@/components/ui/instance-name.vue';
import NavbarInfo from '@/components/navbarinfo.vue';

import { requestFile } from '@/backtivisda/plugins/gitlab.js';


export default {
    name: 'navbar',
    components: { LangPicker, InstanceName, NavbarInfo },
    props: {
        active: String,
    },
    data: () => ({
        expanded: false,
    }),
    mounted() {
        this.redirectIfNotConnected();
    },
    methods: {
        redirectIfNotConnected() {
            requestFile('package.json').catch((error) => {
                if (error === 401) {
                    this.$buefy.snackbar.open({
                        type: 'is-danger',
                        indefinite: true,
                        message: this.$t('ADMIN.LOGIN.ERROR_UNAUTHORIZED_GITLAB_TOKEN'),
                        position: 'is-bottom',
                        actionText: null,
                        cancelText: this.$t('BUTTONS.CANCEL'),
                    });
                    useCredentialsStore().setGitlabToken('');
                } else {
                    this.$buefy.snackbar.open({
                        type: 'is-danger',
                        indefinite: true,
                        message: this.$t('ADMIN.LOGIN.ERROR_GITLAB_TOKEN'),
                        position: 'is-bottom',
                        actionText: null,
                        cancelText: this.$t('BUTTONS.CANCEL'),
                    });
                }
                if (this.$router.currentRoute.name !== 'login')
                    this.$router.push({ name: 'login', params: { lang: this.$i18n.locale } });
            });
        },
    },
};
</script>

<style lang="scss">
.navbar-item[data-badge]:not([data-badge='0'])::after {
    position: absolute;
    right: 0px;
    top: 10px;
    min-width: 10px;
    min-height: 10px;
    line-height: 6px;
    padding: 3px;
    color: var(--primary-text-color);
    background-color: var(--primary-color);
    font-size: 8px;
    border-radius: 20px;
    content: attr(data-badge);
    border: solid 1px var(--primary-color);
    opacity: 0.7;
}
</style>
