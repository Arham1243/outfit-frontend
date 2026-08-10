<script setup>
import { computed } from 'vue';
import { useHelpers } from '@/composables';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import {
    formatType,
    getItemDisplayName,
    getItemImageUrl
} from './wardrobeDisplay';

const props = defineProps({
    visible: { type: Boolean, default: false },
    item: { type: Object, default: null },
    canEdit: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'edit', 'delete']);

const { formatDate } = useHelpers();

const imageUrl = computed(
    () => getItemImageUrl(props.item) || PlaceholderImage
);
const displayName = computed(() =>
    props.item
        ? getItemDisplayName(props.item, $t('wardrobe_untitled'))
        : ''
);
const typeLabel = computed(() =>
    props.item?.type
        ? formatType(props.item.type)
        : $t('classification_pending')
);
const addedLabel = computed(() => {
    if (!props.item?.created_at) return '—';
    return formatDate(props.item.created_at, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
});

function closeDialog() {
    emit('update:visible', false);
}
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        dismissableMask
        class="wardrobe-dialog wardrobe-dialog--view"
        :showHeader="false"
        :draggable="false"
        :style="{ width: 'min(94vw, 52rem)' }"
        @update:visible="emit('update:visible', $event)"
    >
        <div class="wardrobe-view">
            <div class="wardrobe-view__media">
                <Image
                    :src="imageUrl"
                    :alt="displayName"
                    preview
                    imageClass="wardrobe-view__image"
                />
                <span class="wardrobe-view__zoom-hint">
                    <i class="pi pi-search-plus" aria-hidden="true"></i>
                    {{ $t('wardrobe_click_to_zoom') }}
                </span>
            </div>

            <div class="wardrobe-view__panel">
                <Button
                    type="button"
                    icon="pi pi-times"
                    rounded
                    text
                    severity="secondary"
                    class="wardrobe-view__close"
                    :aria-label="$t('close')"
                    @click="closeDialog"
                />

                <span class="wardrobe-view__badge">{{ typeLabel }}</span>
                <h2 class="wardrobe-view__title">{{ displayName }}</h2>

                <div class="wardrobe-view__meta-row">
                    <span class="wardrobe-view__meta-label">
                        {{ $t('wardrobe_added') }}
                    </span>
                    <span class="wardrobe-view__meta-value">{{ addedLabel }}</span>
                </div>

                <div class="wardrobe-view__actions">
                    <Button
                        v-if="canEdit"
                        type="button"
                        :label="$t('edit')"
                        icon="pi pi-pencil"
                        outlined
                        @click="emit('edit')"
                    />
                    <Button
                        v-if="canDelete"
                        type="button"
                        :label="$t('delete')"
                        icon="pi pi-trash"
                        severity="danger"
                        text
                        @click="emit('delete')"
                    />
                </div>
            </div>
        </div>
    </Dialog>
</template>
