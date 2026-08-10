<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
    src: { type: String, required: true },
    alt: { type: String, default: '' }
});

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.08;

const scale = ref(1);
const translateX = ref(0);
const translateY = ref(0);
const isPanning = ref(false);

let panStartX = 0;
let panStartY = 0;
let panOriginX = 0;
let panOriginY = 0;

function resetView() {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    stopPanning();
}

watch(
    () => props.src,
    () => resetView()
);

const zoomPercent = computed(() => Math.round(scale.value * 100));

const imageStyle = computed(() => ({
    transform: `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`
}));

function onWheel(event) {
    event.preventDefault();

    const direction = event.deltaY > 0 ? -1 : 1;
    const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, scale.value + direction * ZOOM_STEP)
    );

    if (next <= MIN_SCALE) {
        resetView();
        return;
    }

    scale.value = Number(next.toFixed(3));
}

function onMouseMove(event) {
    if (!isPanning.value) return;

    translateX.value = panOriginX + (event.clientX - panStartX);
    translateY.value = panOriginY + (event.clientY - panStartY);
}

function stopPanning() {
    if (!isPanning.value) return;

    isPanning.value = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', stopPanning);
}

function onMouseDown(event) {
    if (event.button !== 2 || scale.value <= MIN_SCALE) return;

    event.preventDefault();
    isPanning.value = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panOriginX = translateX.value;
    panOriginY = translateY.value;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopPanning);
}

function onContextMenu(event) {
    event.preventDefault();
}

onBeforeUnmount(() => {
    stopPanning();
});
</script>

<template>
    <div
        class="wardrobe-zoom"
        :class="{
            'wardrobe-zoom--pannable': scale > MIN_SCALE,
            'wardrobe-zoom--panning': isPanning
        }"
        @wheel="onWheel"
        @mousedown="onMouseDown"
        @contextmenu="onContextMenu"
    >
        <div class="wardrobe-zoom__stage">
            <img
                :src="src"
                :alt="alt"
                class="wardrobe-zoom__image"
                :style="imageStyle"
                draggable="false"
            />
        </div>

        <div class="wardrobe-zoom__toolbar" aria-live="polite">
            <span class="wardrobe-zoom__level">{{ zoomPercent }}%</span>
        </div>
    </div>
</template>
