const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/ugc/builder/pages/UnifiedBuilder.tsx');
const panelsDir = path.join(__dirname, 'src/ugc/builder/pages/panels');
const hooksDir = path.join(__dirname, 'src/ugc/builder/pages/hooks');

const lines = fs.readFileSync(srcPath, 'utf-8').split('\n');

// ========== 1. Fix BuilderModals - keep original 6-space indent ==========
{
  const extracted = lines.slice(2550, 3423); // lines 2551-3423

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
  builderProjects: BuilderProjectSummary[];
  isProjectLoading: boolean;
  refreshBuilderProjects: () => Promise<BuilderProjectSummary[]>;
  handleCreateProjectFromCurrent: () => Promise<void>;
  handleLoadProject: (projectId: string) => Promise<void>;
  handleDeleteProject: (projectId: string) => Promise<void>;
  handleSchemaChange: (schemaId: string, updates: Partial<SchemaDefinition>) => void;
  handleAddField: (schemaId: string, key: string, fieldDef: FieldDefinition) => void;
  handleDeleteField: (schemaId: string, fieldKey: string) => void;
  handleUpdateField: (schemaId: string, fieldKey: string, updates: Partial<FieldDefinition>) => void;
  handleChangeFieldType: (schemaId: string, fieldKey: string, newType: string) => void;
  renderComponentInstances: Array<{ id: string; name: string; targetSchema?: string }>;
  handleInstanceChange: (schemaId: string, instances: Record<string, unknown>[]) => void;
  handleAddInstance: () => void;
  editingItem: Record<string, unknown> | null;
  setEditingItem: (item: Record<string, unknown> | null) => void;
  handleEditItem: (item: Record<string, unknown>) => void;
  handleEditItemField: (key: string, value: unknown) => void;
  handleSaveEditItem: () => void;
  aiGenType: AIGenType;
  setAiGenType: (type: AIGenType) => void;
  aiGenInput: string;
  setAiGenInput: (input: string) => void;
  abilityImportErrors: string[];
  setAbilityImportErrors: (errors: string[]) => void;
  editingTagIndex: number | null;
  setEditingTagIndex: (index: number | null) => void;
  newTagName: string;
  setNewTagName: (name: string) => void;
  newTagGroup: string;
  setNewTagGroup: (group: string) => void;
  promptOutput: string;
  handleGenerateFullRules: () => void;
  handleAddRequirementEntry: () => void;
  handleUpdateRequirementEntry: (id: string, updates: Partial<{ location: string; content: string; notes?: string }>) => void;
  handleRemoveRequirementEntry: (id: string) => void;
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
    <>
`;

  const footer = `    </>
  );
}
`;

  // Keep original indent (6 spaces) which is correct for inside <>
  const content = header + extracted.join('\n') + '\n' + footer;
  const outPath = path.join(panelsDir, 'BuilderModals.tsx');
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${outPath} (${content.split('\n').length} lines)`);
}

// ========== 2. Fix useBgmPreview - use layout param, keep indent ==========
{
  const extracted = lines.slice(139, 211); // lines 140-211
  // Replace state.layout with layout
  const fixed = extracted.map(line => line.replace(/state\.layout/g, 'layout'));

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

  const content = header + fixed.join('\n') + '\n' + footer;
  const outPath = path.join(hooksDir, 'useBgmPreview.ts');
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${outPath} (${content.split('\n').length} lines)`);
}

// ========== 3. Fix useProjectManager - keep indent ==========
{
  const extracted = lines.slice(677, 863); // lines 678-863

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

  // Keep original indent (2 spaces for function body)
  const content = header + extracted.join('\n') + '\n' + footer;
  const outPath = path.join(hooksDir, 'useProjectManager.ts');
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${outPath} (${content.split('\n').length} lines)`);
}

console.log('\nDone! Fixed all 3 files.');
