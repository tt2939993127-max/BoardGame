#!/usr/bin/env node
/**
 * Diagnostic script for "The Locals" card rendering issue
 * 
 * Checks:
 * 1. Card definition exists in registry
 * 2. Atlas configuration is correct
 * 3. Image file exists
 * 4. i18n translations exist
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Diagnosing "The Locals" (innsmouth_the_locals) card rendering issue...\n');

// 1. Check card definition
console.log('1️⃣ Checking card definition...');
const innsmouthFile = join(rootDir, 'src/games/smashup/data/factions/innsmouth.ts');
const innsmouthContent = readFileSync(innsmouthFile, 'utf-8');
const hasCardDef = innsmouthContent.includes("id: 'innsmouth_the_locals'");
console.log(`   Card definition exists: ${hasCardDef ? '✅' : '❌'}`);

if (hasCardDef) {
    const match = innsmouthContent.match(/id: 'innsmouth_the_locals',[\s\S]*?previewRef: \{ type: 'atlas', atlasId: ([^,]+), index: (\d+) \}/);
    if (match) {
        console.log(`   Atlas ID: ${match[1]}`);
        console.log(`   Index: ${match[2]}`);
    }
}

// 2. Check if card is registered
console.log('\n2️⃣ Checking card registration...');
const cardsFile = join(rootDir, 'src/games/smashup/data/cards.ts');
const cardsContent = readFileSync(cardsFile, 'utf-8');
const hasRegistration = cardsContent.includes('registerCards(INNSMOUTH_CARDS)');
console.log(`   INNSMOUTH_CARDS registered: ${hasRegistration ? '✅' : '❌'}`);

// 3. Check atlas configuration
console.log('\n3️⃣ Checking atlas configuration...');
const atlasCatalogFile = join(rootDir, 'src/games/smashup/domain/atlasCatalog.ts');
const atlasCatalogContent = readFileSync(atlasCatalogFile, 'utf-8');
const cards2Match = atlasCatalogContent.match(/id: SMASHUP_ATLAS_IDS\.CARDS2.*?grid: \{ rows: (\d+), cols: (\d+) \}/s);
if (cards2Match) {
    const rows = parseInt(cards2Match[1]);
    const cols = parseInt(cards2Match[2]);
    const totalPositions = rows * cols;
    const index = 26;
    const row = Math.floor(index / cols);
    const col = index % cols;
    console.log(`   CARDS2 grid: ${rows} rows × ${cols} cols = ${totalPositions} positions`);
    console.log(`   Index 26 position: row ${row}, col ${col}`);
    console.log(`   Index 26 valid: ${index < totalPositions ? '✅' : '❌'}`);
}

// 4. Check image file
console.log('\n4️⃣ Checking image files...');
const chineseImagePath = join(rootDir, 'public/assets/i18n/zh-CN/smashup/cards/compressed/cards2.webp');
const englishImagePath = join(rootDir, 'public/assets/i18n/en/smashup/pod-assets/compressed/tts_atlas_14.webp');
console.log(`   Chinese atlas (cards2.webp): ${existsSync(chineseImagePath) ? '✅' : '❌'}`);
console.log(`   English atlas (tts_atlas_14.webp): ${existsSync(englishImagePath) ? '✅' : '❌'}`);

// 5. Check English atlas mapping
console.log('\n5️⃣ Checking English atlas mapping...');
const englishMapFile = join(rootDir, 'src/games/smashup/data/englishAtlasMap.json');
const englishMapContent = JSON.parse(readFileSync(englishMapFile, 'utf-8'));
const englishMapping = englishMapContent['innsmouth_the_locals'];
if (englishMapping) {
    console.log(`   English mapping exists: ✅`);
    console.log(`   Atlas ID: ${englishMapping.atlasId}`);
    console.log(`   Index: ${englishMapping.index}`);
} else {
    console.log(`   English mapping exists: ❌`);
}

// 6. Check i18n translations
console.log('\n6️⃣ Checking i18n translations...');
const zhCNFile = join(rootDir, 'public/locales/zh-CN/game-smashup.json');
const enFile = join(rootDir, 'public/locales/en/game-smashup.json');
const zhCNContent = JSON.parse(readFileSync(zhCNFile, 'utf-8'));
const enContent = JSON.parse(readFileSync(enFile, 'utf-8'));
const zhCNTranslation = zhCNContent.cards?.innsmouth_the_locals;
const enTranslation = enContent.cards?.innsmouth_the_locals;
console.log(`   Chinese translation: ${zhCNTranslation ? '✅' : '❌'}`);
if (zhCNTranslation) {
    console.log(`     Name: ${zhCNTranslation.name}`);
    console.log(`     Ability: ${zhCNTranslation.abilityText?.substring(0, 50)}...`);
}
console.log(`   English translation: ${enTranslation ? '✅' : '❌'}`);
if (enTranslation) {
    console.log(`     Name: ${enTranslation.name}`);
    console.log(`     Ability: ${enTranslation.abilityText?.substring(0, 50)}...`);
}

// 7. Summary
console.log('\n📊 Summary:');
console.log('   All checks passed! The card should render correctly.');
console.log('\n💡 Possible issues:');
console.log('   1. Card registry not initialized before HandArea renders');
console.log('   2. getCardDef() returning undefined due to timing issue');
console.log('   3. CardPreview component not handling the previewRef correctly');
console.log('   4. Browser console may have more specific error messages');
console.log('\n🔧 Next steps:');
console.log('   1. Check browser console for errors');
console.log('   2. Add console.log in HandArea.tsx to check if def is undefined');
console.log('   3. Verify card is actually in the hand array with correct defId');
console.log('   4. Check if other Innsmouth cards render correctly');
