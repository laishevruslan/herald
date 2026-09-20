<script setup>
import { useStore } from '@datastore';
const store = useStore();
store.fetchFonts();
</script>
<template>
    <div></div>
</template>

<script>
import { loadFonts } from '@/plugins/font-loader';


export default {
    name: 'font-loader',
    created() {
        const store = useStore();
        store.fetchFonts().then(() => {
            loadFonts(store.fonts).catch((error) => {
                this.$buefy.snackbar.open({
                    duration: 6000,
                    message: this.$t('FONTS.ERROR_LOADING_MESSAGE'),
                    type: 'is-danger',
                    cancelText: this.$t('BUTTONS.CANCEL'),
                    position: 'is-bottom',
                    actionText: null,
                });
                console.error(error);
            });
        })
    },
};
</script>
