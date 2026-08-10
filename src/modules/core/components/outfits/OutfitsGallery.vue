<script setup>
import OutfitsGalleryCard from './OutfitsGalleryCard.vue';
import WardrobePagination from '@/modules/core/components/wardrobe/WardrobePagination.vue';

defineProps({
    items: { type: Array, default: () => [] },
    pageLoading: { type: Boolean, default: false },
    show: { type: Boolean, default: false },
    createdCount: { type: Number, default: 0 },
    page: { type: Number, default: 1 },
    totalRecords: { type: Number, default: 0 },
    pageSize: { type: Number, default: 20 }
});

defineEmits(['open-item', 'page-change']);

function isPending(item) {
    return item?.status === 'pending' || item?.status === 'processing';
}

function isFailed(item) {
    return item?.status === 'failed';
}
</script>

<template>
    <section v-if="show" class="outfits-gallery-section">
        <header class="outfits-gallery-section__header">
            <h2 class="outfits-gallery-section__title">
                {{ $t('outfits_generated_outfits') }}
            </h2>
            <span class="outfits-gallery-section__count">
                {{
                    $t('outfits_created_count', {
                        count: createdCount || items.length
                    })
                }}
            </span>
        </header>

        <Loader v-if="pageLoading" />

        <div v-else-if="items.length" class="outfits-gallery">
            <OutfitsGalleryCard
                v-for="item in items"
                :key="`${item.uuid}-${item.status}-${item.image_url ?? ''}`"
                :item="item"
                :pending="isPending(item)"
                :failed="isFailed(item)"
                @open="$emit('open-item', $event)"
            />
        </div>

        <WardrobePagination
            v-if="!pageLoading && totalRecords > pageSize"
            :page="page"
            :total-records="totalRecords"
            :page-size="pageSize"
            @page-change="$emit('page-change', $event)"
        />
    </section>
</template>
