import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const rootDir = process.cwd();

const jobs = [
  {
    source: 'public/assets/i18n/zh-CN/dicethrone/images/gunslinger/compressed/player-board.webp',
    outputDir: 'public/assets/i18n/zh-CN/dicethrone/images/gunslinger/crops/player-board',
    entries: [
      { id: 'revolver', left: 0, top: 170, width: 330, height: 485 },
      { id: 'bounty-hunter', left: 330, top: 170, width: 340, height: 485 },
      { id: 'quick-draw', left: 0, top: 640, width: 330, height: 490 },
      { id: 'take-cover', left: 330, top: 640, width: 340, height: 490 },
      { id: 'showdown', left: 1380, top: 170, width: 340, height: 485 },
      { id: 'deadeye', left: 1715, top: 170, width: 333, height: 485 },
      { id: 'fan-the-hammer', left: 1380, top: 640, width: 340, height: 490 },
      { id: 'duel', left: 1715, top: 640, width: 333, height: 490 },
      { id: 'fill-em-with-lead', left: 650, top: 885, width: 750, height: 340 },
    ],
  },
  {
    source: 'public/assets/i18n/zh-CN/dicethrone/images/gunslinger/compressed/tip.webp',
    outputDir: 'public/assets/i18n/zh-CN/dicethrone/images/gunslinger/crops/tip',
    entries: [
      { id: 'evasive', left: 0, top: 0, width: 700, height: 470 },
      { id: 'reload', left: 0, top: 450, width: 700, height: 510 },
      { id: 'knockdown', left: 0, top: 930, width: 700, height: 480 },
      { id: 'bounty', left: 0, top: 1390, width: 700, height: 560 },
      { id: 'dice-legend', left: 720, top: 1310, width: 360, height: 660 },
    ],
  },
];

const abilityCardsAtlasJob = {
  source: 'public/assets/i18n/zh-CN/dicethrone/images/gunslinger/compressed/ability-cards.webp',
  outputDir: 'public/assets/i18n/zh-CN/dicethrone/images/gunslinger/crops/ability-cards',
  // 真相源 slot 裁图：用于人工核对原图布局，不等于运行时 atlas index。
  sourceAtlasConfigPath: 'public/assets/atlas-configs/dicethrone/ability-cards-common.atlas.json',
  sourceMaxIndex: 31,
  // 正式运行时 frame 裁图：与 ability-cards-gunslinger.atlas.json 一致。
  runtimeAtlasConfigPath: 'public/assets/atlas-configs/dicethrone/ability-cards-gunslinger.atlas.json',
  namedRuntimeEntries: [
    { id: 'fan-the-hammer-2', frameIndex: 22 },
    { id: 'pistol-whip', frameIndex: 23 },
    { id: 'take-cover-2', frameIndex: 24 },
    { id: 'mark-the-target', frameIndex: 25 },
    { id: 'deadeye-2', frameIndex: 26 },
    { id: 'the-law', frameIndex: 27 },
  ],
  directEntries: [
    { id: 'hero-portrait-extra', left: 6065, top: 6318, width: 675, height: 1054 },
  ],
};

const handPreviewJob = {
  // 仅供录入核对使用，不得再接入运行时代码。
  outputDir: 'temp/dicethrone-intake/gunslinger/hand-preview',
  targetWidth: 598,
  targetHeight: 965,
  entries: [
    'fan-the-hammer-2.webp',
    'pistol-whip.webp',
    'take-cover-2.webp',
    'mark-the-target.webp',
    'deadeye-2.webp',
    'the-law.webp',
  ],
};

async function ensureDir(targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
}

async function readJson(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const content = await fs.readFile(absolutePath, 'utf8');
  return JSON.parse(content);
}

async function extractFromRect(sourcePath, outputPath, rect) {
  await sharp(sourcePath)
    .extract({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })
    .webp({ quality: 100 })
    .toFile(outputPath);
}

async function writeNormalizedPreview(sourcePath, outputDir, fileName, targetWidth, targetHeight) {
  await ensureDir(outputDir);
  await ensureDir(path.join(outputDir, 'compressed'));

  const buildPipeline = () => sharp(sourcePath)
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 100 });

  await buildPipeline().toFile(path.join(outputDir, fileName));
  await buildPipeline().toFile(path.join(outputDir, 'compressed', fileName));
}

function getScaledAtlasRect(atlasConfig, metadata, index) {
  const scaleX = metadata.width / atlasConfig.imageW;
  const scaleY = metadata.height / atlasConfig.imageH;
  if (Array.isArray(atlasConfig.frames)) {
    const frame = atlasConfig.frames[index];
    if (!frame) {
      throw new Error(`运行时 atlas 缺少 frame index=${index}`);
    }
    return {
      left: Math.round(frame.x * scaleX),
      top: Math.round(frame.y * scaleY),
      width: Math.round(frame.width * scaleX),
      height: Math.round(frame.height * scaleY),
    };
  }

  const row = Math.floor(index / atlasConfig.cols);
  const col = index % atlasConfig.cols;
  return {
    left: Math.round(atlasConfig.colStarts[col] * scaleX),
    top: Math.round(atlasConfig.rowStarts[row] * scaleY),
    width: Math.round(atlasConfig.colWidths[col] * scaleX),
    height: Math.round(atlasConfig.rowHeights[row] * scaleY),
  };
}

async function run() {
  for (const job of jobs) {
    const sourcePath = path.join(rootDir, job.source);
    const outputDir = path.join(rootDir, job.outputDir);
    await ensureDir(outputDir);

    for (const entry of job.entries) {
      const outputPath = path.join(outputDir, `${entry.id}.webp`);
      await sharp(sourcePath)
        .extract({
          left: entry.left,
          top: entry.top,
          width: entry.width,
          height: entry.height,
        })
        .webp({ quality: 100 })
        .toFile(outputPath);
      console.log(`${job.outputDir}/${entry.id}.webp`);
    }
  }

  const atlasSourcePath = path.join(rootDir, abilityCardsAtlasJob.source);
  const atlasOutputDir = path.join(rootDir, abilityCardsAtlasJob.outputDir);
  const sourceAtlasConfig = await readJson(abilityCardsAtlasJob.sourceAtlasConfigPath);
  const runtimeAtlasConfig = await readJson(abilityCardsAtlasJob.runtimeAtlasConfigPath);
  const atlasMetadata = await sharp(atlasSourcePath).metadata();
  await ensureDir(atlasOutputDir);

  for (let index = 0; index <= abilityCardsAtlasJob.sourceMaxIndex; index += 1) {
    const id = `slot-${String(index).padStart(2, '0')}`;
    const outputPath = path.join(atlasOutputDir, `${id}.webp`);
    const rect = getScaledAtlasRect(sourceAtlasConfig, atlasMetadata, index);
    await extractFromRect(atlasSourcePath, outputPath, rect);
    console.log(`${abilityCardsAtlasJob.outputDir}/${id}.webp`);
  }

  for (const entry of abilityCardsAtlasJob.namedRuntimeEntries) {
    const outputPath = path.join(atlasOutputDir, `${entry.id}.webp`);
    const rect = getScaledAtlasRect(runtimeAtlasConfig, atlasMetadata, entry.frameIndex);
    await extractFromRect(atlasSourcePath, outputPath, rect);
    await ensureDir(path.join(atlasOutputDir, 'compressed'));
    await extractFromRect(
      atlasSourcePath,
      path.join(atlasOutputDir, 'compressed', `${entry.id}.webp`),
      rect,
    );
    console.log(`${abilityCardsAtlasJob.outputDir}/${entry.id}.webp`);
    console.log(`${abilityCardsAtlasJob.outputDir}/compressed/${entry.id}.webp`);
  }

  for (const entry of abilityCardsAtlasJob.directEntries) {
    const outputPath = path.join(atlasOutputDir, `${entry.id}.webp`);
    await extractFromRect(atlasSourcePath, outputPath, entry);
    console.log(`${abilityCardsAtlasJob.outputDir}/${entry.id}.webp`);
  }

  const handPreviewOutputDir = path.join(rootDir, handPreviewJob.outputDir);
  for (const fileName of handPreviewJob.entries) {
    const sourcePath = path.join(atlasOutputDir, fileName);
    await writeNormalizedPreview(
      sourcePath,
      handPreviewOutputDir,
      fileName,
      handPreviewJob.targetWidth,
      handPreviewJob.targetHeight,
    );
    console.log(`${handPreviewJob.outputDir}/${fileName}`);
    console.log(`${handPreviewJob.outputDir}/compressed/${fileName}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
