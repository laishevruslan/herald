<script setup>
import { useVidaStore } from '@/vida/store.js';

const vStore = useVidaStore();
</script>

<template>
    <div class="row is-justify-content-center">
        <b-tooltip :label="$t('BUTTONS.UNDO')" style='padding: 0px 3px'>
            <b-button icon @click='vStore.undo(componentId)' icon-left="undo"
                :disabled='!vStore.canUndo(componentId) || disabled'></b-button>
        </b-tooltip>
        <b-tooltip :label="$t('BUTTONS.REDO')" style='padding: 0px 3px'>
            <b-button icon @click='vStore.redo(componentId)' icon-left="redo"
                :disabled='!vStore.canRedo(componentId) || disabled'></b-button>
        </b-tooltip>
        <b-tooltip v-if="vStore.allowedActions(componentId).has('forward')" :label="$t('BUTTONS.BRING_FORWARD')"
            style="padding: 0px 3px">
            <b-button icon @click="$emit('forward')" icon-left="arrange-bring-forward"
                :disabled="!forwardEnabled || disabled"></b-button>
        </b-tooltip>
        <b-tooltip v-if="vStore.allowedActions(componentId).has('backward')" :label="$t('BUTTONS.SEND_BACKWARD')"
            style="padding: 0px 3px">
            <b-button icon @click="$emit('backward')" icon-left="arrange-send-backward"
                :disabled="!backwardEnabled || disabled"></b-button>
        </b-tooltip>
        <b-tooltip v-if="vStore.allowedActions(componentId).has('duplicate')" :label="$t('BUTTONS.DUPLICATE')"
            style="padding: 0px 3px">
            <b-button icon @click="$emit('duplicate')" icon-left="content-duplicate" :disabled="disabled"></b-button>
        </b-tooltip>
        <b-tooltip v-if="vStore.allowedActions(componentId).has('remove')"
            :label="$t('BUTTONS.DELETE')" style="padding: 0px 3px">
            <b-button icon @click="remove" icon-left="delete" type="is-danger" :disabled="disabled"></b-button>
        </b-tooltip>
    </div>
</template>

<script>

export default {
    name: 'visual-input-toolbar',
    components: {},
    props: {
        componentId: String,
        forwardEnabled: { type: Boolean, default: true },
        backwardEnabled: { type: Boolean, default: true },
        disabled: { type: Boolean, default: false },
        undo: { type: Boolean, default: false },
        redo: { type: Boolean, default: false }
    },
    data: function() {
        return {
            isRemoving: false
        }
    },
    methods: {
        remove() {
            this.$buefy.dialog.confirm({
                title: this.$i18n.t('EDIT.REMOVE_WARNING.TITLE'),
                message: this.$i18n.t('EDIT.REMOVE_WARNING.MESSAGE'),
                confirmText: this.$i18n.t('EDIT.REMOVE_WARNING.CONFIRM_TEXT'),
                cancelText: this.$i18n.t('EDIT.REMOVE_WARNING.CANCEL_TEXT'),
                type: 'is-danger',
                hasIcon: true,
                onConfirm: () => {
                    this.$emit('remove');
                    this.isRemoving = false;
                },
                onCancel: () => {
                    this.isRemoving = false;
                },
            });
        },
        handleKeydown(event) {

            const vStore = useVidaStore();
            if (event.ctrlKey && event.key == 'z') {
                vStore.undo(this.componentId);
                event.preventDefault();
                return;
            }

            if (event.ctrlKey && event.key == 'y') {
                vStore.redo(this.componentId);
                event.preventDefault();
                return;
            }

            if (vStore.allowedActions(this.componentId).has('duplicate')
                && event.ctrlKey && event.key == 'd') {
                this.$emit('duplicate')
                event.preventDefault();
                return;
            }

            if (vStore.allowedActions(this.componentId).has('remove')
                && event.key == 'Delete' && !this.isRemoving) {
                this.isRemoving = true;
                this.remove();
                event.preventDefault();
                return;
            }

            if (vStore.allowedActions(this.componentId).has('backward')
                && event.key == 'PageDown') {
                this.$emit('backward')
                event.preventDefault();
                return;
            }

            if (vStore.allowedActions(this.componentId).has('forward')
                && event.key == 'PageUp') {
                this.$emit('forward')
                event.preventDefault();
                return;
            }

            // TODO move with arrows
        }
    },
    mounted: function() {
        window.addEventListener('keydown', this.handleKeydown);
    },
    beforeDestroy: function () {
        window.removeEventListener('keydown', this.handleKeydown);
    }
};
</script>

<style scoped></style>
