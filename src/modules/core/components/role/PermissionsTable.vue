<script setup>
import { ref, onBeforeMount, computed } from 'vue';
import { useRoleStore } from '@/modules/core/stores';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import useEventsBus from '@/composables/useEventsBus';
import { isEqual } from 'lodash-es';
import {
    buildPermissionMatrixRows,
    applyPermissionSectionPreset,
    computeSectionPresetSwitches,
    isCoreSectionEntity,
    normalizePermissionMatrix,
    isApplicableAction,
    applyPermissionDependencies
} from '@/utils/permissionMatrix';
import PermissionMatrixTable from '@/components/permission/PermissionMatrixTable.vue';

const GLOBAL_PRESET = {
    key: 'global',
    label: $t('all_permissions'),
    filter: () => true
};

const PRESET_TOOLBAR_ROWS = [
    GLOBAL_PRESET,
    {
        key: 'core',
        label: $t('core'),
        filter: isCoreSectionEntity
    }
];

function emptySectionPresets() {
    return {
        global: { viewOnly: false, fullAdmin: false },
        core: { viewOnly: false, fullAdmin: false }
    };
}

const sectionPresets = ref(emptySectionPresets());

const router = useRouter();
const route = useRoute();
const { emit } = useEventsBus();
const roleStore = useRoleStore();

const loading = ref(false);
const loadingPermissions = ref(false);
const tableData = ref([]);
const selectedPermissions = ref([]);
const rolePermissions = ref([]);
const busy = ref(false);
const item = ref([]);
const roleId = ref(route.params?.id);

const isSystemRole = computed(() => {
    const r = item.value;
    if (!r || typeof r !== 'object') {
        return false;
    }
    return !!(r.system || r.is_system);
});

const permissionsReadOnly = computed(() => isSystemRole.value);
const showUnsavedDialog = ref(false);
let nextRoute = null;

onBeforeMount(async () => {
    await getItem();
    emit('updateDetailsBreadcrumb', roleStore.currentItem?.name || '');
    await getRolePermissions();
});

onBeforeRouteLeave((to, from, next) => {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
        nextRoute = next;
    } else {
        next();
    }
});

const isDirty = computed(() => {
    return !isEqual(selectedPermissions.value, rolePermissions.value);
});

const buildTableData = () => {
    tableData.value = buildPermissionMatrixRows(
        rolePermissions.value,
        selectedPermissions.value
    );
};

function syncSectionPresetsFromSelection() {
    for (const row of PRESET_TOOLBAR_ROWS) {
        const next = computeSectionPresetSwitches(
            selectedPermissions.value,
            rolePermissions.value,
            row.filter
        );
        sectionPresets.value[row.key].viewOnly = next.viewOnly;
        sectionPresets.value[row.key].fullAdmin = next.fullAdmin;
    }
}

function onSectionPreset(key, kind, enabled) {
    const row = PRESET_TOOLBAR_ROWS.find((r) => r.key === key);
    if (!row || permissionsReadOnly.value) {
        return;
    }
    if (!enabled) {
        applyPermissionSectionPreset(
            selectedPermissions.value,
            rolePermissions.value,
            row.filter,
            'clear'
        );
    } else if (kind === 'view') {
        applyPermissionSectionPreset(
            selectedPermissions.value,
            rolePermissions.value,
            row.filter,
            'view-only'
        );
    } else {
        applyPermissionSectionPreset(
            selectedPermissions.value,
            rolePermissions.value,
            row.filter,
            'full'
        );
    }
    syncSectionPresetsFromSelection();
    buildTableData();
}

function buildPermissionsForBackend(permissions) {
    const result = [];

    Object.entries(permissions).forEach(([entity, actions]) => {
        Object.entries(actions).forEach(([action, value]) => {
            if (value === true && isApplicableAction(entity, action)) {
                result.push(`${entity}.${action}`);
            }
        });
    });

    return result;
}

function togglePermission(entity, action, val) {
    if (!selectedPermissions.value[entity]) {
        selectedPermissions.value[entity] = {};
    }

    if (
        isApplicableAction(entity, action) &&
        selectedPermissions.value[entity][action] !== null
    ) {
        selectedPermissions.value[entity][action] = val;
        applyPermissionDependencies(entity, selectedPermissions.value[entity]);
    }
    syncSectionPresetsFromSelection();
    buildTableData();
}

function resetMatrix() {
    selectedPermissions.value = [];
    rolePermissions.value = [];
    buildTableData();
}

function cancel() {
    showUnsavedDialog.value = true;
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    if (nextRoute) {
        const go = nextRoute;
        nextRoute = null;
        go();
    } else {
        resetMatrix();
        getRolePermissions();
    }
}

const getItem = async () => {
    try {
        loading.value = true;
        const res = await roleStore.getItem(roleId.value);
        item.value = res.data;
    } finally {
        loading.value = false;
    }
};

const getRolePermissions = async () => {
    try {
        loadingPermissions.value = true;
        const res = await roleStore.getRolePermissions(roleId.value);
        const normalized = normalizePermissionMatrix(
            JSON.parse(JSON.stringify(res))
        );
        rolePermissions.value = normalized;
        selectedPermissions.value = JSON.parse(JSON.stringify(normalized));
        sectionPresets.value = emptySectionPresets();
        syncSectionPresetsFromSelection();
        buildTableData();
    } finally {
        loadingPermissions.value = false;
    }
};

const syncRolePermissions = async () => {
    try {
        busy.value = true;
        await roleStore.syncRolePermissions(roleId.value, {
            permissions: buildPermissionsForBackend(selectedPermissions.value)
        });
        resetMatrix();
        getRolePermissions();
    } finally {
        busy.value = false;
    }
};
</script>

<template>
    <Loader v-if="loading" />
    <template v-else>
        <TitleHeader>
            <template #title>
                <div class="flex items-center gap-5">
                    <Button
                        type="button"
                        variant="outlined"
                        icon="pi pi-chevron-left"
                        size="large"
                        @click="router.push({ name: 'User Roles' })"
                        iconClass="!text-sm"
                    />
                    <div>
                        <h1 class="text-2xl sm:text-3xl font-bold capitalize">
                            {{ item?.name }}
                        </h1>
                    </div>
                </div>
            </template>
            <template #actions>
                <Button
                    v-if="!permissionsReadOnly"
                    :label="$t('cancel')"
                    variant="outlined"
                    class="w-full sm:w-auto"
                    @click="cancel"
                    :disabled="busy || !isDirty"
                />
                <Button
                    v-if="!permissionsReadOnly"
                    :label="$t('save')"
                    icon="pi pi-check"
                    iconPos="left"
                    class="w-full sm:w-auto"
                    @click="syncRolePermissions"
                    :disabled="busy || !isDirty"
                    :loading="busy"
                />
            </template>
        </TitleHeader>

        <Card class="py-3 px-2">
            <template #content>
                <Message
                    v-if="permissionsReadOnly && !loading"
                    severity="info"
                    class="mb-4"
                    :closable="false"
                >
                    {{
                        $t(
                            'the_system_administrator_role_always_has_full_access_its_permissions_cannot_be_changed_you_can_still_adjust_permissions_for_other_system_roles_for_example_approver_or_standard_roles_and_for_custom_roles'
                        )
                    }}
                </Message>
                <div
                    class="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start"
                >
                    <div
                        v-if="!loadingPermissions && !permissionsReadOnly"
                        class="shrink-0 w-full lg:w-56 xl:w-60 space-y-3 lg:sticky lg:top-4 border border-surface-200 dark:border-surface-700 rounded-lg p-4 bg-surface-0 dark:bg-surface-900"
                    >
                        <div class="font-semibold text-sm">
                            {{ GLOBAL_PRESET.label }}
                        </div>
                        <div class="flex flex-col gap-3">
                            <div class="flex items-center gap-2">
                                <ToggleSwitch
                                    inputId="global-view-only"
                                    :modelValue="
                                        sectionPresets[GLOBAL_PRESET.key]
                                            .viewOnly
                                    "
                                    :disabled="busy || loadingPermissions"
                                    @update:modelValue="
                                        (v) =>
                                            onSectionPreset(
                                                GLOBAL_PRESET.key,
                                                'view',
                                                v
                                            )
                                    "
                                />
                                <label
                                    for="global-view-only"
                                    class="cursor-pointer text-sm font-medium mb-0"
                                    >{{ $t('view_only') }}</label
                                >
                            </div>
                            <div class="flex items-center gap-2">
                                <ToggleSwitch
                                    inputId="global-full-access"
                                    :modelValue="
                                        sectionPresets[GLOBAL_PRESET.key]
                                            .fullAdmin
                                    "
                                    :disabled="busy || loadingPermissions"
                                    @update:modelValue="
                                        (v) =>
                                            onSectionPreset(
                                                GLOBAL_PRESET.key,
                                                'full',
                                                v
                                            )
                                    "
                                />
                                <label
                                    for="global-full-access"
                                    class="cursor-pointer text-sm font-medium mb-0"
                                    >{{ $t('full_access') }}</label
                                >
                            </div>
                        </div>
                    </div>
                    <div class="min-w-0 flex-1 w-full overflow-x-auto">
                        <PermissionMatrixTable
                            :table-data="tableData"
                            :loading="loadingPermissions"
                            :busy="busy"
                            :disabled="permissionsReadOnly"
                            :show-section-presets="!permissionsReadOnly"
                            :section-presets="sectionPresets"
                            @toggle-permission="togglePermission"
                            @section-preset="onSectionPreset"
                        />
                    </div>
                </div>
            </template>
        </Card>
    </template>

    <Confirmation
        v-model="showUnsavedDialog"
        :header="$t('unsaved_changes')"
        :content="
            $t(
                'you_have_unsaved_changes_if_you_continue_those_changes_will_be_lost_do_you_want_to_discard_them'
            )
        "
        variant="danger"
        :confirmButtonText="$t('discard_changes')"
        :cancelButtonText="$t('keep_editing')"
        @confirm="confirmDiscard"
    />
</template>
