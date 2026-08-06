const CM_PER_INCH = 2.54;

/**
 * Parse feet.inches input (e.g. 5.8 → 5 ft 8 in, 5.11 → 5 ft 11 in).
 */
export function parseFeetInchesInput(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const normalized = String(value).trim().replace(',', '.');

    if (!/^\d+(\.\d+)?$/.test(normalized)) {
        return null;
    }

    const [feetPart, inchesPart = '0'] = normalized.split('.');
    const feet = Number(feetPart);
    const inches = Number(inchesPart);

    if (!Number.isFinite(feet) || feet < 0 || feet > 8) {
        return null;
    }

    if (!Number.isFinite(inches) || inches < 0 || inches > 11) {
        return null;
    }

    return { feet, inches };
}

export function feetInchesToCm(feet, inches) {
    return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

export function feetInchesInputToCm(value) {
    const parsed = parseFeetInchesInput(value);

    if (!parsed) {
        return null;
    }

    return feetInchesToCm(parsed.feet, parsed.inches);
}

export function cmToFeetInchesInput(cm) {
    if (cm === null || cm === undefined || cm === '') {
        return '';
    }

    const parsed = Number(cm);

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return '';
    }

    const totalInches = Math.round(parsed / CM_PER_INCH);
    let feet = Math.floor(totalInches / 12);
    let inches = totalInches % 12;

    if (inches === 12) {
        feet += 1;
        inches = 0;
    }

    return `${feet}.${inches}`;
}
