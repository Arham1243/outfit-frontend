<script setup>
defineProps({
    /** Tighter layout for list footers (e.g. infinite scroll loaders). */
    compact: { type: Boolean, default: false }
});
</script>

<template>
    <div :class="compact ? 'text-center py-3' : 'text-center mt-12'">
        <ProgressSpinner
            :style="
                compact
                    ? { width: '40px', height: '40px' }
                    : { width: '70px', height: '70px' }
            "
            strokeWidth="3"
        />
    </div>
</template>

<style lang="scss" scoped></style>
