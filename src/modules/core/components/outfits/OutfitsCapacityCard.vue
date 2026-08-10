<script setup>
import { computed } from 'vue';
import { formatWardrobeTypeLabel } from '@/config/wardrobeTypes';

const props = defineProps({
    loading: { type: Boolean, default: false },
    typeCounts: { type: Object, default: () => ({}) },
    combinationStats: { type: Object, default: null },
    progressPercent: { type: Number, default: 0 },
    showStats: { type: Boolean, default: false }
});

defineEmits(['go-wardrobe']);

const sortedTypeCounts = computed(() =>
    Object.entries(props.typeCounts ?? {})
        .filter(([, count]) => count > 0)
        .sort(([a], [b]) => a.localeCompare(b))
);

function formatTypeCount(type, count) {
    return $t('wardrobe_type_count', {
        count,
        type: formatWardrobeTypeLabel(type)
    });
}
</script>

<template>
    <section class="outfits-capacity-card">
        <div class="outfits-capacity-card__top">
            <p class="outfits-capacity-card__label">
                {{ $t('outfits_generation_capacity') }}
            </p>

            <div
                v-if="showStats"
                class="outfits-capacity-card__remaining-block"
            >
                <span class="outfits-capacity-card__remaining-label">
                    {{ $t('outfits_remaining_label') }}
                </span>
                <span class="outfits-capacity-card__remaining-value">
                    {{ combinationStats?.remaining ?? 0 }}
                </span>
            </div>
        </div>

        <div v-if="showStats" class="outfits-capacity-card__summary">
            <p class="outfits-capacity-card__fraction">
                <span class="outfits-capacity-card__fraction-count">
                    {{ combinationStats?.generated_count ?? 0 }}
                    /
                    {{ combinationStats?.total_possible ?? 0 }}
                </span>
                <span class="outfits-capacity-card__fraction-label">
                    {{ $t('outfits_possible') }}
                </span>
            </p>
        </div>

        <div
            v-if="showStats"
            class="outfits-capacity-card__progress"
            role="progressbar"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
        >
            <span
                class="outfits-capacity-card__progress-fill"
                :style="{ width: `${progressPercent}%` }"
            />
        </div>

        <div
            class="outfits-capacity-card__chips"
            :class="{ 'outfits-capacity-card__chips--disabled': loading }"
        >
            <button
                v-for="[type, count] in sortedTypeCounts"
                :key="type"
                type="button"
                class="outfits-capacity-card__chip"
                @click="$emit('go-wardrobe')"
            >
                {{ formatTypeCount(type, count) }}
            </button>
            <span
                v-if="!loading && !sortedTypeCounts.length"
                class="outfits-capacity-card__empty"
            >
                {{ $t('no_wardrobe_images_found') }}
            </span>
        </div>
    </section>
</template>
