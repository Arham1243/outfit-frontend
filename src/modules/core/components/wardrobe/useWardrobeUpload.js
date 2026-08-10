import { ref } from 'vue';
import { WARDROBE_IMAGE } from '@/config';

export const ACCEPTED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp'
];

const MAX_FILE_SIZE = WARDROBE_IMAGE.maxFileSizeMb * 1024 * 1024;

export function useWardrobeUpload() {
    const isDragOver = ref(false);
    const fileInputRef = ref(null);

    const readFileAsDataUrl = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const isAcceptedImage = (file) => {
        if (!file) return false;
        if (file.size > MAX_FILE_SIZE) return false;
        if (ACCEPTED_MIME_TYPES.includes(file.type)) return true;
        const name = String(file.name ?? '').toLowerCase();
        return ['.png', '.jpg', '.jpeg', '.gif', '.webp'].some((ext) =>
            name.endsWith(ext)
        );
    };

    const createPendingImage = async (file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        preview: await readFileAsDataUrl(file)
    });

    const openFilePicker = (busy = false) => {
        if (busy) return;
        fileInputRef.value?.click();
    };

    const resetFileInput = () => {
        if (fileInputRef.value) {
            fileInputRef.value.value = '';
        }
    };

    const onDragOver = (event) => {
        event.preventDefault();
        isDragOver.value = true;
    };

    const onDragLeave = (event) => {
        event.preventDefault();
        isDragOver.value = false;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '';

        if (bytes < 1024) {
            return `${bytes} B`;
        }

        if (bytes < 1024 * 1024) {
            return `${(bytes / 1024).toFixed(1)} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return {
        isDragOver,
        fileInputRef,
        readFileAsDataUrl,
        isAcceptedImage,
        createPendingImage,
        openFilePicker,
        resetFileInput,
        onDragOver,
        onDragLeave,
        formatFileSize
    };
}
