import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PencilLine, Search, Send, Trash2 } from 'lucide-react';
import { FeedbackModal } from '../components/system/FeedbackModal';
import type { FeedbackConfigProposalDraft } from '../lib/feedback/feedbackPayload';
import {
  BETRAYAL_CONFIG_REVIEW_COLUMN_KEYS,
  BETRAYAL_CONFIG_REVIEW_FIELD_DEFINITIONS,
  buildBetrayalConfigReviewTable,
  getBetrayalConfigReviewCellValue,
  getBetrayalConfigReviewFieldDefinition,
  isBetrayalConfigReviewFieldApplicable,
  type BetrayalConfigReviewFieldKey,
  type BetrayalConfigReviewRow,
  type BetrayalConfigReviewType,
} from '../games/betrayal/config/configReviewAdapter';

const TYPE_FILTERS: Array<'all' | BetrayalConfigReviewType> = [
  'all',
  'starting-room',
  'room-template',
  'scenario-card',
  'scenario-config',
  'haunt-static',
];

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

interface PendingConfigEdit {
  row: BetrayalConfigReviewRow;
  fieldKey: BetrayalConfigReviewFieldKey;
  rawValue: string;
  parsedValue: unknown;
  error?: string;
}

function getEditKey(row: BetrayalConfigReviewRow, fieldKey: BetrayalConfigReviewFieldKey): string {
  return `${row.rowId}:${fieldKey}`;
}

function formatCellValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

function parseSuggestedValue(fieldKey: BetrayalConfigReviewFieldKey, rawValue: string): { value: unknown; error?: string } {
  const definition = getBetrayalConfigReviewFieldDefinition(fieldKey);
  const trimmed = rawValue.trim();

  if (trimmed === '') {
    return { value: '' };
  }

  if (definition.valueKind === 'number') {
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      return { value: trimmed, error: '请输入数字' };
    }
    return { value: parsed };
  }

  if (definition.valueKind === 'boolean') {
    if (['true', '是', 'yes', '1'].includes(trimmed.toLocaleLowerCase())) return { value: true };
    if (['false', '否', 'no', '0'].includes(trimmed.toLocaleLowerCase())) return { value: false };
    return { value: trimmed, error: '请输入 true/false 或 是/否' };
  }

  if (definition.valueKind === 'string-array') {
    return {
      value: trimmed
        .split(/[、,，\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  return { value: trimmed };
}

function areConfigValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildConfigProposal(
  row: BetrayalConfigReviewRow,
  fieldKey: BetrayalConfigReviewFieldKey,
  suggestedValue: unknown,
): FeedbackConfigProposalDraft {
  const currentValue = getBetrayalConfigReviewCellValue(row, fieldKey);
  return {
    gameId: 'betrayal',
    configVersion: buildBetrayalConfigReviewTable().configVersion,
    objectId: row.objectId,
    objectDisplayName: row.displayName,
    objectType: row.objectType,
    fieldPath: row.fieldPaths[fieldKey],
    fieldDisplayName: FIELD_LABELS[fieldKey],
    currentValue,
    suggestedValue,
    currentDisplayValue: formatCellValue(currentValue),
    updatedDisplayValue: formatCellValue(suggestedValue),
    sourceContext: {
      route: typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}${window.location.hash}` : undefined,
      tableId: buildBetrayalConfigReviewTable().tableId,
      rowId: row.rowId,
      cellKey: fieldKey,
      language: 'zh-CN',
      objectContext: {
        groupName: row.groupName,
        sourceContexts: row.sourceContexts,
      },
    },
    status: 'pending_ai_review',
  };
}

function ConfigEditableCell({
  row,
  fieldKey,
  pendingEdit,
  onCommit,
}: {
  row: BetrayalConfigReviewRow;
  fieldKey: BetrayalConfigReviewFieldKey;
  pendingEdit?: PendingConfigEdit;
  onCommit: (params: { row: BetrayalConfigReviewRow; fieldKey: BetrayalConfigReviewFieldKey; rawValue: string }) => void;
}) {
  const applicable = isBetrayalConfigReviewFieldApplicable(row, fieldKey);
  const definition = getBetrayalConfigReviewFieldDefinition(fieldKey);
  const currentValue = getBetrayalConfigReviewCellValue(row, fieldKey);
  const currentText = applicable ? formatCellValue(currentValue) : '';
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(currentText);

  const shownText = pendingEdit
    ? pendingEdit.error
      ? pendingEdit.rawValue
      : formatCellValue(pendingEdit.parsedValue)
    : currentText;

  if (!applicable) {
    return <span className="text-[#9b8067]">—</span>;
  }

  if (!definition.editable) {
    return (
      <span
        title={definition.meaning}
        className={pendingEdit ? 'font-semibold text-[#7b2f12]' : undefined}
      >
        {shownText || '—'}
      </span>
    );
  }

  const startEdit = () => {
    setDraft(pendingEdit?.rawValue ?? currentText);
    setIsEditing(true);
  };

  const commitDraft = () => {
    setIsEditing(false);
    if (draft.trim() === currentText.trim()) return;
    onCommit({ row, fieldKey, rawValue: draft });
  };

  if (isEditing) {
    return (
      <textarea
        className="min-h-[34px] w-full min-w-[160px] rounded border border-[#8a5a35]/40 bg-[#fff8ec] px-2 py-1 text-sm text-[#2a1a10] outline-none focus:border-[#7b2f12]"
        value={draft}
        autoFocus
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            commitDraft();
          }
          if (event.key === 'Escape') {
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      className={`group flex min-h-[30px] w-full items-start justify-between gap-2 text-left ${pendingEdit ? 'font-semibold text-[#7b2f12]' : 'text-[#2f1e12]'}`}
      title={definition.meaning}
      onClick={startEdit}
    >
      <span>{shownText || '—'}</span>
      <PencilLine className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-70" aria-hidden="true" />
    </button>
  );
}

export const BetrayalConfigReview = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('game-betrayal');
  const table = useMemo(() => buildBetrayalConfigReviewTable(), []);
  const [typeFilter, setTypeFilter] = useState<'all' | BetrayalConfigReviewType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingEdits, setPendingEdits] = useState<Record<string, PendingConfigEdit>>({});
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
    return table.rows.filter((row) => (
      (typeFilter === 'all' || row.objectType === typeFilter)
      && (!normalizedSearch || row.searchText.includes(normalizedSearch))
    ));
  }, [searchTerm, table.rows, typeFilter]);

  const pendingEditList = useMemo(() => Object.values(pendingEdits), [pendingEdits]);
  const invalidEditCount = pendingEditList.filter((edit) => edit.error).length;
  const validPendingEdits = pendingEditList.filter((edit) => !edit.error);
  const feedbackProposals = useMemo(() => (
    validPendingEdits.map((edit) => buildConfigProposal(edit.row, edit.fieldKey, edit.parsedValue))
  ), [validPendingEdits]);

  const handleCellCommit = ({ row, fieldKey, rawValue }: {
    row: BetrayalConfigReviewRow;
    fieldKey: BetrayalConfigReviewFieldKey;
    rawValue: string;
  }) => {
    const editKey = getEditKey(row, fieldKey);
    const currentValue = getBetrayalConfigReviewCellValue(row, fieldKey);
    const { value, error } = parseSuggestedValue(fieldKey, rawValue);

    if (!error && areConfigValuesEqual(value, currentValue)) {
      setPendingEdits((prev) => {
        const next = { ...prev };
        delete next[editKey];
        return next;
      });
      return;
    }

    setPendingEdits((prev) => ({
      ...prev,
      [editKey]: {
        row,
        fieldKey,
        rawValue,
        parsedValue: value,
        error,
      },
    }));
  };

  return (
    <main className="min-h-screen bg-[#f4ead8] px-5 py-6 text-[#2f1e12]">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <header className="rounded-xl border border-[#8a5a35]/30 bg-[#fff8ec] p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <button
                type="button"
                className="mb-3 inline-flex items-center gap-2 text-sm text-[#6b3d21] hover:text-[#2f1e12]"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {t('configReview.back')}
              </button>
              <h1 className="text-2xl font-bold">{t('configReview.title')}</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-[#6b4b35]">
                {t('configReview.description', { source: 'scenarioConfig.ts' })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pendingEditList.length === 0}
                className="inline-flex min-h-[34px] items-center gap-2 rounded border border-[#8a5a35]/40 bg-white px-3 text-sm text-[#5a341f] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => setPendingEdits({})}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('configReview.clearDrafts')}
              </button>
              <button
                type="button"
                disabled={validPendingEdits.length === 0 || invalidEditCount > 0}
                className="inline-flex min-h-[34px] items-center gap-2 rounded border border-[#3f2718]/45 bg-[#4b2c18] px-3 text-sm text-[#f5ddb4] disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => setIsFeedbackOpen(true)}
                data-testid="betrayal-config-submit-edits"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t('configReview.submitEdits', { count: validPendingEdits.length })}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded border border-[#8a5a35]/30 bg-white px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-[#8a5a35]" aria-hidden="true" />
              <input
                className="min-w-[260px] bg-transparent outline-none"
                value={searchTerm}
                placeholder={t('configReview.searchPlaceholder')}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
            <select
              className="rounded border border-[#8a5a35]/30 bg-white px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as 'all' | BetrayalConfigReviewType)}
            >
              {TYPE_FILTERS.map((filter) => (
                <option key={filter} value={filter}>
                  {TYPE_FILTER_LABELS[filter]}
                </option>
              ))}
            </select>
            <span className="text-sm text-[#6b4b35]">
              {t('configReview.rowSummary', {
                filtered: filteredRows.length,
                total: table.rows.length,
                invalid: invalidEditCount,
              })}
            </span>
          </div>
        </header>

        {pendingEditList.length > 0 ? (
          <section className="rounded-lg border border-[#ba7a2a]/35 bg-[#fff2d8] px-4 py-3 text-sm text-[#5a341f]">
            {t('configReview.pendingEdits', { count: pendingEditList.length })}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-[#8a5a35]/30 bg-[#fffaf1] shadow-sm">
          <div className="max-h-[72vh] overflow-auto">
            <table className="min-w-[1900px] border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#ead9bd] text-left text-[#3b2819]">
                <tr>
                  {BETRAYAL_CONFIG_REVIEW_COLUMN_KEYS.map((columnKey) => (
                    <th key={columnKey} className="border-b border-[#8a5a35]/30 px-3 py-2 font-semibold">
                      {FIELD_LABELS[columnKey]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.rowId} className="odd:bg-[#fffaf1] even:bg-[#f8eddc]">
                    {BETRAYAL_CONFIG_REVIEW_COLUMN_KEYS.map((columnKey) => (
                      <td key={columnKey} className="max-w-[260px] align-top border-b border-[#8a5a35]/15 px-3 py-2">
                        <ConfigEditableCell
                          row={row}
                          fieldKey={columnKey}
                          pendingEdit={pendingEdits[getEditKey(row, columnKey)]}
                          onCommit={handleCellCommit}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-[#8a5a35]/20 bg-[#fff8ec] px-4 py-3 text-xs leading-5 text-[#6b4b35]">
          {t('configReview.auditCoverage', {
            count: BETRAYAL_CONFIG_REVIEW_FIELD_DEFINITIONS.filter((field) => field.requiredForAudit).length,
          })}
        </section>
      </div>

      {isFeedbackOpen ? (
        <FeedbackModal
          onClose={() => setIsFeedbackOpen(false)}
          onSubmitted={() => {
            setPendingEdits({});
            setIsFeedbackOpen(false);
          }}
          configProposals={feedbackProposals}
          initialContent={t('configReview.feedbackInitialContent')}
        />
      ) : null}
    </main>
  );
};

export default BetrayalConfigReview;
