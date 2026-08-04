import { defineStore } from 'pinia';
import { useGlobalStore } from '@/stores';
import { OutfitService } from '@/modules/core/services';

export const useOutfitStore = defineStore('OutfitStore', () => {
    const globalStore = useGlobalStore();

    const list = (params) => {
        return globalStore.actionWrapper(async () => {
            const res = await OutfitService.list(params);
            return res.data;
        });
    };

    const generate = (params) => {
        return globalStore.actionWrapper(async () => {
            const res = await OutfitService.generate(params);
            return res.data;
        });
    };

    const getTypeCounts = () => {
        return globalStore.actionWrapper(async () => {
            const res = await OutfitService.getTypeCounts();
            return res.data;
        });
    };

    return {
        list,
        generate,
        getTypeCounts
    };
});
