#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const skills = join(root, '.spec', 'skills')
const marker = '.generated-from-spec'
const dryRun = process.argv.includes('--dry-run')
const hosts = [
  [join(root, '.codex', 'skill'), skills],
  [join(root, '.agents', 'skills'), skills],
  [join(root, '.claude', 'skills'), skills],
]

for (const [target, source] of hosts) {
  if (!existsSync(source)) throw new Error(`Canonical source missing: ${relative(root, source)}`)
  const markerPath = join(target, marker)
  if (existsSync(target) && !existsSync(markerPath)) {
    throw new Error(`Refusing to replace non-generated host path: ${relative(root, target)}`)
  }
  if (existsSync(markerPath) && readFileSync(markerPath, 'utf8').trim() !== relative(root, source)) {
    throw new Error(`Host marker mismatch: ${relative(root, target)}`)
  }
  if (dryRun) {
    console.log(`WOULD_SYNC ${relative(root, source)} -> ${relative(root, target)}`)
    continue
  }
  rmSync(target, { recursive: true, force: true })
  mkdirSync(target, { recursive: true })
  cpSync(source, target, { recursive: true })
  writeFileSync(markerPath, `${relative(root, source)}\n`, 'utf8')
  console.log(`SYNCED ${relative(root, source)} -> ${relative(root, target)}`)
}
