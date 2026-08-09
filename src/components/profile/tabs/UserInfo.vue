<script setup>
import { onBeforeMount, ref, toRefs } from 'vue';
import { useLanguageStore } from '@/stores';
import PlaceholderImage from '@/assets/images/image_not_available.png';

const languageStore = useLanguageStore();
const languageSelectOptions = ref([]);
const loadingLanguages = ref(false);
const savedPreferredLanguage = ref(null);

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, required: true, default: false },
    variant: {
        type: String,
        default: 'page'
    }
});

const { formData, busy } = toRefs(props);
const fieldColClass =
    props.variant === 'dialog'
        ? 'col-span-12 sm:col-span-6'
        : 'col-span-12 sm:col-span-6 lg:col-span-4';
const emit = defineEmits(['save']);
const save = () => {
    emit('save');
};

const genderOptions = [
    { name: $t('male'), code: 'male' },
    { name: $t('female'), code: 'female' }
];

const isFutureDate = (date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date > today;
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

function onFileSelect(event) {
    const file = event.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.profile_image = e.target.result;
    };
    reader.readAsDataURL(file);
}
</script>

<template>
    <div class="grid grid-cols-12 gap-x-4 gap-y-5">
        <div :class="fieldColClass">
            <label class="block mb-3 required">{{ $t('primary_email') }}</label>
            <InputField
                id="email"
                :disabled="true"
                class="w-full"
                v-model="formData.email"
                variant="text"
                @keyup.enter="save"
            />
        </div>

        <div :class="fieldColClass">
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

        <div :class="fieldColClass">
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

        <div :class="fieldColClass">
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

        <div :class="fieldColClass">
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

        <div class="col-span-12 flex justify-center mt-4">
            <div class="flex flex-col items-center gap-4">
                <label class="block font-semibold flex items-center gap-2">
                    {{ $t('profile_picture') }}
                    <i
                        class="pi pi-info-circle text-gray-400 cursor-pointer"
                        v-tooltip.top="
                            'The profile picture size is 500KB and best viewed as a square.'
                        "
                    ></i>
                </label>

                <div
                    class="border border-gray-300 rounded-full shadow-sm flex items-center justify-center bg-gray-50 dark:bg-gray-800 h-40 w-40 overflow-hidden"
                >
                    <img
                        v-if="formData.profile_image"
                        :src="formData.profile_image"
                        alt="Profile Picture"
                        class="object-cover h-full w-full"
                    />
                    <img
                        v-else
                        :src="PlaceholderImage"
                        alt="Default Profile"
                        class="object-contain h-full w-full"
                    />
                </div>
                <div class="flex justify-center">
                    <FileUpload
                        name="profileImage"
                        mode="basic"
                        customUpload
                        auto
                        :chooseLabel="$t('upload')"
                        chooseIcon="pi pi-upload"
                        :maxFileSize="500 * 1024"
                        accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                        @select="onFileSelect"
                        :disabled="busy"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
