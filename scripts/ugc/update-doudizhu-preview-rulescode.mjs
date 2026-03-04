import fs from 'node:fs';
import path from 'node:path';

const jsonPath = path.resolve('docs/ugc/doudizhu-preview.ugc.json');
const domainPath = path.resolve('uploads/ugc/local-draft/doudizhu-preview/domain.js');

const jsonText = fs.readFileSync(jsonPath, 'utf8');
const domain = fs.readFileSync(domainPath, 'utf8');
const main = domain.split('// === builder preview config injected for runtime view ===')[0].trimEnd();
const escaped = JSON.stringify(main);

const key = '"rulesCode"';
const start = jsonText.indexOf(key);
if (start < 0) {
  throw new Error('rulesCode 未找到');
}
const uiIndex = jsonText.indexOf('"uiLayout"', start);
if (uiIndex < 0) {
  throw new Error('uiLayout 未找到');
}
const colonIndex = jsonText.indexOf(':', start);
const commaIndex = jsonText.lastIndexOf(',', uiIndex);
if (colonIndex < 0 || commaIndex < 0 || commaIndex <= colonIndex) {
  throw new Error('rulesCode 范围无效');
}

const before = jsonText.slice(0, colonIndex + 1);
const after = jsonText.slice(commaIndex);
const next = `${before} ${escaped}${after}`;

fs.writeFileSync(jsonPath, next, 'utf8');
console.log('[UGC] rulesCode updated');
