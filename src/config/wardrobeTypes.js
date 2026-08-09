export const WARDROBE_TYPES = [
    't-shirt',
    'shirt',
    'pants',
    'jeans',
    'shoes',
    'jacket',
    'hoodie',
    'sweatshirt',
    'shorts'
];

export const formatWardrobeTypeLabel = (type) => {
    if (!type) return '';
    return String(type)
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
};

export const buildWardrobeTypeOptions = (t = (key) => key) =>
    WARDROBE_TYPES.map((type) => ({
        value: type,
        label: formatWardrobeTypeLabel(type)
    }));
