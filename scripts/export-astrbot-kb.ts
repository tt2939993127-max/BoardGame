import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { abilityRegistry } from '../src/games/cardia/domain/abilityRegistry';
import { ALL_CARDS as CARDIA_ALL_CARDS } from '../src/games/cardia/domain/cardRegistry';
import { HEROES_DATA } from '../src/games/dicethrone/heroes';
import { buildCardRegistry as buildSummonerWarsCardRegistry, getCardPoolByFaction } from '../src/games/summonerwars/config/cardRegistry';
import { FACTION_CATALOG } from '../src/games/summonerwars/config/factions';

type KnowledgeDocument = {
    id: string;
    kind: string;
    title: string;
    text: string;
    keywords: string[];
    source: string[];
    metadata: Record<string, unknown>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');
const tempRoot = join(repoRoot, 'temp');
const outputRoot = join(tempRoot, 'astrbot-kb');

const kbBuckets = new Map<string, KnowledgeDocument[]>();

function addDoc(kbName: string, document: KnowledgeDocument): void {
    const bucket = kbBuckets.get(kbName) ?? [];
    bucket.push(document);
    kbBuckets.set(kbName, bucket);
}

function uniq(items: Array<string | undefined | null>): string[] {
    return [...new Set(items.filter((item): item is string => Boolean(item && item.trim())))];
}

function getByPath(root: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
        if (!current || typeof current !== 'object') return undefined;
        return (current as Record<string, unknown>)[key];
    }, root);
}

function asText(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
}

function stringifyCompact(value: unknown): string {
    return JSON.stringify(value, null, 2);
}

function formatList(values: Array<string | number | undefined | null>): string {
    const filtered = values.filter((value): value is string | number => value !== undefined && value !== null && String(value).trim().length > 0);
    return filtered.length > 0 ? filtered.join(' / ') : '无';
}

function splitMarkdownSections(fileName: string, content: string): Array<{ title: string; text: string }> {
    const normalized = content.replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const sections = normalized
        .split(/\n(?=##?\s+)/g)
        .map(section => section.trim())
        .filter(Boolean);

    if (sections.length <= 1) {
        return [{ title: fileName.replace(/\.md$/i, ''), text: normalized }];
    }

    return sections.map((section, index) => {
        const firstLine = section.split('\n')[0]?.trim() ?? '';
        const heading = firstLine.replace(/^#+\s+/, '').trim();
        return {
            title: heading ? `${fileName.replace(/\.md$/i, '')} / ${heading}` : `${fileName.replace(/\.md$/i, '')} / 片段 ${index + 1}`,
            text: section,
        };
    });
}

function isInternalRuleFile(fileName: string): boolean {
    return /ENGINE_GUIDE|POD-SYSTEM|coverage|核对|真相源表|录入/.test(fileName);
}

async function readJson<T>(path: string): Promise<T> {
    return JSON.parse(await readFile(path, 'utf-8')) as T;
}

async function readJsonl(path: string): Promise<KnowledgeDocument[]> {
    const content = await readFile(path, 'utf-8');
    return content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => JSON.parse(line) as KnowledgeDocument);
}

async function ensureCleanOutputRoot(): Promise<void> {
    await rm(outputRoot, { recursive: true, force: true });
    await mkdir(outputRoot, { recursive: true });
}

async function exportSmashupFromExistingArtifacts(): Promise<void> {
    const structuredPath = join(tempRoot, 'smashup-kb', 'documents.jsonl');
    const wikiPath = join(tempRoot, 'smashup-wiki-kb', 'documents.jsonl');
    const structuredDocs = await readJsonl(structuredPath);
    const wikiDocs = await readJsonl(wikiPath);

    for (const document of structuredDocs) {
        if (['card', 'base', 'faction', 'titan'].includes(document.kind)) {
            addDoc('smashup_structured', document);
            continue;
        }
        if (document.kind !== 'rule') continue;

        const sourceText = document.source.join(' ');
        const targetKb = isInternalRuleFile(sourceText) ? 'smashup_internal' : 'smashup_rules';
        addDoc(targetKb, document);
    }

    for (const document of wikiDocs) {
        if (document.kind !== 'wiki-chunk') continue;
        addDoc('smashup_wiki', document);
    }
}

async function exportCardiaKnowledge(): Promise<void> {
    const locale = await readJson<Record<string, unknown>>(join(repoRoot, 'public', 'locales', 'zh-CN', 'game-cardia.json'));
    const abilities = abilityRegistry.getAll();

    for (const card of CARDIA_ALL_CARDS) {
        const name = asText(getByPath(locale, card.nameKey)) || card.id;
        const description = asText(getByPath(locale, card.descriptionKey));
        const abilityDetails = card.abilityIds.map(abilityId => {
            const ability = abilities.find(entry => entry.id === abilityId);
            const abilityName = ability ? asText(getByPath(locale, ability.name)) : abilityId;
            const abilityDescription = ability ? asText(getByPath(locale, ability.description)) : '';
            return {
                id: abilityId,
                name: abilityName || abilityId,
                description: abilityDescription || '无',
                trigger: ability?.trigger ?? '',
            };
        });

        addDoc('cardia_structured', {
            id: `cardia:card:${card.id}`,
            kind: 'card',
            title: `卡迪亚卡牌：${name}`,
            text: [
                `名称：${name}`,
                `ID：${card.id}`,
                `牌组：${card.deckVariant}`,
                `派系：${card.faction}`,
                `影响力：${card.influence}`,
                `难度：${card.difficulty}`,
                `能力：${formatList(abilityDetails.map(detail => detail.name))}`,
                `描述：${description || '无'}`,
                `能力详情：${stringifyCompact(abilityDetails)}`,
            ].join('\n'),
            keywords: uniq([name, card.id, card.faction, card.deckVariant, ...card.abilityIds]),
            source: [
                'src/games/cardia/domain/cardRegistry.ts',
                'src/games/cardia/domain/abilityRegistry.ts',
                `public/locales/zh-CN/game-cardia.json#${card.nameKey}`,
                `public/locales/zh-CN/game-cardia.json#${card.descriptionKey}`,
            ],
            metadata: {
                game: 'cardia',
                entityType: 'card',
                faction: card.faction,
                deckVariant: card.deckVariant,
                influence: card.influence,
            },
        });
    }

    for (const ability of abilities) {
        const name = asText(getByPath(locale, ability.name)) || ability.id;
        const description = asText(getByPath(locale, ability.description));
        addDoc('cardia_structured', {
            id: `cardia:ability:${ability.id}`,
            kind: 'ability',
            title: `卡迪亚能力：${name}`,
            text: [
                `名称：${name}`,
                `ID：${ability.id}`,
                `触发：${ability.trigger}`,
                `即时：${ability.isInstant ? '是' : '否'}`,
                `持续：${ability.isOngoing ? '是' : '否'}`,
                `需要标记：${ability.requiresMarker ? '是' : '否'}`,
                `描述：${description || '无'}`,
                `效果：${stringifyCompact(ability.effects)}`,
            ].join('\n'),
            keywords: uniq([name, ability.id, ability.trigger]),
            source: [
                'src/games/cardia/domain/abilityRegistry.ts',
                `public/locales/zh-CN/game-cardia.json#${ability.name}`,
                `public/locales/zh-CN/game-cardia.json#${ability.description}`,
            ],
            metadata: {
                game: 'cardia',
                entityType: 'ability',
                trigger: ability.trigger,
            },
        });
    }

    const factions = getByPath(locale, 'factions') as Record<string, unknown> | undefined;
    for (const [factionId, factionNameValue] of Object.entries(factions ?? {})) {
        addDoc('cardia_structured', {
            id: `cardia:faction:${factionId}`,
            kind: 'faction',
            title: `卡迪亚派系：${asText(factionNameValue) || factionId}`,
            text: [
                `派系：${asText(factionNameValue) || factionId}`,
                `ID：${factionId}`,
                `卡牌数：${CARDIA_ALL_CARDS.filter(card => card.faction === factionId).length}`,
            ].join('\n'),
            keywords: uniq([factionId, asText(factionNameValue)]),
            source: ['public/locales/zh-CN/game-cardia.json#factions', 'src/games/cardia/domain/cardRegistry.ts'],
            metadata: {
                game: 'cardia',
                entityType: 'faction',
            },
        });
    }

    const ruleDir = join(repoRoot, 'src', 'games', 'cardia', 'rule');
    for (const fileName of (await readdir(ruleDir)).filter(name => name.endsWith('.md')).sort()) {
        const fullPath = join(ruleDir, fileName);
        const content = await readFile(fullPath, 'utf-8');
        for (const [index, chunk] of splitMarkdownSections(fileName, content).entries()) {
            addDoc('cardia_rules', {
                id: `cardia:rule:${fileName}:${index + 1}`,
                kind: 'rule',
                title: chunk.title,
                text: chunk.text,
                keywords: uniq([fileName.replace(/\.md$/i, ''), 'cardia', '规则']),
                source: [`src/games/cardia/rule/${fileName}`],
                metadata: {
                    game: 'cardia',
                    entityType: 'rule',
                    fileName,
                },
            });
        }
    }
}

async function exportDiceThroneKnowledge(): Promise<void> {
    const locale = await readJson<Record<string, unknown>>(join(repoRoot, 'public', 'locales', 'zh-CN', 'game-dicethrone.json'));

    for (const [heroId, hero] of Object.entries(HEROES_DATA)) {
        const heroName = asText(getByPath(locale, `characters.${heroId}`))
            || asText(getByPath(locale, `hero.${heroId}`))
            || heroId;
        addDoc('dicethrone_structured', {
            id: `dicethrone:hero:${heroId}`,
            kind: 'hero',
            title: `王权骰铸角色：${heroName}`,
            text: [
                `角色：${heroName} (${heroId})`,
                `技能数：${hero.abilities.length}`,
                `卡牌数：${hero.cards.length}`,
                `技能列表：${formatList(hero.abilities.map(ability => asText(getByPath(locale, ability.name)) || ability.id))}`,
            ].join('\n'),
            keywords: uniq([heroId, heroName, ...hero.abilities.map(ability => ability.id)]),
            source: ['src/games/dicethrone/heroes/index.ts', 'public/locales/zh-CN/game-dicethrone.json'],
            metadata: {
                game: 'dicethrone',
                entityType: 'hero',
                heroId,
            },
        });

        for (const ability of hero.abilities) {
            const name = asText(getByPath(locale, ability.name)) || ability.id;
            const description = asText(getByPath(locale, ability.description));
            addDoc('dicethrone_structured', {
                id: `dicethrone:ability:${heroId}:${ability.id}`,
                kind: 'ability',
                title: `王权骰铸技能：${name}`,
                text: [
                    `角色：${heroName} (${heroId})`,
                    `名称：${name}`,
                    `ID：${ability.id}`,
                    `类型：${ability.type}`,
                    `描述：${description || '无'}`,
                    `变体：${stringifyCompact(ability.variants ?? [])}`,
                ].join('\n'),
                keywords: uniq([heroId, heroName, name, ability.id, ability.type]),
                source: [
                    `src/games/dicethrone/heroes/${heroId}/abilities.ts`,
                    `public/locales/zh-CN/game-dicethrone.json#${ability.name}`,
                    `public/locales/zh-CN/game-dicethrone.json#${ability.description}`,
                ],
                metadata: {
                    game: 'dicethrone',
                    entityType: 'ability',
                    heroId,
                    abilityType: ability.type,
                },
            });
        }

        for (const card of hero.cards) {
            const name = asText(getByPath(locale, card.name)) || card.id;
            const description = asText(getByPath(locale, card.description));
            addDoc('dicethrone_structured', {
                id: `dicethrone:card:${heroId}:${card.id}`,
                kind: 'card',
                title: `王权骰铸卡牌：${name}`,
                text: [
                    `角色：${heroName} (${heroId})`,
                    `名称：${name}`,
                    `ID：${card.id}`,
                    `类型：${card.type}`,
                    `CP：${card.cpCost}`,
                    `时机：${card.timing}`,
                    `描述：${description || '无'}`,
                    `效果：${stringifyCompact(card.effects ?? [])}`,
                ].join('\n'),
                keywords: uniq([heroId, heroName, name, card.id, card.type, card.timing]),
                source: [
                    `src/games/dicethrone/heroes/${heroId}/cards.ts`,
                    `public/locales/zh-CN/game-dicethrone.json#${card.name}`,
                    `public/locales/zh-CN/game-dicethrone.json#${card.description}`,
                ],
                metadata: {
                    game: 'dicethrone',
                    entityType: 'card',
                    heroId,
                    cardType: card.type,
                },
            });
        }
    }

    const ruleDir = join(repoRoot, 'src', 'games', 'dicethrone', 'rule');
    for (const fileName of (await readdir(ruleDir)).filter(name => name.endsWith('.md')).sort()) {
        const fullPath = join(ruleDir, fileName);
        const targetKb = isInternalRuleFile(fileName) ? 'dicethrone_internal' : 'dicethrone_rules';
        const content = await readFile(fullPath, 'utf-8');
        for (const [index, chunk] of splitMarkdownSections(fileName, content).entries()) {
            addDoc(targetKb, {
                id: `dicethrone:rule:${fileName}:${index + 1}`,
                kind: targetKb.endsWith('internal') ? 'internal-doc' : 'rule',
                title: chunk.title,
                text: chunk.text,
                keywords: uniq([fileName.replace(/\.md$/i, ''), 'dicethrone', targetKb.endsWith('internal') ? '内部' : '规则']),
                source: [`src/games/dicethrone/rule/${fileName}`],
                metadata: {
                    game: 'dicethrone',
                    entityType: targetKb.endsWith('internal') ? 'internal-doc' : 'rule',
                    fileName,
                },
            });
        }
    }
}

async function exportSummonerWarsKnowledge(): Promise<void> {
    const locale = await readJson<Record<string, unknown>>(join(repoRoot, 'public', 'locales', 'zh-CN', 'game-summonerwars.json'));
    const abilitiesLocale = (getByPath(locale, 'abilities') as Record<string, unknown>) ?? {};

    buildSummonerWarsCardRegistry();

    for (const faction of FACTION_CATALOG.filter(entry => entry.selectable !== false)) {
        const factionName = asText(getByPath(locale, faction.nameKey)) || faction.id;
        const cards = getCardPoolByFaction(faction.id);

        addDoc('summonerwars_structured', {
            id: `summonerwars:faction:${faction.id}`,
            kind: 'faction',
            title: `召唤师战争阵营：${factionName}`,
            text: [
                `阵营：${factionName}`,
                `ID：${faction.id}`,
                `卡池数量：${cards.length}`,
                `召唤师：${formatList(cards.filter(card => card.cardType === 'unit' && card.unitClass === 'summoner').map(card => card.name))}`,
            ].join('\n'),
            keywords: uniq([faction.id, factionName]),
            source: ['src/games/summonerwars/config/factions/index.ts', `public/locales/zh-CN/game-summonerwars.json#${faction.nameKey}`],
            metadata: {
                game: 'summonerwars',
                entityType: 'faction',
                factionId: faction.id,
            },
        });

        for (const card of cards) {
            const abilityDetails = (card.abilities ?? []).map(abilityId => {
                const entry = abilitiesLocale[abilityId] as Record<string, unknown> | undefined;
                return {
                    id: abilityId,
                    name: asText(entry?.name) || abilityId,
                    description: asText(entry?.description) || '',
                };
            });

            const lines = [
                `阵营：${factionName} (${faction.id})`,
                `名称：${card.name}`,
                `ID：${card.id}`,
                `类型：${card.cardType}`,
            ];

            if (card.cardType === 'unit') {
                lines.push(`职业：${card.unitClass}`);
                lines.push(`力量：${card.strength}`);
                lines.push(`生命：${card.life}`);
                lines.push(`费用：${card.cost}`);
                lines.push(`攻击方式：${card.attackType}`);
                lines.push(`射程：${card.attackRange}`);
            } else if (card.cardType === 'event') {
                lines.push(`费用：${card.cost}`);
                lines.push(`可打出阶段：${card.playPhase}`);
                lines.push(`效果：${card.effect}`);
            } else {
                lines.push(`费用：${card.cost}`);
                lines.push(`生命：${card.life}`);
                lines.push(`城门：${card.isGate ? '是' : '否'}`);
            }

            if (abilityDetails.length > 0) {
                lines.push(`能力：${formatList(abilityDetails.map(detail => detail.name))}`);
                lines.push(`能力详情：${stringifyCompact(abilityDetails)}`);
            }

            addDoc('summonerwars_structured', {
                id: `summonerwars:card:${card.id}`,
                kind: card.cardType,
                title: `召唤师战争卡牌：${card.name}`,
                text: lines.join('\n'),
                keywords: uniq([card.id, card.name, faction.id, factionName, ...(card.abilities ?? [])]),
                source: [`src/games/summonerwars/config/factions/${faction.id}.ts`, 'src/games/summonerwars/config/cardRegistry.ts'],
                metadata: {
                    game: 'summonerwars',
                    entityType: card.cardType,
                    factionId: faction.id,
                    unitClass: card.cardType === 'unit' ? card.unitClass : undefined,
                },
            });
        }
    }

    for (const [abilityId, rawValue] of Object.entries(abilitiesLocale)) {
        const entry = rawValue as Record<string, unknown>;
        addDoc('summonerwars_structured', {
            id: `summonerwars:ability:${abilityId}`,
            kind: 'ability',
            title: `召唤师战争能力：${asText(entry.name) || abilityId}`,
            text: [
                `名称：${asText(entry.name) || abilityId}`,
                `ID：${abilityId}`,
                `描述：${asText(entry.description) || '无'}`,
            ].join('\n'),
            keywords: uniq([abilityId, asText(entry.name)]),
            source: [`public/locales/zh-CN/game-summonerwars.json#abilities.${abilityId}`],
            metadata: {
                game: 'summonerwars',
                entityType: 'ability',
            },
        });
    }

    const ruleDir = join(repoRoot, 'src', 'games', 'summonerwars', 'rule');
    for (const fileName of (await readdir(ruleDir)).filter(name => name.endsWith('.md')).sort()) {
        const fullPath = join(ruleDir, fileName);
        const content = await readFile(fullPath, 'utf-8');
        for (const [index, chunk] of splitMarkdownSections(fileName, content).entries()) {
            addDoc('summonerwars_rules', {
                id: `summonerwars:rule:${fileName}:${index + 1}`,
                kind: 'rule',
                title: chunk.title,
                text: chunk.text,
                keywords: uniq([fileName.replace(/\.md$/i, ''), 'summonerwars', '规则']),
                source: [`src/games/summonerwars/rule/${fileName}`],
                metadata: {
                    game: 'summonerwars',
                    entityType: 'rule',
                    fileName,
                },
            });
        }
    }
}

async function exportProjectDocs(): Promise<void> {
    const docsRoot = join(repoRoot, 'docs');
    async function walk(dir: string): Promise<string[]> {
        const entries = await readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                files.push(...await walk(fullPath));
                continue;
            }
            if (entry.isFile() && entry.name.endsWith('.md')) {
                files.push(fullPath);
            }
        }
        return files;
    }

    const docFiles = (await walk(docsRoot)).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    for (const fullPath of docFiles) {
        const relativePath = relative(repoRoot, fullPath).replace(/\\/g, '/');
        const content = await readFile(fullPath, 'utf-8');
        for (const [index, chunk] of splitMarkdownSections(relativePath.split('/').at(-1) ?? relativePath, content).entries()) {
            addDoc('boardgame_project_docs', {
                id: `boardgame:doc:${relativePath}:${index + 1}`,
                kind: 'project-doc',
                title: `${relativePath} / ${chunk.title}`,
                text: chunk.text,
                keywords: uniq(relativePath.split(/[/.\\_-]+/g)),
                source: [relativePath],
                metadata: {
                    game: 'boardgame',
                    entityType: 'project-doc',
                    relativePath,
                },
            });
        }
    }
}

async function writeOutputs(): Promise<void> {
    for (const [kbName, documents] of kbBuckets.entries()) {
        const dir = join(outputRoot, kbName);
        await mkdir(dir, { recursive: true });
        await writeFile(
            join(dir, 'documents.jsonl'),
            documents.map(document => JSON.stringify(document)).join('\n') + '\n',
            'utf-8',
        );
        await writeFile(
            join(dir, 'stats.json'),
            JSON.stringify(
                {
                    kbName,
                    documentCount: documents.length,
                    sourceCount: new Set(documents.flatMap(document => document.source)).size,
                },
                null,
                2,
            ),
            'utf-8',
        );
    }
}

async function main(): Promise<void> {
    await ensureCleanOutputRoot();
    await exportSmashupFromExistingArtifacts();
    await exportCardiaKnowledge();
    await exportDiceThroneKnowledge();
    await exportSummonerWarsKnowledge();
    await exportProjectDocs();
    await writeOutputs();

    const summary = Array.from(kbBuckets.entries())
        .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
        .map(([kbName, documents]) => ({ kbName, documentCount: documents.length }));

    await writeFile(join(outputRoot, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
    console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
