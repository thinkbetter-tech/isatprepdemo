/**
 * Blackboard Types - Visual Teaching Canvas System
 * Defines all types for the classroom blackboard experience
 */

// ============================================================
// POSITION AND DIMENSION TYPES
// ============================================================

/** Position on blackboard (0-100 percentage based) */
export interface BoardPosition {
  x: number;  // 0-100% of board width
  y: number;  // 0-100% of board height
}

/** Dimensions in percentage */
export interface BoardDimensions {
  width: number;   // 0-100%
  height: number;  // 0-100%
}

/** Bounding box */
export interface BoundingBox extends BoardPosition, BoardDimensions {}

// ============================================================
// ELEMENT TYPES
// ============================================================

/** Base element that all blackboard elements extend */
export interface BlackboardElement {
  id: string;
  type: ElementType;
  position: BoardPosition;
  createdAt: number;
  visible: boolean;
  opacity: number;
  zIndex: number;
  label?: string;  // Optional label for referencing
  /** When true the element is rendered with a strike-through overlay
   *  (set by the `correct` command). The element stays on the board so
   *  the student can see the wrong version next to the right one. */
  struck?: boolean;
  /** Optional teacher's red-pen note rendered next to a struck element. */
  correctionNote?: string;
  /** Optional corrected text/latex drawn next to a struck element. */
  replacement?: string;
}

/** All possible element types */
export type ElementType =
  | 'text'
  | 'latex'
  | 'shape'
  | 'graph'
  | 'curve'
  | 'diagram'
  | 'arrow'
  | 'line'
  | 'freehand'
  | 'image'
  | 'section'
  | 'table'
  | 'bullet_list'
  | 'comparison'
  | 'number_line'
  | 'timeline'
  | 'annotation'
  | 'svg_raw'
  | 'punnett_square';

// ============================================================
// TEXT ELEMENTS
// ============================================================

export type TextSize = 'small' | 'medium' | 'large' | 'heading' | 'title';

export interface TextElement extends BlackboardElement {
  type: 'text';
  content: string;
  size: TextSize;
  color: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

// ============================================================
// LATEX/MATH ELEMENTS
// ============================================================

export interface LatexElement extends BlackboardElement {
  type: 'latex';
  latex: string;
  color: string;
  displayMode: boolean;  // Block vs inline
  boxed?: boolean;       // Draw box around equation
  numbered?: boolean;    // Show equation number
}

/** Step-by-step derivation */
export interface DerivationStep {
  latex: string;
  annotation?: string;  // Optional side note
  highlight?: boolean;
}

export interface DerivationElement extends BlackboardElement {
  type: 'latex';
  steps: DerivationStep[];
  currentStep: number;
  showArrows: boolean;
  stepSpacing: number;
}

// ============================================================
// SHAPE ELEMENTS
// ============================================================

export type ShapeType =
  | 'circle'
  | 'rectangle'
  | 'triangle'
  | 'ellipse'
  | 'polygon'
  | 'arc';

export interface ShapeElement extends BlackboardElement {
  type: 'shape';
  shapeType: ShapeType;
  dimensions: BoardDimensions;
  color: string;
  fill?: string;
  strokeWidth: number;
  rotation?: number;
  // Shape-specific params
  params: Record<string, number | string>;
}

// ============================================================
// LINE AND ARROW ELEMENTS
// ============================================================

export interface LineElement extends BlackboardElement {
  type: 'line';
  endPosition: BoardPosition;
  color: string;
  strokeWidth: number;
  dashed?: boolean;
  dashPattern?: number[];
}

export type ArrowHeadStyle = 'triangle' | 'stealth' | 'circle' | 'diamond';

export interface ArrowElement extends BlackboardElement {
  type: 'arrow';
  endPosition: BoardPosition;
  color: string;
  strokeWidth: number;
  headStyle: ArrowHeadStyle;
  headSize: number;
  doubleHeaded?: boolean;
  curved?: boolean;
  curvature?: number;
}

// ============================================================
// GRAPH AND PLOT ELEMENTS
// ============================================================

export type GraphType =
  | 'function'      // y = f(x)
  | 'parametric'    // x(t), y(t)
  | 'polar'         // r = f(theta)
  | 'scatter'       // Data points
  | 'bar'           // Bar chart
  | 'vector_field'  // Vector field
  | 'phase_space';  // Phase diagrams

export interface AxisConfig {
  min: number;
  max: number;
  label: string;
  tickCount?: number;
  showGrid?: boolean;
}

export interface GraphElement extends BlackboardElement {
  type: 'graph';
  graphType: GraphType;
  dimensions: BoardDimensions;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  title?: string;
  showAxes: boolean;
  showGrid: boolean;
  gridColor?: string;
  axisColor?: string;
}

export interface FunctionGraph extends GraphElement {
  graphType: 'function';
  expression: string;  // Math expression like "sin(x)", "x^2"
  color: string;
  strokeWidth: number;
  samples?: number;    // Number of points to sample
}

export interface ScatterGraph extends GraphElement {
  graphType: 'scatter';
  points: Array<{ x: number; y: number; label?: string }>;
  pointColor: string;
  pointSize: number;
  showLine?: boolean;  // Connect points
}

// ============================================================
// CURVE ELEMENTS (Standalone mathematical curves)
// ============================================================

export interface CurveElement extends BlackboardElement {
  type: 'curve';
  expression: string;
  xRange: [number, number];
  color: string;
  strokeWidth: number;
  samples: number;
  showPoints?: boolean;
}

// ============================================================
// DIAGRAM ELEMENTS (Predefined complex diagrams)
// ============================================================

export type DiagramType =
  | 'circuit'           // Electrical circuits
  | 'free_body'         // Physics free body diagrams
  | 'molecule'          // Chemistry molecular structures
  | 'orbital'           // Atomic orbitals
  | 'flowchart'         // Process flows
  | 'tree'              // Tree structures
  | 'venn'              // Venn diagrams
  | 'coordinate_system' // 2D/3D coordinate systems
  | 'vector_diagram'    // Vector addition/subtraction
  | 'wave'              // Wave diagrams
  | 'lens_ray'          // Optics ray diagrams
  | 'mirror_ray';       // Mirror ray diagrams

export interface DiagramComponent {
  id: string;
  type: string;  // Component-specific type
  position: BoardPosition;
  params: Record<string, any>;
  connections?: string[];  // IDs of connected components
}

export interface DiagramElement extends BlackboardElement {
  type: 'diagram';
  diagramType: DiagramType;
  components: DiagramComponent[];
  dimensions: BoardDimensions;
  showLabels: boolean;
}

// ============================================================
// SECTION/AREA ELEMENTS
// ============================================================

export interface SectionElement extends BlackboardElement {
  type: 'section';
  title: string;
  dimensions: BoardDimensions;
  borderColor?: string;
  backgroundColor?: string;
  titlePosition: 'top' | 'left';
}

// ============================================================
// FREEHAND DRAWING
// ============================================================

export interface FreehandElement extends BlackboardElement {
  type: 'freehand';
  points: BoardPosition[];
  color: string;
  strokeWidth: number;
  smoothing?: number;
}

// ============================================================
// POINTER AND HIGHLIGHTING
// ============================================================

export type PointerStyle = 'chalk' | 'laser' | 'hand' | 'circle' | 'arrow';

export interface PointerState {
  visible: boolean;
  position: BoardPosition;
  style: PointerStyle;
  color: string;
  size: number;
  trail?: BoardPosition[];  // For motion trail
}

export type HighlightStyle = 'underline' | 'circle' | 'box' | 'glow' | 'wavy';

export interface Highlight {
  elementId: string;
  style: HighlightStyle;
  color: string;
  animated?: boolean;
}

// ============================================================
// ANIMATION TYPES
// ============================================================

export type EasingFunction =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce'
  | 'elastic';

export interface AnimationConfig {
  duration: number;      // milliseconds
  easing: EasingFunction;
  delay?: number;
}

export type AnimationType =
  | 'write'          // Chalk writing effect
  | 'fade_in'        // Fade in
  | 'fade_out'       // Fade out
  | 'draw'           // Progressive drawing (for shapes/curves)
  | 'erase'          // Eraser effect
  | 'highlight'      // Highlight pulse
  | 'move'           // Move element
  | 'scale'          // Scale element
  | 'morph'          // Transform one thing to another
  | 'point'          // Pointer movement
  | 'reveal';        // Reveal hidden content

export interface Animation {
  id: string;
  type: AnimationType;
  targetId: string;     // Element ID to animate
  config: AnimationConfig;
  startValue?: any;
  endValue?: any;
  onComplete?: () => void;
}

// ============================================================
// BLACKBOARD STATE
// ============================================================

export interface BlackboardState {
  elements: Map<string, BlackboardElement>;
  pointer: PointerState;
  highlights: Highlight[];
  animationQueue: Animation[];
  currentAnimation: Animation | null;
  boardColor: string;
  chalkColor: string;
  gridVisible: boolean;
  gridSpacing: number;
}

// ============================================================
// COMMAND TYPES (For WebSocket communication)
// ============================================================

export type CommandType =
  | 'draw_text'
  | 'draw_latex'
  | 'draw_equation'
  | 'animate_derivation'
  | 'draw_graph'
  | 'draw_curve'
  | 'draw_shape'
  | 'draw_arrow'
  | 'draw_line'
  | 'draw_diagram'
  | 'draw_freehand'
  | 'point_at'
  | 'highlight'
  | 'underline'
  | 'clear_area'
  | 'clear_board'
  | 'erase'
  | 'move_element'
  | 'remove_element'
  | 'correct'
  | 'create_section'
  | 'update_element'
  | 'animate'
  | 'draw_table'
  | 'draw_bullet_list'
  | 'draw_comparison'
  | 'draw_number_line'
  | 'draw_timeline'
  | 'draw_sketch'
  | 'draw_punnett_square'
  | 'annotate'
  | 'display_pdf_page';

export interface BlackboardCommand {
  id: string;
  type: CommandType;
  params: Record<string, any>;
  timestamp: number;
  animate?: boolean;
  animationConfig?: AnimationConfig;
}

export interface CommandResult {
  commandId: string;
  success: boolean;
  elementId?: string;
  error?: string;
}

// ============================================================
// TOOL DEFINITIONS (For agent)
// ============================================================

export interface DrawTextParams {
  text: string;
  x: number;
  y: number;
  size?: TextSize;
  color?: string;
  animate?: boolean;
}

export interface DrawLatexParams {
  latex: string;
  x: number;
  y: number;
  color?: string;
  boxed?: boolean;
  label?: string;
}

export interface AnimateDerivationParams {
  steps: string[];
  x: number;
  y: number;
  stepDelay?: number;
  showArrows?: boolean;
}

export interface DrawGraphParams {
  graphType: GraphType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  expression?: string;
  data?: any;
  xRange?: [number, number];
  yRange?: [number, number];
  xLabel?: string;
  yLabel?: string;
  title?: string;
  color?: string;
}

export interface DrawShapeParams {
  shape: ShapeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
  label?: string;
}

export interface DrawArrowParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color?: string;
  strokeWidth?: number;
  headStyle?: ArrowHeadStyle;
  label?: string;
  curved?: boolean;
}

export interface DrawDiagramParams {
  diagramType: DiagramType;
  x: number;
  y: number;
  components: DiagramComponent[];
  width?: number;
  height?: number;
}

export interface PointAtParams {
  x: number;
  y: number;
  duration?: number;
  style?: PointerStyle;
}

export interface HighlightParams {
  elementId: string;
  style?: HighlightStyle;
  color?: string;
  duration?: number;
}

export interface ClearAreaParams {
  x: number;
  y: number;
  width: number;
  height: number;
  animate?: boolean;
}

// ============================================================
// NEW CONTENT ORGANIZATION ELEMENTS
// ============================================================

export interface TableElement extends BlackboardElement {
  type: 'table';
  headers: string[];
  rows: string[][];
  dimensions: BoardDimensions;
  color: string;
}

export interface BulletListElement extends BlackboardElement {
  type: 'bullet_list';
  title: string;
  items: string[];
  numbered: boolean;
  color: string;
}

export interface ComparisonElement extends BlackboardElement {
  type: 'comparison';
  leftTitle: string;
  leftItems: string[];
  rightTitle: string;
  rightItems: string[];
  dimensions: BoardDimensions;
  color: string;
}

export interface NumberLineElement extends BlackboardElement {
  type: 'number_line';
  min: number;
  max: number;
  marks: Array<{ value: number; label: string }>;
  dimensions: BoardDimensions;
  color: string;
}

export interface TimelineElement extends BlackboardElement {
  type: 'timeline';
  events: string[];
  dimensions: BoardDimensions;
  color: string;
}

export interface AnnotationElement extends BlackboardElement {
  type: 'annotation';
  targetElementId: string;
  text: string;
  annotationPosition: 'top' | 'bottom' | 'left' | 'right';
  color: string;
}

/** Raw SVG markup emitted by the model (`draw_sketch` tool).
 *  The agent's escape hatch for diagrams not covered by the dedicated
 *  drawing tools. The SVG is sanitized via DOMPurify before render. */
export interface SvgRawElement extends BlackboardElement {
  type: 'svg_raw';
  svg: string;
  dimensions: BoardDimensions;
}

export interface PunnettSquareElement extends BlackboardElement {
  type: 'punnett_square';
  parent1: string;
  parent2: string;
  topGametes: string[];
  leftGametes: string[];
  title?: string;
  dimensions: BoardDimensions;
}

/** Pinned snippet of a rendered PDF page from an uploaded question paper.
 *  Emitted by the `display_pdf_page` tool so the tutor can show the original
 *  printed question (including any figure) next to the cited excerpt. */
export interface ImageElement extends BlackboardElement {
  type: 'image';
  src: string;
  dimensions: BoardDimensions;
  caption?: string;
  /** Source paper / page metadata, kept for hover citations. */
  contentId?: number;
  page?: number;
}

// ============================================================
// PRESET DIAGRAM COMPONENTS
// ============================================================

// Circuit components
export type CircuitComponent =
  | 'resistor'
  | 'capacitor'
  | 'inductor'
  | 'battery'
  | 'switch'
  | 'ammeter'
  | 'voltmeter'
  | 'bulb'
  | 'diode'
  | 'transistor'
  | 'ground'
  | 'wire';

// Chemistry components
export type MoleculeComponent =
  | 'atom'
  | 'single_bond'
  | 'double_bond'
  | 'triple_bond'
  | 'lone_pair'
  | 'wedge_bond'
  | 'dash_bond';

// Physics free body components
export type FreeBodyComponent =
  | 'force_arrow'
  | 'velocity_arrow'
  | 'acceleration_arrow'
  | 'mass_block'
  | 'pulley'
  | 'spring'
  | 'surface'
  | 'incline'
  | 'pivot';
