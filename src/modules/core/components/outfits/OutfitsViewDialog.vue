<script setup>
import { computed, ref } from 'vue';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import WardrobeZoomableImage from '@/modules/core/components/wardrobe/WardrobeZoomableImage.vue';
import { useHelpers } from '@/composables';
import {
    downloadOutfitImage,
    formatFaceModeLabel,
    formatOutfitViewSubtitle,
    getOutfitTitle,
    getWardrobeItemDisplayName,
    getWardrobeItemSubtitle
} from './outfitDisplay';
import OutfitGeneratingEffect from './OutfitGeneratingEffect.vue';

const props = defineProps({
    visible: { type: Boolean, default: false },
    item: { type: Object, default: null }
});

const emit = defineEmits(['update:visible']);

const { formatDate } = useHelpers();
const downloading = ref(false);

const imageUrl = computed(() => props.item?.image_url || PlaceholderImage);

const title = computed(() =>
    props.item ? getOutfitTitle(props.item, $t('outfit_untitled')) : ''
);

const faceModeLabel = computed(() => {
    const faceMode = props.item?.generation_settings?.face_mode;
    if (!faceMode) return '';
    return formatFaceModeLabel(faceMode, {
        aiFace: $t('outfit_face_mode_ai_short'),
        userFace: $t('outfit_face_mode_user_short')
    });
});

const subtitle = computed(() => {
    if (!props.item) return '';

    const generatedOn = props.item.created_at
        ? `${$t('outfit_generated_on_label')} ${formatDate(
              props.item.created_at,
              {
                  month: 'short',
                  day: 'numeric'
              }
          )}`
        : '';

    return formatOutfitViewSubtitle(props.item, {
        male: $t('male'),
        female: $t('female'),
        generatedOn
    });
});

const wardrobeItems = computed(() => props.item?.wardrobe_items ?? []);

const isPending = computed(
    () =>
        props.item?.status === 'pending' || props.item?.status === 'processing'
);

const isFailed = computed(() => props.item?.status === 'failed');

function closeDialog() {
    emit('update:visible', false);
}

async function handleDownload() {
    if (!props.item?.uuid || !props.item?.image_url || downloading.value)
        return;

    try {
        downloading.value = true;
        const safeName = (props.item.name || 'outfit')
            .replace(/[^\w\-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        await downloadOutfitImage(
            props.item.uuid,
            `${safeName || 'outfit'}.jpg`
        );
    } finally {
        downloading.value = false;
    }
}
</script>

<template>
    <Dialog
        :visible="visible"
        modal
        dismissableMask
        class="outfits-dialog outfits-dialog--view"
        :showHeader="false"
        :draggable="false"
        :style="{ width: 'min(96vw, 80rem)', maxHeight: '92vh' }"
        @update:visible="emit('update:visible', $event)"
        @hide="emit('update:visible', false)"
    >
        <div v-if="item" class="outfits-view">
            <div class="outfits-view__media">
                <WardrobeZoomableImage
                    v-if="item.image_url"
                    :key="item.uuid"
                    :src="imageUrl"
                    :alt="title"
                />
                <div
                    v-else-if="isPending"
                    class="outfits-view__placeholder outfits-view__placeholder--generating"
                >
                    <OutfitGeneratingEffect />
                </div>
                <div
                    v-else-if="isFailed"
                    class="outfits-view__placeholder outfits-view__placeholder--failed"
                >
                    <i class="pi pi-exclamation-triangle" aria-hidden="true" />
                    <span>{{ $t('outfit_generation_failed') }}</span>
                </div>
            </div>

            <div class="outfits-view__panel">
                <Button
                    type="button"
                    icon="pi pi-times"
                    rounded
                    text
                    severity="secondary"
                    class="outfits-view__close"
                    :aria-label="$t('close')"
                    @click="closeDialog"
                />

                <div class="outfits-view__intro">
                    <span v-if="faceModeLabel" class="outfits-view__badge">
                        {{ faceModeLabel }}
                    </span>

                    <h2 class="outfits-view__title">{{ title }}</h2>

                    <p v-if="subtitle" class="outfits-view__subtitle">
                        {{ subtitle }}
                    </p>
                </div>

                <div v-if="wardrobeItems.length" class="outfits-view__items">
                    <p class="outfits-view__items-label">
                        <i class="pi pi-box" aria-hidden="true" />
                        {{ $t('outfit_wardrobe_items_used') }}
                    </p>
                    <ul class="outfits-view__items-list">
                        <li
                            v-for="wardrobe in wardrobeItems"
                            :key="wardrobe.uuid"
                            class="outfits-view__item"
                        >
                            <img
                                :src="wardrobe.image_url || PlaceholderImage"
                                :alt="
                                    getWardrobeItemDisplayName(
                                        wardrobe,
                                        $t('wardrobe_untitled')
                                    )
                                "
                                class="outfits-view__item-thumb"
                            />
                            <div class="outfits-view__item-copy">
                                <span class="outfits-view__item-name">
                                    {{
                                        getWardrobeItemDisplayName(
                                            wardrobe,
                                            $t('wardrobe_untitled')
                                        )
                                    }}
                                </span>
                                <span class="outfits-view__item-type">
                                    {{ getWardrobeItemSubtitle(wardrobe) }}
                                </span>
                            </div>
                        </li>
                    </ul>
                </div>

                <div class="outfits-view__footer">
                    <Button
                        v-if="item.image_url"
                        type="button"
                        class="outfits-view__download"
                        :label="$t('outfit_download_image')"
                        icon="pi pi-download"
                        :loading="downloading"
                        @click="handleDownload"
                    />
                </div>
            </div>
        </div>
    </Dialog>
</template>
