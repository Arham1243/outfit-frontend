<script setup>
import {
    permissionLabel,
    permissionMatrixRowClass
} from '@/utils/permissionMatrix';

const props = defineProps({
    tableData: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
    actions: {
        type: Array,
        default: () => ['view', 'create', 'edit', 'delete']
    },
    /** Extra class on checkbox InputField (e.g. core user tab). */
    inputClass: { type: String, default: '' },
    /** Show View only / Full access next to Reports, Invoicing, Core headers. */
    showSectionPresets: { type: Boolean, default: false },
    /** { reports: { viewOnly, fullAdmin }, ... } - required when showSectionPresets is true. */
    sectionPresets: { type: Object, default: null }
});

const emit = defineEmits(['togglePermission', 'sectionPreset']);

function showSectionPresetSwitches(data) {
    return (
        data.presetSectionKey &&
        props.showSectionPresets &&
        props.sectionPresets
    );
}

function onSectionPreset(presetSectionKey, kind, enabled) {
    emit('sectionPreset', presetSectionKey, kind, enabled);
}

function isLastAction(action) {
    return (
        props.actions.length > 0 &&
        action === props.actions[props.actions.length - 1]
    );
}
</script>

<template>
    <div class="permission-matrix-table-wrap">
        <DataTable
            class="permission-matrix-table"
            :value="tableData"
            :loading="loading"
            :rowClass="permissionMatrixRowClass"
        >
            <Column field="entity" :header="$t('permission')">
                <template #body="{ data }">
                    <div
                        class="flex items-center min-h-[2.25rem]"
                        :class="data.indent ? 'pl-4' : ''"
                    >
                        <span
                            v-if="data.isGroupHeader"
                            class="font-semibold text-base shrink-0"
                            >{{ data.groupTitle }}</span
                        >
                        <span
                            v-else
                            :class="
                                data.isSectionLead || data.entity === 'receipts'
                                    ? 'font-bold text-base'
                                    : ''
                            "
                            >{{ permissionLabel(data.entity) }}</span
                        >
                    </div>
                </template>
            </Column>

            <Column
                v-for="a in actions"
                :key="a"
                :field="a"
                :header="a.charAt(0).toUpperCase() + a.slice(1)"
            >
                <template #body="{ data }">
                    <div
                        v-if="
                            data.isGroupHeader &&
                            showSectionPresetSwitches(data) &&
                            isLastAction(a)
                        "
                        class="permission-matrix-section-presets"
                        @click.stop
                    >
                        <div class="flex items-center gap-2">
                            <label
                                :for="`sec-${data.presetSectionKey}-view`"
                                class="cursor-pointer text-sm font-medium mb-0 whitespace-nowrap"
                                >{{ $t('view_only') }}</label
                            >
                            <ToggleSwitch
                                :inputId="`sec-${data.presetSectionKey}-view`"
                                :modelValue="
                                    sectionPresets[data.presetSectionKey]
                                        ?.viewOnly
                                "
                                :disabled="disabled || busy"
                                @update:modelValue="
                                    (v) =>
                                        onSectionPreset(
                                            data.presetSectionKey,
                                            'view',
                                            v
                                        )
                                "
                            />
                        </div>
                        <div class="flex items-center gap-2">
                            <label
                                :for="`sec-${data.presetSectionKey}-full`"
                                class="cursor-pointer text-sm font-medium mb-0 whitespace-nowrap"
                                >{{ $t('full_access') }}</label
                            >
                            <ToggleSwitch
                                :inputId="`sec-${data.presetSectionKey}-full`"
                                :modelValue="
                                    sectionPresets[data.presetSectionKey]
                                        ?.fullAdmin
                                "
                                :disabled="disabled || busy"
                                @update:modelValue="
                                    (v) =>
                                        onSectionPreset(
                                            data.presetSectionKey,
                                            'full',
                                            v
                                        )
                                "
                            />
                        </div>
                    </div>
                    <div
                        v-else-if="!data.isGroupHeader"
                        class="permission-matrix-checkbox-cell"
                    >
                        <InputField
                            v-if="data[a] !== null"
                            :disabled="
                                disabled ||
                                busy ||
                                (a === 'view' && data.viewLocked)
                            "
                            variant="checkbox"
                            binary
                            :class="inputClass"
                            :modelValue="data[a]"
                            @update:modelValue="
                                (val) =>
                                    emit(
                                        'togglePermission',
                                        data.entity,
                                        a,
                                        val
                                    )
                            "
                        />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
