const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/ugc/builder/pages/UnifiedBuilder.tsx');
const pagesDir = path.join(__dirname, 'src/ugc/builder/pages');
const panelsDir = path.join(pagesDir, 'panels');
const hooksDir = path.join(pagesDir, 'hooks');

fs.mkdirSync(panelsDir, { recursive: true });
fs.mkdirSync(hooksDir, { recursive: true });

const lines = fs.readFileSync(srcPath, 'utf-8').split('\n');

function deindent(arr, spaces) {
  const prefix = ' '.repeat(spaces);
  return arr.map(line => line.startsWith(prefix) ? line.slice(spaces) : line);
}

// ========== 1. BuilderModals (lines 2551-3423, 1-indexed) ==========
{
  const extracted = lines.slice(2550, 3423); // 0-indexed 2550..3422
  const deindented = deindent(extracted, 6); // original at 6 spaces indent

  const header = `/**
 * 模态框集合
 * 从 UnifiedBuilder.tsx 提取
 */

import { Sparkles, Copy, GripVertical, Trash2 } from 'lucide-react';
import { useBuilder, useBuilderActions, type LayoutComponent } from '../../context';
import { useAuth } from '../../../../contexts/AuthContext';
import { field, type SchemaDefinition, type FieldDefinition, type TagDefinition } from '../../schema/types';
import { DataTable } from '../../ui/DataTable';
import { validateAbilityJson } from '../../utils/validateAbilityJson';
import { Modal } from '../components/Modal';
import { HookField } from '../components/HookField';
import { RenderComponentManager } from '../components/RenderComponentManager';
import { type AIGenType, type ModalType, type BuilderProjectSummary, SCHEMA_TEMPLATES, normalizeTags, formatProjectDate } from '../builderTypes';
import { generateAIPrompt } from '../promptBuilders';

interface BuilderModalsProps {
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  // Project list
  builderProjects: BuilderProjectSummary[];
  isProjectLoading: boolean;
  refreshBuilderProjects: () => Promise<BuilderProjectSummary[]>;
  handleCreateProjectFromCurrent: () => Promise<void>;
  handleLoadProject: (projectId: string) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  // Schema operations
  handleSchemaChange: (schemaId: string, updates: Partial<SchemaDefinition>) => void;
  handleAddField: (schemaId: string, key: string, fieldDef: FieldDefinition) => void;
  handleDeleteField: (schemaId: string, fieldKey: string) => void;
  handleUpdateField: (schemaId: string, fieldKey: string, updates: Partial<FieldDefinition>) => void;
  handleChangeFieldType: (schemaId: string, fieldKey: string, newType: string) => void;
  renderComponentInstances: Array<{ id: string; name: string; targetSchema?: string }>;
  // Data operations
  handleInstanceChange: (schemaId: string, instances: Record<string, unknown>[]) => void;
  handleAddInstance: () => void;
  // Edit item
  editingItem: Record<string, unknown> | null;
  setEditingItem: (item: Record<string, unknown> | null) => void;
  handleEditItem: (item: Record<string, unknown>) => void;
  handleEditItemField: (key: string, value: unknown) => void;
  handleSaveEditItem: () => void;
  // AI generation
  aiGenType: AIGenType;
  setAiGenType: (type: AIGenType) => void;
  aiGenInput: string;
  setAiGenInput: (input: string) => void;
  abilityImportErrors: string[];
  setAbilityImportErrors: (errors: string[]) => void;
  // Tag editing
  editingTagIndex: number | null;
  setEditingTagIndex: (index: number | null) => void;
  newTagName: string;
  setNewTagName: (name: string) => void;
  newTagGroup: string;
  setNewTagGroup: (group: string) => void;
  // Rules
  promptOutput: string;
  handleGenerateFullRules: () => void;
  handleAddRequirementEntry: () => void;
  handleUpdateRequirementEntry: (id: string, updates: Partial<{ location: string; content: string; notes?: string }>) => void;
  handleRemoveRequirementEntry: (id: string) => void;
  // Schema template
  schemaTemplateModal: boolean;
  setSchemaTemplateModal: (open: boolean) => void;
  handleAddSchemaWithTemplate: (templateKey: keyof typeof SCHEMA_TEMPLATES) => void;
}

export function BuilderModals(props: BuilderModalsProps) {
  const {
    activeModal, setActiveModal,
    builderProjects, isProjectLoading, refreshBuilderProjects, handleCreateProjectFromCurrent, handleLoadProject, handleDeleteProject,
    handleSchemaChange, handleAddField, handleDeleteField, handleUpdateField, handleChangeFieldType, renderComponentInstances,
    handleInstanceChange, handleAddInstance,
    editingItem, setEditingItem, handleEditItem, handleEditItemField, handleSaveEditItem,
    aiGenType, setAiGenType, aiGenInput, setAiGenInput, abilityImportErrors, setAbilityImportErrors,
    editingTagIndex, setEditingTagIndex, newTagName, setNewTagName, newTagGroup, setNewTagGroup,
    promptOutput, handleGenerateFullRules, handleAddRequirementEntry, handleUpdateRequirementEntry, handleRemoveRequirementEntry,
    schemaTemplateModal, setSchemaTemplateModal, handleAddSchemaWithTemplate,
  } = props;
  const { state, currentSchema, currentInstances } = useBuilder();
  const actions = useBuilderActions();
  const { token } = useAuth();

  return (
    <>`;

  const footer = `    </>
  );
}
`;

  const content = header + '\n' + deindented.join('\n') + '\n' + footer;
  const outPath = path.join(panelsDir, 'BuilderModals.tsx');
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${outPath} (${content.split('\n').length} lines)`);
}

// ========== 2. useBgmPreview (lines 140-211, 1-indexed) ==========
{
  const extracted = lines.slice(139, 211); // 0-indexed 139..210
  const deindented = deindent(extracted, 2); // original at 2 spaces indent

  const header = `/**
 * BGM 预览 hook
 * 从 UnifiedBuilder.tsx 提取
 */

import { useMemo, useEffect } from 'react';
import { useAudio } from '../../../../contexts/AudioContext';
import { AudioManager } from '../../../../lib/audio/AudioManager';
import type { BgmDefinition } from '../../../../lib/audio/types';
import type { LayoutComponent } from '../../context';

export function useBgmPreview(layout: LayoutComponent[], isPreviewMode: boolean) {
  const { playBgm, stopBgm, setPlaylist } = useAudio();

`;

  const footer = `}
`;

  const content = header + deindented.join('\n') + '\n' + footer;
  const outPath = path.join(hooksDir, 'useBgmPreview.ts');
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${outPath} (${content.split('\n').length} lines)`);
}

// ========== 3. useProjectManager (lines 678-863, 1-indexed) ==========
{
  const extracted = lines.slice(677, 863); // 0-indexed 677..862
  const deindented = deindent(extracted, 2); // original at 2 spaces indent

  const header = `/**
 * 项目管理 hook
 * 从 UnifiedBuilder.tsx 提取
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useToast } from '../../../../contexts/ToastContext';
import { UGC_API_URL } from '../../../../config/server';
import { type BuilderProjectSummary, type BuilderProjectDetail, type ModalType, normalizeBaseUrl, buildAuthHeaders } from '../builderTypes';
import type { BuilderState } from '../../context';

interface ApplySavedResult {
  data: Record<string, unknown>;
  didUpgrade: boolean;
}

export function useProjectManager({
  applySavedData,
  persistLocalSave,
  buildSaveData,
  activeModal,
  setActiveModal,
  state,
}: {
  applySavedData: (data: Record<string, unknown>) => ApplySavedResult;
  persistLocalSave: (saveData: Record<string, unknown>) => void;
  buildSaveData: () => Record<string, unknown>;
  activeModal: ModalType;
  setActiveModal: (modal: ModalType) => void;
  state: BuilderState;
}) {
  const { token } = useAuth();
  const toast = useToast();

  const [builderProjects, setBuilderProjects] = useState<BuilderProjectSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [projectNameDraft, setProjectNameDraft] = useState('');

`;

  const footer = `
  return {
    builderProjects,
    activeProjectId,
    isProjectLoading,
    projectNameDraft,
    refreshBuilderProjects,
    handleLoadProject,
    handleDeleteProject,
    handleCreateProjectFromCurrent,
    handleOpenProjectList,
    fetchBuilderProjects,
    loadBuilderProject,
    createBuilderProject,
    updateBuilderProject,
    deleteBuilderProject,
  };
}
`;

  const content = header + deindented.join('\n') + '\n' + footer;
  const outPath = path.join(hooksDir, 'useProjectManager.ts');
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${outPath} (${content.split('\n').length} lines)`);
}

console.log('\nDone! Created 3 files.');
