<script setup>
import { computed, ref, toRefs } from 'vue';

const props = defineProps({
    formData: { type: Object, required: true },
    busy: { type: Boolean, required: true, default: false }
});

const { formData, busy } = toRefs(props);
const emit = defineEmits(['save']);

const fileUploadRef = ref(null);

const initials = computed(() => {
    const name = formData.value.name?.trim();
    if (!name) {
        return '?';
    }

    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
});

function triggerPhotoUpload() {
    fileUploadRef.value?.$el?.querySelector('input[type="file"]')?.click();
}

function onFileSelect(event) {
    const file = event.files?.[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        formData.value.profile_image = e.target.result;
    };
    reader.readAsDataURL(file);
}

function save() {
    emit('save');
}
</script>

<template>
    <div class="profile-dialog-form">
        <div class="profile-dialog-form__avatar-wrap">
            <div class="profile-dialog-form__avatar">
                <img
                    v-if="formData.profile_image"
                    :src="formData.profile_image"
                    :alt="$t('profile_picture')"
                    class="profile-dialog-form__avatar-image"
                />
                <span v-else class="profile-dialog-form__avatar-initials">
                    {{ initials }}
                </span>
            </div>

            <button
                type="button"
                class="profile-dialog-form__avatar-edit"
                :aria-label="$t('upload')"
                :disabled="busy"
                @click="triggerPhotoUpload"
            >
                <svg
                    class="profile-dialog-form__camera-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"
                        stroke="currentColor"
                        stroke-width="1.75"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                    <circle
                        cx="12"
                        cy="13"
                        r="3"
                        stroke="currentColor"
                        stroke-width="1.75"
                    />
                </svg>
            </button>

            <FileUpload
                ref="fileUploadRef"
                name="profileImage"
                mode="basic"
                customUpload
                auto
                class="profile-dialog-form__file-upload"
                :maxFileSize="500 * 1024"
                accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                :disabled="busy"
                @select="onFileSelect"
            />
        </div>

        <div class="profile-dialog-form__field">
            <label class="profile-dialog-form__label" for="profile-name">
                {{ $t('name') }}
            </label>
            <InputField
                id="profile-name"
                :disabled="busy"
                class="profile-dialog-form__input"
                v-model="formData.name"
                variant="text"
                @keyup.enter="save"
            />
        </div>
    </div>
</template>
