import { ref } from 'vue';
import { useRoleStore } from '@/modules/core/stores';

const roleSuggestions = ref([]);

export function useTableFilterPresets() {
    const roleStore = useRoleStore();

    const fetchRoles = async (query = '') => {
        const payload = { search: { value: query } };
        const res = await roleStore.list(payload, { limit: 50 });
        roleSuggestions.value = [...(res.data ?? []).map((item) => item.name)];
    };

    const presets = {
        role: {
            suggestions: roleSuggestions,
            onComplete: (event) => fetchRoles(event.query)
        }
    };

    return { presets };
}
