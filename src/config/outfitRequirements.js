export const OUTFIT_FOOTWEAR_TYPES = ['shoes'];

export const OUTFIT_TOP_TYPES = ['shirt', 't-shirt', 'sweater'];

export const OUTFIT_BOTTOM_TYPES = ['pants', 'jeans', 'shorts'];

export const OUTFIT_ONE_PIECE_TYPES = ['dress'];

export const OUTFIT_WARDROBE_GROUP_KEYS = {
    footwear: 'outfit_group_footwear',
    top: 'outfit_group_top',
    bottom: 'outfit_group_bottom'
};

export function countForTypes(typeCounts, types) {
    return types.reduce(
        (total, type) => total + Number(typeCounts?.[type] ?? 0),
        0
    );
}

export function getMissingWardrobeGroups(typeCounts = {}) {
    const hasFootwear = countForTypes(typeCounts, OUTFIT_FOOTWEAR_TYPES) > 0;
    const hasDress = countForTypes(typeCounts, OUTFIT_ONE_PIECE_TYPES) > 0;
    const hasTop = countForTypes(typeCounts, OUTFIT_TOP_TYPES) > 0;
    const hasBottom = countForTypes(typeCounts, OUTFIT_BOTTOM_TYPES) > 0;

    const missing = [];

    if (!hasFootwear) {
        missing.push('footwear');
    }

    if (hasDress && hasFootwear) {
        return missing;
    }

    if (!hasTop) {
        missing.push('top');
    }

    if (!hasBottom) {
        missing.push('bottom');
    }

    return missing;
}

export function isProfileReadyForOutfits({ height, face_image: faceImage }) {
    const normalizedHeight =
        height === null || height === undefined || height === ''
            ? null
            : Number(height);

    return (
        Number.isFinite(normalizedHeight) &&
        normalizedHeight >= 50 &&
        Boolean(faceImage)
    );
}

export function formatMissingWardrobeGroups(missingGroups, t) {
    return missingGroups
        .map((group) => t(OUTFIT_WARDROBE_GROUP_KEYS[group] ?? group))
        .join(', ');
}
