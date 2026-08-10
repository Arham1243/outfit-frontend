<script setup>
import { computed } from 'vue';
import { WARDROBE_TYPES, formatWardrobeTypeLabel } from '@/config/wardrobeTypes';

const props = defineProps({
    searchQuery: { type: String, default: '' },
    selectedType: { type: String, default: null },
    typeCounts: { type: Object, default: () => ({}) },
    total: { type: Number, default: 0 },
    selectMode: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false }
});

const emit = defineEmits(['update:searchQuery', 'select-type', 'toggle-select']);

const categoryPills = computed(() => {
    const pills = [
        {
            value: null,
            label: $t('all'),
            count: props.total
        }
    ];

    WARDROBE_TYPES.forEach((type) => {
        pills.push({
            value: type,
            label: formatWardrobeTypeLabel(type),
            count: Number(props.typeCounts?.[type] ?? 0)
        });
    });

    return pills;
});

function onSearchInput(event) {
    emit('update:searchQuery', event.target.value);
}
</script>

<template>
    <div class="wardrobe-toolbar">
        <div class="wardrobe-toolbar__search-row">
            <div class="wardrobe-toolbar__search">
                <IconField>
                    <InputIcon class="pi pi-search" />
                    <InputText
                        :modelValue="searchQuery"
                        :placeholder="$t('wardrobe_search_placeholder')"
                        @input="onSearchInput"
                    />
                </IconField>
            </div>

            <Button
                v-if="canDelete"
                type="button"
                :label="selectMode ? $t('wardrobe_done') : $t('wardrobe_select')"
                :icon="selectMode ? 'pi pi-check' : 'pi pi-check-square'"
                class="wardrobe-toolbar__select-btn"
                @click="emit('toggle-select')"
            />
        </div>

        <div class="wardrobe-toolbar__pills" role="tablist" :aria-label="$t('filter_by_type')">
            <button
                v-for="pill in categoryPills"
                :key="pill.value ?? 'all'"
                type="button"
                class="wardrobe-pill"
                :class="{ 'wardrobe-pill--active': selectedType === pill.value }"
                role="tab"
                :aria-selected="selectedType === pill.value"
                @click="emit('select-type', pill.value)"
            >
                <span>{{ pill.label }}</span>
                <span class="wardrobe-pill__count">{{ pill.count }}</span>
            </button>
        </div>
    </div>
</template>
