/**
 * Blackboard State Manager Hook
 * Manages all elements, animations, and state for the blackboard canvas
 */

import { useState, useCallback, useRef, useMemo, MutableRefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  BlackboardElement,
  BlackboardState,
  BlackboardCommand,
  CommandResult,
  PointerState,
  Animation,
  Highlight,
  TextElement,
  LatexElement,
  ShapeElement,
  GraphElement,
  ArrowElement,
  LineElement,
  DiagramElement,
  CurveElement,
  SectionElement,
  FreehandElement,
  TableElement,
  BulletListElement,
  ComparisonElement,
  NumberLineElement,
  TimelineElement,
  AnnotationElement,
  SvgRawElement,
  PunnettSquareElement,
  ImageElement,
  BoardPosition,
  TextSize,
  AnimationConfig,
} from '../types/blackboard';

// Default state values
const DEFAULT_POINTER: PointerState = {
  visible: false,
  position: { x: 50, y: 50 },
  style: 'chalk',
  color: '#152647',
  size: 10,
};

const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  duration: 500,
  easing: 'easeOut',
  delay: 0,
};

// Text size mappings (in pixels, will be scaled)
const TEXT_SIZE_MAP: Record<TextSize, number> = {
  small: 14,
  medium: 20,
  large: 28,
  heading: 36,
  title: 48,
};

// ============================================================
// FRONTEND LAYOUT ENGINE
// ============================================================

const LAYOUT_START_Y = 5;  // Starting Y position (percentage)
const LAYOUT_GAP = 4;      // Gap between elements (percentage)

// Generous height estimates for initial placement (percentage of board)
// These are intentionally generous — better to have extra space than overlap.
// After rendering, actual measurements correct the tracker for subsequent elements.
const HEIGHT_ESTIMATES: Record<string, number> = {
  text_small: 5,
  text_medium: 8,
  text_large: 10,
  text_heading: 12,
  text_title: 14,
  latex: 10,
  diagram: 30,
  graph: 35,
  curve: 35,
  shape: 15,
  section: 30,
  table: 25,
  bullet_list: 20,
  comparison: 25,
  number_line: 12,
  timeline: 14,
  derivation_step: 8,
  svg_raw: 30,
  punnett_square: 35,
  image: 45,
};

function getEstimatedHeight(elementType: string, subType?: string): number {
  const key = subType ? `${elementType}_${subType}` : elementType;
  return HEIGHT_ESTIMATES[key] || 10;
}

// ============================================================
// NAMED BOARD REGIONS (the model addresses these via `place=...`)
// ============================================================

interface BoardRegion {
  /** Default left edge as % of board width. */
  x: number;
  /** Default content width as % of board width. */
  width: number;
  /** When defined, fixes y to a specific row (header / footer). When
   *  omitted, the auto-y cursor still advances normally. */
  y?: number;
}

/**
 * Six teaching regions, modelled on how a teacher actually uses the
 * board. The model picks one via `place="..."`; the frontend resolves
 * to numeric coordinates here so layout decisions stay in the UI layer.
 */
const BOARD_REGIONS: Record<string, BoardRegion> = {
  // Title/heading text uses dominant-baseline="hanging" in ChalkText, so
  // y refers to the glyph TOP. y=5 (≈45px at 900px height) puts the
  // glyph top below the 12px wooden frame and the chalk filter's
  // -20% (~14px) extension, giving ~19px visible clearance.
  header:  { x: 10, y: 5,  width: 80 }, // titles, topic banners
  main:    { x: 10,        width: 80 }, // default body text
  left:    { x: 4,         width: 44 }, // left column (e.g. given/find)
  right:   { x: 52,        width: 44 }, // right column (e.g. solution)
  margin:  { x: 80,        width: 18 }, // narrow side notes
  footer:  { x: 10, y: 88, width: 80 }, // takeaways, summary
};

function resolvePlacement(place: unknown): BoardRegion | null {
  if (typeof place !== 'string') return null;
  const region = BOARD_REGIONS[place.trim().toLowerCase()];
  return region ?? null;
}

/**
 * Apply region defaults onto a params object IN PLACE. Called once at
 * the top of executeCommand before the per-command switch runs, so
 * every draw_X case sees pre-filled x/width/y when the model used
 * `place=...`. Explicit x/y/width from the model always win.
 */
function applyPlacement(p: any): void {
  if (!p || !p.place) return;
  const region = resolvePlacement(p.place);
  if (!region) return;
  if (p.x === undefined || p.x === null) p.x = region.x;
  if (p.width === undefined || p.width === null) p.width = region.width;
  if (region.y !== undefined && (p.y === undefined || p.y === null)) {
    p.y = region.y;
  }
}

interface LayoutTracker {
  currentY: number;
  // Maps element ID -> { y, estimatedHeight } for measurement correction
  elementRecords: Map<string, { y: number; estimatedHeight: number }>;
}

export interface UseBlackboardStateReturn {
  // State
  elements: Map<string, BlackboardElement>;
  pointer: PointerState;
  highlights: Highlight[];
  animationQueue: Animation[];
  isAnimating: boolean;

  // Element operations
  addElement: (element: Omit<BlackboardElement, 'id' | 'createdAt'>) => string;
  updateElement: (id: string, updates: Partial<BlackboardElement>) => void;
  removeElement: (id: string) => void;
  getElement: (id: string) => BlackboardElement | undefined;
  getElementByLabel: (label: string) => BlackboardElement | undefined;
  clearAll: () => void;
  clearArea: (x: number, y: number, width: number, height: number) => string[];

  // Specialized element creation
  drawText: (params: {
    text: string;
    x: number;
    y: number;
    size?: TextSize;
    color?: string;
    animate?: boolean;
  }) => string;

  drawLatex: (params: {
    latex: string;
    x: number;
    y: number;
    color?: string;
    boxed?: boolean;
    label?: string;
  }) => string;

  drawShape: (params: {
    shapeType: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    color?: string;
    fill?: string;
    label?: string;
  }) => string;

  drawArrow: (params: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color?: string;
    label?: string;
    curved?: boolean;
  }) => string;

  drawLine: (params: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color?: string;
    dashed?: boolean;
  }) => string;

  drawGraph: (params: {
    graphType: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    expression?: string;
    xRange?: [number, number];
    yRange?: [number, number];
    title?: string;
    color?: string;
  }) => string;

  drawCurve: (params: {
    expression: string;
    xRange: [number, number];
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
  }) => string;

  createSection: (params: {
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => string;

  // Pointer operations
  setPointerPosition: (x: number, y: number) => void;
  setPointerVisible: (visible: boolean) => void;
  setPointerStyle: (style: PointerState['style']) => void;
  pointAt: (x: number, y: number, duration?: number) => Promise<void>;

  // Highlight operations
  addHighlight: (elementId: string, style?: Highlight['style'], color?: string) => void;
  removeHighlight: (elementId: string) => void;
  clearHighlights: () => void;

  // Animation operations
  queueAnimation: (animation: Omit<Animation, 'id'>) => string;
  playNextAnimation: () => void;
  clearAnimationQueue: () => void;

  // Command execution (for WebSocket messages)
  executeCommand: (command: BlackboardCommand) => CommandResult;

  // Layout measurement feedback
  reportElementMeasured: (id: string, measuredHeightPercent: number) => void;
  layoutRef: MutableRefObject<LayoutTracker>;

  // Utility
  exportState: () => BlackboardState;
  importState: (state: BlackboardState) => void;
}

export function useBlackboardState(): UseBlackboardStateReturn {
  // Core state
  const [elements, setElements] = useState<Map<string, BlackboardElement>>(new Map());
  const [pointer, setPointer] = useState<PointerState>(DEFAULT_POINTER);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [animationQueue, setAnimationQueue] = useState<Animation[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // Refs for animation handling
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Layout tracking — frontend owns element positioning
  const layoutRef = useRef<LayoutTracker>({
    currentY: LAYOUT_START_Y,
    elementRecords: new Map(),
  });

  /** Get the next Y position for an auto-positioned element */
  const getAutoY = useCallback((elementType: string, subType?: string): number => {
    const y = layoutRef.current.currentY;
    const estimatedHeight = getEstimatedHeight(elementType, subType);
    layoutRef.current.currentY = y + estimatedHeight + LAYOUT_GAP;
    return y;
  }, []);

  /** Called by BlackboardCanvas after measuring a rendered element's actual height.
   *  Corrects the layout tracker so subsequent elements are positioned correctly. */
  const reportElementMeasured = useCallback((id: string, measuredHeightPercent: number) => {
    const record = layoutRef.current.elementRecords.get(id);
    if (!record) return;

    const correction = measuredHeightPercent - record.estimatedHeight;
    if (Math.abs(correction) > 1) {
      // Element was taller/shorter than estimated — adjust tracker
      layoutRef.current.currentY += correction;
    }
    // Remove the record once measured
    layoutRef.current.elementRecords.delete(id);
  }, []);

  // ============================================================
  // ELEMENT OPERATIONS
  // ============================================================

  const addElement = useCallback((element: Omit<BlackboardElement, 'id' | 'createdAt'>): string => {
    const id = uuidv4();
    const newElement: BlackboardElement = {
      ...element,
      id,
      createdAt: Date.now(),
    };

    setElements(prev => {
      const updated = new Map(prev);
      updated.set(id, newElement);
      return updated;
    });

    return id;
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<BlackboardElement>) => {
    setElements(prev => {
      const updated = new Map(prev);
      const existing = updated.get(id);
      if (existing) {
        updated.set(id, { ...existing, ...updates });
      }
      return updated;
    });
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements(prev => {
      const updated = new Map(prev);
      updated.delete(id);
      return updated;
    });
    // Also remove any highlights for this element
    setHighlights(prev => prev.filter(h => h.elementId !== id));
  }, []);

  const getElement = useCallback((id: string): BlackboardElement | undefined => {
    return elements.get(id);
  }, [elements]);

  const getElementByLabel = useCallback((label: string): BlackboardElement | undefined => {
    const elementArray = Array.from(elements.values());
    for (const element of elementArray) {
      if (element.label === label) {
        return element;
      }
    }
    return undefined;
  }, [elements]);

  const clearAll = useCallback(() => {
    setElements(new Map());
    setHighlights([]);
    setAnimationQueue([]);
    setIsAnimating(false);
    // Reset layout tracker
    layoutRef.current = { currentY: LAYOUT_START_Y, elementRecords: new Map() };
  }, []);

  const clearArea = useCallback((x: number, y: number, width: number, height: number): string[] => {
    const removedIds: string[] = [];

    setElements(prev => {
      const updated = new Map(prev);
      const entries = Array.from(updated.entries());

      for (const [id, element] of entries) {
        const pos = element.position;
        if (
          pos.x >= x &&
          pos.x <= x + width &&
          pos.y >= y &&
          pos.y <= y + height
        ) {
          updated.delete(id);
          removedIds.push(id);
        }
      }

      return updated;
    });

    return removedIds;
  }, []);

  // ============================================================
  // SPECIALIZED ELEMENT CREATION
  // ============================================================

  const drawText = useCallback((params: {
    text: string;
    x: number;
    y: number;
    size?: TextSize;
    color?: string;
    animate?: boolean;
  }): string => {
    const textElement: Omit<TextElement, 'id' | 'createdAt'> = {
      type: 'text',
      position: { x: params.x, y: params.y },
      content: params.text,
      size: params.size || 'medium',
      color: params.color || '#152647',
      visible: true,
      opacity: 1,
      zIndex: Date.now(),
    };

    return addElement(textElement);
  }, [addElement]);

  const drawLatex = useCallback((params: {
    latex: string;
    x: number;
    y: number;
    color?: string;
    boxed?: boolean;
    label?: string;
  }): string => {
    const latexElement: Omit<LatexElement, 'id' | 'createdAt'> = {
      type: 'latex',
      position: { x: params.x, y: params.y },
      latex: params.latex,
      color: params.color || '#152647',
      displayMode: true,
      boxed: params.boxed,
      visible: true,
      opacity: 1,
      zIndex: Date.now(),
      label: params.label,
    };

    return addElement(latexElement);
  }, [addElement]);

  const drawShape = useCallback((params: {
    shapeType: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    color?: string;
    fill?: string;
    label?: string;
  }): string => {
    const radiusValue = params.radius ?? 10;
    const shapeElement: Omit<ShapeElement, 'id' | 'createdAt'> = {
      type: 'shape',
      shapeType: params.shapeType as any,
      position: { x: params.x, y: params.y },
      dimensions: {
        width: params.width || radiusValue,
        height: params.height || radiusValue,
      },
      color: params.color || '#152647',
      fill: params.fill,
      strokeWidth: 2,
      params: { radius: radiusValue },
      visible: true,
      opacity: 1,
      zIndex: Date.now(),
      label: params.label,
    };

    return addElement(shapeElement);
  }, [addElement]);

  const drawArrow = useCallback((params: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color?: string;
    label?: string;
    curved?: boolean;
  }): string => {
    const arrowElement: Omit<ArrowElement, 'id' | 'createdAt'> = {
      type: 'arrow',
      position: { x: params.startX, y: params.startY },
      endPosition: { x: params.endX, y: params.endY },
      color: params.color || '#152647',
      strokeWidth: 2,
      headStyle: 'triangle',
      headSize: 10,
      curved: params.curved,
      visible: true,
      opacity: 1,
      zIndex: Date.now(),
      label: params.label,
    };

    return addElement(arrowElement);
  }, [addElement]);

  const drawLine = useCallback((params: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color?: string;
    dashed?: boolean;
  }): string => {
    const lineElement: Omit<LineElement, 'id' | 'createdAt'> = {
      type: 'line',
      position: { x: params.startX, y: params.startY },
      endPosition: { x: params.endX, y: params.endY },
      color: params.color || '#152647',
      strokeWidth: 2,
      dashed: params.dashed,
      visible: true,
      opacity: 1,
      zIndex: Date.now(),
    };

    return addElement(lineElement);
  }, [addElement]);

  const drawGraph = useCallback((params: {
    graphType: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    expression?: string;
    xRange?: [number, number];
    yRange?: [number, number];
    title?: string;
    color?: string;
  }): string => {
    const graphElement: Omit<GraphElement, 'id' | 'createdAt'> & { expression?: string; color?: string } = {
      type: 'graph',
      graphType: params.graphType as any,
      position: { x: params.x, y: params.y },
      dimensions: {
        width: params.width || 30,
        height: params.height || 30,
      },
      xAxis: {
        min: params.xRange?.[0] || -10,
        max: params.xRange?.[1] || 10,
        label: 'x',
        showGrid: true,
      },
      yAxis: {
        min: params.yRange?.[0] || -10,
        max: params.yRange?.[1] || 10,
        label: 'y',
        showGrid: true,
      },
      title: params.title,
      showAxes: true,
      showGrid: true,
      expression: params.expression,
      color: params.color || '#F59E0B',
      visible: true,
      opacity: 1,
      zIndex: Date.now(),
    };

    return addElement(graphElement as any);
  }, [addElement]);

  const drawCurve = useCallback((params: {
    expression: string;
    xRange: [number, number];
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
  }): string => {
    const curveElement: Omit<CurveElement, 'id' | 'createdAt'> = {
      type: 'curve',
      position: { x: params.x, y: params.y },
      expression: params.expression,
      xRange: params.xRange,
      color: params.color || '#F59E0B',
      strokeWidth: 2,
      samples: 100,
      visible: true,
      opacity: 1,
      zIndex: Date.now(),
    };

    return addElement(curveElement);
  }, [addElement]);

  const createSection = useCallback((params: {
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }): string => {
    const sectionElement: Omit<SectionElement, 'id' | 'createdAt'> = {
      type: 'section',
      position: { x: params.x, y: params.y },
      title: params.title,
      dimensions: { width: params.width, height: params.height },
      titlePosition: 'top',
      borderColor: '#15264744',
      visible: true,
      opacity: 1,
      zIndex: 0,
    };

    return addElement(sectionElement);
  }, [addElement]);

  // ============================================================
  // POINTER OPERATIONS
  // ============================================================

  const setPointerPosition = useCallback((x: number, y: number) => {
    setPointer(prev => ({
      ...prev,
      position: { x, y },
    }));
  }, []);

  const setPointerVisible = useCallback((visible: boolean) => {
    setPointer(prev => ({ ...prev, visible }));
  }, []);

  const setPointerStyle = useCallback((style: PointerState['style']) => {
    setPointer(prev => ({ ...prev, style }));
  }, []);

  const pointAt = useCallback(async (x: number, y: number, duration: number = 2000): Promise<void> => {
    setPointer(prev => ({
      ...prev,
      visible: true,
      position: { x, y },
    }));

    return new Promise(resolve => {
      setTimeout(() => {
        setPointer(prev => ({ ...prev, visible: false }));
        resolve();
      }, duration);
    });
  }, []);

  // ============================================================
  // HIGHLIGHT OPERATIONS
  // ============================================================

  const addHighlight = useCallback((
    elementId: string,
    style: Highlight['style'] = 'glow',
    color: string = '#F59E0B'
  ) => {
    setHighlights(prev => {
      // Remove existing highlight for this element
      const filtered = prev.filter(h => h.elementId !== elementId);
      return [...filtered, { elementId, style, color }];
    });
  }, []);

  const removeHighlight = useCallback((elementId: string) => {
    setHighlights(prev => prev.filter(h => h.elementId !== elementId));
  }, []);

  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  // ============================================================
  // ANIMATION OPERATIONS
  // ============================================================

  const queueAnimation = useCallback((animation: Omit<Animation, 'id'>): string => {
    const id = uuidv4();
    const fullAnimation: Animation = { ...animation, id };

    setAnimationQueue(prev => [...prev, fullAnimation]);

    return id;
  }, []);

  const playNextAnimation = useCallback(() => {
    setAnimationQueue(prev => {
      if (prev.length === 0) {
        setIsAnimating(false);
        return prev;
      }

      const [current, ...rest] = prev;
      setIsAnimating(true);

      // Execute animation
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      animationTimeoutRef.current = setTimeout(() => {
        current.onComplete?.();
        playNextAnimation();
      }, current.config.duration + (current.config.delay || 0));

      return rest;
    });
  }, []);

  const clearAnimationQueue = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setAnimationQueue([]);
    setIsAnimating(false);
  }, []);

  // ============================================================
  // COMMAND EXECUTION
  // ============================================================

  const executeCommand = useCallback((command: BlackboardCommand): CommandResult => {
    try {
      let elementId: string | undefined;
      const params = command.params as any;

      // Resolve `place="region"` onto x / width / y BEFORE the per-command
      // switch runs. Explicit x/y/width from the model still take precedence.
      applyPlacement(params);

      // When a header element is placed via place="header", advance the
      // auto-y cursor past its bottom so the next auto-positioned element
      // doesn't collide with it. Without this, the cursor stays at
      // LAYOUT_START_Y=5 and equations/text drawn after a title land
      // directly on top of the title.
      if (params.place === 'header' && typeof params.y === 'number') {
        // Best-effort estimate: header-placed elements are usually titles
        // (size='title'). Use the title estimate so the auto-y cursor
        // clears the title cleanly even when params.size is missing.
        const headerSubType =
          (command.type === 'draw_text' && (params as any).size) || 'title';
        const estHeader = getEstimatedHeight('text', headerSubType);
        const headerBottom = params.y + estHeader + LAYOUT_GAP;
        if (layoutRef.current.currentY < headerBottom) {
          layoutRef.current.currentY = headerBottom;
        }
      }

      // Auto-position helper: assigns Y from layout tracker when y is null/undefined
      const autoPosition = (p: any, type: string, subType?: string) => {
        if (p.y == null) {
          const estHeight = getEstimatedHeight(type, subType);
          p.y = getAutoY(type, subType);
          // Record for measurement correction
          return { y: p.y, estimatedHeight: estHeight };
        }
        return null;
      };

      switch (command.type) {
        case 'draw_text': {
          const record = autoPosition(params, 'text', params.size || 'medium');
          elementId = drawText(params);
          if (record && elementId) layoutRef.current.elementRecords.set(elementId, record);
          break;
        }

        case 'draw_latex':
        case 'draw_equation': {
          const record = autoPosition(params, 'latex');
          elementId = drawLatex(params);
          if (record && elementId) layoutRef.current.elementRecords.set(elementId, record);
          break;
        }

        case 'draw_shape': {
          const record = autoPosition(params, 'shape');
          elementId = drawShape(params);
          if (record && elementId) layoutRef.current.elementRecords.set(elementId, record);
          break;
        }

        case 'draw_arrow':
          elementId = drawArrow(params);
          break;

        case 'draw_line':
          elementId = drawLine(params);
          break;

        case 'draw_graph': {
          const record = autoPosition(params, 'graph');
          elementId = drawGraph(params);
          if (record && elementId) layoutRef.current.elementRecords.set(elementId, record);
          break;
        }

        case 'draw_curve': {
          const record = autoPosition(params, 'curve');
          elementId = drawCurve(params);
          if (record && elementId) layoutRef.current.elementRecords.set(elementId, record);
          break;
        }

        case 'create_section': {
          const record = autoPosition(params, 'section');
          elementId = createSection(params);
          if (record && elementId) layoutRef.current.elementRecords.set(elementId, record);
          break;
        }

        case 'draw_diagram': {
          const diagramParams = params;
          autoPosition(diagramParams, 'diagram');
          const diagramElement: Omit<DiagramElement, 'id' | 'createdAt'> = {
            type: 'diagram',
            diagramType: diagramParams.diagramType || 'free_body',
            position: { x: diagramParams.x || 5, y: diagramParams.y || 30 },
            components: diagramParams.components || [],
            dimensions: {
              width: diagramParams.width || 25,
              height: diagramParams.height || 25,
            },
            showLabels: diagramParams.showLabels !== false,
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(diagramElement);
          break;
        }

        case 'animate_derivation': {
          const derivParams = params;
          // Auto-position the first step; subsequent steps stack below
          if (derivParams.y == null) {
            const steps = derivParams.steps || [];
            const totalHeight = steps.length * getEstimatedHeight('derivation_step') + LAYOUT_GAP;
            derivParams.y = layoutRef.current.currentY;
            layoutRef.current.currentY += totalHeight;
          }
          const steps = derivParams.steps || [];
          const stepDelay = derivParams.step_delay || derivParams.stepDelay || 400;
          let yPos = derivParams.y;
          const stepIds: string[] = [];

          for (let i = 0; i < steps.length; i++) {
            const stepId = drawLatex({
              latex: steps[i],
              x: derivParams.x || 5,
              y: yPos,
              color: '#152647',
            });

            if (i > 0) {
              updateElement(stepId, { visible: false, opacity: 0 });
            }

            stepIds.push(stepId);
            yPos += getEstimatedHeight('derivation_step');
          }

          for (let i = 1; i < stepIds.length; i++) {
            const stepId = stepIds[i];
            setTimeout(() => {
              updateElement(stepId, { visible: true, opacity: 1 });
            }, i * stepDelay);
          }

          elementId = stepIds[0];
          break;
        }

        case 'point_at':
          pointAt(command.params.x, command.params.y, command.params.duration);
          break;

        case 'highlight':
          addHighlight(
            command.params.elementId,
            command.params.style,
            command.params.color
          );
          break;

        case 'clear_area':
          clearArea(
            command.params.x,
            command.params.y,
            command.params.width,
            command.params.height
          );
          break;

        case 'clear_board':
          clearAll();
          break;

        case 'remove_element':
          removeElement(command.params.elementId);
          break;

        case 'update_element':
          updateElement(command.params.elementId, command.params.updates);
          break;

        case 'correct': {
          const correctUpdates: Partial<BlackboardElement> = { struck: true };
          if (typeof command.params.replacement === 'string' && command.params.replacement.length > 0) {
            correctUpdates.replacement = command.params.replacement;
          }
          if (typeof command.params.note === 'string' && command.params.note.length > 0) {
            correctUpdates.correctionNote = command.params.note;
          }
          updateElement(command.params.elementId, correctUpdates);
          break;
        }

        case 'move_element':
          updateElement(command.params.elementId, {
            position: { x: command.params.x, y: command.params.y },
          });
          break;

        case 'draw_table': {
          const tableParams = params;
          autoPosition(tableParams, 'table');
          const tableElement: Omit<TableElement, 'id' | 'createdAt'> = {
            type: 'table',
            position: { x: tableParams.x || 5, y: tableParams.y || 30 },
            headers: tableParams.headers || [],
            rows: tableParams.rows || [],
            dimensions: {
              width: tableParams.width || 60,
              height: (tableParams.rows?.length || 0) * 5 + 8,
            },
            color: tableParams.color || '#152647',
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(tableElement);
          break;
        }

        case 'draw_bullet_list': {
          const listParams = params;
          autoPosition(listParams, 'bullet_list');
          const listElement: Omit<BulletListElement, 'id' | 'createdAt'> = {
            type: 'bullet_list',
            position: { x: listParams.x || 5, y: listParams.y || 20 },
            title: listParams.title || '',
            items: listParams.items || [],
            numbered: listParams.numbered || false,
            color: listParams.color || '#152647',
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(listElement);
          break;
        }

        case 'draw_comparison': {
          const compParams = params;
          autoPosition(compParams, 'comparison');
          const compElement: Omit<ComparisonElement, 'id' | 'createdAt'> = {
            type: 'comparison',
            position: { x: compParams.x || 5, y: compParams.y || 20 },
            leftTitle: compParams.leftTitle || '',
            leftItems: compParams.leftItems || [],
            rightTitle: compParams.rightTitle || '',
            rightItems: compParams.rightItems || [],
            dimensions: {
              width: compParams.width || 70,
              height: Math.max(compParams.leftItems?.length || 0, compParams.rightItems?.length || 0) * 4 + 8,
            },
            color: compParams.color || '#152647',
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(compElement);
          break;
        }

        case 'draw_number_line': {
          const nlParams = params;
          autoPosition(nlParams, 'number_line');
          const nlElement: Omit<NumberLineElement, 'id' | 'createdAt'> = {
            type: 'number_line',
            position: { x: nlParams.x || 5, y: nlParams.y || 50 },
            min: nlParams.min || 0,
            max: nlParams.max || 10,
            marks: nlParams.marks || [],
            dimensions: {
              width: nlParams.width || 70,
              height: 10,
            },
            color: nlParams.color || '#152647',
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(nlElement);
          break;
        }

        case 'draw_timeline': {
          const tlParams = params;
          autoPosition(tlParams, 'timeline');
          const tlElement: Omit<TimelineElement, 'id' | 'createdAt'> = {
            type: 'timeline',
            position: { x: tlParams.x || 5, y: tlParams.y || 50 },
            events: tlParams.events || [],
            dimensions: {
              width: tlParams.width || 80,
              height: 12,
            },
            color: tlParams.color || '#152647',
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(tlElement);
          break;
        }

        case 'draw_sketch': {
          const sketchParams = params;
          autoPosition(sketchParams, 'svg_raw');
          const sketchElement: Omit<SvgRawElement, 'id' | 'createdAt'> = {
            type: 'svg_raw',
            position: { x: sketchParams.x ?? 5, y: sketchParams.y ?? 25 },
            svg: typeof sketchParams.svg === 'string' ? sketchParams.svg : '',
            dimensions: {
              width: sketchParams.width ?? 40,
              height: sketchParams.height ?? 30,
            },
            label: sketchParams.label,
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(sketchElement);
          break;
        }

        case 'draw_punnett_square': {
          const punParams = params;
          autoPosition(punParams, 'punnett_square');
          const topGametes: string[] = Array.isArray(punParams.topGametes)
            ? punParams.topGametes
            : [];
          const leftGametes: string[] = Array.isArray(punParams.leftGametes)
            ? punParams.leftGametes
            : [];
          const punElement: Omit<PunnettSquareElement, 'id' | 'createdAt'> = {
            type: 'punnett_square',
            position: { x: punParams.x ?? 30, y: punParams.y ?? 25 },
            parent1: String(punParams.parent1 ?? ''),
            parent2: String(punParams.parent2 ?? ''),
            topGametes,
            leftGametes,
            title: punParams.title,
            dimensions: {
              width: punParams.width ?? 35,
              height: punParams.width ?? 35,
            },
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(punElement);
          break;
        }

        case 'annotate': {
          const annParams = params;
          const annElement: Omit<AnnotationElement, 'id' | 'createdAt'> = {
            type: 'annotation',
            position: { x: 0, y: 0 }, // Will be positioned relative to target
            targetElementId: annParams.elementId || '',
            text: annParams.text || '',
            annotationPosition: annParams.position || 'right',
            color: annParams.color || '#F59E0B',
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(annElement);
          break;
        }

        case 'display_pdf_page': {
          const imgParams = params;
          autoPosition(imgParams, 'image');
          const w = typeof imgParams.width === 'number' ? imgParams.width : 70;
          const imgElement: Omit<ImageElement, 'id' | 'createdAt'> = {
            type: 'image',
            position: { x: imgParams.x ?? 15, y: imgParams.y ?? 25 },
            src: String(imgParams.src || ''),
            dimensions: { width: w, height: w * 1.3 },
            caption: imgParams.caption,
            contentId: imgParams.content_id,
            page: imgParams.page,
            visible: true,
            opacity: 1,
            zIndex: Date.now(),
          };
          elementId = addElement(imgElement);
          break;
        }

        default:
          return {
            commandId: command.id,
            success: false,
            error: `Unknown command type: ${command.type}`,
          };
      }

      return {
        commandId: command.id,
        success: true,
        elementId,
      };
    } catch (error) {
      return {
        commandId: command.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [
    drawText, drawLatex, drawShape, drawArrow, drawLine,
    drawGraph, drawCurve, createSection, pointAt, addHighlight,
    clearArea, clearAll, removeElement, updateElement, addElement,
    getElement, getElementByLabel, getAutoY
  ]);

  // ============================================================
  // STATE EXPORT/IMPORT
  // ============================================================

  const exportState = useCallback((): BlackboardState => {
    return {
      elements,
      pointer,
      highlights,
      animationQueue,
      currentAnimation: null,
      boardColor: '#FAFAF7',  // Blackboard green
      chalkColor: '#152647',
      gridVisible: false,
      gridSpacing: 5,
    };
  }, [elements, pointer, highlights, animationQueue]);

  const importState = useCallback((state: BlackboardState) => {
    setElements(state.elements);
    setPointer(state.pointer);
    setHighlights(state.highlights);
    setAnimationQueue(state.animationQueue);
  }, []);

  return {
    // State
    elements,
    pointer,
    highlights,
    animationQueue,
    isAnimating,

    // Element operations
    addElement,
    updateElement,
    removeElement,
    getElement,
    getElementByLabel,
    clearAll,
    clearArea,

    // Specialized element creation
    drawText,
    drawLatex,
    drawShape,
    drawArrow,
    drawLine,
    drawGraph,
    drawCurve,
    createSection,

    // Pointer operations
    setPointerPosition,
    setPointerVisible,
    setPointerStyle,
    pointAt,

    // Highlight operations
    addHighlight,
    removeHighlight,
    clearHighlights,

    // Animation operations
    queueAnimation,
    playNextAnimation,
    clearAnimationQueue,

    // Command execution
    executeCommand,

    // Layout measurement feedback
    reportElementMeasured,
    layoutRef,

    // Utility
    exportState,
    importState,
  };
}
