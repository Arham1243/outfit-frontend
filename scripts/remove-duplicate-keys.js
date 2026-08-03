#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively remove duplicate keys from a nested object
 * Only removes duplicates that are siblings within the same parent object
 * @param {Object} obj - The object to process
 * @returns {Object} - Object with duplicates removed
 */
function removeDuplicateKeys(obj) {
    function processObject(currentObj) {
        const seenKeys = new Set();
        const result = {};

        for (const key in currentObj) {
            if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
                if (seenKeys.has(key)) {
                    console.log(`  ⚠️  Removing duplicate key: "${key}"`);
                    continue;
                }

                seenKeys.add(key);

                if (
                    typeof currentObj[key] === 'object' &&
                    currentObj[key] !== null &&
                    !Array.isArray(currentObj[key])
                ) {
                    result[key] = processObject(currentObj[key]);
                } else {
                    result[key] = currentObj[key];
                }
            }
        }

        return result;
    }

    return processObject(obj);
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
        return null;
    }
}

/**
 * Write JSON file with proper formatting
 * @param {string} filePath - Path to the JSON file
 * @param {Object} data - Data to write
 */
function writeJsonFile(filePath, data) {
    try {
        const content = JSON.stringify(data, null, 4);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`  ✅ Saved: ${filePath}`);
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error.message);
    }
}

/**
 * Process a single locale directory
 * @param {string} localesDir - Path to the locales directory
 */
function processLocaleDirectory(localesDir) {
    if (!fs.existsSync(localesDir)) {
        console.error(`Directory not found: ${localesDir}`);
        return;
    }

    console.log(`\n📁 Processing: ${localesDir}`);

    const files = fs
        .readdirSync(localesDir)
        .filter((file) => file.endsWith('.json'));

    if (files.length === 0) {
        console.log('  No JSON files found.');
        return;
    }

    files.forEach((file) => {
        const filePath = path.join(localesDir, file);
        console.log(`\n🔍 Checking: ${file}`);

        const data = loadJsonFile(filePath);
        if (!data) return;

        const originalKeyCount = Object.keys(data).length;
        const cleanedData = removeDuplicateKeys(data);
        const newKeyCount = Object.keys(cleanedData).length;

        if (originalKeyCount !== newKeyCount) {
            console.log(
                `  📊 Keys: ${originalKeyCount} → ${newKeyCount} (removed ${originalKeyCount - newKeyCount} duplicates)`
            );
            writeJsonFile(filePath, cleanedData);
        } else {
            console.log(`  ✅ No duplicates found (${originalKeyCount} keys)`);
        }
    });
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);

    // Default directory to process (this project only)
    const defaultDir = path.join(__dirname, '../src/i18n/locales');

    let directoriesToProcess = [defaultDir];

    // If specific directories are provided as arguments
    if (args.length > 0) {
        directoriesToProcess = args.map((arg) => path.resolve(arg));
    }

    console.log('🧹 Removing Duplicate Keys from Locale Files\n');
    console.log('='.repeat(50));

    directoriesToProcess.forEach((dir) => {
        processLocaleDirectory(dir);
    });

    console.log('\n' + '='.repeat(50));
    console.log('✨ Done!\n');
}

// Run the script
main();
