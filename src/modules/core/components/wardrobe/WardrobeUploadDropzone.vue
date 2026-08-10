<script setup>
import { computed } from 'vue';
import { WARDROBE_IMAGE } from '@/config';

const props = defineProps({
    busy: { type: Boolean, default: false },
    multiple: { type: Boolean, default: false },
    compact: { type: Boolean, default: false },
    isDragOver: { type: Boolean, default: false },
    title: { type: String, default: '' },
    icon: { type: String, default: 'pi pi-cloud-upload' },
    variant: { type: String, default: 'default' }
});

const emit = defineEmits([
    'pick',
    'dragover',
    'dragleave',
    'drop',
    'change'
]);

const uploadDimensionHint = computed(() =>
    $t('wardrobe_upload_recommended_dimensions', {
        width: WARDROBE_IMAGE.recommendedWidth,
        height: WARDROBE_IMAGE.recommendedHeight,
        ratio: WARDROBE_IMAGE.aspectRatioLabel
    })
);
</script>

<template>
    <div
        class="wardrobe-upload__dropzone"
        :class="{
            'wardrobe-upload__dropzone--compact': compact,
            'wardrobe-upload__dropzone--active': isDragOver,
            'wardrobe-upload__dropzone--disabled': busy,
            'wardrobe-upload__dropzone--bulk': variant === 'bulk'
        }"
        @dragover="emit('dragover', $event)"
        @dragleave="emit('dragleave', $event)"
        @drop="emit('drop', $event)"
        @click="emit('pick')"
    >
        <span class="wardrobe-upload__dropzone-icon" aria-hidden="true">
            <i :class="icon" />
        </span>
        <p class="wardrobe-upload__dropzone-title m-0">
            {{ title || $t('drag_drop_or_browse_file') }}
        </p>
        <p class="wardrobe-upload__dropzone-hint m-0">
            {{ $t('wardrobe_upload_supported_formats') }}
        </p>
        <p v-if="variant === 'bulk'" class="wardrobe-upload__dropzone-hint m-0">
            {{ $t('wardrobe_bulk_upload_hint') }}
        </p>
        <p v-else class="wardrobe-upload__dropzone-hint m-0">
            {{ uploadDimensionHint }}
        </p>
    </div>
</template>
