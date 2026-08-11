#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const spec = join(root, '.spec')
const errors = []

const fail = (file, message) => errors.push(`${relative(root, file)}: ${message}`)
const exists = (path) => existsSync(path)

function walk(dir, predicate) {
  if (!exists(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path, predicate) : predicate(path) ? [path] : []
  })
}

function read(path) {
  return readFileSync(path, 'utf8')
}

function markdownLinks(path) {
  const body = read(path)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
  return [...body.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1].split('#')[0])
}

function checkFrontmatter(path, expectedName) {
  const lines = read(path).split(/\r?\n/)
  if (lines[0] !== '---') return fail(path, '缺少 frontmatter')
  const end = lines.indexOf('---', 1)
  if (end === -1) return fail(path, 'frontmatter 未关闭')
  const fields = lines.slice(1, end).filter((line) => line.trim()).map((line) => line.split(':', 1)[0].trim())
  if (fields.sort().join(',') !== 'description,name') return fail(path, 'frontmatter 只允许 name 和 description')
  const name = lines.slice(1, end).find((line) => line.startsWith('name:'))?.slice(5).trim()
  if (name !== expectedName) fail(path, `name「${name ?? ''}」与目录「${expectedName}」不一致`)
}

const required = [
  join(root, 'AGENTS.md'),
  join(root, 'CLAUDE.md'),
  join(spec, 'AGENTS.md'),
  join(spec, 'rules', 'system.md'),
  join(spec, 'knowledge', 'README.md'),
  join(spec, 'knowledge', 'standards', 'README.md'),
  join(spec, 'rules', 'README.md'),
  join(spec, 'skills', 'before-you-code', 'SKILL.md'),
  join(spec, 'decisions', 'README.md'),
  join(spec, 'tools', 'setup-hosts.mjs'),
]
for (const path of required) if (!exists(path)) fail(path, '核心入口缺失')

const knowledgeRoutes = [
  'rule-bug.md',
  'ui.md',
  'testing.md',
  'data-assets.md',
  'architecture.md',
  'operations.md',
]
const knowledgeIndex = join(spec, 'knowledge', 'README.md')
for (const route of knowledgeRoutes) {
  const path = join(spec, 'knowledge', 'routes', route)
  if (!exists(path)) fail(path, '任务路由缺失')
  if (exists(knowledgeIndex) && !read(knowledgeIndex).includes(`routes/${route}`)) {
    fail(knowledgeIndex, `未挂载任务路由 ${route}`)
  }
}
if (exists(knowledgeIndex) && read(knowledgeIndex).trim().split(/\r?\n/).length > 40) {
  fail(knowledgeIndex, '知识主入口必须保持为浅路由，专项任务表应下沉到 knowledge/routes')
}

const adapters = [
  [join(root, 'AGENTS.md'), '.spec/AGENTS.md'],
  [join(root, 'CLAUDE.md'), '.spec/AGENTS.md'],
  [join(root, 'docs', 'ai-rules', 'README.md'), '.spec/knowledge/README.md'],
  [join(root, 'docs', 'ai-rules', 'doc-index.md'), '.spec/knowledge/README.md'],
]
for (const [path, target] of adapters) {
  if (exists(path) && !read(path).includes(target)) fail(path, `未指向唯一规范源 ${target}`)
}

for (const [path, maxLines] of [[join(root, 'AGENTS.md'), 12], [join(root, 'CLAUDE.md'), 12]]) {
  if (exists(path) && read(path).trim().split(/\r?\n/).length > maxLines) {
    fail(path, '宿主入口只能做薄适配，不能复制项目规则正文')
  }
}

for (const name of ['tasks', 'agents']) {
  if (exists(join(spec, name))) fail(join(spec, name), 'AI 规范目录不得建立第二套任务或 agent 编排')
}

for (const path of walk(join(spec, 'skills'), (path) => basename(path) === 'SKILL.md')) {
  checkFrontmatter(path, basename(dirname(path)))
}

if (exists(join(root, '.gitignore'))) {
  const ignore = read(join(root, '.gitignore'))
  for (const path of ['/.codex/skill/', '/.agents/skills/', '/.claude/skills/']) {
    if (!ignore.includes(path)) fail(join(root, '.gitignore'), `缺少可再生宿主目录忽略规则 ${path}`)
  }
}

if (exists(join(root, 'CLAUDE.md'))) {
  const claude = read(join(root, 'CLAUDE.md'))
  for (const path of ['.spec/AGENTS.md', '.spec/knowledge/README.md', '.spec/rules/system.md']) {
    if (!claude.includes(`@${path}`)) fail(join(root, 'CLAUDE.md'), `缺少强制加载 ${path}`)
  }
}

const activeSpecMarkdown = walk(spec, (path) => path.endsWith('.md'))
for (const path of activeSpecMarkdown) {
  for (const target of markdownLinks(path)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue
    const resolved = resolve(dirname(path), target)
    if (!exists(resolved)) fail(path, `链接不存在: ${target}`)
  }
}

for (const path of activeSpecMarkdown) {
  const body = read(path)
  if (body.includes('<!-- OPENSPEC:') || body.includes('@/openspec/AGENTS.md')) {
    fail(path, 'AI 规范目录混入了 OpenSpec 托管指令')
  }
  if (body.includes('docs/ai-rules/')) fail(path, '活跃 AI 规范仍引用旧规范路径')
}

const standards = walk(join(spec, 'knowledge', 'standards'), (path) => path.endsWith('.md') && basename(path) !== 'README.md')
const routeCatalog = walk(join(spec, 'knowledge', 'routes'), (path) => path.endsWith('.md'))
  .map(read)
  .join('\n')
const catalogs = read(join(spec, 'knowledge', 'README.md')) + read(join(spec, 'knowledge', 'standards', 'README.md')) + routeCatalog
for (const path of standards) {
  if (!catalogs.includes(basename(path))) fail(path, '没有进入知识导航或标准目录')
}

const legacyAiRules = walk(join(root, 'docs', 'ai-rules'), (path) => path.endsWith('.md'))
for (const path of legacyAiRules) {
  const lines = read(path).trim().split(/\r?\n/)
  if (lines.length > 4 || !read(path).includes('../../.spec/')) {
    fail(path, '旧规范目录必须是指向 .spec 的薄兼容页')
  }
}

if (errors.length) {
  console.error(`spec-lint: ${errors.length} 处结构错误\n`)
  for (const error of errors) console.error(`  x ${error}`)
  process.exit(1)
}

console.log('spec-lint: OK')
