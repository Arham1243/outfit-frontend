<script setup>
import { toRefs } from 'vue';
import PlaceholderImage from '@/assets/images/image_not_available.png';

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
