<script setup>
import { computed, onBeforeMount, ref, toRefs } from 'vue';
import { useRoleStore } from '@/modules/core/stores';
import { useLanguageStore } from '@/stores';

const roleStore = useRoleStore();
const languageStore = useLanguageStore();
const languageSelectOptions = ref([]);
const loadingLanguages = ref(false);
const savedPreferredLanguage = ref(null);

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, required: true, default: false },
    isEditMode: { type: Boolean, required: true, default: false }
});

const { formData, busy, isEditMode } = toRefs(props);
const roles = ref([]);
const loadingRoles = ref(false);

const genderOptions = [
    { name: $t('male'), code: 'male' },
    { name: $t('female'), code: 'female' }
];

const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
};

const emit = defineEmits(['save']);
const save = () => {
    emit('save');
};

onBeforeMount(async () => {
    await loadLanguageOptions();
});

function buildLanguageSelectOptions(
    activeList,
    selectedUuid,
    selectedLanguage
) {
    const list = Array.isArray(activeList) ? [...activeList] : [];
    if (
        selectedUuid &&
        selectedLanguage &&
        !list.some((lang) => lang.uuid === selectedUuid)
    ) {
        list.push(selectedLanguage);
    }
    return list;
}

async function loadLanguageOptions() {
    try {
        loadingLanguages.value = true;
        savedPreferredLanguage.value =
            formData.value.preferred_language ?? null;
        const active = await languageStore.getActiveLanguages();
        languageSelectOptions.value = buildLanguageSelectOptions(
            active,
            formData.value.preferred_language_uuid,
            savedPreferredLanguage.value
        );
    } finally {
        loadingLanguages.value = false;
    }
}

const statusOptions = computed(() => {
    if (!isEditMode.value) {
        return [{ name: 'Pending', code: 'pending' }];
    }

    const base = [
        { name: 'Active', code: 'active' },
        { name: 'Inactive', code: 'inactive' }
    ];

    if (formData.value.status === 'pending') {
        base.push({ name: 'Pending', code: 'pending' });
    }

    return base;
});

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
            name: r.name
        }));
    } finally {
        loadingRoles.value = false;
    }
};
</script>

<template>
    <div class="grid grid-cols-12 gap-6">
        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label
                class="block mb-3"
                :class="{
                    required:
                        !isEditMode ||
                        (isEditMode && formData.status === 'pending')
                }"
            >
                {{ $t('primary_email') }}
            </label>
            <InputField
                id="email"
                :disabled="
                    busy || (isEditMode && formData.status !== 'pending')
                "
                class="w-full"
                v-model="formData.email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">{{ $t('full_name') }}</label>
            <InputField
                id="name"
                :disabled="busy"
                class="w-full"
                v-model="formData.name"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">{{ $t('status') }}</label>
            <InputField
                id="status"
                :disabled="busy"
                class="w-full"
                v-model="formData.status"
                :placeholder="$t('select')"
                variant="dropdown"
                optionLabel="name"
                optionValue="code"
                :options="statusOptions"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">{{ $t('gender') }}</label>
            <InputField
                id="gender"
                :disabled="busy"
                class="w-full"
                v-model="formData.gender"
                :placeholder="$t('select')"
                variant="dropdown"
                optionLabel="name"
                optionValue="code"
                :options="genderOptions"
                showClear
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">{{ $t('date_of_birth') }}</label>
            <InputField
                id="date_of_birth"
                variant="date"
                v-model="formData.date_of_birth"
                class="w-full"
                :disabled="busy"
                :disabled-date="isFutureDate"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3 required">{{ $t('role') }}</label>
            <ApiDropdown
                id="role_id"
                showClear
                filter
                @search="getRoles"
                :placeholder="$t('select')"
                class="w-full"
                v-model="formData.role_id"
                :loading="loadingRoles"
                :options="roles"
                optionLabel="name"
                optionValue="id"
                :disabled="busy || loadingRoles"
            />
        </div>

        <div class="col-span-12 sm:col-span-6 lg:col-span-4">
            <label class="block mb-3">{{
                $t('preferred_language')
            }}</label>
            <InputField
                id="preferred_language_uuid"
                v-model="formData.preferred_language_uuid"
                variant="dropdown"
                :options="languageSelectOptions"
                optionLabel="name"
                optionValue="uuid"
                :placeholder="$t('select')"
                class="w-full"
                :loading="loadingLanguages"
                :disabled="busy || loadingLanguages"
                showClear
                filter
                :filterFields="['name', 'locale', 'code']"
                filter-placeholder="Search "
            />
        </div>
    </div>
</template>
