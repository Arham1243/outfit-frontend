<script setup>
defineProps({
    selectedCount: { type: Number, default: 0 },
    pageCount: { type: Number, default: 0 }
});

defineEmits(['select-page', 'delete', 'done']);
</script>

<template>
    <div class="wardrobe-selection-bar">
        <span class="wardrobe-selection-bar__count">
            {{ $t('wardrobe_selected_count', { count: selectedCount }) }}
        </span>

        <div class="wardrobe-selection-bar__actions">
            <Button
                type="button"
                :label="$t('wardrobe_select_page')"
                text
                class="wardrobe-selection-bar__link"
                :disabled="!pageCount"
                @click="$emit('select-page')"
            />
            <Button
                type="button"
                :label="$t('delete')"
                icon="pi pi-trash"
                severity="danger"
                :disabled="!selectedCount"
                @click="$emit('delete')"
            />
            <Button
                type="button"
                :label="$t('wardrobe_done')"
                icon="pi pi-check"
                @click="$emit('done')"
            />
        </div>
    </div>
</template>
