import { readFileSync, writeFileSync } from 'fs';

const file = 'src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts';
let content = readFileSync(file, 'utf-8');

// Replace all occurrences of power 3 with power 5 for m3 and m4
content = content.replace(/makeMinion\('m3', 'ninja_shinobi', '1', 3\)/g, "makeMinion('m3', 'ninja_shinobi', '1', 5)");
content = content.replace(/makeMinion\('m4', 'ninja_shinobi', '1', 3\)/g, "makeMinion('m4', 'ninja_shinobi', '1', 5)");

writeFileSync(file, content, 'utf-8');
console.log('Fixed power values: m3 and m4 now have power 5');
