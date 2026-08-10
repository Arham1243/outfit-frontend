<script setup>
import { computed, ref } from 'vue';
import PlaceholderImage from '@/assets/images/image_not_available.png';
import { OUTFIT_FACE_IMAGE } from '@/config';
import {
    cmToFeetInchesInput,
    feetInchesInputToCm
} from '@/utils/heightConversion';

const props = defineProps({
    formData: { type: Object, required: true },
    saving: { type: Boolean, default: false },
    generateLabel: { type: String, required: true },
    batchSizeOptions: { type: Array, default: () => [1, 2, 3, 4] },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    canCreate: { type: Boolean, default: false },
    genderError: { type: String, default: '' },
    heightError: { type: String, default: '' },
    faceError: { type: String, default: '' },
    requiresFaceImage: { type: Boolean, default: false }
});

const heightFtInput = defineModel('heightFtInput', {
    type: String,
    default: ''
});
const batchSize = defineModel('batchSize', { type: Number, default: 1 });

const emit = defineEmits([
    'gender-change',
    'face-mode-change',
    'height-blur',
    'face-select',
    'face-remove',
    'generate'
]);

const HEIGHT_MIN_CM = 140;
const HEIGHT_MAX_CM = 210;
const HEIGHT_DEFAULT_CM = 170;

const heightSliderOpen = ref(false);

const genderOptions = [
    { label: $t('male'), value: 'male' },
    { label: $t('female'), value: 'female' }
];

const faceModeOptions = [
    { label: $t('outfit_face_mode_ai_short'), value: 'ai_model' },
    { label: $t('outfit_face_mode_user_short'), value: 'user_face' }
];

const heightCm = computed({
    get() {
        const parsed = feetInchesInputToCm(props.heightFtInput);

        if (parsed === null) {
            return HEIGHT_DEFAULT_CM;
        }

        return Math.min(HEIGHT_MAX_CM, Math.max(HEIGHT_MIN_CM, parsed));
    },
    set(value) {
        emit('update:heightFtInput', cmToFeetInchesInput(value));
    }
});

const heightDisplay = computed(() => {
    const cm =
        feetInchesInputToCm(props.heightFtInput) ??
        (heightSliderOpen.value ? heightCm.value : null);

    if (cm === null) {
        return '—';
    }

    const ftValue = props.heightFtInput || cmToFeetInchesInput(cm);

    return `${cm} ${$t('cm')} · ${ftValue} ${$t('ft')}`;
});

function toggleHeightSlider() {
    if (props.saving) return;

    heightSliderOpen.value = !heightSliderOpen.value;

    if (heightSliderOpen.value && !props.heightFtInput) {
        emit('update:heightFtInput', cmToFeetInchesInput(HEIGHT_DEFAULT_CM));
    }
}

function onHeightSlideEnd() {
    emit('height-blur');
}

function onGenderChange(value) {
    props.formData.gender = value;
    emit('gender-change', value);
}

function onFaceModeChange(value) {
    props.formData.face_mode = value;
    emit('face-mode-change', value);
}

function onFaceFileSelect(event) {
    emit('face-select', event);
}

function removeFaceImage() {
    props.formData.face_image = null;
    emit('face-remove');
}
</script>

<template>
    <section
        id="outfits-generation-settings"
        class="outfits-generate-card outfits-gen-settings"
    >
        <p class="outfits-generate-card__label">
            {{ $t('outfits_generation_settings') }}
        </p>

        <div class="outfits-gen-settings__body">
            <div class="outfits-gen-settings__field">
                <div class="outfits-gen-settings__row-label">
                    <i class="pi pi-user" aria-hidden="true" />
                    <span>{{ $t('outfits_model_gender') }}</span>
                </div>
                <SelectButton
                    :modelValue="formData.gender"
                    :options="genderOptions"
                    optionLabel="label"
                    optionValue="value"
                    :allowEmpty="false"
                    :disabled="saving"
                    class="outfits-gen-settings__segment"
                    @update:modelValue="onGenderChange"
                />
                <small v-if="genderError" class="outfits-gen-settings__error">
                    {{ genderError }}
                </small>
            </div>

            <div class="outfits-gen-settings__field">
                <button
                    type="button"
                    class="outfits-gen-settings__row outfits-gen-settings__row--height"
                    :class="{
                        'outfits-gen-settings__row--open': heightSliderOpen,
                        'outfits-gen-settings__row--invalid': !!heightError
                    }"
                    :disabled="saving"
                    :aria-expanded="heightSliderOpen"
                    @click="toggleHeightSlider"
                >
                    <div class="outfits-gen-settings__row-label">
                        <i class="pi pi-arrows-v" aria-hidden="true" />
                        <span>{{ $t('outfits_model_height') }}</span>
                    </div>
                    <span class="outfits-gen-settings__height-value">
                        {{ heightDisplay }}
                    </span>
                </button>

                <div
                    v-if="heightSliderOpen"
                    class="outfits-gen-settings__height-slider"
                >
                    <Slider
                        v-model="heightCm"
                        :min="HEIGHT_MIN_CM"
                        :max="HEIGHT_MAX_CM"
                        :step="1"
                        :disabled="saving"
                        class="outfits-gen-settings__slider"
                        @slideend="onHeightSlideEnd"
                    />
                    <div class="outfits-gen-settings__height-markers">
                        <span>{{ HEIGHT_MIN_CM }} {{ $t('cm') }}</span>
                        <span
                            >{{
                                Math.round((HEIGHT_MIN_CM + HEIGHT_MAX_CM) / 2)
                            }}
                            {{ $t('cm') }}</span
                        >
                        <span>{{ HEIGHT_MAX_CM }} {{ $t('cm') }}</span>
                    </div>
                </div>

                <small v-if="heightError" class="outfits-gen-settings__error">
                    {{ heightError }}
                </small>
            </div>

            <div class="outfits-gen-settings__field">
                <div class="outfits-gen-settings__row-label">
                    <i class="pi pi-expand" aria-hidden="true" />
                    <span>{{ $t('outfit_face_mode') }}</span>
                </div>
                <SelectButton
                    :modelValue="formData.face_mode"
                    :options="faceModeOptions"
                    optionLabel="label"
                    optionValue="value"
                    :allowEmpty="false"
                    :disabled="saving"
                    class="outfits-gen-settings__segment outfits-gen-settings__segment--face"
                    @update:modelValue="onFaceModeChange"
                />
            </div>

            <div v-if="requiresFaceImage" class="outfits-gen-settings__field">
                <div
                    v-if="formData.face_image"
                    class="outfits-gen-settings__upload-card"
                >
                    <img
                        :src="formData.face_image"
                        :alt="$t('outfit_face_image')"
                        class="outfits-gen-settings__upload-thumb"
                    />
                    <div class="outfits-gen-settings__upload-copy">
                        <p class="outfits-gen-settings__upload-title">
                            {{ $t('outfit_face_photo_uploaded') }}
                        </p>
                        <p class="outfits-gen-settings__upload-subtitle">
                            {{ $t('outfit_face_photo_usage') }}
                        </p>
                    </div>
                    <Button
                        type="button"
                        icon="pi pi-times"
                        rounded
                        text
                        severity="secondary"
                        class="outfits-gen-settings__upload-remove"
                        :aria-label="$t('remove_image')"
                        :disabled="saving"
                        @click="removeFaceImage"
                    />
                </div>

                <div v-else class="outfits-gen-settings__upload-empty">
                    <img
                        :src="PlaceholderImage"
                        :alt="$t('outfit_face_image')"
                        class="outfits-gen-settings__upload-thumb outfits-gen-settings__upload-thumb--placeholder"
                    />
                    <div class="outfits-gen-settings__upload-copy">
                        <p class="outfits-gen-settings__upload-title">
                            {{ $t('outfit_face_image') }}
                        </p>
                        <p class="outfits-gen-settings__upload-subtitle">
                            {{ $t('outfit_face_image_hint') }}
                        </p>
                    </div>
                    <FileUpload
                        mode="basic"
                        customUpload
                        auto
                        :chooseLabel="$t('upload')"
                        chooseIcon="pi pi-upload"
                        :maxFileSize="OUTFIT_FACE_IMAGE.maxFileSizeKb * 1024"
                        accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                        class="outfits-gen-settings__upload-btn"
                        :disabled="saving"
                        @select="onFaceFileSelect"
                    />
                </div>

                <small v-if="faceError" class="outfits-gen-settings__error">
                    {{ faceError }}
                </small>
            </div>
        </div>

        <div class="outfits-generate-card__actions">
            <div
                v-if="canCreate && batchSizeOptions.length"
                class="outfits-batch-picker"
                role="group"
                :aria-label="$t('outfits_batch_size_label')"
            >
                <button
                    v-for="size in batchSizeOptions"
                    :key="size"
                    type="button"
                    class="outfits-batch-picker__option"
                    :class="{
                        'outfits-batch-picker__option--active':
                            batchSize === size
                    }"
                    :disabled="loading || disabled || saving"
                    @click="batchSize = size"
                >
                    {{ size }}
                </button>
            </div>

            <Button
                v-if="canCreate"
                type="button"
                class="outfits-generate-card__cta"
                :label="generateLabel"
                icon="pi pi-sparkles"
                :loading="loading"
                :disabled="disabled"
                @click="$emit('generate')"
            />
        </div>
    </section>
</template>
