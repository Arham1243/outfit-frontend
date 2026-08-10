#!/usr/bin/env node

/**
 * Scans the codebase for used i18n keys and regenerates en/fr/ur locale files
 * containing only referenced translations.
 *
 * Usage:
 *   node scripts/prune-translations.js          # prune locale files
 *   node scripts/prune-translations.js --dry-run # print used keys only
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const LOCALES_DIR = path.join(SRC_DIR, 'i18n/locales');
const LOCALE_FILES = ['en.json', 'fr.json', 'ur.json'];

/** Renamed keys: newKey -> oldKey in source locale files */
const KEY_ALIASES = {
    address_label: 'address_d70f93',
    customer_notes: 'customer_notes_b108ce'
};

const EXTRA_KEYS = new Set([
    'zip_postal_code',
    'common.table.showingEntry',
    'common.table.showingEntries'
]);

const T_KEY_PATTERNS = [
    /\$t\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /(?<!\$)\bt\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /globalThis\.\$t\s*\(\s*['"`]([^'"`]+)['"`]/g
];

function walkDir(dir, extensions, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules' && entry.name !== 'locales') {
                walkDir(fullPath, extensions, files);
            }
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
            files.push(fullPath);
        }
    }
    return files;
}

function extractKeysFromContent(content) {
    const keys = new Set();
    for (const pattern of T_KEY_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const key = match[1].trim();
            if (key && !key.includes('${')) {
                keys.add(key);
            }
        }
    }
    return keys;
}

function extractMenuKeys() {
    const menuPath = path.join(SRC_DIR, 'static/menuItems.json');
    const keys = new Set();
    const items = JSON.parse(fs.readFileSync(menuPath, 'utf-8'));

    function walk(nodes) {
        for (const item of nodes) {
            if (item.label) keys.add(item.label);
            if (item.items) walk(item.items);
        }
    }
    walk(items);
    return keys;
}

function extractBreadcrumbKeys() {
    const routeFiles = [
        path.join(SRC_DIR, 'routes/routes.js'),
        path.join(SRC_DIR, 'modules/core/routes/routes.js'),
        path.join(SRC_DIR, 'modules/administration/routes/routes.js')
    ];
    const keys = new Set();
    const labelPattern = /label:\s*['"`]([^'"`]+)['"`]/g;

    for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        let match;
        while ((match = labelPattern.exec(content)) !== null) {
            if (match[1].startsWith('breadcrumbs.')) {
                keys.add(match[1]);
            }
        }
    }
    return keys;
}

function extractPermissionMatrixKeys() {
    const filePath = path.join(SRC_DIR, 'utils/permissionMatrix.js');
    const content = fs.readFileSync(filePath, 'utf-8');
    const keys = new Set();
    const pattern = /:\s*['"`](menu\.[^'"`]+)['"`]/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
        keys.add(match[1]);
    }
    return keys;
}

function collectUsedKeys() {
    const keys = new Set([...EXTRA_KEYS]);

    for (const file of walkDir(SRC_DIR, ['.vue', '.js'])) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const key of extractKeysFromContent(content)) {
            keys.add(key);
        }
    }

    for (const key of extractMenuKeys()) keys.add(key);
    for (const key of extractBreadcrumbKeys()) keys.add(key);
    for (const key of extractPermissionMatrixKeys()) keys.add(key);

    return keys;
}

function getNestedValue(obj, keyPath) {
    const parts = keyPath.split('.');
    let current = obj;
    for (const part of parts) {
        if (current == null || typeof current !== 'object') return undefined;
        current = current[part];
    }
    return current;
}

function setNestedValue(obj, keyPath, value) {
    const parts = keyPath.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (
            !(part in current) ||
            typeof current[part] !== 'object' ||
            current[part] === null
        ) {
            current[part] = {};
        }
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

function resolveKeyValue(sourceData, key) {
    if (Object.prototype.hasOwnProperty.call(KEY_ALIASES, key)) {
        const aliasKey = KEY_ALIASES[key];
        const aliasValue = getNestedValue(sourceData, aliasKey);
        if (aliasValue !== undefined && typeof aliasValue !== 'object') {
            return aliasValue;
        }
    }

    const direct = getNestedValue(sourceData, key);
    if (direct !== undefined && typeof direct !== 'object') {
        return direct;
    }

    return undefined;
}

function buildPrunedLocale(sourceData, usedKeys, fallbackData = null) {
    const result = {};
    const sortedKeys = [...usedKeys].sort((a, b) => {
        const aNested = a.includes('.');
        const bNested = b.includes('.');
        if (aNested !== bNested) return aNested ? -1 : 1;
        return a.localeCompare(b);
    });

    const missing = [];

    for (const key of sortedKeys) {
        let value = resolveKeyValue(sourceData, key);
        if (
            value === undefined &&
            fallbackData &&
            fallbackData !== sourceData
        ) {
            value = resolveKeyValue(fallbackData, key);
        }
        if (value === undefined) {
            missing.push(key);
            continue;
        }
        setNestedValue(result, key, value);
    }

    return { result, missing };
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 4)}\n`, 'utf-8');
}

function countLeafKeys(obj, prefix = '') {
    let count = 0;
    for (const key of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (
            typeof obj[key] === 'object' &&
            obj[key] !== null &&
            !Array.isArray(obj[key])
        ) {
            count += countLeafKeys(obj[key], fullKey);
        } else {
            count += 1;
        }
    }
    return count;
}

function main() {
    const dryRun = process.argv.includes('--dry-run');
    const usedKeys = collectUsedKeys();

    console.log(`Found ${usedKeys.size} used translation keys.`);

    if (dryRun) {
        [...usedKeys].sort().forEach((key) => console.log(key));
        return;
    }

    const sourcePath = path.join(LOCALES_DIR, 'en.json');
    const sourceData = loadJson(sourcePath);
    const { result: enResult, missing } = buildPrunedLocale(
        sourceData,
        usedKeys
    );

    if (missing.length > 0) {
        console.warn('\nMissing keys in en.json (will be omitted):');
        missing.sort().forEach((key) => console.warn(`  - ${key}`));
    }

    writeJson(sourcePath, enResult);
    console.log(
        `\nen.json: ${countLeafKeys(enResult)} keys (was ${countLeafKeys(sourceData)})`
    );

    for (const file of LOCALE_FILES.slice(1)) {
        const filePath = path.join(LOCALES_DIR, file);
        const localeData = loadJson(filePath);
        const { result, missing: localeMissing } = buildPrunedLocale(
            localeData,
            usedKeys,
            enResult
        );

        if (localeMissing.length > 0) {
            console.warn(`\nMissing keys in ${file}:`);
            localeMissing.sort().forEach((key) => console.warn(`  - ${key}`));
        }

        writeJson(filePath, result);
        console.log(
            `${file}: ${countLeafKeys(result)} keys (was ${countLeafKeys(localeData)})`
        );
    }

    console.log('\nLocale files pruned successfully.');
}

main();
