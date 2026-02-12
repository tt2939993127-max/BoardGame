const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/ugc/builder/pages/UnifiedBuilder.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Helper: replace lines range (1-indexed, inclusive) with new lines
function replaceRange(arr, start1, end1, newLines) {
  return [
    ...arr.slice(0, start1 - 1),
    ...newLines,
    ...arr.slice(end1),
  ];
}

let result = [...lines];

// Track offset from replacements (work bottom to top)

// ========== 1. Replace modals section (lines 2551-3423) with BuilderModals component ==========
const modalsReplacement = [
  '      <BuilderModals',
  '        activeModal={activeModal}',
  '        setActiveModal={setActiveModal}',
  '        builderProjects={builderProjects}',
  '        isProjectLoading={isProjectLoading}',
  '        refreshBuilderProjects={refreshBuilderProjects}',
  '        handleCreateProjectFromCurrent={handleCreateProjectFromCurrent}',
  '        handleLoadProject={handleLoadProject}',
  '        handleDeleteProject={handleDeleteProject}',
  '        handleSchemaChange={handleSchemaChange}',
  '        handleAddField={handleAddField}',
  '        handleDeleteField={handleDeleteField}',
  '        handleUpdateField={handleUpdateField}',
  '        handleChangeFieldType={handleChangeFieldType}',
  '        renderComponentInstances={renderComponentInstances}',
  '        handleInstanceChange={handleInstanceChange}',
  '        handleAddInstance={handleAddInstance}',
  '        editingItem={editingItem}',
  '        setEditingItem={setEditingItem}',
  '        handleEditItem={handleEditItem}',
  '        handleEditItemField={handleEditItemField}',
  '        handleSaveEditItem={handleSaveEditItem}',
  '        aiGenType={aiGenType}',
  '        setAiGenType={setAiGenType}',
  '        aiGenInput={aiGenInput}',
  '        setAiGenInput={setAiGenInput}',
  '        abilityImportErrors={abilityImportErrors}',
  '        setAbilityImportErrors={setAbilityImportErrors}',
  '        editingTagIndex={editingTagIndex}',
  '        setEditingTagIndex={setEditingTagIndex}',
  '        newTagName={newTagName}',
  '        setNewTagName={setNewTagName}',
  '        newTagGroup={newTagGroup}',
  '        setNewTagGroup={setNewTagGroup}',
  '        promptOutput={promptOutput}',
  '        handleGenerateFullRules={handleGenerateFullRules}',
  '        handleAddRequirementEntry={handleAddRequirementEntry}',
  '        handleUpdateRequirementEntry={handleUpdateRequirementEntry}',
  '        handleRemoveRequirementEntry={handleRemoveRequirementEntry}',
  '        schemaTemplateModal={schemaTemplateModal}',
  '        setSchemaTemplateModal={setSchemaTemplateModal}',
  '        handleAddSchemaWithTemplate={handleAddSchemaWithTemplate}',
  '      />',
];
result = replaceRange(result, 2551, 3423, modalsReplacement);

// ========== 2. Replace property panel (lines 1485-2541) with PropertyPanel component ==========
const propertyPanelReplacement = [
  '        <PropertyPanel',
  '          handleLayoutChange={handleLayoutChange}',
  '          layoutOutputsSummary={layoutOutputsSummary}',
  '          renderComponentInstances={renderComponentInstances}',
  '        />',
];
result = replaceRange(result, 1485, 2541, propertyPanelReplacement);

// ========== 3. Replace project manager section (lines 678-863) ==========
// Replace with useProjectManager hook call
const projectManagerReplacement = [
  '  const {',
  '    builderProjects, isProjectLoading, refreshBuilderProjects,',
  '    handleLoadProject, handleDeleteProject, handleCreateProjectFromCurrent,',
  '    handleOpenProjectList, updateBuilderProject,',
  '  } = useProjectManager({',
  '    applySavedData,',
  '    persistLocalSave,',
  '    buildSaveData,',
  '    activeModal,',
  '    setActiveModal,',
  '    state,',
  '  });',
];
result = replaceRange(result, 678, 863, projectManagerReplacement);

// ========== 4. Replace bgm preview section (lines 140-211) ==========
const bgmReplacement = [
  '  useBgmPreview(state.layout, isPreviewMode);',
];
result = replaceRange(result, 140, 211, bgmReplacement);

// ========== 5. Remove project manager state declarations (was at lines 89-92) ==========
// These are now inside useProjectManager hook
// After previous replacements, we need to find and remove these lines
const projectStateLines = [
  "  const [builderProjects, setBuilderProjects] = useState<BuilderProjectSummary[]>([]);",
  "  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);",
  "  const [isProjectLoading, setIsProjectLoading] = useState(false);",
  "  const [projectNameDraft, setProjectNameDraft] = useState('');",
];
// Find and remove these exact lines
for (const targetLine of projectStateLines) {
  const idx = result.indexOf(targetLine);
  if (idx !== -1) {
    result.splice(idx, 1);
  }
}

// ========== 6. Update imports ==========
// Add new imports after line 38 (import { RenderComponentManager })
const newImports = [
  "import { PropertyPanel } from './panels/PropertyPanel';",
  "import { BuilderModals } from './panels/BuilderModals';",
  "import { useBgmPreview } from './hooks/useBgmPreview';",
  "import { useProjectManager } from './hooks/useProjectManager';",
];

// Find the last existing import line (before the export type line)
const exportTypeLine = result.findIndex(l => l.startsWith('export type'));
if (exportTypeLine !== -1) {
  result.splice(exportTypeLine, 0, ...newImports, '');
}

// Remove now-unused imports: useAudio, AudioManager, BgmDefinition, UGC_API_URL (moved to hooks)
// Be careful - only remove if truly unused
// useAudio: was only used for bgm preview - now in useBgmPreview hook
// AudioManager: was only used for bgm preview
// BgmDefinition: was only used for bgm preview
// UGC_API_URL: was only used for project manager
// useAuth: still used for token (in handleSave, handleExport, handleImport)
// useToast: still used

// Remove specific import lines
const importsToRemove = [
  "import { useAudio } from '../../../contexts/AudioContext';",
  "import { AudioManager } from '../../../lib/audio/AudioManager';",
  "import type { BgmDefinition } from '../../../lib/audio/types';",
  "import { UGC_API_URL } from '../../../config/server';",
];

for (const importLine of importsToRemove) {
  const idx = result.indexOf(importLine);
  if (idx !== -1) {
    result.splice(idx, 1);
  }
}

// Also check if playBgm/stopBgm/setPlaylist are still used (they were from useAudio)
// They were only used in the bgm preview section, so we can remove that destructuring
const audioDestructIdx = result.findIndex(l => l.includes("const { playBgm, stopBgm, setPlaylist } = useAudio()"));
if (audioDestructIdx !== -1) {
  result.splice(audioDestructIdx, 1);
}

// Write result
const output = result.join('\n');
fs.writeFileSync(filePath, output, 'utf-8');

const lineCount = result.length;
console.log(`Updated ${filePath} (${lineCount} lines)`);
