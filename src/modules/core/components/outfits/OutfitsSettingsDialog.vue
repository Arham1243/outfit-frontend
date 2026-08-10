<script setup>
import { computed } from 'vue';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import { OUTFIT_FACE_IMAGE } from '@/config';

const props = defineProps({
    formData: { type: Object, required: true },
    initialData: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    genderError: { type: String, default: '' },
    heightError: { type: String, default: '' },
    faceError: { type: String, default: '' },
    heightCmPreviewLabel: { type: String, default: '' },
    faceDimensionHint: { type: String, default: '' },
    requiresFaceImage: { type: Boolean, default: false }
});

const visible = defineModel('visible', { type: Boolean, default: false });
const heightFtInput = defineModel('heightFtInput', {
    type: String,
    default: ''
});

const emit = defineEmits(['save', 'cancel', 'face-select']);

const settingsDialogFormData = computed(() => ({
    ...props.formData,
    height_ft: heightFtInput.value
}));

const genderOptions = [
    { label: $t('male'), value: 'male' },
    { label: $t('female'), value: 'female' }
];

const faceModeOptions = [
    { label: $t('outfit_face_mode_ai_model'), value: 'ai_model' },
    { label: $t('outfit_face_mode_user_face'), value: 'user_face' }
];

function onFaceFileSelect(event) {
    emit('face-select', event);
}

function removeFaceImage() {
    props.formData.face_image = null;
}
</script>

<template>
    <BaseDialog
        :visible="visible"
        :header="$t('outfit_settings_title')"
        :busy="saving"
        :isEditMode="true"
        :formData="settingsDialogFormData"
        :initialData="initialData"
        :excludeDirtyKeys="['height']"
        :confirmLabel="$t('save')"
        class="outfits-settings-dialog"
        @update:visible="visible = $event"
        @confirm="emit('save')"
        @cancel="emit('cancel')"
    >
        <div class="outfits-settings col-span-12">
            <div class="outfits-settings__field">
                <label class="outfits-settings__label">
                    {{ $t('gender') }}
                </label>
                <SelectButton
                    v-model="formData.gender"
                    :options="genderOptions"
                    optionLabel="label"
                    optionValue="value"
                    :allowEmpty="false"
                    :disabled="saving"
                    class="outfits-settings__segment"
                />
                <small v-if="genderError" class="outfits-settings__error">
                    {{ genderError }}
                </small>
            </div>

            <div class="outfits-settings__field">
                <label class="outfits-settings__label" for="outfit-height">
                    {{ $t('height') }}
                </label>
                <div
                    class="outfits-settings__height-input"
                    :class="{
                        'outfits-settings__height-input--invalid': !!heightError
                    }"
                >
                    <input
                        id="outfit-height"
                        :value="heightFtInput"
                        type="text"
                        inputmode="decimal"
                        placeholder="5.8"
                        class="outfits-settings__height-value"
                        :disabled="saving"
                        :aria-invalid="!!heightError"
                        @input="heightFtInput = $event.target.value"
                    />
                    <span class="outfits-settings__height-unit">{{
                        $t('ft')
                    }}</span>
                </div>
                <small
                    v-if="heightCmPreviewLabel"
                    class="outfits-settings__height-hint"
                >
                    {{ heightCmPreviewLabel }}
                </small>
                <small v-if="heightError" class="outfits-settings__error">
                    {{ heightError }}
                </small>
            </div>

            <div class="outfits-settings__field">
                <label class="outfits-settings__label">
                    {{ $t('outfit_face_mode') }}
                </label>
                <SelectButton
                    v-model="formData.face_mode"
                    :options="faceModeOptions"
                    optionLabel="label"
                    optionValue="value"
                    :allowEmpty="false"
                    :disabled="saving"
                    class="outfits-settings__segment"
                />
                <p class="outfits-settings__face-hint">
                    {{ $t('outfit_face_mode_hint') }}
                </p>
            </div>

            <div v-if="requiresFaceImage" class="outfits-settings__field">
                <label class="outfits-settings__label">
                    {{ $t('outfit_face_image') }}
                </label>
                <p class="outfits-settings__face-hint">
                    {{ $t('outfit_face_image_hint') }}
                    {{ faceDimensionHint }}
                </p>

                <div class="outfits-settings__face-card">
                    <div class="outfits-settings__face-preview">
                        <img
                            v-if="formData.face_image"
                            :src="formData.face_image"
                            :alt="$t('outfit_face_image')"
                            class="outfits-settings__face-img"
                        />
                        <img
                            v-else
                            :src="PlaceholderImage"
                            :alt="$t('outfit_face_image')"
                            class="outfits-settings__face-img outfits-settings__face-img--placeholder"
                        />
                    </div>

                    <div class="outfits-settings__face-actions">
                        <FileUpload
                            mode="basic"
                            customUpload
                            auto
                            :chooseLabel="$t('upload')"
                            chooseIcon="pi pi-upload"
                            :maxFileSize="
                                OUTFIT_FACE_IMAGE.maxFileSizeKb * 1024
                            "
                            accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                            class="outfits-settings__face-upload"
                            :disabled="saving"
                            @select="onFaceFileSelect"
                        />
                        <Button
                            v-if="formData.face_image"
                            type="button"
                            text
                            size="small"
                            severity="danger"
                            :label="$t('remove_image')"
                            icon="pi pi-trash"
                            :disabled="saving"
                            @click="removeFaceImage"
                        />
                    </div>
                </div>

                <small v-if="faceError" class="outfits-settings__error">
                    {{ faceError }}
                </small>
            </div>
        </div>
    </BaseDialog>
</template>
