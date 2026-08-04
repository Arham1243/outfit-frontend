import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { WardrobeService } from '@/modules/core/services';

export const useWardrobeStore = defineStore('WardrobeStore', () => {
    const globalStore = useGlobalStore();

    const search = (payload, params) => {
        return globalStore.actionWrapper(async () => {
            const res = await WardrobeService.search(payload, params);
            return res.data;
        });
    };

    const create = (payload, options = {}) => {
        return globalStore.actionWrapper(async () => {
            const res = await WardrobeService.create(payload);
            if (!options.silent) {
                globalStore.showSuccess(
                    $t('wardrobe_created'),
                    $t('wardrobe_created_successfully')
                );
            }
            return res.data;
        });
    };

    const update = (id, payload) => {
        return globalStore.actionWrapper(async () => {
            const res = await WardrobeService.update(id, payload);
            globalStore.showSuccess(
                $t('wardrobe_updated'),
                $t('wardrobe_updated_successfully')
            );
            return res.data;
        });
    };

    const deleteItem = async (id) => {
        return globalStore.actionWrapper(async () => {
            const res = await WardrobeService.deleteItem(id);
            globalStore.showSuccess(
                $t('wardrobe_deleted'),
                $t('wardrobe_deleted_successfully')
            );
            return res.data;
        });
    };

    const bulkDelete = async (uuids) => {
        return globalStore.actionWrapper(async () => {
            const res = await WardrobeService.bulkDelete(uuids);
            const count = res.data?.deleted ?? uuids.length;
            globalStore.showSuccess(
                $t('wardrobe_deleted'),
                $t('wardrobe_images_deleted_successfully', { count })
            );
            return res.data;
        });
    };

    return {
        search,
        create,
        update,
        deleteItem,
        bulkDelete
    };
});
