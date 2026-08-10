<script setup>
import { computed } from 'vue';
import { countActiveCategories } from './wardrobeDisplay';

const props = defineProps({
    total: { type: Number, default: 0 },
    typeCounts: { type: Object, default: () => ({}) },
    lastUpdatedLabel: { type: String, default: '' },
    canCreate: { type: Boolean, default: false }
});

defineEmits(['bulk-upload', 'add-item']);

const categoryCount = computed(() => countActiveCategories(props.typeCounts));

const statsText = computed(() => {
    if (!props.total) {
        return $t('wardrobe_stats_empty');
    }

    return $t('wardrobe_stats_summary', {
        total: props.total,
        categories: categoryCount.value,
        updated: props.lastUpdatedLabel
    });
});
</script>

<template>
    <header class="wardrobe-header">
        <div class="wardrobe-header__copy">
            <h1 class="wardrobe-header__title">{{ $t('wardrobe') }}</h1>
            <p class="wardrobe-header__stats">{{ statsText }}</p>
        </div>

        <div v-if="canCreate" class="wardrobe-header__actions">
            <Button
                type="button"
                :label="$t('wardrobe_bulk_upload')"
                icon="pi pi-upload"
                severity="secondary"
                outlined
                class="wardrobe-header__action"
                @click="$emit('bulk-upload')"
            />
            <Button
                type="button"
                :label="$t('wardrobe_add_item')"
                icon="pi pi-plus"
                class="wardrobe-header__action wardrobe-header__action--primary"
                @click="$emit('add-item')"
            />
        </div>
    </header>
</template>
