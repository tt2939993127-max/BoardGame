import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.resolve('D:/gongzuo/web/BordGame/BordGameAsset/SoundEffect/_source_zips');
const TARGET_FILE = path.resolve('D:/gongzuo/web/BordGame/public/audio_assets.md');
const VALID_EXTS = ['.wav', '.mp3', '.ogg', '.flac'];

function scanDirectory(dir, fileSet = new Set()) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        if (file.startsWith('.') || file === '__MACOSX') return;
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            scanDirectory(filePath, fileSet);
        } else {
            if (VALID_EXTS.includes(path.extname(file).toLowerCase())) {
                fileSet.add(file);
            }
        }
    });
    return fileSet;
}

function groupFiles(names) {
    if (names.length === 0) return [];

    // Grouping by pattern: prefix + <variable> + suffix
    // We'll try to group numbers first, then letters.

    const tryGroup = (list, regex, isAlpha = false) => {
        const groups = {};
        const remain = [];

        list.forEach(name => {
            const match = name.match(regex);
            if (match) {
                const [_, prefix, val, suffix] = match;
                const key = prefix + '###' + suffix;
                if (!groups[key]) groups[key] = [];
                groups[key].push({ val, original: name });
            } else {
                remain.push(name);
            }
        });

        const grouped = [];
        for (const key in groups) {
            const items = groups[key];
            const [prefix, suffix] = key.split('###');

            if (items.length === 1) {
                remain.push(items[0].original);
                continue;
            }

            // Sort items
            if (isAlpha) {
                items.sort((a, b) => a.val.localeCompare(b.val));
            } else {
                items.sort((a, b) => a.val.localeCompare(b.val)); // lexicographical fine for padded digits
            }

            const ranges = [];
            let start = items[0].val;
            let last = items[0].val;

            for (let i = 1; i <= items.length; i++) {
                const current = items[i]?.val;
                let isSequential = false;

                if (current) {
                    if (isAlpha) {
                        isSequential = current.charCodeAt(0) === last.charCodeAt(0) + 1;
                    } else {
                        isSequential = parseInt(current) === parseInt(last) + 1 && current.length === last.length;
                    }
                }

                if (isSequential) {
                    last = current;
                } else {
                    ranges.push(start === last ? start : `${start}-${last}`);
                    if (current) {
                        start = current;
                        last = current;
                    }
                }
            }
            grouped.push(`${prefix}[${ranges.join(', ')}]${suffix}`);
        }
        return [...remain, ...grouped];
    };

    // Pass 1: Numeric grouping (e.g. Sound_01.wav)
    let processed = tryGroup(names, /^(.*?)(\d+)([^0-9]*\.[^.]+)$/, false);

    // Pass 2: Alphabetic grouping (e.g. Hit_A.wav, or Action A.wav)
    // Looking for a single char A-Z that is either preceded by _ or space, or part of a suffix
    processed = tryGroup(processed, /^(.*?)([A-Z])([^A-Z]*\.[^.]+)$/, true);

    return processed.sort();
}

function generateMarkdown(fileSet) {
    const names = Array.from(fileSet);
    const grouped = groupFiles(names);

    let content = '# Audio Asset Symbols (Flat & Grouped)\n\n';
    content += `Generated on: ${new Date().toLocaleString()}\n`;
    content += `Total Metadata Symbols: ${grouped.length} (from ${names.length} physical files)\n\n`;

    content += '> [!TIP]\n';
    content += '> This is a **FLAT LIST** of all audio filenames found in the assets directory.\n';
    content += '> - **Grouping**: Numbers `[01-05]` and Letters `[A-C]` are merged to save space.\n';
    content += '> - **Lookup**: Use the command below to find the physical path of any symbol.\n\n';

    content += '## 🔍 Search Command\n';
    content += '```json\n';
    content += '{\n';
    content += `  "SearchDirectory": "${SOURCE_DIR.replace(/\\/g, '/')}",\n`;
    content += '  "Pattern": "*SYMBOL_OR_PART*",\n';
    content += '  "Type": "file"\n';
    content += '}\n';
    content += '```\n\n';

    content += '---\n\n';
    content += '## 🎵 File Symbols\n\n';
    grouped.forEach(item => {
        content += `- \`${item}\` \n`;
    });

    return content;
}

console.log('Scanning all files...');
try {
    const fileSet = scanDirectory(SOURCE_DIR);
    console.log(`Found ${fileSet.size} unique filenames.`);

    console.log('Generating flat grouped manifest...');
    const markdown = generateMarkdown(fileSet);

    fs.writeFileSync(TARGET_FILE, markdown, 'utf8');
    console.log(`Successfully wrote to ${TARGET_FILE}`);
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
