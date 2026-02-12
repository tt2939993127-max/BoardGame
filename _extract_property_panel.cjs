const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'src/ugc/builder/pages/UnifiedBuilder.tsx');
const outDir = path.join(__dirname, 'src/ugc/builder/pages/panels');
const outPath = path.join(outDir, 'PropertyPanel.tsx');

const lines = fs.readFileSync(srcPath, 'utf-8').split('\n');

// Extract lines 1486-2541 (1-indexed), so 0-indexed 1485..2540
const extracted = lines.slice(1485, 2541);

// De-indent: original is at 8 spaces, we want 4 spaces in new file
const deindented = extracted.map(line => {
  if (line.startsWith('        ')) return line.slice(4);
  return line;
});

const header = `/**
 * 属性面板（右侧）
 * 从 UnifiedBuilder.tsx 提取
 */

import { Trash2 } from 'lucide-react';
import { useBuilder, useBuilderActions, type LayoutComponent } from '../../context';
import { useRenderPrompt } from '../../ai';
import { BASE_UI_COMPONENTS } from '../uiComponents';
import { buildActionHookPrompt } from '../promptBuilders';
import { HookField } from '../components/HookField';

interface PropertyPanelProps {
  handleLayoutChange: (layout: LayoutComponent[]) => void;
  layoutOutputsSummary: string;
  renderComponentInstances: Array<{ id: string; name: string; targetSchema?: string }>;
}

export function PropertyPanel({ handleLayoutChange, layoutOutputsSummary, renderComponentInstances }: PropertyPanelProps) {
  const { state, currentSchema } = useBuilder();
  const actions = useBuilderActions();
  const { generateFront, generateBack } = useRenderPrompt();

  return (`;

const footer = `  );
}
`;

const content = header + '\n' + deindented.join('\n') + '\n' + footer;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, content, 'utf-8');

console.log('Wrote ' + outPath + ' (' + content.split('\n').length + ' lines)');
