import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/games/smashup/__tests__/temple-firstmate-afterscore.test.ts';
const content = readFileSync(filePath, 'utf-8');

const fixed = content
    .replace(/SU_EVENTS\.CARD_TO_DECK_BOTTOM/g, '"su:card_to_deck_bottom"')
    .replace(/import \{ SU_EVENTS \} from '\.\.\/domain\/events';[\r\n]+/, '');

writeFileSync(filePath, fixed, 'utf-8');
console.log('Fixed event names in test file');
