<script setup>
import { computed } from 'vue';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import { formatOutfitMeta, getOutfitTitle } from './outfitDisplay';
import OutfitGeneratingEffect from './OutfitGeneratingEffect.vue';

const props = defineProps({
    item: { type: Object, required: true },
    pending: { type: Boolean, default: false },
    failed: { type: Boolean, default: false }
});

defineEmits(['open']);

const title = computed(() => getOutfitTitle(props.item, $t('outfit_untitled')));

const meta = computed(() =>
    formatOutfitMeta(props.item, {
        male: $t('male'),
        female: $t('female'),
        aiFace: $t('outfit_face_mode_ai_model'),
        userFace: $t('outfit_face_mode_user_face')
    })
);

const thumbItems = computed(() =>
    (props.item?.wardrobe_items ?? []).slice(0, 3)
);
</script>

<template>
    <article
        class="outfits-gallery-card"
        :class="{
            'outfits-gallery-card--pending': pending,
            'outfits-gallery-card--failed': failed
        }"
        role="button"
        tabindex="0"
        @click="$emit('open', item)"
        @keydown.enter="$emit('open', item)"
        @keydown.space.prevent="$emit('open', item)"
    >
        <div class="outfits-gallery-card__media">
            <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="title"
                class="outfits-gallery-card__img"
            />
            <div
                v-else-if="failed"
                class="outfits-gallery-card__placeholder outfits-gallery-card__placeholder--failed"
            >
                <i class="pi pi-exclamation-triangle" aria-hidden="true" />
                <span>{{ $t('outfit_generation_failed') }}</span>
            </div>

            <div
                v-if="thumbItems.length && item.image_url"
                class="outfits-gallery-card__thumbs"
            >
                <img
                    v-for="wardrobe in thumbItems"
                    :key="wardrobe.uuid"
                    :src="wardrobe.image_url || PlaceholderImage"
                    :alt="wardrobe.name || wardrobe.type"
                    class="outfits-gallery-card__thumb"
                />
            </div>
        </div>

        <div v-if="pending" class="outfits-gallery-card__generating">
            <OutfitGeneratingEffect compact />
        </div>

        <div v-if="!pending" class="outfits-gallery-card__body">
            <h3 class="outfits-gallery-card__title">{{ title }}</h3>
            <p v-if="meta" class="outfits-gallery-card__meta">{{ meta }}</p>
        </div>
        <div
            v-else
            class="outfits-gallery-card__body outfits-gallery-card__body--pending-spacer"
            aria-hidden="true"
        >
            <h3 class="outfits-gallery-card__title">&nbsp;</h3>
        </div>
    </article>
</template>
