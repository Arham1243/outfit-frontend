import { formatWardrobeTypeLabel } from '@/config/wardrobeTypes';

export function getItemImageUrl(item) {
    return item?.image_url || item?.image || null;
}

export function formatType(type) {
    if (!type) return null;
    return formatWardrobeTypeLabel(type);
}

export function getItemDisplayName(item, untitledLabel) {
    const name = item?.name?.trim();
    if (name) return name;
    if (item?.type) return formatType(item.type);
    return untitledLabel;
}

export function countActiveCategories(typeCounts = {}) {
    return Object.entries(typeCounts).filter(
        ([key, count]) => key !== 'uncategorized' && Number(count) > 0
    ).length;
}

export function getLatestUpdatedAt(items = []) {
    if (!items.length) return null;

    return items.reduce((latest, item) => {
        const value = item?.updated_at || item?.created_at;
        if (!value) return latest;
        if (!latest) return value;
        return new Date(value) > new Date(latest) ? value : latest;
    }, null);
}
