import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useApp } from '../context/AppContext';
import { ChemText } from './common/ChemText';
import { useAuthUser } from '../lib/cloud';
import { useTeacherOnScreen } from '../lib/viewAs';
import { courseTopics } from '../data/courseScope';
import {
  MIND_MAP_GLOSSARY,
  CHAPTER_INFO,
  MindMapGlossaryItem
} from '../data/mindMapGlossaryData';
import {
  MIND_MAP_TEMPLATES,
  MindMapNode,
  MindMapEdge,
  MindMapTemplate
} from '../data/mindMapTemplates';
import {
  Plus,
  Trash2,
  Edit3,
  Link2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  BookOpen,
  FlaskConical,
  Save,
  Download,
  Search,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  X,
  Eye,
  Info,
  Move
} from 'lucide-react';

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; ring: string; header: string; lightBg: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300 dark:border-emerald-700',
    text: 'text-emerald-800 dark:text-emerald-300',
    ring: 'ring-emerald-400',
    header: 'bg-emerald-600 text-white',
    lightBg: 'bg-emerald-500/10'
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    border: 'border-indigo-300 dark:border-indigo-700',
    text: 'text-indigo-800 dark:text-indigo-300',
    ring: 'ring-indigo-400',
    header: 'bg-indigo-600 text-white',
    lightBg: 'bg-indigo-500/10'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-300 dark:border-amber-700',
    text: 'text-amber-800 dark:text-amber-300',
    ring: 'ring-amber-400',
    header: 'bg-amber-600 text-white',
    lightBg: 'bg-amber-500/10'
  },
  teal: {
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-300 dark:border-teal-700',
    text: 'text-teal-800 dark:text-teal-300',
    ring: 'ring-teal-400',
    header: 'bg-teal-600 text-white',
    lightBg: 'bg-teal-500/10'
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-300 dark:border-rose-700',
    text: 'text-rose-800 dark:text-rose-300',
    ring: 'ring-rose-400',
    header: 'bg-rose-600 text-white',
    lightBg: 'bg-rose-500/10'
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-300',
    ring: 'ring-orange-400',
    header: 'bg-orange-600 text-white',
    lightBg: 'bg-orange-500/10'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    border: 'border-blue-300 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    ring: 'ring-blue-400',
    header: 'bg-blue-600 text-white',
    lightBg: 'bg-blue-500/10'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-300 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-300',
    ring: 'ring-purple-400',
    header: 'bg-purple-600 text-white',
    lightBg: 'bg-purple-500/10'
  },
  violet: {
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-300 dark:border-violet-700',
    text: 'text-violet-800 dark:text-violet-300',
    ring: 'ring-violet-400',
    header: 'bg-violet-600 text-white',
    lightBg: 'bg-violet-500/10'
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/40',
    border: 'border-cyan-300 dark:border-cyan-700',
    text: 'text-cyan-800 dark:text-cyan-300',
    ring: 'ring-cyan-400',
    header: 'bg-cyan-600 text-white',
    lightBg: 'bg-cyan-500/10'
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    border: 'border-pink-300 dark:border-pink-700',
    text: 'text-pink-800 dark:text-pink-300',
    ring: 'ring-pink-400',
    header: 'bg-pink-600 text-white',
    lightBg: 'bg-pink-500/10'
  }
};

const COMMON_RELATIONS = [
  { labelEn: 'leads to', labelMn: 'үүсгэнэ / хүргэнэ' },
  { labelEn: 'depends on', labelMn: 'хамаарна' },
  { labelEn: 'requires', labelMn: 'шаардана' },
  { labelEn: 'calculates', labelMn: 'тооцоолно' },
  { labelEn: 'identifies', labelMn: 'танина' },
  { labelEn: 'explained by', labelMn: 'тайлбарлагдана' },
  { labelEn: 'example of', labelMn: 'жишээ нь' }
];

export const MindMapView: React.FC = () => {
  const { mode } = useLanguage();
  const { jumpToTopic, jumpToSimulator, stats, courseChoice } = useApp();
  // The topics the student has studied, each with its concept maps in its lesson
  const studiedTopics = courseTopics(courseChoice).filter(t => stats.completedTopics.includes(t.id));
  // The mind map can be exported as a file for the teacher account only
  const { user } = useAuthUser();
  // The teacher's own view only; looking at the site as a student (lib/viewAs) it is hidden, as for a student
  const teacher = useTeacherOnScreen(user);

  // Template & Storage
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-overview');
  const [nodes, setNodes] = useState<MindMapNode[]>(MIND_MAP_TEMPLATES[0].nodes);
  const [edges, setEdges] = useState<MindMapEdge[]>(MIND_MAP_TEMPLATES[0].edges);
  const [activeNodeId, setActiveNodeId] = useState<string | null>('node-electrolysis');

  // Connect Mode
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null);
  const [isConnectMode, setIsConnectMode] = useState<boolean>(false);
  const [pendingEdgeModal, setPendingEdgeModal] = useState<{ from: string; to: string } | null>(null);
  const [edgeLabelText, setEdgeLabelText] = useState<string>('leads to');

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 20, y: 20 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging Node
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragNodeOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Chapter Glossary Palette
  const [isGlossaryOpen, setIsGlossaryOpen] = useState<boolean>(true);
  const [glossaryChapterFilter, setGlossaryChapterFilter] = useState<number | 'all'>('all');
  const [glossarySearch, setGlossarySearch] = useState<string>('');

  // Modals
  const [editingNode, setEditingNode] = useState<MindMapNode | null>(null);
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState<boolean>(false);
  const [newCustomTitle, setNewCustomTitle] = useState<string>('');
  const [newCustomTitleMn, setNewCustomTitleMn] = useState<string>('');
  const [newCustomCategory, setNewCustomCategory] = useState<string>('Matter');
  const [newCustomFormula, setNewCustomFormula] = useState<string>('');
  const [newCustomDesc, setNewCustomDesc] = useState<string>('');
  const [newCustomColor, setNewCustomColor] = useState<string>('emerald');

  // Toast / notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Load from localStorage or template
  useEffect(() => {
    const saved = localStorage.getItem(`chem_mindmap_${selectedTemplateId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && parsed.edges) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved mindmap', e);
      }
    }
    const tpl = MIND_MAP_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (tpl) {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
    } else if (selectedTemplateId === 'blank') {
      setNodes([]);
      setEdges([]);
      setActiveNodeId(null);
    }
  }, [selectedTemplateId]);

  // Save to localStorage
  const handleSaveToStorage = () => {
    try {
      localStorage.setItem(
        `chem_mindmap_${selectedTemplateId}`,
        JSON.stringify({ nodes, edges })
      );
      showToast(mode === 'mn' ? 'Зураглал амжилттай хадгалагдлаа!' : 'Mind map successfully saved to browser storage!');
    } catch (e) {
      console.error(e);
    }
  };

  // Reset to original template
  const handleResetTemplate = () => {
    if (selectedTemplateId === 'blank') {
      setNodes([]);
      setEdges([]);
      setActiveNodeId(null);
      localStorage.removeItem('chem_mindmap_blank');
      showToast(mode === 'mn' ? 'Зураглал цэвэрлэгдлээ' : 'Canvas cleared');
      return;
    }
    const tpl = MIND_MAP_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (tpl) {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setActiveNodeId(tpl.nodes[0]?.id || null);
      localStorage.removeItem(`chem_mindmap_${selectedTemplateId}`);
      showToast(mode === 'mn' ? 'Үндсэн загварт буцаалаа' : 'Reset to template defaults');
    }
  };

  // Export as JSON file
  const handleExportJSON = () => {
    if (!teacher) return;
    const data = {
      template: selectedTemplateId,
      exportedAt: new Date().toISOString(),
      nodes,
      edges
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cambridge-chemistry-mindmap-${selectedTemplateId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(mode === 'mn' ? 'JSON файл татагдлаа' : 'JSON file exported');
  };

  // Node Dragging Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (isConnectMode) {
      handleNodeConnectClick(nodeId);
      return;
    }
    setActiveNodeId(nodeId);
    setDraggingNodeId(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      dragNodeOffsetRef.current = {
        x: e.clientX - node.x * zoom - pan.x,
        y: e.clientY - node.y * zoom - pan.y
      };
    }
  };

  // Canvas Pan Handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'grid-rect') {
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      };
      if (isConnectMode && !connectSourceId) {
        setIsConnectMode(false);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const newX = Math.round((e.clientX - dragNodeOffsetRef.current.x - pan.x) / zoom);
      const newY = Math.round((e.clientY - dragNodeOffsetRef.current.y - pan.y) / zoom);
      setNodes(prev =>
        prev.map(node =>
          node.id === draggingNodeId ? { ...node, x: Math.max(20, newX), y: Math.max(20, newY) } : node
        )
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    setIsPanning(false);
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(1.8, Math.max(0.5, Number((prev + delta).toFixed(2)))));
  };

  const handleCenterView = () => {
    setZoom(1);
    setPan({ x: 40, y: 30 });
  };

  // Connection Handler
  const handleNodeConnectClick = (nodeId: string) => {
    if (!connectSourceId) {
      setConnectSourceId(nodeId);
      showToast(mode === 'mn' ? 'Холбох зорилтот зангилааг дарна уу' : 'Click the target node to link');
    } else if (connectSourceId === nodeId) {
      setConnectSourceId(null);
      setIsConnectMode(false);
    } else {
      // Create edge modal or direct add
      const existing = edges.find(
        e => (e.from === connectSourceId && e.to === nodeId) || (e.from === nodeId && e.to === connectSourceId)
      );
      if (existing) {
        showToast(mode === 'mn' ? 'Энэ хоёр зангилаа аль хэдийн холбогдсон байна' : 'These nodes are already connected');
        setConnectSourceId(null);
        setIsConnectMode(false);
        return;
      }
      setPendingEdgeModal({ from: connectSourceId, to: nodeId });
      setConnectSourceId(null);
      setIsConnectMode(false);
    }
  };

  const handleConfirmAddEdge = () => {
    if (!pendingEdgeModal) return;
    const newEdge: MindMapEdge = {
      id: `edge-${Date.now()}`,
      from: pendingEdgeModal.from,
      to: pendingEdgeModal.to,
      labelEn: edgeLabelText,
      labelMn: COMMON_RELATIONS.find(r => r.labelEn === edgeLabelText)?.labelMn || edgeLabelText
    };
    setEdges(prev => [...prev, newEdge]);
    setPendingEdgeModal(null);
    showToast(mode === 'mn' ? 'Холбоос үүсгэгдлээ' : 'Connection created');
  };

  const handleDeleteEdge = (edgeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEdges(prev => prev.filter(edge => edge.id !== edgeId));
    showToast(mode === 'mn' ? 'Холбоос устгагдлаа' : 'Connection removed');
  };

  const handleDeleteNode = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(edge => edge.from !== nodeId && edge.to !== nodeId));
    if (activeNodeId === nodeId) {
      setActiveNodeId(null);
    }
    showToast(mode === 'mn' ? 'Зангилаа устгагдлаа' : 'Node deleted');
  };

  // Add Glossary Item to Canvas
  const handleAddGlossaryToCanvas = (item: MindMapGlossaryItem) => {
    // Check if node already exists
    const exists = nodes.some(n => n.glossaryId === item.id || n.titleEn === item.termEn);
    if (exists) {
      // Focus on existing node
      const existingNode = nodes.find(n => n.glossaryId === item.id || n.titleEn === item.termEn);
      if (existingNode) {
        setActiveNodeId(existingNode.id);
        // Center pan near it
        setPan({
          x: Math.round(-existingNode.x * zoom + 300),
          y: Math.round(-existingNode.y * zoom + 200)
        });
        showToast(mode === 'mn' ? 'Энэ ойлголт зураглал дээр байна (Төвлөрүүлэв)' : 'Concept already on canvas (Focused)');
      }
      return;
    }

    // Determine smart open coordinates
    const offsetIndex = nodes.length % 6;
    const startX = 260 + (offsetIndex % 3) * 260;
    const startY = 160 + Math.floor(offsetIndex / 3) * 240;

    const newNode: MindMapNode = {
      id: `node-glo-${Date.now()}`,
      titleEn: item.termEn,
      titleMn: item.termMn,
      category: item.category,
      color: item.color,
      x: startX,
      y: startY,
      formula: item.formula,
      descriptionEn: item.definitionEn,
      descriptionMn: item.definitionMn,
      chapterNumber: item.chapterNumber,
      glossaryId: item.id
    };

    setNodes(prev => [...prev, newNode]);
    setActiveNodeId(newNode.id);
    showToast(`${mode === 'mn' ? item.termMn : item.termEn} ${mode === 'mn' ? 'зураглалд нэмэгдлээ' : 'added to mind map'}`);
  };

  // Add Custom Node
  const handleCreateCustomNode = () => {
    if (!newCustomTitle.trim()) return;
    const newNode: MindMapNode = {
      id: `custom-node-${Date.now()}`,
      titleEn: newCustomTitle.trim(),
      titleMn: newCustomTitleMn.trim() || newCustomTitle.trim(),
      category: newCustomCategory,
      color: newCustomColor,
      x: 350 + (nodes.length % 4) * 80,
      y: 200 + (nodes.length % 4) * 60,
      formula: newCustomFormula.trim() || undefined,
      descriptionEn: newCustomDesc.trim() || undefined,
      descriptionMn: newCustomDesc.trim() || undefined
    };
    setNodes(prev => [...prev, newNode]);
    setActiveNodeId(newNode.id);
    setIsAddCustomModalOpen(false);
    setNewCustomTitle('');
    setNewCustomTitleMn('');
    setNewCustomFormula('');
    setNewCustomDesc('');
    showToast(mode === 'mn' ? 'Шинэ зангилаа амжилттай үүслээ' : 'Custom node created');
  };

  // Edit Node
  const handleSaveNodeEdit = () => {
    if (!editingNode) return;
    setNodes(prev => prev.map(n => (n.id === editingNode.id ? editingNode : n)));
    setEditingNode(null);
    showToast(mode === 'mn' ? 'Зангилаа амжилттай шинэчлэгдлээ' : 'Node updated');
  };

  // Filter glossary
  const filteredGlossary = MIND_MAP_GLOSSARY.filter(item => {
    const matchesChapter = glossaryChapterFilter === 'all' || item.chapterNumber === glossaryChapterFilter;
    const query = glossarySearch.toLowerCase().trim();
    if (!query) return matchesChapter;
    const matchesSearch =
      item.termEn.toLowerCase().includes(query) ||
      item.termMn.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      (item.formula && item.formula.toLowerCase().includes(query));
    return matchesChapter && matchesSearch;
  });

  const selectedNode = nodes.find(n => n.id === activeNodeId) || null;
  const selectedNodeGlossary = selectedNode?.glossaryId
    ? MIND_MAP_GLOSSARY.find(g => g.id === selectedNode.glossaryId)
    : MIND_MAP_GLOSSARY.find(g => g.termEn === selectedNode?.titleEn);

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* The concept maps of the lessons the student has studied: each one is a link to its lesson's concept maps */}
      {studiedTopics.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
            {mode === 'mn' ? 'Судалсан хичээлийн концепт зураг' : 'Concept maps of the lessons you studied'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {studiedTopics.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => jumpToTopic(t.id)}
                className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 transition-colors space-y-0.5"
              >
                <div className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">{t.syllabusRef}</div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">{mode === 'mn' ? t.titleMn : t.titleEn}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {mode === 'mn' ? 'Хичээл рүү очиж концепт зургийг үзэх →' : 'Open the lesson and its concept maps →'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Top Banner & Cambridge Framing */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-7 shadow-sm transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span>Interactive Concept Mind Map Creator</span>
              <span>·</span>
              <span>Cambridge 0620</span>
              <span>·</span>
              <span className="text-slate-500">{nodes.length} Nodes & {edges.length} Links</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>{mode === 'mn' ? 'Химийн ойлголтын зураглал бүтээгч' : 'Interactive Chemistry Concept & Mind Map'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
              {mode === 'mn'
                ? 'Кэмбрижийн 0620 химийн бүлгүүдийн үгийн санг ашиглан өөрийн бүтээлч mind map-ийг бүтээж, ойлголтуудыг холбон, томьёо ба тайлбаруудыг интерактив байдлаар суралцаарай.'
                : 'Construct your personal conceptual mind map using official Cambridge 0620 chapter glossaries. Drag, connect, and explore relationships between chemical principles.'}
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* Template Selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedTemplateId}
                onChange={e => setSelectedTemplateId(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs"
              >
                <option value="tpl-overview" className="dark:bg-slate-900">🌟 6 Core Pillars (Overview)</option>
                <option value="tpl-ch1" className="dark:bg-slate-900">🧊 Ch 1: States of Matter & Diffusion</option>
                <option value="tpl-ch4" className="dark:bg-slate-900">⚡ Ch 4: Electrochemistry</option>
                <option value="blank" className="dark:bg-slate-900">➕ Шинэ хоосон зураглал (Blank)</option>
              </select>
            </div>

            {/* Add Node Button */}
            <button
              onClick={() => setIsAddCustomModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              title={mode === 'mn' ? 'Шинэ зангилаа нэмэх' : 'Add custom node'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{mode === 'mn' ? 'Зангилаа нэмэх' : 'Add Node'}</span>
            </button>

            {/* Connect Mode Toggle */}
            <button
              onClick={() => {
                setIsConnectMode(!isConnectMode);
                setConnectSourceId(null);
                if (!isConnectMode) {
                  showToast(mode === 'mn' ? 'Эхлэл зангилаагаа дарж сонгоно уу' : 'Click the starting node to connect');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                isConnectMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold ring-2 ring-amber-400/40 animate-pulse'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>{isConnectMode ? (mode === 'mn' ? 'Холбох горим ИДЭВХЖСЭН' : 'Connecting...') : (mode === 'mn' ? 'Холбоос үүсгэх' : 'Link Nodes')}</span>
            </button>

            {/* Glossary Palette Toggle */}
            <button
              onClick={() => setIsGlossaryOpen(!isGlossaryOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                isGlossaryOpen
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{mode === 'mn' ? 'Бүлгийн үгийн сан' : 'Chapter Glossary'}</span>
            </button>

            {/* Save & Reset */}
            <button
              onClick={handleSaveToStorage}
              className="p-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
              title={mode === 'mn' ? 'Хадгалах' : 'Save Mind Map'}
            >
              <Save className="w-4 h-4" />
            </button>
            {teacher && (
              <button
                onClick={handleExportJSON}
                className="p-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
                title={mode === 'mn' ? 'Татаж авах (JSON)' : 'Export JSON'}
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleResetTemplate}
              className="p-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
              title={mode === 'mn' ? 'Дахин тохируулах' : 'Reset to template'}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status bar */}
        {toastMessage && (
          <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between animate-fadeIn">
            <span className="font-semibold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              {toastMessage}
            </span>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Chapter Glossary Palette (4 columns when open) */}
        {isGlossaryOpen && (
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 max-h-[820px] flex flex-col transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {mode === 'mn' ? 'Бүлгүүдийн үгийн сан' : 'Chapter Glossary Bank'}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500 font-semibold">
                {filteredGlossary.length} terms
              </span>
            </div>

            {/* Chapter Selection Bar */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                {mode === 'mn' ? 'Сэдэв / Бүлгээр шүүх:' : 'Filter by Chapter:'}
              </label>
              <select
                value={glossaryChapterFilter}
                onChange={e => setGlossaryChapterFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full text-xs font-semibold p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">{mode === 'mn' ? '📚 Бүх 12 бүлэг' : '📚 All 12 Chapters'}</option>
                {CHAPTER_INFO.map(ch => (
                  <option key={ch.number} value={ch.number}>
                    {mode === 'mn' ? ch.titleMn : `${ch.number}. ${ch.titleEn}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={glossarySearch}
                onChange={e => setGlossarySearch(e.target.value)}
                placeholder={mode === 'mn' ? 'Нэр томьёо, томьёогоор хайх...' : 'Search terms or formulas...'}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {glossarySearch && (
                <button
                  onClick={() => setGlossarySearch('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Glossary Item Cards Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {filteredGlossary.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  {mode === 'mn' ? 'Тохирох үг олдсонгүй' : 'No matching terms found'}
                </div>
              ) : (
                filteredGlossary.map(item => {
                  const isAlreadyAdded = nodes.some(n => n.glossaryId === item.id || n.titleEn === item.termEn);
                  const colorConf = COLOR_MAP[item.color] || COLOR_MAP.emerald;

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isAlreadyAdded
                          ? 'bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 opacity-90'
                          : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 hover:border-emerald-300 dark:hover:border-emerald-600 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                            <span className={`w-2 h-2 rounded-full ${colorConf.header.split(' ')[0]}`} />
                            <span>Ch.{item.chapterNumber} · {item.category}</span>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {mode === 'mn' ? item.termMn : item.termEn}
                          </div>
                          <div className="text-[11px] text-slate-500 italic truncate">
                            {mode === 'mn' ? item.termEn : item.termMn}
                          </div>
                        </div>

                        {/* Action Add Button */}
                        <button
                          onClick={() => handleAddGlossaryToCanvas(item)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors flex items-center gap-1 ${
                            isAlreadyAdded
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-800'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                          title={isAlreadyAdded ? (mode === 'mn' ? 'Зураглал дээр төвлөрүүлэх' : 'Focus on canvas') : (mode === 'mn' ? 'Зураглалд нэмэх' : 'Add to Mind Map')}
                        >
                          {isAlreadyAdded ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{mode === 'mn' ? 'Харах' : 'Focus'}</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              <span>{mode === 'mn' ? 'Нэмэх' : 'Add'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Formula if present */}
                      {item.formula && (
                        <div className="mt-1.5 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300 w-fit">
                          <ChemText>{item.formula}</ChemText>
                        </div>
                      )}

                      {/* Concise Definition */}
                      <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                        {mode === 'mn' ? item.definitionMn : item.definitionEn}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Center / Right: Interactive Canvas Area (8 or 12 columns) */}
        <div className={`${isGlossaryOpen ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          {/* Canvas Wrapper */}
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="relative w-full h-[620px] sm:h-[680px] bg-slate-100/70 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner cursor-grab active:cursor-grabbing select-none"
          >
            {/* Canvas floating controls (bottom-right) */}
            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur border border-slate-200 dark:border-slate-800 p-1.5 rounded-xl shadow-md">
              <button
                onClick={() => handleZoom(0.1)}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors rounded-lg"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors rounded-lg"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-500 px-1">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleCenterView}
                className="p-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 transition-colors rounded-lg"
                title="Reset View"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas Notice / Guide (top-left) */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 bg-white/85 dark:bg-slate-900/85 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 shadow-xs">
              <Move className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>
                {isConnectMode
                  ? (mode === 'mn' ? '🔗 Холбох 2 зангилаагаа дараалан дарна уу' : '🔗 Click 2 nodes sequentially to connect them')
                  : (mode === 'mn' ? 'Зангилаануудыг чирж зөөн байрлуулах боломжтой' : 'Drag nodes to reposition freely')}
              </span>
            </div>

            {/* Inner Transformed Container */}
            <div
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                width: '2600px',
                height: '1800px',
                position: 'relative'
              }}
            >
              {/* SVG Layer: Grid Pattern & Connections */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-auto"
                style={{ overflow: 'visible' }}
              >
                <defs>
                  {/* Subtle Grid dots pattern */}
                  <pattern id="mindmap-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" className="fill-slate-300/60 dark:fill-slate-800" />
                  </pattern>

                  {/* Arrow markers */}
                  <marker
                    id="arrowhead-emerald"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M 0 1 L 6 4 L 0 7 z" className="fill-emerald-600 dark:fill-emerald-500" />
                  </marker>
                  <marker
                    id="arrowhead-cyan"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="4"
                    orient="auto"
                  >
                    <path d="M 0 1 L 6 4 L 0 7 z" className="fill-cyan-600 dark:fill-cyan-400" />
                  </marker>
                </defs>

                {/* Background Grid */}
                <rect id="grid-rect" width="100%" height="100%" fill="url(#mindmap-grid)" />

                {/* Render Edges */}
                {edges.map(edge => {
                  const fromNode = nodes.find(n => n.id === edge.from);
                  const toNode = nodes.find(n => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  // Compute card center coordinates (assuming node width ~220, height ~100)
                  const x1 = fromNode.x + 110;
                  const y1 = fromNode.y + 50;
                  const x2 = toNode.x + 110;
                  const y2 = toNode.y + 50;

                  // Smooth Bezier curve control points
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const cx1 = x1 + dx * 0.4;
                  const cy1 = y1;
                  const cx2 = x1 + dx * 0.6;
                  const cy2 = y2;

                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2;

                  return (
                    <g key={edge.id} className="group cursor-pointer">
                      {/* Thicker hover target */}
                      <path
                        d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="16"
                        onClick={e => handleDeleteEdge(edge.id, e)}
                      />
                      {/* Visible Bezier Line */}
                      <path
                        d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                        fill="none"
                        className="stroke-emerald-600/70 dark:stroke-cyan-500/70 group-hover:stroke-rose-500 transition-colors"
                        strokeWidth="2.5"
                        strokeDasharray="none"
                        markerEnd="url(#arrowhead-emerald)"
                      />

                      {/* Connection Label Pill */}
                      {(edge.labelEn || edge.labelMn) && (
                        <foreignObject
                          x={midX - 70}
                          y={midY - 14}
                          width="140"
                          height="28"
                          className="overflow-visible pointer-events-auto"
                        >
                          <div
                            onClick={e => handleDeleteEdge(edge.id, e)}
                            className="inline-flex items-center justify-center gap-1 w-full px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[10px] font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:border-rose-400 hover:text-rose-600 transition-colors"
                            title={mode === 'mn' ? 'Дарж холбоосыг устгах' : 'Click to delete link'}
                          >
                            <span className="truncate">
                              {mode === 'mn' ? edge.labelMn || edge.labelEn : edge.labelEn}
                            </span>
                            <X className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-rose-500 shrink-0" />
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* HTML Nodes Layer */}
              {nodes.map(node => {
                const isSelected = node.id === activeNodeId;
                const isConnectSource = node.id === connectSourceId;
                const colorConf = COLOR_MAP[node.color] || COLOR_MAP.emerald;

                return (
                  <div
                    key={node.id}
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: '230px'
                    }}
                    className={`absolute rounded-2xl border transition-all cursor-move select-none shadow-sm ${
                      colorConf.bg
                    } ${colorConf.border} ${
                      isSelected
                        ? `ring-3 ${colorConf.ring} shadow-lg z-10 scale-[1.02]`
                        : isConnectSource
                        ? 'ring-4 ring-amber-400 shadow-xl z-20 animate-pulse'
                        : 'hover:shadow-md hover:border-slate-400'
                    }`}
                  >
                    {/* Node Header Pill */}
                    <div className="px-3.5 py-1.5 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] font-mono font-bold">
                      <span className={colorConf.text}>{node.category}</span>
                      <div className="flex items-center gap-1">
                        {/* Quick Connect Icon */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setIsConnectMode(true);
                            setConnectSourceId(node.id);
                            showToast(mode === 'mn' ? 'Холбох зорилтот зангилаагаа дарна уу' : 'Click target node to connect');
                          }}
                          className="p-1 hover:text-amber-500 rounded text-slate-400"
                          title={mode === 'mn' ? 'Энэ зангилаанаас холбоос татах' : 'Link from this node'}
                        >
                          <Link2 className="w-3 h-3" />
                        </button>
                        {/* Quick Edit */}
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingNode(node);
                          }}
                          className="p-1 hover:text-emerald-500 rounded text-slate-400"
                          title={mode === 'mn' ? 'Засах' : 'Edit'}
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        {/* Delete Node */}
                        <button
                          onClick={e => handleDeleteNode(node.id, e)}
                          className="p-1 hover:text-rose-500 rounded text-slate-400"
                          title={mode === 'mn' ? 'Устгах' : 'Delete'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Node Body */}
                    <div className="p-3.5 space-y-1.5">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                        <ChemText>{mode === 'mn' ? node.titleMn : node.titleEn}</ChemText>
                      </div>

                      {/* Formula Badge */}
                      {node.formula && (
                        <div className="inline-block px-2 py-0.5 bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          <ChemText>{node.formula}</ChemText>
                        </div>
                      )}

                      {/* Short Description */}
                      {(node.descriptionMn || node.descriptionEn) && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">
                          <ChemText>{mode === 'mn' ? node.descriptionMn : node.descriptionEn}</ChemText>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Node Inspector Bar / Card */}
          {selectedNode && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>Category: {selectedNode.category}</span>
                    {selectedNode.chapterNumber && <span>· Chapter {selectedNode.chapterNumber}</span>}
                  </div>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ChemText>{mode === 'mn' ? selectedNode.titleMn : selectedNode.titleEn}</ChemText>
                    {selectedNode.formula && (
                      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-slate-700 dark:text-slate-300 font-normal">
                        <ChemText>{selectedNode.formula}</ChemText>
                      </span>
                    )}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingNode(selectedNode)}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{mode === 'mn' ? 'Засах' : 'Edit Node'}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-900"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{mode === 'mn' ? 'Устгах' : 'Delete'}</span>
                  </button>
                </div>
              </div>

              {/* Description & Syllabus details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider font-mono text-[10px]">
                    {mode === 'mn' ? 'Ойлголтын дэлгэрэнгүй тайлбар:' : 'Core Concept Definition:'}
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <ChemText>{mode === 'mn' ? selectedNode.descriptionMn : selectedNode.descriptionEn}</ChemText>
                  </p>
                </div>

                {/* Exam Tip if available */}
                {selectedNodeGlossary?.examTipEn && (
                  <div className="space-y-1">
                    <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono text-[10px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {mode === 'mn' ? 'Кэмбрижийн шалгалтын зөвлөгөө:' : 'Cambridge Exam Tip:'}
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
                      <ChemText>{mode === 'mn' ? selectedNodeGlossary.examTipMn || selectedNodeGlossary.examTipEn : selectedNodeGlossary.examTipEn}</ChemText>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Edit Node */}
      {editingNode && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                <span>{mode === 'mn' ? 'Зангилааг засах' : 'Edit Node'}</span>
              </h3>
              <button onClick={() => setEditingNode(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mode === 'mn' ? 'Гарчиг (Монгол)' : 'Title (Mongolian)'}
                </label>
                <input
                  type="text"
                  value={editingNode.titleMn}
                  onChange={e => setEditingNode({ ...editingNode, titleMn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mode === 'mn' ? 'Гарчиг (Англи)' : 'Title (English)'}
                </label>
                <input
                  type="text"
                  value={editingNode.titleEn}
                  onChange={e => setEditingNode({ ...editingNode, titleEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {mode === 'mn' ? 'Химийн томьёо' : 'Formula / Notation'}
                  </label>
                  <input
                    type="text"
                    value={editingNode.formula || ''}
                    onChange={e => setEditingNode({ ...editingNode, formula: e.target.value })}
                    placeholder="e.g. NH3, CaCO3"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {mode === 'mn' ? 'Өнгөний төрөл' : 'Color Accent'}
                  </label>
                  <select
                    value={editingNode.color}
                    onChange={e => setEditingNode({ ...editingNode, color: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {Object.keys(COLOR_MAP).map(c => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mode === 'mn' ? 'Тайлбар / Тэмдэглэл' : 'Concept Description / Notes'}
                </label>
                <textarea
                  rows={3}
                  value={editingNode.descriptionMn || editingNode.descriptionEn || ''}
                  onChange={e => setEditingNode({ ...editingNode, descriptionMn: e.target.value, descriptionEn: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setEditingNode(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                {mode === 'mn' ? 'Болих' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveNodeEdit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {mode === 'mn' ? 'Хадгалах' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Custom Node */}
      {isAddCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>{mode === 'mn' ? 'Шинэ зангилаа нэмэх' : 'Create Custom Node'}</span>
              </h3>
              <button onClick={() => setIsAddCustomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mode === 'mn' ? 'Нэр томьёо (Монгол)' : 'Title (Mongolian)'} *
                </label>
                <input
                  type="text"
                  placeholder="Жишээ нь: Ионы холбоо"
                  value={newCustomTitleMn}
                  onChange={e => setNewCustomTitleMn(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mode === 'mn' ? 'Нэр томьёо (Англи)' : 'Title (English)'} *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ionic Bonding"
                  value={newCustomTitle}
                  onChange={e => setNewCustomTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {mode === 'mn' ? 'Химийн томьёо (Заавал биш)' : 'Formula / Notation (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NaCl, Mr=58.5"
                    value={newCustomFormula}
                    onChange={e => setNewCustomFormula(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {mode === 'mn' ? 'Өнгөний төрөл' : 'Color Theme'}
                  </label>
                  <select
                    value={newCustomColor}
                    onChange={e => setNewCustomColor(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  >
                    {Object.keys(COLOR_MAP).map(c => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {mode === 'mn' ? 'Тайлбар / Гол санаа' : 'Description / Concept explanation'}
                </label>
                <textarea
                  rows={2}
                  placeholder={mode === 'mn' ? 'Энэ ойлголтын талаарх товч тайлбар...' : 'Brief summary of this concept...'}
                  value={newCustomDesc}
                  onChange={e => setNewCustomDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setIsAddCustomModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                {mode === 'mn' ? 'Болих' : 'Cancel'}
              </button>
              <button
                disabled={!newCustomTitle.trim() && !newCustomTitleMn.trim()}
                onClick={handleCreateCustomNode}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {mode === 'mn' ? 'Үүсгэх' : 'Create Node'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Pending Edge Relation Picker */}
      {pendingEdgeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-500" />
                <span>{mode === 'mn' ? 'Холбоосын төрөл сонгох' : 'Select Link Label'}</span>
              </h3>
              <button onClick={() => setPendingEdgeModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-600 dark:text-slate-400 block">
                {mode === 'mn' ? 'Түгээмэл холбоосын харьцаа:' : 'Common Chemistry Relationships:'}
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {COMMON_RELATIONS.map(rel => (
                  <button
                    key={rel.labelEn}
                    onClick={() => setEdgeLabelText(rel.labelEn)}
                    className={`p-2 text-left rounded-xl border text-xs transition-colors flex items-center justify-between ${
                      edgeLabelText === rel.labelEn
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 font-bold text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{mode === 'mn' ? rel.labelMn : rel.labelEn}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({rel.labelEn})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPendingEdgeModal(null)}
                className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                {mode === 'mn' ? 'Болих' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmAddEdge}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                {mode === 'mn' ? 'Холбох' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
