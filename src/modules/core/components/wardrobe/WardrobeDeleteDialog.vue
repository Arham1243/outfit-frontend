<script setup>
import { computed } from 'vue';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import {
    formatType,
    getItemDisplayName,
    getItemImageUrl
} from './wardrobeDisplay';

const props = defineProps({
    visible: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    item: { type: Object, default: null },
    bulkCount: { type: Number, default: 0 },
    isBulk: { type: Boolean, default: false }
});

const emit = defineEmits(['update:visible', 'confirm']);

const imageUrl = computed(() => {
    if (props.isBulk || !props.item) return PlaceholderImage;
    return getItemImageUrl(props.item) || PlaceholderImage;
});

const displayName = computed(() => {
    if (props.isBulk) {
        return $t('wardrobe_selected_count', { count: props.bulkCount });
    }

    return props.item
        ? getItemDisplayName(props.item, $t('wardrobe_untitled'))
        : '';
});

const typeLabel = computed(() => {
    if (props.isBulk) return '';
    return props.item?.type
        ? formatType(props.item.type)
        : $t('classification_pending');
});

const header = computed(() =>
    props.isBulk ? $t('delete_wardrobe_images') : $t('wardrobe_delete_dialog_title')
);

function closeDialog() {
    emit('update:visible', false);
}
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        dismissableMask
        class="wardrobe-dialog wardrobe-dialog--delete"
        :header="header"
        :draggable="false"
        :style="{ width: 'min(94vw, 28rem)' }"
        @update:visible="emit('update:visible', $event)"
    >
        <div v-if="isBulk" class="wardrobe-delete__content">
            <p class="wardrobe-delete__message">
                {{
                    $t('are_you_sure_you_want_to_delete_selected_wardrobe_images', {
                        count: bulkCount
                    })
                }}
            </p>
        </div>

        <div v-else class="wardrobe-delete__content wardrobe-delete__content--item">
            <div class="wardrobe-delete__preview">
                <img :src="imageUrl" alt="" class="wardrobe-delete__preview-img" />
            </div>
            <div class="wardrobe-delete__copy">
                <p class="wardrobe-delete__name">{{ displayName }}</p>
                <p class="wardrobe-delete__type">{{ typeLabel }}</p>
            </div>
        </div>

        <template #footer>
            <Button
                type="button"
                :label="$t('cancel')"
                text
                :disabled="busy"
                @click="closeDialog"
            />
            <Button
                type="button"
                :label="$t('delete')"
                icon="pi pi-trash"
                severity="danger"
                :loading="busy"
                @click="emit('confirm')"
            />
        </template>
    </Dialog>
</template>
