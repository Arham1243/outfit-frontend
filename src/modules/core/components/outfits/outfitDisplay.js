import AxiosService from '@/services/Axios.service';
import { cmToFeetInchesInput } from '@/utils/heightConversion';
import { formatWardrobeTypeLabel } from '@/config/wardrobeTypes';

const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export function getOutfitTitle(item, untitledLabel) {
    const name = item?.name?.trim();
    if (name) return name;
    return untitledLabel;
}

export function formatGenderLabel(gender, labels) {
    if (gender === 'male') return labels.male;
    if (gender === 'female') return labels.female;
    return gender ?? '';
}

export function formatFaceModeLabel(faceMode, labels) {
    if (faceMode === 'user_face' || faceMode === 'user_body_ai_face') {
        return labels.userFace;
    }

    return labels.aiFace;
}

export function formatHeightFromCm(cm) {
    if (cm === null || cm === undefined || cm === '') {
        return '';
    }

    const parsed = Number(cm);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return '';
    }

    const totalInches = Math.round(parsed / 2.54);
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;

    return `${feet}'${inches}"`;
}

export function formatHeightSummary(cm) {
    const feetLabel = formatHeightFromCm(cm);
    const input = cmToFeetInchesInput(cm);

    if (!feetLabel) {
        return '—';
    }

    if (!input) {
        return feetLabel;
    }

    return feetLabel;
}

export function formatOutfitMeta(item, labels) {
    const settings = item?.generation_settings ?? {};
    const parts = [];

    if (settings.gender) {
        parts.push(formatGenderLabel(settings.gender, labels));
    }

    if (settings.height) {
        parts.push(formatHeightFromCm(settings.height));
    }

    if (settings.face_mode) {
        parts.push(formatFaceModeLabel(settings.face_mode, labels));
    }

    return parts.filter(Boolean).join(' · ');
}

export function formatOutfitViewSubtitle(item, labels) {
    const settings = item?.generation_settings ?? {};
    const parts = [];

    if (settings.gender) {
        parts.push(formatGenderLabel(settings.gender, labels));
    }

    if (settings.height) {
        parts.push(formatHeightFromCm(settings.height));
    }

    if (labels.generatedOn) {
        parts.push(labels.generatedOn);
    }

    return parts.filter(Boolean).join(' · ');
}

export function getWardrobeItemDisplayName(item, untitledLabel) {
    const name = item?.name?.trim();
    if (name) return name;
    if (item?.type) return formatWardrobeTypeLabel(item.type);
    return untitledLabel;
}

export function getWardrobeItemSubtitle(item) {
    if (!item?.type) return '';
    return formatWardrobeTypeLabel(item.type);
}

export async function downloadOutfitImage(outfitUuid, filename = 'outfit.jpg') {
    if (!outfitUuid) return;

    const response = await AxiosService.get(
        `${API_BASE_URL}/outfits/${encodeURIComponent(outfitUuid)}/download`,
        { responseType: 'blob' }
    );

    const blob = response.data;

    if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('Download failed');
    }

    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
}
