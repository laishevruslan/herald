import { defineStore } from 'pinia';

import { useStore } from '@datastore';
import { Vida } from 'aktivisda-library';

export const useVidaStore = defineStore('vidaStore', {
    state: () => {
        return {
            vida: undefined,
            cache: {
                zoom: 1
            },
            rerenderingMap: {

            },
            hasChanged: false,
        };
    },
    actions: {
        setup(canvasId) {
            this.vida = new Vida(canvasId);
            const store = useStore();
            this.vida.setGallery(store);

            this.vida.onComponentUpdated = (id) => {
                if (this.rerenderingMap[id] === undefined)
                    this.rerenderingMap = 1;
                this.rerenderingMap[id] += 1;
            }

        },
        zoomFit() {
            this.cache.zoom = this.vida.zoom(null);
        },
        zoomOut() {
            this.cache.zoom /= 1.2
            this.vida.zoom(this.cache.zoom);
        },
        zoomIn() {
            this.cache.zoom *= 1.2;
            this.vida.zoom(this.cache.zoom);
        },
        undo(componentId) {
            this.hasChanged = true;
            this.vida.undoComponent(componentId);
        },
        redo(componentId) {
            this.hasChanged = true;
            this.vida.redoComponent(componentId);
        },
    },
    getters: {
        document: (state) => {
            return state.vida.documentParams()
        },
        zoom: (state) => {
            return state.cache.zoom;
        },
        canUndo: (state) => {
            return (componentId) => state.vida.canUndo(componentId)
        },
        canRedo: (state) => {
            return (componentId) => state.vida.canRedo(componentId)
        },
        allowedActions: (state) => {
            return (componentId) => state.vida.componentAllowedActions(componentId)
        },
        componentParams: (state) => {
            return (componentId) => state.vida.componentParams(componentId)
        },
        displayedOrEditingLang: (state) => {
            const i18n = state.vida.document.i18n;
            if (i18n.displayedLocale !== undefined) return i18n.displayedLocale;
            if (i18n.editingLocale !== undefined && i18n.editingLocale !== null)
                return i18n.editingLocale;
            return i18n.defaultLocale;
        }
    }
});
