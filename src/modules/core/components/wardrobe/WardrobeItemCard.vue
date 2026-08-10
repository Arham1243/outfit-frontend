<script setup>
import { computed } from 'vue';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import {
    formatType,
    getItemDisplayName,
    getItemImageUrl
} from './wardrobeDisplay';

const props = defineProps({
    item: { type: Object, required: true },
    selectMode: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    canSelect: { type: Boolean, default: false }
});

const emit = defineEmits(['click', 'toggle']);

const imageUrl = computed(
    () => getItemImageUrl(props.item) || PlaceholderImage
);
const displayName = computed(() =>
    getItemDisplayName(props.item, $t('wardrobe_untitled'))
);
const typeLabel = computed(() =>
    props.item.type ? formatType(props.item.type) : $t('classification_pending')
);

function handleClick() {
    if (props.selectMode && props.canSelect) {
        emit('toggle');
        return;
    }

    emit('click');
}

function handleCheckboxClick(event) {
    event.stopPropagation();
    emit('toggle');
}
</script>

<template>
    <article
        class="wardrobe-card"
        :class="{
            'wardrobe-card--selected': selected,
            'wardrobe-card--selectable': selectMode && canSelect
        }"
        role="button"
        tabindex="0"
        @click="handleClick"
        @keydown.enter.prevent="handleClick"
        @keydown.space.prevent="handleClick"
    >
        <div class="wardrobe-card__media">
            <img
                :src="imageUrl"
                :alt="displayName"
                class="wardrobe-card__image"
                loading="lazy"
            />

            <span
                v-if="canSelect && selectMode"
                class="wardrobe-card__checkbox-wrap"
            >
                <Checkbox
                    :modelValue="selected"
                    binary
                    class="wardrobe-card__checkbox"
                    @click="handleCheckboxClick"
                />
            </span>

            <span class="wardrobe-card__badge">{{ typeLabel }}</span>
        </div>

        <div class="wardrobe-card__body">
            <h3 class="wardrobe-card__name">{{ displayName }}</h3>
            <p class="wardrobe-card__meta">
                {{
                    item.type
                        ? formatType(item.type)
                        : $t('classification_pending')
                }}
            </p>
        </div>
    </article>
</template>
