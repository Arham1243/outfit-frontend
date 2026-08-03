#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const SOURCE_FILE = 'en.json';

/**
 * Recursively extract all keys from a nested object
 * @param {Object} obj - The object to extract keys from
 * @param {string} prefix - The prefix for nested keys
 * @returns {Set<string>} - Set of all keys
 */
function extractKeys(obj, prefix = '') {
    const keys = new Set();

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (
                typeof obj[key] === 'object' &&
                obj[key] !== null &&
                !Array.isArray(obj[key])
            ) {
                // Recursively extract nested keys
                const nestedKeys = extractKeys(obj[key], fullKey);
                nestedKeys.forEach((k) => keys.add(k));
            } else {
                keys.add(fullKey);
            }
        }
    }

    return keys;
}

/**
 * Load and parse a JSON file
 * @param {string} filePath - Path to the JSON file
 * @returns {Object} - Parsed JSON object
 */
function loadJsonFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
        process.exit(1);
    }
}

/**
 * Main validation function
 */
function validateTranslations() {
    const sourcePath = path.join(LOCALES_DIR, SOURCE_FILE);

    if (!fs.existsSync(sourcePath)) {
        console.error(`Source file ${SOURCE_FILE} not found in ${LOCALES_DIR}`);
        process.exit(1);
    }

    const sourceData = loadJsonFile(sourcePath);
    const sourceKeys = extractKeys(sourceData);

    // Get all language files except the source
    const files = fs
        .readdirSync(LOCALES_DIR)
        .filter((file) => file.endsWith('.json') && file !== SOURCE_FILE);

    let hasMissingKeys = false;
    const missingKeysReport = {};
    const extraKeysReport = {};

    files.forEach((file) => {
        const filePath = path.join(LOCALES_DIR, file);
        const targetData = loadJsonFile(filePath);
        const targetKeys = extractKeys(targetData);

        // Find missing keys
        const missing = [...sourceKeys].filter((key) => !targetKeys.has(key));

        // Find extra keys
        const extra = [...targetKeys].filter((key) => !sourceKeys.has(key));

        if (missing.length > 0) {
            hasMissingKeys = true;
            missingKeysReport[file] = missing.sort();
        }

        if (extra.length > 0) {
            extraKeysReport[file] = extra.sort();
        }
    });

    // Generate report
    console.log('\n=== Translation Validation Report ===\n');

    if (Object.keys(missingKeysReport).length > 0) {
        console.log('Missing translation keys:\n');
        for (const [file, keys] of Object.entries(missingKeysReport)) {
            console.log(`* ${file}`);
            keys.forEach((key) => console.log(`  * ${key}`));
            console.log('');
        }
    } else {
        console.log('✓ No missing translation keys found.\n');
    }

    if (Object.keys(extraKeysReport).length > 0) {
        console.log('Extra keys not found in en.json:\n');
        for (const [file, keys] of Object.entries(extraKeysReport)) {
            console.log(`* ${file}`);
            keys.forEach((key) => console.log(`  * ${key}`));
            console.log('');
        }
    } else {
        console.log('✓ No extra keys found.\n');
    }

    console.log('=== End of Report ===\n');

    if (hasMissingKeys) {
        console.error(
            '❌ Validation failed: Missing translation keys detected.'
        );
        process.exit(1);
    }

    console.log('✅ Validation passed: All translation files are in sync.');
    process.exit(0);
}

// Run validation
validateTranslations();
