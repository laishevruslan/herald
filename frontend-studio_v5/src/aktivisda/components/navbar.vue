<script setup>
import { useStore } from '@datastore';
const store = useStore();

store.fetchAll();
</script>

<template>
    <nav class="navbar is-fixed-top" role="navigation" aria-label="main navigation">
        <div class="navbar-brand">
            <b-navbar-item tag="router-link" :to="{ name: 'welcome' }" style="font-size: 15px">
                <instance-name :primaryBackground="false" />
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

export default {
    name: 'navbar',
    components: { LangPicker, InstanceName, NavbarInfo },
    props: {
        active: String,
    },
    data: () => ({
        expanded: false,
    }),
    methods: {},
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
