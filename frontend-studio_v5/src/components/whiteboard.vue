<script setup>
import { useVidaStore } from '@/vida/store.js'

const vStore = useVidaStore();
</script>

<template>
    <div style="height: 100%">
        <div class="whiteboard-tools">
            <span id="zoom-box">{{ (vStore.zoom * 100) | toFixed(1) }}%</span>
            <b-button @click="vStore.zoomOut()" size="is-small" icon-left="minus" outlined></b-button>
            <b-button @click="vStore.zoomIn()" size="is-small" icon-left="plus" outlined></b-button>
            <b-button @click="vStore.zoomFit()" type="is-primary" size="is-small" icon-left="arrow-expand-all" outlined></b-button>
        </div>
        <div class="canvas-container pa-4">
            <div :id="id" width="0" height="0"></div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'whiteboard',
    props: {
        id: String,
        zoom: { type: Number, default: 0 },
    },
    filters: {
        toFixed: (val, precision) => val.toFixed(precision),
    },
};
</script>

<style lang="scss">
.canvas-container {
    background: #eee;
    border: none;
    height: calc(100vh - 60px);
    canvas {
        background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%) !important;
        background-size: 25px 25px !important;
        background-position:
            0 0,
            12.5px 0,
            12.5px -12.5px,
            0px 12.5px !important;
        background-repeat: repeat !important;
    }
}

#whiteboard {
    background: #eee;
}

.whiteboard-tools {
    position: absolute;
    bottom: 20px;
    right: 20px;
    padding: 7px;
    border-radius: 30px;
    border: 1px #493711 solid;
    font-size: 20px;
    background-color: white;
    padding: 15px;
    box-shadow: 0 0 1em rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    border: none;
    z-index: 10;
}

.whiteboard-tools button {
    margin: 5px;
}

.whiteboard-tools #zoom-box {
    font-size: smaller;
    color: #333;
    font-weight: bold;
}
</style>
