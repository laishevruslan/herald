<template>
    <v-menu
        ref="menu"
        v-model="menuVisible"
        :close-on-content-click="false"
        :nudge-right="40"
        offset-y
        transition="scale-transition"
        min-width="290px"
        max-width="290px">
        <template v-slot:activator="{ on }">
            <v-text-field filled :label="label" :hide-details="hideDetails" :prepend-icon="prependIcon" readonly v-model="time" v-on="on" />
        </template>

        <v-time-picker v-if="menuVisible" v-model="time" @click:minute="close"></v-time-picker>
    </v-menu>
</template>

<script>
export default {
    name: 'time-picker',
    props: {
        value: {},
        label: String,
        hideDetails: Boolean,
        prependIcon: { type: String, default: 'mdi-calendar-clock' },
    },
    data() {
        return {
            menuVisible: false,
            time: null,
        };
    },
    methods: {
        close() {
            this.menuVisible = false;
        },
    },
    watch: {
        value() {
            this.time = this.value;
        },
        time(newValue) {
            this.$emit('input', newValue);
        },
    },
    mounted() {
        this.time = this.value;
    },
};
</script>
