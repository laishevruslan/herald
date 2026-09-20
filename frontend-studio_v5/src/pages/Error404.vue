<template>
    <div>
        <vida-navbar active="about" />
        <section class="hero is-primary">
            <div>
                <h1 class="title">404 Error</h1>
                <p class="subtitle">Ooops this page doesn't exist.</p>
            </div>
        </section>
    </div>
</template>

<script>
import VidaNavbar from '@navbar';
import { showSnackbarOnRedirection } from '@/plugins/utils.js';

export default {
    name: 'Error404',
    components: { VidaNavbar },
    computed: {},
    mounted: function () {
        showSnackbarOnRedirection(this);
        document.dispatchEvent(new Event('x-app-rendered'));
    },
};
</script>

<style lang="scss"></style>
