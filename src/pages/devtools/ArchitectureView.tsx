/**
 * 架构可视化工具 v7 — C4 模型
 *
 * L1 System Context: 玩家 → 桌游平台 → 外部系统
 * L2 Container:      6 层容器 + 层间关系
 * L3 Component:      单层内部节点 + 内部边 + 外部接口
 * 深层: 管线 8 步流水线 / 系统插件矩阵
 * 路由: /dev/arch
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  type ArchNode,
  NODES, EDGES, LAYER_BANDS, NODE_MAP, GRID,
  PRIMITIVE_ITEMS, PIPELINE_STEPS, SYSTEM_ITEMS, TEST_FLOW_STEPS,
  C4_CONTEXT, C4_CONTEXT_LINKS, CONTAINER_LINKS, LAYER_SUMMARIES,
  rectEdgePath,
  layerInternalEdges, layerExternalLinks,
} from './arch/archData';

// ============================================================================
// 视图模式
// ============================================================================

type ViewMode = 'context' | 'container' | 'layer' | 'sub-pipeline' | 'sub-systems' | 'sub-testing';

// ============================================================================
// 主组件
// ============================================================================

const ArchitectureView: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('context');
  const [activeLayer, setActiveLayer] = useState('ui');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // 选中节点的上下游
  const selectedDeps = useMemo(() => {
    if (!selectedNode) return null;
    return {
      upstream: EDGES.filter(e => e.to === selectedNode.id).map(e => ({ ...e, node: NODE_MAP.get(e.from)! })),
      downstream: EDGES.filter(e => e.from === selectedNode.id).map(e => ({ ...e, node: NODE_MAP.get(e.to)! })),
    };
  }, [selectedNode]);

  const goToLayer = useCallback((layerId: string) => {
    setActiveLayer(layerId);
    setSelectedNode(null);
    setViewMode('layer');
  }, []);

  const handleNodeClick = useCallback((n: ArchNode, evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (n.expandable === 'pipeline') { setViewMode('sub-pipeline'); return; }
    if (n.expandable === 'systems') { setViewMode('sub-systems'); return; }
    if (n.expandable === 'testing') { setViewMode('sub-testing'); return; }
    setSelectedNode(prev => prev?.id === n.id ? null : n);
  }, []);

  const closePop = useCallback(() => setSelectedNode(null), []);

  // ========================================================================
  // C4 L1: System Context
  // ========================================================================
  if (viewMode === 'context') {
    const boxes: { id: string; x: number; y: number; w: number; h: number }[] = [
      { id: 'user', x: 200, y: 16, w: 140, h: 52 },
      { id: 'story', x: 155, y: 100, w: 230, h: 64 },
      { id: 'platform', x: 90, y: 210, w: 360, h: 90 },
      { id: 'ext-db', x: 50, y: 360, w: 160, h: 52 },
      { id: 'ext-cdn', x: 330, y: 360, w: 160, h: 52 },
    ];
    const boxMap = new Map(boxes.map(b => [b.id, b]));
    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4">
        <div className="mb-3 flex items-center gap-3">
          <h1 className="text-lg font-bold text-white">🏗️ C4 L1 · 系统上下文</h1>
          <span className="text-xs text-slate-500">点击引擎框架 → 查看内部容器</span>
        </div>
        <svg viewBox="0 0 540 440" preserveAspectRatio="xMidYMid meet"
          className="w-full" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <style>{`
            @keyframes archFadeIn { from { opacity:0 } }
            @keyframes flowPulse { 0%,100%{ opacity:.3;r:2 } 50%{ opacity:1;r:3.5 } }
          `}</style>
          {C4_CONTEXT.map((ent, idx) => {
            const b = boxMap.get(ent.id)!;
            const isSys = ent.type === 'system';
            const isExt = ent.type === 'external';
            const isStory = ent.type === 'story';
            return (
              <g key={ent.id}
                style={{ cursor: isSys ? 'pointer' : 'default', animation: `archFadeIn 0.4s ease ${idx * 0.1}s both` }}
                onClick={isSys ? () => setViewMode('container') : undefined}>
                <rect x={b.x} y={b.y} width={b.w} height={b.h}
                  rx={isStory ? 14 : isSys ? 14 : isExt ? 8 : 26}
                  fill={isSys ? ent.color + '12' : isStory ? ent.color + '18' : '#161b22'}
                  stroke={ent.color} strokeWidth={isStory ? 2.5 : isSys ? 2.5 : 1.2}
                  strokeDasharray={isExt ? '6,3' : isStory ? '8,4' : undefined} />
                <text x={b.x + b.w / 2} y={b.y + (isSys ? 30 : isStory ? 26 : 22)} textAnchor="middle"
                  fill={ent.color} fontSize={isSys ? 16 : isStory ? 15 : 12} fontWeight={700}>{ent.label}</text>
                <text x={b.x + b.w / 2} y={b.y + (isSys ? 50 : isStory ? 44 : 38)} textAnchor="middle"
                  fill="#8b949e" fontSize={9}>{ent.desc}</text>
                {isStory && (
                  <text x={b.x + b.w / 2} y={b.y + 58} textAnchor="middle"
                    fill="#6e7681" fontSize={8}>setup · validate · execute · reduce</text>
                )}
                {isSys && (
                  <text x={b.x + b.w / 2} y={b.y + 68} textAnchor="middle"
                    fill="#8b949e" fontSize={9}>管线 · 系统插件 · 基础能力 · 测试框架</text>
                )}
                {isExt && (
                  <text x={b.x + b.w / 2} y={b.y + b.h + 12} textAnchor="middle"
                    fill="#6e7681" fontSize={8}>[外部系统]</text>
                )}
                {isSys && (
                  <text x={b.x + b.w / 2} y={b.y + b.h + 14} textAnchor="middle"
                    fill={ent.color} fontSize={8} opacity={0.6}>点击查看内部 →</text>
                )}
              </g>
            );
          })}
          {C4_CONTEXT_LINKS.map((link, i) => {
            const fb = boxMap.get(link.from)!, tb = boxMap.get(link.to)!;
            const sx = fb.x + fb.w / 2, sy = fb.y + fb.h;
            const tx = tb.x + tb.w / 2, ty = tb.y;
            return (
              <g key={i} style={{ animation: `archFadeIn 0.5s ease ${0.3 + i * 0.1}s both` }}>
                <line x1={sx} y1={sy} x2={tx} y2={ty}
                  stroke="#6e7681" strokeWidth={1.5} strokeOpacity={0.5} />
                <circle r="3" fill="#6e7681" style={{ animation: 'flowPulse 2s ease infinite' }}>
                  <animateMotion dur="1.5s" repeatCount="indefinite" path={`M${sx},${sy} L${tx},${ty}`} />
                </circle>
                <text x={(sx + tx) / 2 + 8} y={(sy + ty) / 2} fontSize={9} fill="#6e7681">{link.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ========================================================================
  // C4 L2: Container（层间关系）
  // ========================================================================
  if (viewMode === 'container') {
    const cardW = 480, cardH = 56, gap = 14, startX = 60, startY = 40;
    const layerCards = LAYER_BANDS.map((band, i) => ({
      ...band,
      cx: startX, cy: startY + i * (cardH + gap),
      w: cardW, h: cardH,
      summary: LAYER_SUMMARIES[band.id] ?? '',
      nodeCount: NODES.filter(n => n.layer === band.id).length,
    }));
    const cardMap = new Map(layerCards.map(c => [c.id, c]));
    const vw = startX + cardW + 100, vh = startY + layerCards.length * (cardH + gap) + 20;
    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4">
        <div className="mb-3 flex items-center gap-3">
          <button className="text-sm text-slate-400 hover:text-white" onClick={() => setViewMode('context')}>← 系统上下文</button>
          <h1 className="text-lg font-bold text-white">📦 C4 L2 · 容器图</h1>
          <span className="text-xs text-slate-500">点击容器 → 查看内部组件</span>
        </div>
        <svg viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet"
          className="w-full" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <style>{`
            @keyframes archFadeIn { from { opacity:0 } }
            @keyframes flowPulse { 0%,100%{ opacity:.3;r:2 } 50%{ opacity:1;r:3.5 } }
          `}</style>
          {layerCards.map((card, idx) => (
            <g key={card.id}
              style={{ cursor: 'pointer', animation: `archFadeIn 0.4s ease ${idx * 0.08}s both` }}
              onClick={() => goToLayer(card.id)}>
              <rect x={card.cx} y={card.cy} width={card.w} height={card.h} rx={10}
                fill={card.color + '08'} stroke={card.color} strokeOpacity={0.4} strokeWidth={1.5} />
              <rect x={card.cx + 1} y={card.cy + 6} width={3} height={card.h - 12} rx={1.5}
                fill={card.color} fillOpacity={0.6} />
              <text x={card.cx + 16} y={card.cy + 24} fontSize={14} fontWeight={700} fill={card.color}>{card.label}</text>
              <text x={card.cx + 16} y={card.cy + 42} fontSize={9} fill="#8b949e">{card.summary}</text>
              <text x={card.cx + card.w - 14} y={card.cy + 33} textAnchor="end" fill="#6e7681" fontSize={9}>
                {card.nodeCount} 组件 →
              </text>
            </g>
          ))}
          {CONTAINER_LINKS.filter(l => !l.dashed).map((link, i) => {
            const fc = cardMap.get(link.from), tc = cardMap.get(link.to);
            if (!fc || !tc) return null;
            const mx = fc.cx + fc.w / 2;
            const sy = fc.cy + fc.h, ty = tc.cy;
            return (
              <g key={`m${i}`} style={{ animation: `archFadeIn 0.5s ease ${0.4 + i * 0.08}s both` }}>
                <line x1={mx} y1={sy} x2={mx} y2={ty}
                  stroke={link.color} strokeWidth={1.5} strokeOpacity={0.4} />
                <circle r="3" fill={link.color} style={{ animation: 'flowPulse 2s ease infinite' }}>
                  <animateMotion dur="1.5s" repeatCount="indefinite" path={`M${mx},${sy} V${ty}`} />
                </circle>
                <text x={mx + 10} y={(sy + ty) / 2 + 4} fontSize={9} fill={link.color} opacity={0.6}>{link.label}</text>
              </g>
            );
          })}
          {CONTAINER_LINKS.filter(l => l.dashed).map((link, i) => {
            const fc = cardMap.get(link.from), tc = cardMap.get(link.to);
            if (!fc || !tc) return null;
            const rx = fc.cx + fc.w + 14;
            const sy = fc.cy + fc.h / 2, ty = tc.cy + tc.h / 2;
            return (
              <g key={`fb${i}`} style={{ animation: 'archFadeIn 0.6s ease 0.8s both' }}>
                <path d={`M${fc.cx + fc.w},${sy} H${rx} V${ty} H${tc.cx + tc.w}`}
                  fill="none" stroke={link.color} strokeWidth={1.2} strokeDasharray="6,3" strokeOpacity={0.5} />
                <text x={rx + 4} y={(sy + ty) / 2 + 4} fontSize={8} fill={link.color} opacity={0.6}>{link.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // ========================================================================
  // C4 L3: Component（单层内部）
  // ========================================================================
  if (viewMode === 'layer') {
    const band = LAYER_BANDS.find(b => b.id === activeLayer);
    if (!band) { setViewMode('container'); return null; }
    const layerNodes = NODES.filter(n => n.layer === activeLayer);
    const intEdges = layerInternalEdges(activeLayer);
    const extLinks = layerExternalLinks(activeLayer);
    const inLinks = extLinks.filter(l => l.direction === 'in');
    const outLinks = extLinks.filter(l => l.direction === 'out');

    const rowOffset = band.rowStart;
    const localRows = band.rowEnd - band.rowStart + 1;
    const localRect = (n: ArchNode) => {
      const span = n.colSpan ?? 1;
      const x = GRID.padX + n.col * (GRID.cellW + GRID.gapX);
      const y = 60 + (n.row - rowOffset) * (GRID.cellH + GRID.gapY);
      const w = span * GRID.cellW + (span - 1) * GRID.gapX;
      return { x, y, w, h: GRID.cellH };
    };
    const localNodeMap = new Map(layerNodes.map(n => [n.id, n]));

    const svgW = GRID.padX + GRID.cols * (GRID.cellW + GRID.gapX);
    const extBadgeH = (inLinks.length > 0 || outLinks.length > 0) ? 50 : 0;
    const svgH = 60 + localRows * (GRID.cellH + GRID.gapY) + extBadgeH + 30;

    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4" onClick={closePop}>
        <div className="mb-3 flex items-center gap-3">
          <button className="text-sm text-slate-400 hover:text-white"
            onClick={e => { e.stopPropagation(); setViewMode('container'); }}>← 容器图</button>
          <h1 className="text-lg font-bold text-white">🔍 {band.label} — 组件视图 (C4 L3)</h1>
          <span className="text-xs text-slate-500">{layerNodes.length} 个组件 · 点击查看详情</span>
        </div>
        <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet"
          className="w-full" style={{ maxHeight: 'calc(100vh - 80px)' }}>
          <style>{`
            @keyframes archFadeIn { from { opacity:0 } }
            @keyframes flowPulse { 0%,100%{ opacity:.3;r:2 } 50%{ opacity:1;r:3.5 } }
          `}</style>
          <defs>
            <marker id="l3-arr" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M2,2 L8,5 L2,8" fill="none" stroke={band.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          {/* 层色带背景 */}
          <rect x={GRID.padX - 8} y={50} width={svgW - GRID.padX + 4}
            height={localRows * (GRID.cellH + GRID.gapY) + 20} rx={8}
            fill={band.color} fillOpacity={0.04} stroke={band.color} strokeOpacity={0.15} strokeWidth={1} />

          {/* 内部边 */}
          {intEdges.map((edge, i) => {
            const fn = localNodeMap.get(edge.from);
            const tn = localNodeMap.get(edge.to);
            if (!fn || !tn) return null;
            const pathD = rectEdgePath(localRect(fn), localRect(tn));
            return (
              <g key={`e${i}`} style={{ animation: `archFadeIn 0.5s ease ${0.2 + i * 0.05}s both` }}>
                <path d={pathD} fill="none" stroke={edge.color} strokeWidth={1.2} strokeOpacity={0.6}
                  strokeDasharray={edge.type === 'event' ? '6,3' : undefined} markerEnd="url(#l3-arr)" />
                {edge.label && (() => {
                  const fr = localRect(fn), tr = localRect(tn);
                  const lx = (fr.x + fr.w / 2 + tr.x + tr.w / 2) / 2;
                  const ly = (fr.y + fr.h / 2 + tr.y + tr.h / 2) / 2;
                  return <text x={lx} y={ly - 5} textAnchor="middle" fill={edge.color} fontSize={8}
                    stroke="#0d1117" strokeWidth={2.5} paintOrder="stroke">{edge.label}</text>;
                })()}
              </g>
            );
          })}

          {/* 节点 */}
          {layerNodes.map((n, ni) => {
            const r = localRect(n);
            const isSelected = selectedNode?.id === n.id;
            const isHovered = hoveredNode === n.id;
            return (
              <g key={n.id}
                style={{ cursor: 'pointer', animation: `archFadeIn 0.4s ease ${ni * 0.06}s both` }}
                onMouseEnter={() => setHoveredNode(n.id)} onMouseLeave={() => setHoveredNode(null)}
                onClick={evt => handleNodeClick(n, evt)}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8}
                  fill={isHovered || isSelected ? n.color + '30' : '#161b22'}
                  stroke={isHovered || isSelected ? n.color : n.color + '60'}
                  strokeWidth={isHovered || isSelected ? 2 : 1}
                  strokeDasharray={n.dashed ? '6,3' : undefined}
                  style={{ transition: 'fill 0.2s, stroke 0.2s' }} />
                <text x={r.x + r.w / 2} y={r.y + 20} textAnchor="middle" fill={n.color} fontSize={12} fontWeight={700}>{n.label}</text>
                <text x={r.x + r.w / 2} y={r.y + 38} textAnchor="middle" fill="#8b949e" fontSize={9}>{n.desc}</text>
                {n.expandable && (
                  <text x={r.x + r.w - 10} y={r.y + 14} textAnchor="end" fill={n.color} fontSize={8} opacity={0.5}>→ 展开</text>
                )}
              </g>
            );
          })}

          {/* 外部接口 */}
          {(inLinks.length > 0 || outLinks.length > 0) && (() => {
            const badgeY = 60 + localRows * (GRID.cellH + GRID.gapY) + 14;
            return (
              <g style={{ animation: 'archFadeIn 0.5s ease 0.4s both' }}>
                {inLinks.length > 0 && (
                  <text x={GRID.padX} y={badgeY} fill="#6e7681" fontSize={9}>
                    ⬇ 来自: {inLinks.map(l => `${l.externalNode.label}(${l.label})`).join(' · ')}
                  </text>
                )}
                {outLinks.length > 0 && (
                  <text x={GRID.padX} y={badgeY + (inLinks.length > 0 ? 16 : 0)} fill="#6e7681" fontSize={9}>
                    ⬆ 输出: {outLinks.map(l => `${l.externalNode.label}(${l.label})`).join(' · ')}
                  </text>
                )}
              </g>
            );
          })()}

          {/* SVG 弹窗 */}
          {selectedNode && selectedDeps && (() => {
            const isPrimitives = selectedNode.expandable === 'primitives';
            const popW = isPrimitives ? 420 : 400;
            const details = selectedNode.details ?? [];
            const accentN = details.filter(d => d.startsWith('\ud83c\udfaf') || d.startsWith('\ud83c\udfb2')).length;
            const upCount = selectedDeps.upstream.length;
            const downCount = selectedDeps.downstream.length;
            let contentH = 68 + (details.length - accentN) * 16 + accentN * 22
              + (upCount > 0 ? 28 + upCount * 24 : 0) + (downCount > 0 ? 28 + downCount * 24 : 0);
            if (isPrimitives) contentH += 130;
            const popH = Math.max(120, contentH + 20);
            const popX = (svgW - popW) / 2;
            const popY = Math.max(10, (svgH - popH) / 2);
            let cy = popY + 16;
            return (
              <g onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ animation: 'archFadeIn 0.2s ease' }}>
                <rect x={0} y={0} width={svgW} height={svgH} fill="#000" fillOpacity={0.45}
                  style={{ cursor: 'pointer' }} onClick={closePop} />
                <rect x={popX} y={popY} width={popW} height={popH} rx={12}
                  fill="#161b22" stroke={selectedNode.color + '40'} strokeWidth={1.5} />
                <rect x={popX + 1} y={popY + 1} width={popW - 2} height={3} rx={1.5}
                  fill={selectedNode.color} fillOpacity={0.5} />
                <text x={popX + popW - 16} y={popY + 18} textAnchor="middle" fill="#6e7681" fontSize={14}
                  style={{ cursor: 'pointer' }} onClick={closePop}>{"\u2715"}</text>
                <text x={popX + 16} y={(cy += 12, cy)} fill={selectedNode.color} fontSize={14} fontWeight={700}>{selectedNode.label}</text>
                <text x={popX + 16} y={(cy += 18, cy)} fill="#8b949e" fontSize={10}>{selectedNode.desc}</text>
                {(cy += 10, null)}
                <line x1={popX + 14} y1={cy} x2={popX + popW - 14} y2={cy} stroke="#21262d" strokeWidth={1} />
                {details.length > 0 && (() => {
                  cy += 4;
                  return details.map((d, i) => {
                    const isRole = d.startsWith('\ud83c\udfaf');
                    const isExample = d.startsWith('\ud83c\udfb2');
                    if (isRole || isExample) {
                      cy += 20;
                      const ac = isRole ? selectedNode.color : '#e3b341';
                      return (
                        <g key={i}>
                          <rect x={popX + 14} y={cy - 13} width={popW - 28} height={18} rx={4}
                            fill={ac} fillOpacity={0.08} stroke={ac} strokeOpacity={0.15} strokeWidth={0.8} />
                          <text x={popX + 22} y={cy} fill={ac} fontSize={9} fontWeight={600}>{d}</text>
                        </g>
                      );
                    }
                    cy += 16;
                    return (
                      <g key={i}>
                        <line x1={popX + 18} y1={cy - 10} x2={popX + 18} y2={cy - 2} stroke="#30363d" strokeWidth={1} />
                        <text x={popX + 26} y={cy} fill="#c9d1d9" fontSize={9}>{d}</text>
                      </g>
                    );
                  });
                })()}
                {isPrimitives && (() => {
                  cy += 16;
                  const gridX = popX + 16, gridCols = 2, cellW = 192, cellH = 22;
                  return PRIMITIVE_ITEMS.map((item, i) => {
                    const col = i % gridCols, row = Math.floor(i / gridCols);
                    const ix = gridX + col * cellW, iy = cy + row * cellH;
                    return (
                      <g key={i}>
                        <text x={ix} y={iy + 14} fontSize={13}>{item.emoji}</text>
                        <text x={ix + 20} y={iy + 14} fontSize={10} fontWeight={600} fill="#e6edf3">{item.name}</text>
                        <text x={ix + 20} y={iy + 14} dx={item.name.length * 9 + 4} fontSize={9} fill="#6e7681">{item.desc}</text>
                      </g>
                    );
                  });
                })()}
                {isPrimitives && (cy += 110, null)}
                {upCount > 0 && (() => {
                  cy += 14;
                  return (
                    <>
                      <text x={popX + 16} y={(cy += 4, cy)} fill="#6e7681" fontSize={9} fontWeight={600}>⬆ 上游（谁调用我）</text>
                      {(cy += 4, null)}
                      <line x1={popX + 14} y1={cy} x2={popX + popW - 14} y2={cy} stroke="#21262d" strokeWidth={1} />
                      {selectedDeps.upstream.map((dep, i) => {
                        cy += 24;
                        const bw = (dep.node?.label?.length ?? 8) * 8 + 20;
                        return (
                          <g key={i} style={{ cursor: 'pointer' }} onClick={() => dep.node && setSelectedNode(dep.node)}>
                            <rect x={popX + 20} y={cy - 14} width={bw} height={20} rx={6}
                              fill={dep.node?.color + '12'} stroke={dep.node?.color + '40'} strokeWidth={1} />
                            <text x={popX + 28} y={cy} fill={dep.node?.color} fontSize={10} fontWeight={500}>{dep.node?.label}</text>
                            {dep.label && <text x={popX + 28 + bw} y={cy} fill="#6e7681" fontSize={9}>{dep.label}</text>}
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
                {downCount > 0 && (() => {
                  cy += 14;
                  return (
                    <>
                      <text x={popX + 16} y={(cy += 4, cy)} fill="#6e7681" fontSize={9} fontWeight={600}>⬇ 下游（我调用谁）</text>
                      {(cy += 4, null)}
                      <line x1={popX + 14} y1={cy} x2={popX + popW - 14} y2={cy} stroke="#21262d" strokeWidth={1} />
                      {selectedDeps.downstream.map((dep, i) => {
                        cy += 24;
                        const bw = (dep.node?.label?.length ?? 8) * 8 + 20;
                        return (
                          <g key={i} style={{ cursor: 'pointer' }} onClick={() => dep.node && setSelectedNode(dep.node)}>
                            <rect x={popX + 20} y={cy - 14} width={bw} height={20} rx={6}
                              fill={dep.node?.color + '12'} stroke={dep.node?.color + '40'} strokeWidth={1} />
                            <text x={popX + 28} y={cy} fill={dep.node?.color} fontSize={10} fontWeight={500}>{dep.node?.label}</text>
                            {dep.label && <text x={popX + 28 + bw} y={cy} fill="#6e7681" fontSize={9}>{dep.label}</text>}
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </g>
            );
          })()}
        </svg>
      </div>
    );
  }

  // ========================================================================
  // 深层: 管线 8 步流水线
  // ========================================================================
  if (viewMode === 'sub-pipeline') {
    const stepH = 72, stepW = 380, gap = 14, sysW = 260;
    const totalH = PIPELINE_STEPS.length * (stepH + gap) + 120;
    const vw = stepW + sysW + 180, vh = totalH;
    const sx = 80, sy = 70;
    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4" onClick={() => goToLayer('engine')}>
        <button className="mb-3 text-sm text-slate-400 hover:text-white" onClick={e => { e.stopPropagation(); goToLayer('engine'); }}>← 引擎层</button>
        <h2 className="text-lg font-bold text-white mb-2">⚡ 回合执行引擎 — 8 步管线</h2>
        <p className="text-xs text-slate-500 mb-2">点击任意位置返回引擎层</p>
        <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <style>{`
            @keyframes archFadeIn { from { opacity: 0 } }
            @keyframes archDraw { to { stroke-dashoffset: 0 } }
          `}</style>
          <defs>
            <marker id="pa" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M2,2 L8,5 L2,8" fill="none" stroke="#f0883e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker id="ph" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M2,2 L8,5 L2,8" fill="none" stroke="#f778ba" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>
          <text x={sx} y={sy - 24} fontSize={11} fontWeight={600} fill="#e3b341">📎 示例场景: 骰子王座 — 玩家A攻击玩家B</text>
          {PIPELINE_STEPS.map((step, i) => {
            const x = sx, y = sy + i * (stepH + gap);
            return (
              <g key={i} style={{ animation: `archFadeIn 0.4s ease ${i * 0.07}s both` }}>
                <rect x={x} y={y} width={stepW} height={stepH} rx={10} fill="#161b22" stroke="#f0883e" strokeWidth={1.2} />
                <text x={x + 14} y={y + 22} fontSize={18} fill="#f0883e">{step.emoji}</text>
                <text x={x + 42} y={y + 22} fontSize={13} fontWeight={700} fill="#f0883e">
                  {`${'\u24ea\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467'[i + 1] ?? ''} ${step.label}`}
                </text>
                <text x={x + 42} y={y + 40} fontSize={10} fill="#8b949e">{step.desc}</text>
                {step.example && (
                  <text x={x + 42} y={y + 56} fontSize={9} fill="#e3b341">🎲 {step.example}</text>
                )}
                {i < PIPELINE_STEPS.length - 1 && (
                  <line x1={x + stepW / 2} y1={y + stepH} x2={x + stepW / 2} y2={y + stepH + gap}
                    stroke="#f0883e" strokeWidth={2.5} markerEnd="url(#pa)"
                    style={{ strokeDasharray: 20, strokeDashoffset: 20, animation: `archDraw 0.3s ease ${i * 0.07 + 0.3}s forwards` }} />
                )}
                {step.systems && step.systems.length > 0 && (
                  <g>
                    <line x1={x + stepW} y1={y + stepH / 2} x2={x + stepW + 20} y2={y + stepH / 2} stroke="#58a6ff" strokeWidth={1} strokeDasharray="4,3" />
                    <rect x={x + stepW + 22} y={y + 2} width={sysW} height={stepH - 4} rx={6} fill="#161b22" stroke="#58a6ff" strokeWidth={0.8} strokeOpacity={0.5} />
                    <text x={x + stepW + 32} y={y + 18} fontSize={10} fontWeight={600} fill="#58a6ff">介入的系统</text>
                    {step.systems.map((s, si) => (
                      <text key={si} x={x + stepW + 32 + (si % 2) * 125} y={y + 34 + Math.floor(si / 2) * 13} fontSize={9} fill="#8b949e">{s}</text>
                    ))}
                  </g>
                )}
              </g>
            );
          })}
          {(() => {
            const haltFromY = sy + 1 * (stepH + gap) + stepH / 2;
            const haltToY = sy + 5 * (stepH + gap) + stepH / 2;
            const hx = sx - 44;
            return (
              <g style={{ animation: 'archFadeIn 0.6s ease 0.5s both' }}>
                <path d={`M${sx},${haltFromY} C${hx},${haltFromY} ${hx},${haltToY} ${sx},${haltToY}`} fill="none" stroke="#f778ba" strokeWidth={1.5} strokeDasharray="6,4" markerEnd="url(#ph)" />
                <text x={hx - 2} y={(haltFromY + haltToY) / 2 - 6} textAnchor="middle" fontSize={8} fill="#f778ba">halt: 拦截</text>
                <text x={hx - 2} y={(haltFromY + haltToY) / 2 + 6} textAnchor="middle" fontSize={8} fill="#f778ba">跳过③④⑤</text>
              </g>
            );
          })()}
        </svg>
      </div>
    );
  }

  // ========================================================================
  // 深层: 系统插件矩阵
  // ========================================================================
  if (viewMode === 'sub-systems') {
    const defaults = SYSTEM_ITEMS.filter(s => s.isDefault);
    const optional = SYSTEM_ITEMS.filter(s => !s.isDefault);
    const rowH = 40, colW = 520, padX = 40, padY = 50;
    const vw = colW + padX * 2 + 20;
    const vh = padY + (defaults.length + optional.length + 3) * (rowH + 4) + 60;
    const hookColor = (h: string) => h === '前置' ? '#58a6ff' : h === '后置' ? '#3fb950' : '#f0883e';
    const renderRow = (item: typeof SYSTEM_ITEMS[number], i: number, y: number, dashed: boolean) => (
      <g key={i}>
        <rect x={padX} y={y} width={colW} height={rowH} rx={6}
          fill="#161b22" stroke={dashed ? '#6e7681' : '#30363d'} strokeWidth={1}
          strokeDasharray={dashed ? '6,3' : undefined} />
        <text x={padX + 14} y={y + 25} fontSize={16}>{item.emoji}</text>
        <text x={padX + 38} y={y + 25} fontSize={12} fontWeight={600} fill="#e6edf3">{item.name}</text>
        <text x={padX + 150} y={y + 25} fontSize={10} fill="#8b949e">{item.desc}</text>
        <rect x={padX + colW - 80} y={y + 10} width={68} height={20} rx={4} fill={hookColor(item.hook)} fillOpacity={0.15} />
        <text x={padX + colW - 46} y={y + 24} textAnchor="middle" fontSize={9} fontWeight={600} fill={hookColor(item.hook)}>{item.hook}</text>
      </g>
    );
    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4" onClick={() => goToLayer('engine')}>
        <button className="mb-3 text-sm text-slate-400 hover:text-white" onClick={e => { e.stopPropagation(); goToLayer('engine'); }}>← 引擎层</button>
        <h2 className="text-lg font-bold text-white mb-2">🔌 系统插件 — 11 个系统</h2>
        <p className="text-xs text-slate-500 mb-2">点击任意位置返回引擎层</p>
        <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 'calc(100vh - 100px)' }}>
          <style>{`@keyframes archFadeIn { from { opacity: 0 } }`}</style>
          <text x={padX} y={padY - 8} fontSize={12} fontWeight={700} fill="#3fb950">默认启用（8 个）— createDefaultSystems() 自动包含</text>
          {defaults.map((item, i) => renderRow(item, i, padY + i * (rowH + 4), false))}
          {(() => {
            const optY = padY + defaults.length * (rowH + 4) + 30;
            return (
              <>
                <text x={padX} y={optY - 8} fontSize={12} fontWeight={700} fill="#8b949e">按需配置（3 个）— 游戏层显式创建</text>
                {optional.map((item, i) => renderRow(item, i, optY + i * (rowH + 4), true))}
              </>
            );
          })()}
          {(() => {
            const legY = padY + (defaults.length + optional.length + 1) * (rowH + 4) + 40;
            return (
              <g>
                <text x={padX} y={legY} fontSize={10} fill="#6e7681">钩子位置：</text>
                <rect x={padX + 60} y={legY - 11} width={10} height={10} rx={2} fill="#58a6ff" fillOpacity={0.3} />
                <text x={padX + 74} y={legY} fontSize={9} fill="#58a6ff">前置（beforeCommand）</text>
                <rect x={padX + 210} y={legY - 11} width={10} height={10} rx={2} fill="#3fb950" fillOpacity={0.3} />
                <text x={padX + 224} y={legY} fontSize={9} fill="#3fb950">后置（afterEvents）</text>
                <rect x={padX + 350} y={legY - 11} width={10} height={10} rx={2} fill="#f0883e" fillOpacity={0.3} />
                <text x={padX + 364} y={legY} fontSize={9} fill="#f0883e">前置+后置</text>
              </g>
            );
          })()}
        </svg>
      </div>
    );
  }

  // ========================================================================
  // 深层: 测试框架 — 录制→回放→对比 动画演示
  // ========================================================================
  if (viewMode === 'sub-testing') {
    const recordSteps = TEST_FLOW_STEPS.filter(s => s.phase === 'record');
    const verifySteps = TEST_FLOW_STEPS.filter(s => s.phase === 'verify');
    const stepH = 72, stepW = 340, gap = 14;
    const colGap = 120;
    const maxRows = Math.max(recordSteps.length, verifySteps.length);
    const totalH = maxRows * (stepH + gap) + 180;
    const sx = 60, sy = 100;
    const vw = sx + stepW * 2 + colGap + 80;
    const vh = totalH;
    const recColor = '#3fb950';
    const verColor = '#f0883e';

    const renderStep = (step: typeof TEST_FLOW_STEPS[number], i: number, x: number, y: number, color: string, totalInCol: number) => (
      <g key={`${step.phase}-${i}`} style={{ animation: `archFadeIn 0.4s ease ${i * 0.1 + (step.phase === 'verify' ? 0.4 : 0)}s both` }}>
        <rect x={x} y={y} width={stepW} height={stepH} rx={10}
          fill="#161b22" stroke={color} strokeWidth={1.2} />
        <text x={x + 14} y={y + 22} fontSize={18} fill={color}>{step.emoji}</text>
        <text x={x + 42} y={y + 22} fontSize={13} fontWeight={700} fill={color}>
          {'\u2460\u2461\u2462\u2463\u2464\u2465\u2466\u2467'[i] ?? ''} {step.label}
        </text>
        <text x={x + 42} y={y + 40} fontSize={10} fill="#8b949e">{step.desc}</text>
        {step.example && (
          <text x={x + 42} y={y + 56} fontSize={9} fill="#e3b341">🎲 {step.example}</text>
        )}
        {i < totalInCol - 1 && (
          <line x1={x + stepW / 2} y1={y + stepH} x2={x + stepW / 2} y2={y + stepH + gap}
            stroke={color} strokeWidth={2} markerEnd={step.phase === 'record' ? 'url(#test-arr-rec)' : 'url(#test-arr-ver)'}
            style={{ strokeDasharray: 20, strokeDashoffset: 20, animation: `archDraw 0.3s ease ${i * 0.1 + 0.3}s forwards` }} />
        )}
      </g>
    );

    // 录制末尾 → 验证开头 的跨列连线
    const recLastY = sy + (recordSteps.length - 1) * (stepH + gap);
    const verFirstY = sy;
    const bridgeFromX = sx + stepW;
    const bridgeToX = sx + stepW + colGap;
    const bridgeMidX = bridgeFromX + colGap / 2;
    const bridgeFromY = recLastY + stepH / 2;
    const bridgeToY = verFirstY + stepH / 2;

    return (
      <div className="min-h-screen bg-[#0d1117] text-slate-200 p-4" onClick={() => goToLayer('engine')}>
        <button className="mb-3 text-sm text-slate-400 hover:text-white" onClick={e => { e.stopPropagation(); goToLayer('engine'); }}>← 引擎层</button>
        <h2 className="text-lg font-bold text-white mb-2">🧪 自动化测试 — 命令录制 → 回放对比</h2>
        <p className="text-xs text-slate-500 mb-2">左: 录制阶段 · 右: 验证阶段 · 点击任意位置返回引擎层</p>
        <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <style>{`
            @keyframes archFadeIn { from { opacity: 0 } }
            @keyframes archDraw { to { stroke-dashoffset: 0 } }
            @keyframes flowPulse { 0%,100%{ opacity:.3;r:2 } 50%{ opacity:1;r:3.5 } }
            @keyframes testBridge { 0%,100%{ opacity:.4 } 50%{ opacity:1 } }
          `}</style>
          <defs>
            <marker id="test-arr-rec" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M2,2 L8,5 L2,8" fill="none" stroke={recColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
            <marker id="test-arr-ver" viewBox="0 0 10 10" markerWidth="8" markerHeight="8" refX="9" refY="5" orient="auto" markerUnits="userSpaceOnUse">
              <path d="M2,2 L8,5 L2,8" fill="none" stroke={verColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          {/* 阶段标题 */}
          <g style={{ animation: 'archFadeIn 0.3s ease both' }}>
            <rect x={sx - 4} y={sy - 42} width={stepW + 8} height={26} rx={6} fill={recColor} fillOpacity={0.1} stroke={recColor} strokeOpacity={0.3} strokeWidth={1} />
            <text x={sx + stepW / 2} y={sy - 24} textAnchor="middle" fontSize={13} fontWeight={700} fill={recColor}>📹 录制阶段</text>
          </g>
          <g style={{ animation: 'archFadeIn 0.3s ease 0.3s both' }}>
            <rect x={sx + stepW + colGap - 4} y={sy - 42} width={stepW + 8} height={26} rx={6} fill={verColor} fillOpacity={0.1} stroke={verColor} strokeOpacity={0.3} strokeWidth={1} />
            <text x={sx + stepW + colGap + stepW / 2} y={sy - 24} textAnchor="middle" fontSize={13} fontWeight={700} fill={verColor}>🔬 验证阶段</text>
          </g>

          {/* 录制列 */}
          {recordSteps.map((step, i) => renderStep(step, i, sx, sy + i * (stepH + gap), recColor, recordSteps.length))}

          {/* 验证列 */}
          {verifySteps.map((step, i) => renderStep(step, i, sx + stepW + colGap, sy + i * (stepH + gap), verColor, verifySteps.length))}

          {/* 跨列桥接: 录制末 → 验证首 */}
          <g style={{ animation: 'archFadeIn 0.6s ease 0.6s both' }}>
            <path d={`M${bridgeFromX},${bridgeFromY} C${bridgeMidX},${bridgeFromY} ${bridgeMidX},${bridgeToY} ${bridgeToX},${bridgeToY}`}
              fill="none" stroke="#e3b341" strokeWidth={2} strokeDasharray="8,4" />
            <circle r="4" fill="#e3b341" style={{ animation: 'testBridge 2s ease infinite' }}>
              <animateMotion dur="2.5s" repeatCount="indefinite"
                path={`M${bridgeFromX},${bridgeFromY} C${bridgeMidX},${bridgeFromY} ${bridgeMidX},${bridgeToY} ${bridgeToX},${bridgeToY}`} />
            </circle>
            <text x={bridgeMidX} y={Math.min(bridgeFromY, bridgeToY) - 10} textAnchor="middle" fontSize={10} fontWeight={600} fill="#e3b341">
              ✏️ 代码修改后触发验证
            </text>
          </g>

          {/* 结果指示: 通过 vs 失败 */}
          {(() => {
            const lastVerY = sy + (verifySteps.length - 1) * (stepH + gap);
            const rx = sx + stepW + colGap, ry = lastVerY + stepH + 24;
            return (
              <g style={{ animation: 'archFadeIn 0.5s ease 0.9s both' }}>
                <rect x={rx} y={ry} width={stepW / 2 - 8} height={36} rx={8}
                  fill="#3fb950" fillOpacity={0.1} stroke="#3fb950" strokeOpacity={0.4} strokeWidth={1.5} />
                <text x={rx + stepW / 4 - 4} y={ry + 22} textAnchor="middle" fontSize={12} fontWeight={700} fill="#3fb950">✅ 全部通过</text>
                <rect x={rx + stepW / 2 + 8} y={ry} width={stepW / 2 - 8} height={36} rx={8}
                  fill="#f85149" fillOpacity={0.1} stroke="#f85149" strokeOpacity={0.4} strokeWidth={1.5} />
                <text x={rx + stepW * 3 / 4 + 4} y={ry + 22} textAnchor="middle" fontSize={12} fontWeight={700} fill="#f85149">❌ 有差异 → 定位Bug</text>
              </g>
            );
          })()}

          {/* 底部原理说明 */}
          <g style={{ animation: 'archFadeIn 0.5s ease 1s both' }}>
            <text x={sx} y={vh - 30} fontSize={10} fill="#6e7681">
              💡 核心原理: 纯函数引擎 + 确定性管线 → 相同输入必定产生相同输出 → 命令序列回放即可验证正确性
            </text>
          </g>
        </svg>
      </div>
    );
  }

  return null;
};

export default ArchitectureView;
