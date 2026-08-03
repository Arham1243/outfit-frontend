<script setup>
import { ref, toRefs, watch } from 'vue';
import { useRoleStore } from '@/modules/core/stores';
import {
    buildPermissionMatrixRows,
    applyPermissionDependencies
} from '@/utils/permissionMatrix';
import PermissionMatrixTable from '@/components/permission/PermissionMatrixTable.vue';

const roleStore = useRoleStore();

const props = defineProps({
    formData: { type: Object, required: true },
    isEditMode: { type: Boolean, default: false },
    busy: { type: Boolean, default: false }
});

const { formData, busy } = toRefs(props);

const loadingRoles = ref(false);
const loadingPermissions = ref(false);
const roles = ref([]);
const rolePermissions = ref({});
const selectedPermissions = ref({});
const tableData = ref([]);
const allChecked = ref(false);

function makeTableData() {
    tableData.value = buildPermissionMatrixRows(
        rolePermissions.value,
        selectedPermissions.value
    );
}

function togglePermission(entity, action, val) {
    if (!selectedPermissions.value[entity]) {
        selectedPermissions.value[entity] = {};
    }
    if (selectedPermissions.value[entity][action] !== null) {
        selectedPermissions.value[entity][action] = val;
        applyPermissionDependencies(entity, selectedPermissions.value[entity]);
        makeTableData();
    }
}

const getRoles = async (searchText = '') => {
    try {
        loadingRoles.value = true;
        const params = { limit: 300 };
        const payload = {
            search: { value: searchText },
            sort: [{ field: 'name', order: 'asc' }],
            filters: [{ field: 'status', operator: '=', value: 1 }]
        };
        const res = await roleStore.list(payload, params);
        roles.value = res.data?.map((r) => ({
            id: r.id,
            uuid: r.uuid,
            name: r.name
        }));
    } finally {
        loadingRoles.value = false;
    }
};

const getRolePermissions = async (roleId) => {
    if (!roleId) return;
    try {
        loadingPermissions.value = true;
        const res = await roleStore.getRolePermissions(roleId);
        rolePermissions.value = JSON.parse(JSON.stringify(res));
        selectedPermissions.value = {};
        Object.keys(rolePermissions.value).forEach((entity) => {
            selectedPermissions.value[entity] = {};
            Object.entries(rolePermissions.value[entity]).forEach(
                ([action, allowed]) => {
                    selectedPermissions.value[entity][action] = allowed;
                }
            );
        });
        makeTableData();
    } finally {
        loadingPermissions.value = false;
    }
};

watch(
    () => formData.value.role_uuid,
    (uuid) => {
        if (!uuid) {
            formData.value.role_id = '';
            rolePermissions.value = {};
            selectedPermissions.value = {};
            makeTableData();
            return;
        }
        const picked = roles.value.find((r) => r.uuid === uuid);
        if (picked) {
            formData.value.role_id = picked.id;
        }
        getRolePermissions(uuid);
    },
    { immediate: true }
);

watch(
    selectedPermissions,
    () => {
        const perms = Object.values(selectedPermissions.value).flatMap(
            (actions) => Object.values(actions)
        );
        allChecked.value = perms.every((v) => v === true);
    },
    { deep: true }
);
</script>

<template>
    <div class="grid grid-cols-12 gap-4 items-end">
        <div class="col-span-12 sm:col-span-6">
            <label class="block mb-2 text-sm">{{ $t('select_role') }}</label>
            <ApiDropdown
                showClear
                filter
                @search="getRoles"
                :placeholder="$t('select')"
                class="w-full text-sm"
                v-model="formData.role_uuid"
                :loading="loadingRoles"
                :options="roles"
                optionLabel="name"
                optionValue="uuid"
                :disabled="busy || loadingRoles"
            />
        </div>
        <div
            class="col-span-12 !mt-5"
            v-if="formData.role_uuid && !loadingRoles"
        >
            <PermissionMatrixTable
                :table-data="tableData"
                :loading="loadingPermissions"
                disabled
                input-class="highlight-disabled-checkbox"
                @toggle-permission="togglePermission"
            />
        </div>
    </div>
</template>
