<script setup>
import { nextTick, onBeforeMount, ref, watch } from 'vue';
import { useLayout } from '@/layout/composables/layout';
import { useGlobalStore, useProfileStore, useSessionStore } from '@/stores';
import UserInfo from '@/components/profile/tabs/UserInfo.vue';
import { useFormDirty } from '@/composables/useFormDirty';
import { useHelpers } from '@/composables/useHelpers';

const { layoutState, closeProfileDialog } = useLayout();
const globalStore = useGlobalStore();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();
const { filterFileFields } = useHelpers();

const busy = ref(false);
const loading = ref(false);
const showUnsavedDialog = ref(false);
const allowClose = ref(false);
const resetKey = ref(0);
const userId = sessionStore.user?.uuid;

const formData = ref({
    name: '',
    profile_image: null
});

const { isDirty, resetDirty } = useFormDirty(formData);

watch(
    () => layoutState.profileDialogVisible,
    async (visible, wasVisible) => {
        if (visible) {
            allowClose.value = false;
            globalStore.clearErrors();
            await getItem();
            return;
        }

        if (wasVisible && isDirty.value && !allowClose.value) {
            layoutState.profileDialogVisible = true;
            showUnsavedDialog.value = true;
        }
    }
);

onBeforeMount(async () => {
    if (layoutState.profileDialogVisible) {
        globalStore.clearErrors();
        await getItem();
    }
});

function mapResponseToForm(data = {}) {
    const allowedKeys = Object.keys(formData.value);
    const mapped = {};

    for (const key of allowedKeys) {
        if (key in data) {
            mapped[key] = data[key] ?? formData.value[key];
        } else {
            mapped[key] = formData.value[key];
        }
    }

    nextTick(() => {
        formData.value = { ...formData.value, ...mapped };
    });
}

async function resetForm({ showLoading = true } = {}) {
    globalStore.clearErrors();
    await getItem({ showLoading });
    resetKey.value++;
    resetDirty(formData.value);
}

async function refreshSessionUser() {
    await sessionStore.me();
}

async function syncSavedProfile() {
    globalStore.clearErrors();
    await getItem({ showLoading: false });
    resetDirty(formData.value);
}

function finishClose() {
    allowClose.value = true;
    closeProfileDialog();
}

function requestClose() {
    if (isDirty.value) {
        showUnsavedDialog.value = true;
        return;
    }

    finishClose();
}

function confirmDiscard() {
    showUnsavedDialog.value = false;
    resetForm();
    finishClose();
}

async function save() {
    if (!userId) {
        return;
    }

    try {
        busy.value = true;
        const payload = filterFileFields(
            {
                name: formData.value.name,
                profile_image: formData.value.profile_image
            },
            ['profile_image']
        );
        await profileStore.update(userId, payload);
        await refreshSessionUser();
        await syncSavedProfile();
        finishClose();
    } catch (error) {
        console.error(error);
    } finally {
        busy.value = false;
    }
}

async function getItem({ showLoading = true } = {}) {
    if (!userId) {
        return;
    }

    try {
        if (showLoading) {
            loading.value = true;
        }

        const res = await profileStore.getItem(userId);
        mapResponseToForm(res?.data);

        await nextTick();
        resetDirty(formData.value);
    } finally {
        if (showLoading) {
            loading.value = false;
        }
    }
}
</script>

<template>
    <Dialog
        v-model:visible="layoutState.profileDialogVisible"
        modal
        dismissableMask
        class="profile-dialog"
        :header="$t('layout.account.edit_profile')"
        :style="{ width: 'min(94vw, 42rem)' }"
        :draggable="false"
    >
        <Loader v-if="loading" />

        <UserInfo
            v-else
            :key="`profile-dialog-${resetKey}`"
            :formData="formData"
            :busy="busy"
            @save="save"
        />

        <template #footer>
            <div class="profile-dialog__footer">
                <Button
                    type="button"
                    :label="$t('cancel')"
                    severity="secondary"
                    text
                    :disabled="busy"
                    @click="requestClose"
                />
                <Button
                    type="button"
                    icon="pi pi-check"
                    :label="$t('save')"
                    :disabled="busy || !isDirty"
                    :loading="busy"
                    @click="save"
                />
            </div>
        </template>
    </Dialog>

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

<style lang="scss" scoped>
.profile-dialog__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    width: 100%;
}
</style>
