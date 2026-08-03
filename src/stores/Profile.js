import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { ProfileService } from '@/services';

export const useProfileStore = defineStore('ProfileStore', () => {
    const globalStore = useGlobalStore();
    const currentItem = ref(null);

    const getItem = (id, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProfileService.getItem(id, params);
            currentItem.value = res.data.data;
            return res.data;
        });
    };

    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await ProfileService.update(id, payload);
            globalStore.showSuccess(
                $t('profile_updated'),
                $t('profile_updated_successfully')
            );
            return res.data;
        });
    };

    return {
        update,
        currentItem,
        getItem
    };
});
