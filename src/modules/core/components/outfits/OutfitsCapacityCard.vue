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
</script>

<template>
    <section
        class="outfits-capacity-card"
        :aria-busy="loading"
    >
        <div class="outfits-capacity-card__top">
            <p class="outfits-capacity-card__label">
                {{ $t('outfits_generation_capacity') }}
            </p>

            <div
                v-if="loading"
                class="outfits-capacity-card__skeleton-remaining"
                aria-hidden="true"
            >
                <Skeleton
                    width="5.5rem"
                    height="0.625rem"
                    borderRadius="0.5rem"
                />
                <Skeleton
                    width="2.75rem"
                    height="1.75rem"
                    borderRadius="0.375rem"
                />
            </div>

            <div
                v-else-if="showStats"
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

        <div
            v-if="loading"
            class="outfits-capacity-card__skeleton"
            aria-hidden="true"
        >
            <div class="outfits-capacity-card__skeleton-summary">
                <Skeleton
                    width="min(100%, 14rem)"
                    height="1.75rem"
                    borderRadius="0.5rem"
                />
                <Skeleton
                    width="100%"
                    height="0.375rem"
                    borderRadius="999px"
                />
            </div>

            <div class="outfits-capacity-card__skeleton-wardrobe">
                <Skeleton
                    width="6.5rem"
                    height="0.625rem"
                    borderRadius="0.5rem"
                />
                <div class="outfits-capacity-card__skeleton-chips">
                    <Skeleton
                        v-for="index in 6"
                        :key="index"
                        width="100%"
                        height="2.125rem"
                        borderRadius="0.625rem"
                    />
                </div>
            </div>
        </div>

        <template v-else>
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

            <div class="outfits-capacity-card__wardrobe">
                <p class="outfits-capacity-card__chips-label">
                    {{ $t('outfits_wardrobe_breakdown') }}
                </p>

                <div class="outfits-capacity-card__chips">
                    <button
                        v-for="[type, count] in sortedTypeCounts"
                        :key="type"
                        type="button"
                        class="outfits-capacity-card__chip"
                        @click="$emit('go-wardrobe')"
                    >
                        <span class="outfits-capacity-card__chip-count">{{ count }}</span>
                        <span class="outfits-capacity-card__chip-type">
                            {{ formatWardrobeTypeLabel(type) }}
                        </span>
                    </button>
                    <span
                        v-if="!sortedTypeCounts.length"
                        class="outfits-capacity-card__empty"
                    >
                        {{ $t('no_wardrobe_images_found') }}
                    </span>
                </div>
            </div>
        </template>
    </section>
</template>
