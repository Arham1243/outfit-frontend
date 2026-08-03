<script setup>
import { computed } from 'vue';

const props = defineProps({
    status: {
        type: String
    },
    size: {
        type: String,
        default: 'small'
    }
});

const tagProps = computed(() => {
    const rawStatus = props.status || '-';
    const value = rawStatus.replace(/_/g, ' ').toUpperCase();

    switch (rawStatus.toLowerCase()) {
        case 'yes':
        case 'active':
        case 'trialing':
        case 'billed':
        case 'paid':
        case 'reimbursable':
        case 'connected':
        case 'approved':
        case 'posted':
        case 'settled':
        case 'delivered':
            return { value, severity: 'success' };
        case 'no':
        case 'na':
        case 'inactive':
        case 'non_reimbursable':
        case 'not_connected':
        case 'not_posted':
        case 'canceled':
        case 'cancelled':
        case 'declined':
        case 'returned':
        case 'void':
            return { value, severity: 'danger' };
        case 'expired':
        case 'unbilled':
        case 'pending':
        case 'pending_payment':
        case 'submitted':
        case 'partial':
        case 'partially_paid':
        case 'customer':
        case 'cancelling':
            return { value, severity: 'warn' };
        case 'draft':
        case 'unpaid':
            return { value, class: '!bg-gray-200 !text-gray-500' };
        case 'supplier':
            return {
                value,
                class: '!bg-purple-100 !text-purple-700'
            };
        case 'new':
        case 'open':
            return { value, severity: 'info' };
        case 'in_process':
        case 'in_progress':
        case 'not_received':
            return { value, severity: 'warn' };
        case 'received':
            return { value, severity: 'success' };
        case 'queued':
            return { value, severity: 'warn' };
        case 'accepted':
            return { value, severity: 'info' };
        case 'closed':
        case 'opened':
            return {
                value,
                class: '!shadow-none !ring-0 !border-0 !outline-none !bg-emerald-700 !text-white dark:!bg-emerald-800 dark:!text-white'
            };
        case 'clicked':
            return { value, severity: 'info' };
        case 'failed':
        case 'send_failed':
        case 'complained':
            return { value, severity: 'danger' };
        case 'temporary_failed':
            return { value, severity: 'warn' };
        default:
            return { value, severity: 'contrast' };
    }
});
</script>

<template>
    <Tag
        :size="size"
        class="!text-xs"
        v-bind="$attrs"
        :value="tagProps.value"
        :severity="tagProps.severity"
        :class="tagProps.class"
    />
</template>
