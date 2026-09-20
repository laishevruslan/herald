<script setup>
// eslint-disable-next-line no-unused-vars
import { useCredentialsStore } from '@/backtivisda/credentials';
</script>

<template>
    <div>
        <vida-navbar active="about" />
        <section class="hero">
            <div>
                <vida-transformer-title :content="$t('ADMIN.LOGIN.TITLE')" size="medium" textAlign="center"></vida-transformer-title>
            </div>
        </section>
        <section class="container" style="max-width: 400px">
            <b-field :label="$t('ADMIN.LOGIN.GITLAB_TOKEN')">
                <b-input v-model="gitlabToken"></b-input>
            </b-field>

            <b-field :label="$t('ADMIN.LOGIN.SERVER_TOKEN')">
                <b-input v-model="serverToken"></b-input>
            </b-field>
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import VidaTransformerTitle from '@/components/ui/transformer-title.vue';

import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'LoginPage',
    components: { VidaNavbar, VidaTransformerTitle },
    mounted() {
        showSnackbarOnRedirection(this);
    },
    computed: {
        serverToken: {
            get: function () {
                const credentialsStore = useCredentialsStore();
                return credentialsStore.serverToken;
            },
            set: function (newValue) {
                const credentialsStore = useCredentialsStore();
                credentialsStore.setServerToken(newValue);
            },
        },
        gitlabToken: {
            get: function () {
                const credentialsStore = useCredentialsStore();
                return credentialsStore.gitlabToken;
            },
            set: function (newValue) {
                const credentialsStore = useCredentialsStore();
                credentialsStore.setGitlabToken(newValue);
            },
        },
    },
};
</script>
