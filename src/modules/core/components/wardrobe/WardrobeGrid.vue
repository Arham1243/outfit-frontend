<script setup>
import WardrobeItemCard from './WardrobeItemCard.vue';

defineProps({
    items: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    selectMode: { type: Boolean, default: false },
    selectedItems: { type: Array, default: () => [] },
    canSelect: { type: Boolean, default: false }
});

const emit = defineEmits(['open-item', 'toggle-item']);

function isSelected(item, selectedItems) {
    return selectedItems.some((entry) => entry.uuid === item.uuid);
}

function onCardClick(item) {
    emit('open-item', item);
}

function onToggle(item) {
    emit('toggle-item', item);
}
</script>

<template>
    <div class="wardrobe-grid-wrap">
        <Loader v-if="loading" />

        <div v-else-if="!items.length" class="wardrobe-grid__empty">
            {{ $t('no_wardrobe_images_found') }}
        </div>

        <div v-else class="wardrobe-grid">
            <WardrobeItemCard
                v-for="item in items"
                :key="item.uuid"
                :item="item"
                :select-mode="selectMode"
                :selected="isSelected(item, selectedItems)"
                :can-select="canSelect"
                @click="onCardClick(item)"
                @toggle="onToggle(item)"
            />
        </div>
    </div>
</template>
