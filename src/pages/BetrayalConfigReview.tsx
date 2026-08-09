import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ImageOff, Maximize2 } from 'lucide-react';
import { OptimizedImage } from '../components/common/media/OptimizedImage';
import { MagnifyOverlay } from '../components/common/overlays/MagnifyOverlay';
import { ConfigReviewTable, type ConfigReviewColumn } from '../components/config/ConfigReviewTable';
import {
  BETRAYAL_CONFIG_REVIEW_COLUMN_KEYS,
  BETRAYAL_CONFIG_REVIEW_FIELD_DEFINITIONS,
  BETRAYAL_CONFIG_REVIEW_TABLE_ID,
  buildBetrayalConfigReviewTable,
  getBetrayalConfigReviewCellValue,
  getBetrayalConfigReviewFieldDefinition,
  isBetrayalConfigReviewFieldApplicable,
  type BetrayalConfigReviewFieldKey,
  type BetrayalConfigReviewRow,
  type BetrayalConfigReviewType,
} from '../games/betrayal/config/configReviewAdapter';
import {
  buildRoomAtlasImageStyle,
  resolveBetrayalRoomTileVisual,
  type BetrayalRoomTileVisual,
} from '../games/betrayal/roomAtlas';

type RoomPreviewTarget = {
  visual: BetrayalRoomTileVisual;
  visualId: string;
  name: string;
};

const TYPE_FILTERS: Array<'all' | BetrayalConfigReviewType> = ['all', 'starting-room', 'room-template', 'scenario-card', 'scenario-config', 'haunt-static'];
const TYPE_FILTER_LABELS: Record<'all' | BetrayalConfigReviewType, string> = {
  all: '全部配置',
  'starting-room': '起始布局',
  'room-template': '可探索房间',
  'scenario-card': '剧本候选',
  'scenario-config': '剧本运行配置',
  'haunt-static': '作祟静态元数据',
};
const FIELD_LABELS: Record<BetrayalConfigReviewFieldKey, string> = {
  category: '分组',
  name: '名称',
  floor: '楼层',
  coordinates: '坐标',
  state: '状态',
  visualId: '正面图',
  atlasFrame: '图集帧',
  discoverySymbol: '发现符号',
  doorways: '原始门位 / 固定门',
  orientationTurns: '旋转',
  rotatedDoorways: '旋转后门位',
  connectionStatus: '门连通校验',
  scenarioCardLabel: '剧本卡标签',
  triggerOmenLabel: '触发预兆',
  hauntNumber: '作祟编号',
  implementationStatus: '实现状态',
  implementedScenarioId: '运行剧本',
  runtimeSupport: '运行支持边界',
  runtimeObjective: '作祟前目标',
  hauntObjective: '作祟后目标',
  hauntId: '作祟 ID',
  reward: '奖励',
  sourcePath: '规则来源',
  reviewStatus: '审查状态',
};
const COLUMN_WIDTHS: Record<BetrayalConfigReviewFieldKey, number> = {
  category: 112,
  name: 200,
  floor: 96,
  coordinates: 88,
  state: 132,
  visualId: 170,
  atlasFrame: 88,
  discoverySymbol: 180,
  doorways: 360,
  orientationTurns: 120,
  rotatedDoorways: 260,
  connectionStatus: 240,
  scenarioCardLabel: 190,
  triggerOmenLabel: 190,
  hauntNumber: 96,
  implementationStatus: 160,
  implementedScenarioId: 190,
  runtimeSupport: 230,
  runtimeObjective: 320,
  hauntObjective: 320,
  hauntId: 180,
  reward: 240,
  sourcePath: 360,
  reviewStatus: 160,
};

function formatCellValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

function parseSuggestedValue(fieldKey: BetrayalConfigReviewFieldKey, rawValue: string): { value: unknown; error?: string } {
  const definition = getBetrayalConfigReviewFieldDefinition(fieldKey);
  const trimmed = rawValue.trim();
  if (trimmed === '') return { value: '' };
  if (definition.valueKind === 'number') {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? { value: parsed } : { value: trimmed, error: '请输入数字' };
  }
  if (definition.valueKind === 'boolean') {
    if (['true', '是', 'yes', '1'].includes(trimmed.toLocaleLowerCase())) return { value: true };
    if (['false', '否', 'no', '0'].includes(trimmed.toLocaleLowerCase())) return { value: false };
    return { value: trimmed, error: '请输入 true/false 或 是/否' };
  }
  if (definition.valueKind === 'string-array') {
    return { value: trimmed.split(/[、,，\n]/).map((item) => item.trim()).filter(Boolean) };
  }
  return { value: trimmed };
}

function resolveRoomPreviewTarget(row: BetrayalConfigReviewRow): RoomPreviewTarget | null {
  const visualId = row.values.visualId;
  if (typeof visualId !== 'string' || visualId.length === 0) return null;
  const visual = resolveBetrayalRoomTileVisual(visualId);
  if (!visual) return null;
  return { visual, visualId, name: row.displayName };
}

function RoomTilePreviewImage({ visual, name, visualId, locale, className = '' }: RoomPreviewTarget & { locale: string; className?: string }) {
  const imageStyle = useMemo(() => buildRoomAtlasImageStyle(visual), [visual]);
  return (
    <div
      role="img"
      aria-label={`${name} 房间图`}
      data-asset-src={visual.image}
      data-atlas-frame-index={visual.frameIndex}
      data-visual-id={visualId}
      className={`relative overflow-hidden rounded-[6px] border border-[#5a3720]/35 bg-[#1d130c] shadow-inner ${className}`}
      style={{ aspectRatio: imageStyle.aspectRatio }}
    >
      <OptimizedImage
        src={visual.image}
        locale={locale}
        alt={`${name} 房间图`}
        draggable={false}
        className="absolute left-0 top-0 max-w-none select-none"
        style={imageStyle}
      />
    </div>
  );
}

export const BetrayalConfigReview = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('game-betrayal');
  const table = useMemo(() => buildBetrayalConfigReviewTable(), []);
  const [typeFilter, setTypeFilter] = useState<'all' | BetrayalConfigReviewType>('all');
  const [magnifiedRoom, setMagnifiedRoom] = useState<RoomPreviewTarget | null>(null);
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'zh-CN';
  const filteredRows = useMemo(() => table.rows.filter((row) => typeFilter === 'all' || row.objectType === typeFilter), [table.rows, typeFilter]);
  const columns = useMemo<ConfigReviewColumn<BetrayalConfigReviewFieldKey>[]>(() => [
    { key: 'image', label: '房间图', minWidth: 104, sticky: true },
    ...BETRAYAL_CONFIG_REVIEW_COLUMN_KEYS.map((key) => ({
      key,
      label: FIELD_LABELS[key],
      minWidth: COLUMN_WIDTHS[key],
    })),
  ], []);

  return (
    <>
    <ConfigReviewTable
      gameId="betrayal"
      tableId={BETRAYAL_CONFIG_REVIEW_TABLE_ID}
      configVersion={table.configVersion}
      rows={filteredRows}
      columns={columns}
      labels={{
        back: t('configReview.back'),
        searchPlaceholder: t('configReview.searchPlaceholder'),
        pendingCount: (count) => t('configReview.pendingEdits', { count }),
        invalidCount: (count) => `有 ${count} 项输入无效`,
        clearEdits: t('configReview.clearDrafts'),
        submitBatch: (count) => t('configReview.submitEdits', { count }),
        emptyCell: '—',
        cellEditHint: '双击单元格编辑',
        rawValueLabel: '当前值',
        invalidNumber: '请输入数字',
        invalidBoolean: '请输入 true/false 或 是/否',
        horizontalScrollPrimary: '表格可横向滚动查看全部字段',
        horizontalScrollSecondary: '普通滚轮上下滚动，底部滚动条左右浏览',
        visibleRange: (start, end, total) => `显示 ${start}-${end} / ${total}`,
        pageSize: '每页',
        pageStatus: (page, total) => `第 ${page} / ${total} 页`,
        previousPage: '上一页',
        nextPage: '下一页',
      }}
      title={t('configReview.title')}
      description={t('configReview.description', { source: 'scenarioConfig.ts' })}
      onBack={() => navigate(-1)}
      filters={(
        <select className="h-10 rounded-[4px] border border-[#8f6642]/40 bg-[#fff6df] px-3 text-sm font-bold text-[#301a0e] outline-none focus:ring-2 focus:ring-[#6b4328]/20" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | BetrayalConfigReviewType)} data-testid="betrayal-config-type-filter">
          {TYPE_FILTERS.map((filter) => <option key={filter} value={filter}>{TYPE_FILTER_LABELS[filter]}</option>)}
        </select>
      )}
      filterKey={typeFilter}
      getSearchText={(row) => row.searchText}
      getCellValue={getBetrayalConfigReviewCellValue}
      getFieldDefinition={getBetrayalConfigReviewFieldDefinition}
      isFieldApplicable={isBetrayalConfigReviewFieldApplicable}
      formatCellValue={(_row, _fieldKey, value) => formatCellValue(value)}
      parseSuggestedValue={(_row, fieldKey, rawValue) => parseSuggestedValue(fieldKey, rawValue)}
      renderCell={({ row, columnKey }) => {
        if (columnKey !== 'image') return undefined;
        const target = resolveRoomPreviewTarget(row);
        if (!target) {
          return <div className="flex h-[58px] w-[74px] items-center justify-center rounded-[6px] border border-[#8f6642]/30 bg-[#ead8b8]/60 text-[#8f6642]" title={t('configReview.material.noPreview')}><ImageOff aria-hidden="true" className="h-4 w-4" /></div>;
        }
        return (
          <button
            type="button"
            className="group relative block h-[58px] w-[74px] overflow-hidden rounded-[6px] outline-none ring-1 ring-[#5a3720]/30 transition hover:ring-2 hover:ring-[#c08a45] focus-visible:ring-2 focus-visible:ring-[#c08a45]"
            title={`放大查看 ${target.name} 房间图`}
            aria-label={`放大查看 ${target.name} 房间图`}
            data-testid="betrayal-config-room-preview-button"
            onClick={() => setMagnifiedRoom(target)}
          >
            <RoomTilePreviewImage {...target} locale={locale} className="h-full w-full" />
            <span className="pointer-events-none absolute bottom-0 right-0 rounded-tl-[5px] bg-[#2c1a10]/85 p-0.5 text-[#f6deb4] opacity-90 transition group-hover:opacity-100">
              <Maximize2 aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          </button>
        );
      }}
      buildProposal={({ row, fieldKey, suggestedValue, currentValue, currentDisplayValue, updatedDisplayValue, tableId, configVersion, language }) => ({
        gameId: 'betrayal',
        configVersion,
        objectId: row.objectId,
        objectDisplayName: row.displayName,
        objectType: row.objectType,
        fieldPath: row.fieldPaths[fieldKey],
        fieldDisplayName: FIELD_LABELS[fieldKey],
        currentValue,
        suggestedValue,
        currentDisplayValue,
        updatedDisplayValue,
        sourceContext: { route: window.location.href, tableId, rowId: row.rowId, cellKey: fieldKey, language, objectContext: { groupName: row.groupName, sourceContexts: row.sourceContexts } },
        status: 'pending_ai_review',
      })}
      footerNotice={t('configReview.auditCoverage', { count: BETRAYAL_CONFIG_REVIEW_FIELD_DEFINITIONS.filter((field) => field.requiredForAudit).length })}
      initialFeedbackContent={t('configReview.feedbackInitialContent')}
      runtimeContext={{ mode: 'local', gameId: 'betrayal' }}
      testIdPrefix="betrayal-config"
    />
    <MagnifyOverlay isOpen={Boolean(magnifiedRoom)} onClose={() => setMagnifiedRoom(null)} closeLabel={t('configReview.material.closePreview')} overlayClassName="bg-black/55" overlayTestId="betrayal-config-room-magnify">
      {magnifiedRoom ? (
        <div className="flex max-h-[88vh] w-[min(88vw,760px)] flex-col gap-3 rounded-[14px] bg-[#2a1a10] p-4 text-[#f7e6c6] shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xl font-bold">{magnifiedRoom.name}</div>
              <div className="text-xs text-[#d9bd8c]">{t('configReview.material.previewMetadata', { visualId: magnifiedRoom.visualId, frameIndex: magnifiedRoom.visual.frameIndex })}</div>
            </div>
          </div>
          <RoomTilePreviewImage {...magnifiedRoom} locale={locale} className="mx-auto max-h-[76vh] w-full" />
        </div>
      ) : null}
    </MagnifyOverlay>
    </>
  );
};

export default BetrayalConfigReview;
