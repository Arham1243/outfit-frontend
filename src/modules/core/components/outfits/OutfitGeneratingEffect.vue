<script setup>
import { computed } from 'vue';

const props = defineProps({
    compact: { type: Boolean, default: false }
});

const columns = computed(() => (props.compact ? 12 : 16));
const rows = computed(() => (props.compact ? 14 : 18));

const dots = computed(() => {
    const items = [];
    const cols = columns.value;
    const rowCount = rows.value;

    for (let index = 0; index < cols * rowCount; index += 1) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const wave = (col / cols) * 1.35 + (row / rowCount) * 0.95;
        const sizeRoll = (col * 7 + row * 13 + index) % 6;
        const size = sizeRoll === 0 ? 'lg' : sizeRoll === 1 ? 'sm' : 'md';

        items.push({
            id: index,
            delay: wave.toFixed(2),
            size
        });
    }

    return items;
});
</script>

<template>
    <div
        class="outfit-generating-effect"
        :class="{ 'outfit-generating-effect--compact': compact }"
        role="status"
        :aria-label="$t('outfit_creating_image')"
    >
        <p class="outfit-generating-effect__label">
            {{ $t('outfit_creating_image') }}
        </p>

        <div
            class="outfit-generating-effect__grid"
            :style="{
                '--outfit-generating-cols': columns,
                '--outfit-generating-rows': rows
            }"
            aria-hidden="true"
        >
            <span
                v-for="dot in dots"
                :key="dot.id"
                class="outfit-generating-effect__dot"
                :class="`outfit-generating-effect__dot--${dot.size}`"
                :style="{ animationDelay: `${dot.delay}s` }"
            />
        </div>
    </div>
</template>
