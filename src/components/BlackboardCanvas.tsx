/**
 * BlackboardCanvas - Main Visual Teaching Canvas Component
 * Renders a classroom blackboard with chalk-like rendering
 */

'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import DOMPurify from 'dompurify';
import {
  BlackboardElement,
  TextElement,
  LatexElement,
  ShapeElement,
  ArrowElement,
  LineElement,
  GraphElement,
  CurveElement,
  SectionElement,
  TableElement,
  BulletListElement,
  ComparisonElement,
  NumberLineElement,
  TimelineElement,
  AnnotationElement,
  SvgRawElement,
  PunnettSquareElement,
  ImageElement,
  PointerState,
  Highlight,
  TextSize,
} from '../types/blackboard';
import { useBlackboardState } from '../hooks/useBlackboardState';

// ============================================================
// CONSTANTS
// ============================================================

// Paper canvas — the board is cream; the tutor "writes" in navy ink with a
// single amber accent (iSATPrep brand). The color *names* are kept so any
// name→hex lookups still resolve; only the values are re-skinned to brand.
const BOARD_COLORS = {
  dark_green: '#FAFAF7',
  black: '#FAFAF7',
  dark_blue: '#FAFAF7',
};

const CHALK_COLORS = {
  white: '#FAFAF7',   // default "ink" → navy
  yellow: '#F59E0B',  // emphasis → amber (the single accent)
  pink: '#C97A05',    // amber-deep
  blue: '#2584B2',    // info
  green: '#2F8552',   // success
  orange: '#F59E0B',  // → amber
};

const TEXT_SIZE_PX: Record<TextSize, number> = {
  small: 18,
  medium: 26,
  large: 34,
  heading: 44,
  title: 58,
};

// Ink fonts: clean worksheet sans for body/labels, Fraunces serif for
// headings/titles (the brand's editorial voice). Replaces the chalk handwriting.
const CHALK_FONT = '"Source Sans 3", system-ui, sans-serif';
const INK_SERIF = 'Fraunces, "Source Serif 4", Georgia, serif';

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/** Convert percentage position to pixel position */
function toPixels(
  percent: number,
  dimension: number
): number {
  return (percent / 100) * dimension;
}

/** Render LaTeX to HTML string */
function renderLatex(latex: string, displayMode: boolean = true): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      output: 'html',
      strict: false,
    });
  } catch (e) {
    console.error('LaTeX render error:', e);
    return `<span style="color: red;">LaTeX Error: ${latex}</span>`;
  }
}

/** Generate chalk texture effect using SVG filter */
function getChalkFilter(): string {
  return `
    <filter id="chalk" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  `;
}

/** Evaluate a math expression for graphing */
function evaluateExpression(expr: string, x: number): number {
  try {
    // Safe math evaluation
    const sanitized = expr
      .replace(/\^/g, '**')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/log/g, 'Math.log')
      .replace(/exp/g, 'Math.exp')
      .replace(/pi/gi, 'Math.PI')
      .replace(/e(?![xp])/g, 'Math.E');

    // eslint-disable-next-line no-new-func
    const fn = new Function('x', `return ${sanitized}`);
    const result = fn(x);
    return isFinite(result) ? result : NaN;
  } catch {
    return NaN;
  }
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Renders text with chalk effect - handles wrapping for long text */
const ChalkText: React.FC<{
  element: TextElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const fontSize = TEXT_SIZE_PX[element.size];

  // Add slight rotation for hand-written feel (-1 to 1 degrees)
  const rotation = (element.id.charCodeAt(0) % 3) - 1;

  // Determine text anchor based on position and size
  // Titles and headings at center (x around 50) should be centered
  // Text near edges should anchor appropriately
  let textAnchor: 'start' | 'middle' | 'end' = 'start';
  const posX = element.position.x;

  if ((element.size === 'title' || element.size === 'heading') && posX >= 40 && posX <= 60) {
    textAnchor = 'middle';
  } else if (posX > 80) {
    textAnchor = 'end';
  }

  // Calculate available width based on position
  const availableWidth = textAnchor === 'middle'
    ? Math.min(posX, 100 - posX) * 2  // Distance to nearest edge * 2
    : textAnchor === 'end'
      ? posX  // Distance from left
      : 100 - posX;  // Distance to right edge

  // Estimate characters that can fit (rough estimate: ~1.5% width per character at medium size)
  const charWidthPercent = element.size === 'title' ? 3 : element.size === 'heading' ? 2.5 : element.size === 'large' ? 2 : 1.2;
  const maxChars = Math.floor((availableWidth - 5) / charWidthPercent);  // Leave 5% margin

  // Wrap text into lines if needed
  const content = element.content;
  const words = content.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxChars || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Line height based on font size
  const lineHeight = fontSize * 1.3;

  // For title/heading, anchor from the glyph TOP (hanging) so the y
  // position is predictable across render scales — otherwise SVG's
  // default `alphabetic` baseline pushes glyphs ~75% of the cap height
  // above y, which can clip into the wooden frame's top border.
  const isLargeHeader = element.size === 'title' || element.size === 'heading';
  const dominantBaseline = isLargeHeader ? 'hanging' : 'alphabetic';

  return (
    <g transform={`rotate(${rotation * 0.3}, ${x}, ${y})`}>
      {lines.map((line, idx) => (
        <text
          key={idx}
          x={x}
          y={y + idx * lineHeight}
          fill={element.color}
          fontSize={fontSize}
          fontFamily={isLargeHeader ? INK_SERIF : CHALK_FONT}
          fontWeight={isLargeHeader ? 600 : 400}
          opacity={element.opacity}
          textAnchor={textAnchor}
          dominantBaseline={dominantBaseline}
          style={{
            filter: 'url(#chalk)',
            // Clean ink on paper — no chalk glow.
            letterSpacing: '0.2px',
          }}
        >
          {line}
        </text>
      ))}
    </g>
  );
};

/** Renders LaTeX equation */
const LatexEquation: React.FC<{
  element: LatexElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const html = renderLatex(element.latex, element.displayMode);

  return (
    <foreignObject
      x={x}
      y={y}
      width={boardWidth * 0.8}
      height={200}
      style={{ overflow: 'visible' }}
    >
      <div
        style={{
          color: element.color,
          fontSize: '24px',
          fontFamily: 'KaTeX_Main, serif',
          padding: element.boxed ? '8px 12px' : '0',
          border: element.boxed ? `2px solid ${element.color}` : 'none',
          borderRadius: element.boxed ? '6px' : '0',
          display: 'inline-block',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </foreignObject>
  );
};

/** Renders shapes (circle, rectangle, etc.) */
const ChalkShape: React.FC<{
  element: ShapeElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = toPixels(element.dimensions.width, boardWidth);
  const height = toPixels(element.dimensions.height, boardHeight);

  const commonProps = {
    stroke: element.color,
    strokeWidth: element.strokeWidth,
    fill: element.fill || 'none',
    opacity: element.opacity,
    style: { filter: 'url(#chalk)' },
  };

  switch (element.shapeType) {
    case 'circle':
      const radius = element.params.radius
        ? toPixels(element.params.radius as number, boardWidth)
        : Math.min(width, height) / 2;
      return (
        <circle
          cx={x}
          cy={y}
          r={radius}
          {...commonProps}
        />
      );

    case 'rectangle':
      return (
        <rect
          x={x - width / 2}
          y={y - height / 2}
          width={width}
          height={height}
          {...commonProps}
        />
      );

    case 'ellipse':
      return (
        <ellipse
          cx={x}
          cy={y}
          rx={width / 2}
          ry={height / 2}
          {...commonProps}
        />
      );

    case 'triangle':
      const points = `${x},${y - height / 2} ${x - width / 2},${y + height / 2} ${x + width / 2},${y + height / 2}`;
      return <polygon points={points} {...commonProps} />;

    default:
      return null;
  }
};

/** Renders arrows */
const ChalkArrow: React.FC<{
  element: ArrowElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x1 = toPixels(element.position.x, boardWidth);
  const y1 = toPixels(element.position.y, boardHeight);
  const x2 = toPixels(element.endPosition.x, boardWidth);
  const y2 = toPixels(element.endPosition.y, boardHeight);

  // Calculate arrow head
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLength = element.headSize;
  const headAngle = Math.PI / 6;

  const headX1 = x2 - headLength * Math.cos(angle - headAngle);
  const headY1 = y2 - headLength * Math.sin(angle - headAngle);
  const headX2 = x2 - headLength * Math.cos(angle + headAngle);
  const headY2 = y2 - headLength * Math.sin(angle + headAngle);

  if (element.curved && element.curvature) {
    // Curved arrow using quadratic bezier
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const perpX = -(y2 - y1);
    const perpY = x2 - x1;
    const len = Math.sqrt(perpX * perpX + perpY * perpY);
    const ctrlX = midX + (perpX / len) * element.curvature * 50;
    const ctrlY = midY + (perpY / len) * element.curvature * 50;

    return (
      <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
        <path
          d={`M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`}
          stroke={element.color}
          strokeWidth={element.strokeWidth}
          fill="none"
        />
        <polygon
          points={`${x2},${y2} ${headX1},${headY1} ${headX2},${headY2}`}
          fill={element.color}
        />
      </g>
    );
  }

  return (
    <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={element.color}
        strokeWidth={element.strokeWidth}
      />
      <polygon
        points={`${x2},${y2} ${headX1},${headY1} ${headX2},${headY2}`}
        fill={element.color}
      />
    </g>
  );
};

/** Renders lines */
const ChalkLine: React.FC<{
  element: LineElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x1 = toPixels(element.position.x, boardWidth);
  const y1 = toPixels(element.position.y, boardHeight);
  const x2 = toPixels(element.endPosition.x, boardWidth);
  const y2 = toPixels(element.endPosition.y, boardHeight);

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={element.color}
      strokeWidth={element.strokeWidth}
      strokeDasharray={element.dashed ? element.dashPattern?.join(',') || '8,4' : undefined}
      opacity={element.opacity}
      style={{ filter: 'url(#chalk)' }}
    />
  );
};

/** Renders graphs with axes */
const GraphPlot: React.FC<{
  element: GraphElement & { expression?: string; color?: string };
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = toPixels(element.dimensions.width, boardWidth);
  const height = toPixels(element.dimensions.height, boardHeight);

  const { xAxis, yAxis } = element;
  const xRange = xAxis.max - xAxis.min;
  const yRange = yAxis.max - yAxis.min;

  // Convert data coordinates to pixel coordinates
  const toScreenX = (dataX: number) => x + ((dataX - xAxis.min) / xRange) * width;
  const toScreenY = (dataY: number) => y + height - ((dataY - yAxis.min) / yRange) * height;

  // Generate curve points if expression exists
  const curvePoints = useMemo(() => {
    if (!element.expression) return '';

    const points: string[] = [];
    const samples = 100;
    const step = xRange / samples;

    for (let i = 0; i <= samples; i++) {
      const dataX = xAxis.min + i * step;
      const dataY = evaluateExpression(element.expression, dataX);

      if (!isNaN(dataY) && dataY >= yAxis.min && dataY <= yAxis.max) {
        const screenX = toScreenX(dataX);
        const screenY = toScreenY(dataY);
        points.push(`${screenX},${screenY}`);
      }
    }

    return points.length > 1 ? `M ${points.join(' L ')}` : '';
  }, [element.expression, xAxis, yAxis, xRange, yRange, width, height, x, y]);

  // Generate grid lines
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];

    if (element.showGrid) {
      const xStep = xRange / 10;
      const yStep = yRange / 10;

      // Vertical grid lines
      for (let i = 0; i <= 10; i++) {
        const gx = toScreenX(xAxis.min + i * xStep);
        lines.push(
          <line
            key={`vgrid-${i}`}
            x1={gx}
            y1={y}
            x2={gx}
            y2={y + height}
            stroke="#FAFAF722"
            strokeWidth={1}
          />
        );
      }

      // Horizontal grid lines
      for (let i = 0; i <= 10; i++) {
        const gy = toScreenY(yAxis.min + i * yStep);
        lines.push(
          <line
            key={`hgrid-${i}`}
            x1={x}
            y1={gy}
            x2={x + width}
            y2={gy}
            stroke="#FAFAF722"
            strokeWidth={1}
          />
        );
      }
    }

    return lines;
  }, [element.showGrid, xAxis, yAxis, xRange, yRange, width, height, x, y]);

  // Origin position
  const originX = toScreenX(0);
  const originY = toScreenY(0);

  return (
    <g opacity={element.opacity}>
      {/* Grid */}
      {gridLines}

      {/* Axes */}
      {element.showAxes && (
        <>
          {/* X-axis */}
          <line
            x1={x}
            y1={originY}
            x2={x + width}
            y2={originY}
            stroke="#FAFAF7"
            strokeWidth={2}
            style={{ filter: 'url(#chalk)' }}
          />
          {/* Y-axis */}
          <line
            x1={originX}
            y1={y}
            x2={originX}
            y2={y + height}
            stroke="#FAFAF7"
            strokeWidth={2}
            style={{ filter: 'url(#chalk)' }}
          />
          {/* X label */}
          <text
            x={x + width + 10}
            y={originY + 5}
            fill="#FAFAF7"
            fontSize={18}
            fontFamily={CHALK_FONT}
          >
            {xAxis.label}
          </text>
          {/* Y label */}
          <text
            x={originX + 5}
            y={y - 10}
            fill="#FAFAF7"
            fontSize={18}
            fontFamily={CHALK_FONT}
          >
            {yAxis.label}
          </text>
        </>
      )}

      {/* Function curve */}
      {curvePoints && (
        <path
          d={curvePoints}
          stroke={element.color || '#F59E0B'}
          strokeWidth={3}
          fill="none"
          style={{ filter: 'url(#chalk)' }}
        />
      )}

      {/* Title */}
      {element.title && (
        <text
          x={x + width / 2}
          y={y - 15}
          fill="#FAFAF7"
          fontSize={22}
          fontFamily={CHALK_FONT}
          fontWeight={500}
          textAnchor="middle"
        >
          {element.title}
        </text>
      )}
    </g>
  );
};

/** Renders Free Body Diagrams and other diagrams */
const DiagramRenderer: React.FC<{
  element: any; // DiagramElement from blackboard types
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = element.dimensions?.width ? toPixels(element.dimensions.width, boardWidth) : 200;
  const height = element.dimensions?.height ? toPixels(element.dimensions.height, boardHeight) : 200;

  // Default force colors
  const forceColors: Record<string, string> = {
    weight: '#C9302D',     // Red for weight/gravity
    normal: '#2F8552',     // Green for normal force
    friction: '#F59E0B',   // Orange for friction
    tension: '#2584B2',    // Blue for tension
    applied: '#C97A05',    // Pink for applied force
    spring: '#F59E0B',     // Yellow for spring force
    default: '#FAFAF7',    // White for unknown
  };

  const getForceColor = (forceType: string): string => {
    const lowerType = forceType.toLowerCase();
    for (const [key, color] of Object.entries(forceColors)) {
      if (lowerType.includes(key)) return color;
    }
    return forceColors.default;
  };

  // Render Free Body Diagram
  if (element.diagramType === 'free_body') {
    const components = element.components || [];
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const blockSize = Math.min(width, height) * 0.3;

    return (
      <g opacity={element.opacity || 1}>
        {/* Title */}
        <text
          x={x + width / 2}
          y={y + 15}
          fill="#FAFAF7"
          fontSize={18}
          fontFamily={CHALK_FONT}
          textAnchor="middle"
          style={{ filter: 'url(#chalk)' }}
        >
          Free Body Diagram
        </text>

        {/* Central mass/object - draw a rectangle */}
        <rect
          x={centerX - blockSize / 2}
          y={centerY - blockSize / 2}
          width={blockSize}
          height={blockSize}
          stroke="#FAFAF7"
          strokeWidth={2}
          fill="none"
          style={{ filter: 'url(#chalk)' }}
        />

        {/* Mass label in center */}
        <text
          x={centerX}
          y={centerY + 5}
          fill="#FAFAF7"
          fontSize={16}
          fontFamily={CHALK_FONT}
          textAnchor="middle"
          style={{ filter: 'url(#chalk)' }}
        >
          m
        </text>

        {/* Render force arrows from components */}
        {components.map((comp: any, idx: number) => {
          if (comp.type === 'force_arrow' || comp.type === 'force') {
            // Safely get direction - could be string or object
            let direction = 'up';
            if (typeof comp.params?.direction === 'string') {
              direction = comp.params.direction;
            } else if (comp.params?.direction?.toLowerCase) {
              direction = comp.params.direction;
            }

            const label = comp.params?.label || comp.params?.name || `F${idx + 1}`;
            const magnitude = comp.params?.magnitude || 1;
            const color = getForceColor(typeof label === 'string' ? label : String(label));

            // Arrow length based on magnitude (normalized)
            const arrowLength = Math.min(blockSize * 1.5, blockSize * 0.5 + (typeof magnitude === 'number' ? magnitude : 1) * 10);
            const headSize = 12;

            let startX = centerX, startY = centerY;
            let endX = centerX, endY = centerY;
            let labelX = centerX, labelY = centerY;
            let textAnchor: 'start' | 'middle' | 'end' = 'middle';

            switch (direction.toLowerCase()) {
              case 'up':
                startY = centerY - blockSize / 2;
                endY = startY - arrowLength;
                labelX = endX + 15;
                labelY = (startY + endY) / 2;
                textAnchor = 'start';
                break;
              case 'down':
                startY = centerY + blockSize / 2;
                endY = startY + arrowLength;
                labelX = endX + 15;
                labelY = (startY + endY) / 2;
                textAnchor = 'start';
                break;
              case 'left':
                startX = centerX - blockSize / 2;
                endX = startX - arrowLength;
                labelX = (startX + endX) / 2;
                labelY = endY - 15;
                break;
              case 'right':
                startX = centerX + blockSize / 2;
                endX = startX + arrowLength;
                labelX = (startX + endX) / 2;
                labelY = endY - 15;
                break;
              default:
                // Try to parse angle if provided
                if (comp.params?.angle !== undefined) {
                  const angle = (comp.params.angle * Math.PI) / 180;
                  startX = centerX + (blockSize / 2) * Math.cos(angle);
                  startY = centerY - (blockSize / 2) * Math.sin(angle);
                  endX = startX + arrowLength * Math.cos(angle);
                  endY = startY - arrowLength * Math.sin(angle);
                  labelX = endX + 10 * Math.cos(angle);
                  labelY = endY - 10 * Math.sin(angle);
                }
            }

            // Calculate arrowhead
            const angle = Math.atan2(endY - startY, endX - startX);
            const headAngle = Math.PI / 6;
            const headX1 = endX - headSize * Math.cos(angle - headAngle);
            const headY1 = endY - headSize * Math.sin(angle - headAngle);
            const headX2 = endX - headSize * Math.cos(angle + headAngle);
            const headY2 = endY - headSize * Math.sin(angle + headAngle);

            return (
              <g key={`force-${idx}`} style={{ filter: 'url(#chalk)' }}>
                {/* Arrow line */}
                <line
                  x1={startX}
                  y1={startY}
                  x2={endX}
                  y2={endY}
                  stroke={color}
                  strokeWidth={3}
                />
                {/* Arrow head */}
                <polygon
                  points={`${endX},${endY} ${headX1},${headY1} ${headX2},${headY2}`}
                  fill={color}
                />
                {/* Force label */}
                <text
                  x={labelX}
                  y={labelY}
                  fill={color}
                  fontSize={14}
                  fontFamily={CHALK_FONT}
                  textAnchor={textAnchor}
                >
                  {label}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* If no components, show default weight and normal force */}
        {(!components || components.length === 0) && (
          <>
            {/* Weight (downward) */}
            <g style={{ filter: 'url(#chalk)' }}>
              <line
                x1={centerX}
                y1={centerY + blockSize / 2}
                x2={centerX}
                y2={centerY + blockSize / 2 + 60}
                stroke="#C9302D"
                strokeWidth={3}
              />
              <polygon
                points={`${centerX},${centerY + blockSize / 2 + 60} ${centerX - 8},${centerY + blockSize / 2 + 48} ${centerX + 8},${centerY + blockSize / 2 + 48}`}
                fill="#C9302D"
              />
              <text
                x={centerX + 15}
                y={centerY + blockSize / 2 + 40}
                fill="#C9302D"
                fontSize={14}
                fontFamily={CHALK_FONT}
              >
                W = mg
              </text>
            </g>

            {/* Normal force (upward) */}
            <g style={{ filter: 'url(#chalk)' }}>
              <line
                x1={centerX}
                y1={centerY - blockSize / 2}
                x2={centerX}
                y2={centerY - blockSize / 2 - 60}
                stroke="#2F8552"
                strokeWidth={3}
              />
              <polygon
                points={`${centerX},${centerY - blockSize / 2 - 60} ${centerX - 8},${centerY - blockSize / 2 - 48} ${centerX + 8},${centerY - blockSize / 2 - 48}`}
                fill="#2F8552"
              />
              <text
                x={centerX + 15}
                y={centerY - blockSize / 2 - 40}
                fill="#2F8552"
                fontSize={14}
                fontFamily={CHALK_FONT}
              >
                N
              </text>
            </g>
          </>
        )}
      </g>
    );
  }

  // Render Vector Diagram (for Newton's Third Law, action-reaction pairs)
  if (element.diagramType === 'vector_diagram') {
    const components = element.components || [];
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const arrowLength = Math.min(width, height) * 0.35;
    const headSize = 12;

    // Default colors for action-reaction pairs
    const actionColor = '#C9302D';   // Red for action
    const reactionColor = '#2F8552'; // Green for reaction

    return (
      <g opacity={element.opacity || 1}>
        {/* Title */}
        <text
          x={x + width / 2}
          y={y + 20}
          fill="#FAFAF7"
          fontSize={16}
          fontFamily={CHALK_FONT}
          textAnchor="middle"
          style={{ filter: 'url(#chalk)' }}
        >
          {element.title || 'Vector Diagram'}
        </text>

        {/* If components are provided, render them */}
        {components.length > 0 ? (
          components.map((comp: any, idx: number) => {
            if (comp.type === 'vector' || comp.type === 'force_arrow' || comp.type === 'arrow') {
              const label = comp.params?.label || comp.params?.name || `F${idx + 1}`;
              const direction = comp.params?.direction || 'right';
              const color = comp.params?.color || (idx % 2 === 0 ? actionColor : reactionColor);

              let startX = centerX, startY = centerY;
              let endX = centerX, endY = centerY;
              let labelX = centerX, labelY = centerY;
              let textAnchor: 'start' | 'middle' | 'end' = 'middle';

              switch (direction.toLowerCase()) {
                case 'up':
                  endY = startY - arrowLength;
                  labelX = startX + 15;
                  labelY = (startY + endY) / 2;
                  textAnchor = 'start';
                  break;
                case 'down':
                  endY = startY + arrowLength;
                  labelX = startX + 15;
                  labelY = (startY + endY) / 2;
                  textAnchor = 'start';
                  break;
                case 'left':
                  endX = startX - arrowLength;
                  labelX = (startX + endX) / 2;
                  labelY = startY - 15;
                  break;
                case 'right':
                  endX = startX + arrowLength;
                  labelX = (startX + endX) / 2;
                  labelY = startY - 15;
                  break;
              }

              // Calculate arrowhead
              const angle = Math.atan2(endY - startY, endX - startX);
              const headAngle = Math.PI / 6;
              const headX1 = endX - headSize * Math.cos(angle - headAngle);
              const headY1 = endY - headSize * Math.sin(angle - headAngle);
              const headX2 = endX - headSize * Math.cos(angle + headAngle);
              const headY2 = endY - headSize * Math.sin(angle + headAngle);

              return (
                <g key={`vector-${idx}`} style={{ filter: 'url(#chalk)' }}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY} stroke={color} strokeWidth={3} />
                  <polygon points={`${endX},${endY} ${headX1},${headY1} ${headX2},${headY2}`} fill={color} />
                  <text x={labelX} y={labelY} fill={color} fontSize={14} fontFamily={CHALK_FONT} textAnchor={textAnchor}>
                    {label}
                  </text>
                </g>
              );
            }
            return null;
          })
        ) : (
          /* Default: Show action-reaction pair (Newton's Third Law) */
          <>
            {/* Central point/object */}
            <circle
              cx={centerX}
              cy={centerY}
              r={8}
              fill="#FAFAF7"
              style={{ filter: 'url(#chalk)' }}
            />

            {/* Action force (right) */}
            <g style={{ filter: 'url(#chalk)' }}>
              <line
                x1={centerX + 10}
                y1={centerY}
                x2={centerX + arrowLength}
                y2={centerY}
                stroke={actionColor}
                strokeWidth={3}
              />
              <polygon
                points={`${centerX + arrowLength},${centerY} ${centerX + arrowLength - 10},${centerY - 6} ${centerX + arrowLength - 10},${centerY + 6}`}
                fill={actionColor}
              />
              <text
                x={centerX + arrowLength / 2 + 5}
                y={centerY - 15}
                fill={actionColor}
                fontSize={14}
                fontFamily={CHALK_FONT}
                textAnchor="middle"
              >
                F_action
              </text>
            </g>

            {/* Reaction force (left) - equal and opposite */}
            <g style={{ filter: 'url(#chalk)' }}>
              <line
                x1={centerX - 10}
                y1={centerY}
                x2={centerX - arrowLength}
                y2={centerY}
                stroke={reactionColor}
                strokeWidth={3}
              />
              <polygon
                points={`${centerX - arrowLength},${centerY} ${centerX - arrowLength + 10},${centerY - 6} ${centerX - arrowLength + 10},${centerY + 6}`}
                fill={reactionColor}
              />
              <text
                x={centerX - arrowLength / 2 - 5}
                y={centerY - 15}
                fill={reactionColor}
                fontSize={14}
                fontFamily={CHALK_FONT}
                textAnchor="middle"
              >
                F_reaction
              </text>
            </g>

            {/* Equation below */}
            <text
              x={centerX}
              y={centerY + 50}
              fill="#F59E0B"
              fontSize={16}
              fontFamily={CHALK_FONT}
              textAnchor="middle"
              style={{ filter: 'url(#chalk)' }}
            >
              F_action = -F_reaction
            </text>
          </>
        )}
      </g>
    );
  }

  // Render Tree (parse trees, decision trees, probability trees with
  // optional edge_label on each child)
  if (element.diagramType === 'tree') {
    const components = element.components || [];
    const root = Array.isArray(components) ? components[0] : components;
    if (!root || typeof root !== 'object') return null;

    type TreeNode = {
      text?: string;
      edge_label?: string;
      children?: TreeNode[];
    };

    type LaidOut = {
      node: TreeNode;
      cx: number;
      cy: number;
      children: LaidOut[];
    };

    const layout = (
      n: TreeNode,
      left: number,
      right: number,
      depth: number,
      maxDepth: number,
    ): LaidOut => {
      const cx = (left + right) / 2;
      const cy =
        y + ((depth + 0.5) / Math.max(1, maxDepth + 1)) * height;
      const kids = (n.children || []).filter(Boolean);
      const slot = kids.length > 0 ? (right - left) / kids.length : 0;
      const children = kids.map((child, i) =>
        layout(
          child,
          left + i * slot,
          left + (i + 1) * slot,
          depth + 1,
          maxDepth,
        ),
      );
      return { node: n, cx, cy, children };
    };

    const computeMaxDepth = (n: TreeNode): number => {
      const kids = (n.children || []).filter(Boolean);
      if (kids.length === 0) return 0;
      return 1 + Math.max(...kids.map(computeMaxDepth));
    };

    const maxDepth = computeMaxDepth(root as TreeNode);
    const laid = layout(root as TreeNode, x, x + width, 0, maxDepth);

    const nodeFontSize = Math.max(12, Math.min(20, height / (maxDepth + 1) * 0.25));
    const edgeFontSize = Math.max(10, nodeFontSize - 2);
    const nodePad = nodeFontSize * 0.6;

    const edges: JSX.Element[] = [];
    const nodes: JSX.Element[] = [];
    let key = 0;

    const collect = (n: LaidOut) => {
      n.children.forEach((child) => {
        edges.push(
          <line
            key={`tree-edge-${key++}`}
            x1={n.cx}
            y1={n.cy + nodeFontSize * 0.6}
            x2={child.cx}
            y2={child.cy - nodeFontSize * 0.6}
            stroke={CHALK_COLORS.white}
            strokeWidth={1.5}
          />,
        );
        if (child.node.edge_label) {
          edges.push(
            <text
              key={`tree-edge-label-${key++}`}
              x={(n.cx + child.cx) / 2}
              y={(n.cy + child.cy) / 2 - 2}
              fill={CHALK_COLORS.yellow}
              fontSize={edgeFontSize}
              fontFamily={CHALK_FONT}
              textAnchor="middle"
            >
              {child.node.edge_label}
            </text>,
          );
        }
        collect(child);
      });
    };
    collect(laid);

    const drawNode = (n: LaidOut) => {
      const text = n.node.text || '';
      const textWidth = Math.max(text.length * nodeFontSize * 0.55, nodeFontSize * 1.5);
      nodes.push(
        <g key={`tree-node-${key++}`}>
          <rect
            x={n.cx - textWidth / 2 - nodePad}
            y={n.cy - nodeFontSize * 0.7 - nodePad / 2}
            width={textWidth + nodePad * 2}
            height={nodeFontSize * 1.4 + nodePad}
            rx={6}
            fill="rgba(0,0,0,0.4)"
            stroke={CHALK_COLORS.white}
            strokeWidth={1.5}
          />
          <text
            x={n.cx}
            y={n.cy + nodeFontSize * 0.35}
            fill={CHALK_COLORS.white}
            fontSize={nodeFontSize}
            fontFamily={CHALK_FONT}
            textAnchor="middle"
          >
            {text}
          </text>
        </g>,
      );
      n.children.forEach(drawNode);
    };
    drawNode(laid);

    return (
      <g opacity={element.opacity || 1} style={{ filter: 'url(#chalk)' }}>
        {edges}
        {nodes}
      </g>
    );
  }

  // Fallback for other diagram types - show a placeholder with the type
  return (
    <g opacity={element.opacity || 1}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke="#2584B2"
        strokeWidth={2}
        strokeDasharray="8,4"
        fill="none"
        style={{ filter: 'url(#chalk)' }}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="#2584B2"
        fontSize={18}
        fontFamily={CHALK_FONT}
        textAnchor="middle"
        style={{ filter: 'url(#chalk)' }}
      >
        [{element.diagramType || 'Diagram'}]
      </text>
    </g>
  );
};

/** Renders a table with headers and rows */
const ChalkTable: React.FC<{
  element: TableElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = toPixels(element.dimensions.width, boardWidth);
  const headers = element.headers || [];
  const rows = element.rows || [];
  const colWidth = headers.length > 0 ? width / headers.length : width;
  const rowHeight = 32;
  const headerHeight = 36;

  return (
    <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
      {/* Header row */}
      {headers.map((header, i) => (
        <g key={`header-${i}`}>
          <text
            x={x + i * colWidth + colWidth / 2}
            y={y + headerHeight / 2 + 6}
            fill="#F59E0B"
            fontSize={18}
            fontFamily={CHALK_FONT}
            fontWeight={600}
            textAnchor="middle"
          >
            {header}
          </text>
        </g>
      ))}
      {/* Header underline */}
      <line
        x1={x}
        y1={y + headerHeight}
        x2={x + width}
        y2={y + headerHeight}
        stroke={element.color}
        strokeWidth={2}
      />
      {/* Column dividers */}
      {headers.map((_, i) => i > 0 && (
        <line
          key={`col-div-${i}`}
          x1={x + i * colWidth}
          y1={y}
          x2={x + i * colWidth}
          y2={y + headerHeight + rows.length * rowHeight}
          stroke={element.color}
          strokeWidth={1}
          opacity={0.4}
        />
      ))}
      {/* Data rows */}
      {rows.map((row, rowIdx) => (
        <g key={`row-${rowIdx}`}>
          {row.map((cell, colIdx) => (
            <text
              key={`cell-${rowIdx}-${colIdx}`}
              x={x + colIdx * colWidth + colWidth / 2}
              y={y + headerHeight + rowIdx * rowHeight + rowHeight / 2 + 6}
              fill={element.color}
              fontSize={16}
              fontFamily={CHALK_FONT}
              textAnchor="middle"
            >
              {cell}
            </text>
          ))}
          {/* Row divider */}
          {rowIdx < rows.length - 1 && (
            <line
              x1={x}
              y1={y + headerHeight + (rowIdx + 1) * rowHeight}
              x2={x + width}
              y2={y + headerHeight + (rowIdx + 1) * rowHeight}
              stroke={element.color}
              strokeWidth={1}
              opacity={0.3}
            />
          )}
        </g>
      ))}
      {/* Outer border */}
      <rect
        x={x}
        y={y}
        width={width}
        height={headerHeight + rows.length * rowHeight}
        stroke={element.color}
        strokeWidth={2}
        fill="none"
        opacity={0.5}
      />
    </g>
  );
};

/** Renders a bulleted or numbered list */
const ChalkBulletList: React.FC<{
  element: BulletListElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const items = element.items || [];
  const lineHeight = 30;

  return (
    <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
      {/* Title */}
      <text
        x={x}
        y={y + 20}
        fill="#F59E0B"
        fontSize={22}
        fontFamily={CHALK_FONT}
        fontWeight={600}
      >
        {element.title}
      </text>
      {/* Underline title */}
      <line
        x1={x}
        y1={y + 28}
        x2={x + element.title.length * 12}
        y2={y + 28}
        stroke="#F59E0B"
        strokeWidth={1}
        opacity={0.5}
      />
      {/* Items */}
      {items.map((item, idx) => (
        <text
          key={`item-${idx}`}
          x={x + 20}
          y={y + 50 + idx * lineHeight}
          fill={element.color}
          fontSize={18}
          fontFamily={CHALK_FONT}
        >
          {element.numbered ? `${idx + 1}. ` : '• '}{item}
        </text>
      ))}
    </g>
  );
};

/** Renders a side-by-side comparison */
const ChalkComparison: React.FC<{
  element: ComparisonElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = toPixels(element.dimensions.width, boardWidth);
  const halfWidth = width / 2;
  const lineHeight = 28;
  const headerOffset = 40;
  const maxItems = Math.max(element.leftItems.length, element.rightItems.length);

  return (
    <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
      {/* Left title */}
      <text
        x={x + halfWidth / 2}
        y={y + 24}
        fill="#C97A05"
        fontSize={20}
        fontFamily={CHALK_FONT}
        fontWeight={600}
        textAnchor="middle"
      >
        {element.leftTitle}
      </text>
      {/* Right title */}
      <text
        x={x + halfWidth + halfWidth / 2}
        y={y + 24}
        fill="#2584B2"
        fontSize={20}
        fontFamily={CHALK_FONT}
        fontWeight={600}
        textAnchor="middle"
      >
        {element.rightTitle}
      </text>
      {/* Center divider */}
      <line
        x1={x + halfWidth}
        y1={y}
        x2={x + halfWidth}
        y2={y + headerOffset + maxItems * lineHeight}
        stroke={element.color}
        strokeWidth={2}
        opacity={0.6}
      />
      {/* Header underline */}
      <line
        x1={x}
        y1={y + 32}
        x2={x + width}
        y2={y + 32}
        stroke={element.color}
        strokeWidth={1}
        opacity={0.4}
      />
      {/* Left items */}
      {element.leftItems.map((item, idx) => (
        <text
          key={`left-${idx}`}
          x={x + 10}
          y={y + headerOffset + idx * lineHeight + 18}
          fill={element.color}
          fontSize={16}
          fontFamily={CHALK_FONT}
        >
          • {item}
        </text>
      ))}
      {/* Right items */}
      {element.rightItems.map((item, idx) => (
        <text
          key={`right-${idx}`}
          x={x + halfWidth + 10}
          y={y + headerOffset + idx * lineHeight + 18}
          fill={element.color}
          fontSize={16}
          fontFamily={CHALK_FONT}
        >
          • {item}
        </text>
      ))}
    </g>
  );
};

/** Renders a number line with marks */
const ChalkNumberLine: React.FC<{
  element: NumberLineElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = toPixels(element.dimensions.width, boardWidth);
  const range = element.max - element.min;
  const tickHeight = 12;

  const toLineX = (val: number) => x + ((val - element.min) / range) * width;

  return (
    <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
      {/* Main line */}
      <line
        x1={x}
        y1={y + 30}
        x2={x + width}
        y2={y + 30}
        stroke={element.color}
        strokeWidth={2}
      />
      {/* Arrow heads */}
      <polygon
        points={`${x - 8},${y + 30} ${x + 4},${y + 24} ${x + 4},${y + 36}`}
        fill={element.color}
      />
      <polygon
        points={`${x + width + 8},${y + 30} ${x + width - 4},${y + 24} ${x + width - 4},${y + 36}`}
        fill={element.color}
      />
      {/* Min/Max labels */}
      <text
        x={x}
        y={y + 55}
        fill={element.color}
        fontSize={14}
        fontFamily={CHALK_FONT}
        textAnchor="middle"
        opacity={0.6}
      >
        {element.min}
      </text>
      <text
        x={x + width}
        y={y + 55}
        fill={element.color}
        fontSize={14}
        fontFamily={CHALK_FONT}
        textAnchor="middle"
        opacity={0.6}
      >
        {element.max}
      </text>
      {/* Marks */}
      {element.marks.map((mark, idx) => {
        const mx = toLineX(mark.value);
        return (
          <g key={`mark-${idx}`}>
            <line
              x1={mx}
              y1={y + 30 - tickHeight}
              x2={mx}
              y2={y + 30 + tickHeight}
              stroke="#F59E0B"
              strokeWidth={2}
            />
            <circle cx={mx} cy={y + 30} r={4} fill="#F59E0B" />
            <text
              x={mx}
              y={y + 30 - tickHeight - 8}
              fill="#F59E0B"
              fontSize={14}
              fontFamily={CHALK_FONT}
              textAnchor="middle"
            >
              {mark.label}
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** Renders a timeline / process flow */
const ChalkTimeline: React.FC<{
  element: TimelineElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = toPixels(element.dimensions.width, boardWidth);
  const events = element.events || [];
  const eventSpacing = events.length > 1 ? width / (events.length - 1) : width;

  return (
    <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
      {/* Main line */}
      <line
        x1={x}
        y1={y + 40}
        x2={x + width}
        y2={y + 40}
        stroke={element.color}
        strokeWidth={2}
        opacity={0.6}
      />
      {/* Events */}
      {events.map((event, idx) => {
        const ex = events.length > 1 ? x + idx * eventSpacing : x + width / 2;
        const isAbove = idx % 2 === 0;
        return (
          <g key={`event-${idx}`}>
            {/* Dot on line */}
            <circle
              cx={ex}
              cy={y + 40}
              r={6}
              fill="#F59E0B"
              stroke={element.color}
              strokeWidth={2}
            />
            {/* Connector line */}
            <line
              x1={ex}
              y1={y + 40}
              x2={ex}
              y2={isAbove ? y + 15 : y + 65}
              stroke={element.color}
              strokeWidth={1}
              opacity={0.5}
            />
            {/* Event text */}
            <text
              x={ex}
              y={isAbove ? y + 10 : y + 80}
              fill={element.color}
              fontSize={14}
              fontFamily={CHALK_FONT}
              textAnchor="middle"
            >
              {event}
            </text>
            {/* Arrow between events */}
            {idx < events.length - 1 && (
              <polygon
                points={`${ex + eventSpacing / 2 + 6},${y + 40} ${ex + eventSpacing / 2 - 2},${y + 36} ${ex + eventSpacing / 2 - 2},${y + 44}`}
                fill={element.color}
                opacity={0.5}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};

/** Renders an annotation callout */
const ChalkAnnotation: React.FC<{
  element: AnnotationElement;
  targetElement?: BlackboardElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, targetElement, boardWidth, boardHeight }) => {
  if (!targetElement) return null;

  const tx = toPixels(targetElement.position.x, boardWidth);
  const ty = toPixels(targetElement.position.y, boardHeight);
  const offset = 80;

  let ax = tx, ay = ty;
  switch (element.annotationPosition) {
    case 'right': ax = tx + offset; ay = ty; break;
    case 'left': ax = tx - offset; ay = ty; break;
    case 'top': ax = tx; ay = ty - offset / 2; break;
    case 'bottom': ax = tx; ay = ty + offset / 2; break;
  }

  return (
    <g opacity={element.opacity} style={{ filter: 'url(#chalk)' }}>
      {/* Connecting line */}
      <line
        x1={tx + 30}
        y1={ty}
        x2={ax}
        y2={ay}
        stroke={element.color}
        strokeWidth={1}
        strokeDasharray="4,3"
        opacity={0.6}
      />
      {/* Annotation text */}
      <text
        x={ax + (element.annotationPosition === 'left' ? -5 : 5)}
        y={ay + 5}
        fill={element.color}
        fontSize={15}
        fontFamily={CHALK_FONT}
        fontStyle="italic"
        textAnchor={element.annotationPosition === 'left' ? 'end' : 'start'}
      >
        {element.text}
      </text>
    </g>
  );
};

/** Renders section boxes */
const SectionBox: React.FC<{
  element: SectionElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const width = toPixels(element.dimensions.width, boardWidth);
  const height = toPixels(element.dimensions.height, boardHeight);

  return (
    <g opacity={element.opacity}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        stroke={element.borderColor || '#FAFAF744'}
        strokeWidth={1}
        strokeDasharray="8,4"
        fill={element.backgroundColor || 'transparent'}
      />
      <text
        x={x + 10}
        y={y - 8}
        fill="#FAFAF788"
        fontSize={16}
        fontFamily={CHALK_FONT}
        fontStyle="italic"
      >
        {element.title}
      </text>
    </g>
  );
};

/** Renders pointer/chalk cursor */
const Pointer: React.FC<{
  pointer: PointerState;
  boardWidth: number;
  boardHeight: number;
}> = ({ pointer, boardWidth, boardHeight }) => {
  if (!pointer.visible) return null;

  const x = toPixels(pointer.position.x, boardWidth);
  const y = toPixels(pointer.position.y, boardHeight);

  switch (pointer.style) {
    case 'laser':
      return (
        <g>
          <circle
            cx={x}
            cy={y}
            r={8}
            fill="#F59E0B"
            opacity={0.8}
          />
          <circle
            cx={x}
            cy={y}
            r={16}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={2}
            opacity={0.4}
          >
            <animate
              attributeName="r"
              values="16;24;16"
              dur="1s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.1;0.4"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      );

    case 'circle':
      return (
        <circle
          cx={x}
          cy={y}
          r={pointer.size}
          fill="none"
          stroke={pointer.color}
          strokeWidth={3}
          opacity={0.8}
        >
          <animate
            attributeName="r"
            values={`${pointer.size};${pointer.size + 5};${pointer.size}`}
            dur="0.5s"
            repeatCount="indefinite"
          />
        </circle>
      );

    case 'chalk':
    default:
      return (
        <g>
          {/* Chalk stick */}
          <rect
            x={x - 4}
            y={y - 20}
            width={8}
            height={20}
            fill="#FAFAF7"
            rx={2}
            transform={`rotate(-30, ${x}, ${y})`}
            style={{ filter: 'url(#chalk)' }}
          />
          {/* Chalk tip glow */}
          <circle
            cx={x}
            cy={y}
            r={4}
            fill={pointer.color}
            opacity={0.8}
          />
        </g>
      );
  }
};

/** Renders highlight effects */
const HighlightEffect: React.FC<{
  highlight: Highlight;
  element: BlackboardElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ highlight, element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);

  switch (highlight.style) {
    case 'glow':
      return (
        <circle
          cx={x + 50}
          cy={y}
          r={60}
          fill="none"
          stroke={highlight.color}
          strokeWidth={4}
          opacity={0.5}
        >
          <animate
            attributeName="opacity"
            values="0.5;0.2;0.5"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      );

    case 'underline':
      return (
        <line
          x1={x}
          y1={y + 30}
          x2={x + 100}
          y2={y + 30}
          stroke={highlight.color}
          strokeWidth={3}
          style={{ filter: 'url(#chalk)' }}
        />
      );

    case 'box':
      return (
        <rect
          x={x - 10}
          y={y - 30}
          width={120}
          height={50}
          fill="none"
          stroke={highlight.color}
          strokeWidth={2}
          rx={4}
        />
      );

    case 'circle':
      return (
        <ellipse
          cx={x + 50}
          cy={y}
          rx={70}
          ry={35}
          fill="none"
          stroke={highlight.color}
          strokeWidth={2}
        />
      );

    default:
      return null;
  }
};

// ============================================================
// RAW SVG SKETCH (escape hatch for diagrams the dedicated tools miss)
// ============================================================

/**
 * Renders the raw SVG payload from `draw_sketch` inside a foreignObject,
 * after DOMPurify sanitization. The original `<svg>` keeps its own
 * viewBox/coordinate system; we just frame it at the requested board
 * position and size.
 */
const SvgRawRenderer: React.FC<{
  element: SvgRawElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const w = toPixels(element.dimensions.width, boardWidth);
  const h = toPixels(element.dimensions.height, boardHeight);

  const sanitized = useMemo(() => {
    return DOMPurify.sanitize(element.svg || '', {
      USE_PROFILES: { svg: true, svgFilters: true },
    });
  }, [element.svg]);

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={element.opacity}
      style={{ filter: 'url(#chalk)', overflow: 'visible' }}
    >
      {/* overflow="visible" on the foreignObject keeps SVG payloads that
          exceed the requested width/height from being hard-cropped at
          their bottom edge — the AI sometimes sizes the dimensions a hair
          too small for its viewBox content (e.g. a pulley diagram with a
          mass block hanging just past the bottom). Letting the sketch
          spill is much less jarring than slicing through a shape mid-
          stroke. The board itself is scrollable, so a tall sketch just
          extends downward. */}
      <foreignObject
        x={0}
        y={0}
        width={w}
        height={h}
        overflow="visible"
      >
        <div
          // @ts-ignore — xmlns on a div is valid inside foreignObject
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: '100%',
            height: '100%',
            color: CHALK_COLORS.white,
            fontFamily: CHALK_FONT,
            overflow: 'visible',
          }}
          // SVG payload is sanitized via DOMPurify above (svg + svgFilters
          // profiles), so script tags / event handlers / javascript: URLs
          // are stripped before this hits the DOM.
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </foreignObject>
    </g>
  );
};

// ============================================================
// PUNNETT SQUARE RENDERER (genetics)
// ============================================================

/**
 * Capital-first allele ordering: "aA" → "Aa". Genetics convention.
 * Pairs alleles letter-by-letter so a dihybrid cross "AB" + "Ab"
 * yields "AABb" (A pairs with A, B pairs with b), not "AABb"
 * misordered.
 */
function combineGametes(top: string, left: string): string {
  if (top.length !== left.length) {
    return top + left;
  }
  const out: string[] = [];
  for (let i = 0; i < top.length; i++) {
    const a = top[i];
    const b = left[i];
    if (a.toLowerCase() === b.toLowerCase()) {
      out.push(a === a.toUpperCase() ? a + b : b + a);
    } else {
      out.push(a + b);
    }
  }
  return out.join('');
}

const PunnettSquareRenderer: React.FC<{
  element: PunnettSquareElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = toPixels(element.position.x, boardWidth);
  const y = toPixels(element.position.y, boardHeight);
  const w = toPixels(element.dimensions.width, boardWidth);
  const h = toPixels(element.dimensions.height, boardHeight);

  const top = element.topGametes ?? [];
  const left = element.leftGametes ?? [];
  const cols = top.length;
  const rows = left.length;

  if (cols === 0 || rows === 0) return null;

  const titleH = 32;
  const headerSize = 28;
  const gridX = headerSize;
  const gridY = titleH + headerSize;
  const gridW = w - headerSize;
  const gridH = h - titleH - headerSize;
  const cellW = gridW / cols;
  const cellH = gridH / rows;

  const cellFontSize = Math.max(
    12,
    Math.min(28, Math.min(cellW, cellH) * 0.45),
  );
  const headerFontSize = Math.max(14, Math.min(26, cellFontSize * 1.1));

  return (
    <g
      transform={`translate(${x}, ${y})`}
      opacity={element.opacity}
      style={{ filter: 'url(#chalk)' }}
    >
      {element.title && (
        <text
          x={w / 2}
          y={20}
          fill={CHALK_COLORS.yellow}
          fontSize={20}
          fontFamily={CHALK_FONT}
          textAnchor="middle"
        >
          {element.title}
        </text>
      )}

      {/* Top gamete labels */}
      {top.map((g, i) => (
        <text
          key={`top-${i}`}
          x={gridX + cellW * (i + 0.5)}
          y={titleH + headerSize * 0.7}
          fill={CHALK_COLORS.yellow}
          fontSize={headerFontSize}
          fontFamily={CHALK_FONT}
          textAnchor="middle"
        >
          {g}
        </text>
      ))}

      {/* Left gamete labels */}
      {left.map((g, i) => (
        <text
          key={`left-${i}`}
          x={headerSize * 0.5}
          y={gridY + cellH * (i + 0.5) + headerFontSize * 0.35}
          fill={CHALK_COLORS.yellow}
          fontSize={headerFontSize}
          fontFamily={CHALK_FONT}
          textAnchor="middle"
        >
          {g}
        </text>
      ))}

      {/* Grid lines */}
      {Array.from({ length: cols + 1 }, (_, i) => (
        <line
          key={`v-${i}`}
          x1={gridX + cellW * i}
          y1={gridY}
          x2={gridX + cellW * i}
          y2={gridY + gridH}
          stroke={CHALK_COLORS.white}
          strokeWidth={1.5}
        />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line
          key={`h-${i}`}
          x1={gridX}
          y1={gridY + cellH * i}
          x2={gridX + gridW}
          y2={gridY + cellH * i}
          stroke={CHALK_COLORS.white}
          strokeWidth={1.5}
        />
      ))}

      {/* Offspring genotypes */}
      {left.map((leftG, r) =>
        top.map((topG, c) => (
          <text
            key={`cell-${r}-${c}`}
            x={gridX + cellW * (c + 0.5)}
            y={gridY + cellH * (r + 0.5) + cellFontSize * 0.35}
            fill={CHALK_COLORS.white}
            fontSize={cellFontSize}
            fontFamily={CHALK_FONT}
            textAnchor="middle"
          >
            {combineGametes(topG, leftG)}
          </text>
        )),
      )}
    </g>
  );
};

// ============================================================
// PAPER SNIPPET (rendered PDF page from an uploaded question paper)
// ============================================================

/**
 * Pins a rasterised PDF page onto the blackboard like a tape-stuck
 * paper note. Sits on a soft cream background so the printed black-on-
 * white question doesn't fight the chalk aesthetic. Sized in board %
 * (width given, height auto-loads from the PNG's natural ratio).
 */
const PaperSnippet: React.FC<{
  element: ImageElement;
  boardWidth: number;
  boardHeight: number;
}> = ({ element, boardWidth, boardHeight }) => {
  const x = (element.position.x / 100) * boardWidth;
  const y = (element.position.y / 100) * boardHeight;
  const w = (element.dimensions.width / 100) * boardWidth;

  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  useEffect(() => {
    if (!element.src) return;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setNaturalRatio(img.naturalHeight / img.naturalWidth);
      }
    };
    img.src = element.src;
  }, [element.src]);

  const h = naturalRatio ? w * naturalRatio : (element.dimensions.height / 100) * boardHeight;
  const captionH = element.caption ? 22 : 0;
  const padding = 12;

  return (
    <g>
      {/* paper-tape backdrop with subtle drop shadow */}
      <rect
        x={x - padding / 2}
        y={y - padding / 2}
        width={w + padding}
        height={h + padding + captionH}
        fill="#F5EFE0"
        stroke="#3a3a3a"
        strokeWidth={1}
        rx={3}
        ry={3}
        style={{ filter: 'drop-shadow(2px 4px 4px rgba(0,0,0,0.4))' }}
      />
      <image
        href={element.src}
        x={x}
        y={y}
        width={w}
        height={h}
        preserveAspectRatio="xMidYMid meet"
      />
      {element.caption && (
        <text
          x={x + w / 2}
          y={y + h + captionH * 0.7}
          textAnchor="middle"
          fontFamily={CHALK_FONT}
          fontSize={14}
          fill="#1a1a1a"
        >
          {element.caption}
        </text>
      )}
    </g>
  );
};

// ============================================================
// STRIKE-THROUGH OVERLAY (used when element.struck === true)
// ============================================================

/**
 * Renders the inner element, then overlays a red-chalk diagonal strike,
 * an optional teacher's correction note, and an optional replacement
 * value drawn just below. Measures the inner content's bounding box
 * after paint so the strike spans whatever is actually on screen.
 */
const StruckElementWrapper: React.FC<{
  element: BlackboardElement;
  boardWidth: number;
  boardHeight: number;
  children: React.ReactNode;
}> = ({ element, boardWidth, boardHeight, children }) => {
  const contentRef = useRef<SVGGElement | null>(null);
  const [bbox, setBbox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    let raf = 0;
    const measure = () => {
      try {
        const b = contentRef.current?.getBBox();
        if (b && b.width > 0 && b.height > 0) {
          setBbox({ x: b.x, y: b.y, width: b.width, height: b.height });
        }
      } catch {
        // getBBox can fail on hidden elements
      }
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [element.id, element.struck, element.replacement, element.correctionNote]);

  if (!element.struck) {
    return <>{children}</>;
  }

  const STRIKE_COLOR = '#C9302D'; // soft red chalk
  const NOTE_COLOR = '#C9302D';

  return (
    <>
      <g ref={contentRef}>{children}</g>
      {bbox && (
        <g style={{ pointerEvents: 'none' }}>
          {/* diagonal strike across the bbox */}
          <line
            x1={bbox.x}
            y1={bbox.y + bbox.height / 2}
            x2={bbox.x + bbox.width}
            y2={bbox.y + bbox.height / 2}
            stroke={STRIKE_COLOR}
            strokeWidth={3}
            strokeLinecap="round"
            style={{ filter: 'url(#chalk)' }}
          />
          {element.correctionNote && (
            <text
              x={bbox.x + bbox.width + 12}
              y={bbox.y + bbox.height / 2 + 6}
              fill={NOTE_COLOR}
              fontSize={18}
              fontFamily={CHALK_FONT}
              fontStyle="italic"
            >
              {element.correctionNote}
            </text>
          )}
          {element.replacement && (
            <text
              x={bbox.x}
              y={bbox.y + bbox.height + 28}
              fill={CHALK_COLORS.white}
              fontSize={24}
              fontFamily={CHALK_FONT}
            >
              {element.replacement}
            </text>
          )}
        </g>
      )}
    </>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export interface BlackboardCanvasProps {
  width?: number;
  height?: number;
  boardColor?: string;
  className?: string;
  showGrid?: boolean;
  onElementClick?: (element: BlackboardElement) => void;
  // External state (when using with useBlackboardConnection)
  externalElements?: Map<string, BlackboardElement>;
  externalPointer?: PointerState;
  externalHighlights?: Highlight[];
  // Animation control - only animate on live slide, not when viewing history
  enableAnimations?: boolean;
  // Layout measurement callback — called after each element renders with its actual height
  onElementMeasured?: (id: string, heightPercent: number) => void;
}

export const BlackboardCanvas: React.FC<BlackboardCanvasProps> = ({
  width = 1200,
  height = 800,
  boardColor = BOARD_COLORS.dark_green,
  className = '',
  showGrid = false,
  onElementClick,
  externalElements,
  externalPointer,
  externalHighlights,
  enableAnimations = true,
  onElementMeasured,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Get state from hook (fallback if no external state provided)
  const internalState = useBlackboardState();

  // Use external state if provided, otherwise use internal
  const elements = externalElements ?? internalState.elements;
  const pointer = externalPointer ?? internalState.pointer;
  const highlights = externalHighlights ?? internalState.highlights;

  // Track new elements for entrance animations
  const prevElementIdsRef = useRef<Set<string>>(new Set());
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enableAnimations) {
      prevElementIdsRef.current = new Set(elements.keys());
      return;
    }

    const currentIds = new Set(elements.keys());
    const prevIds = prevElementIdsRef.current;

    // Find IDs that are in current but not in previous
    const newIds = new Set<string>();
    currentIds.forEach(id => {
      if (!prevIds.has(id)) {
        newIds.add(id);
      }
    });

    prevElementIdsRef.current = currentIds;

    if (newIds.size > 0) {
      setAnimatingIds(prev => {
        const merged = new Set(prev);
        newIds.forEach(id => merged.add(id));
        return merged;
      });

      // Remove animation class after animation completes (600ms)
      const timeout = setTimeout(() => {
        setAnimatingIds(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => updated.delete(id));
          return updated;
        });
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [elements, enableAnimations]);

  // Sort elements by zIndex for proper layering
  const sortedElements = useMemo(() => {
    return Array.from(elements.values())
      .filter(el => el.visible)
      .sort((a, b) => a.zIndex - b.zIndex);
  }, [elements]);

  // Compute the lowest content bottom (in % of board height) so the SVG
  // grows past 100% when the teacher keeps writing. Mirrors the height
  // estimates we use elsewhere; rough is fine — the wrapper scrolls.
  //
  // The board is taller than the viewport by default (DEFAULT_BOARD_PCT)
  // so the AI can place content at any Y between 5–200 without first
  // having to "fill" the visible area. Without this floor, an early
  // call like draw_text(y=120) would have nothing for the wrapper to
  // scroll to, since the SVG would still be sized to one viewport.
  const DEFAULT_BOARD_PCT = 220;
  const virtualHeightPx = useMemo(() => {
    let maxBottomPct = 0;
    sortedElements.forEach((el) => {
      const yPct = el.position?.y ?? 0;
      const dims = (el as { dimensions?: { height?: number } }).dimensions;
      let estHeightPct = 8;
      if (dims && typeof dims.height === 'number') {
        estHeightPct = dims.height;
      } else {
        switch (el.type) {
          case 'text': estHeightPct = 5; break;
          case 'latex': estHeightPct = 6; break;
          case 'arrow':
          case 'line': {
            const endY = (el as { endPosition?: { y?: number } }).endPosition?.y ?? yPct;
            estHeightPct = Math.abs(endY - yPct) || 4;
            break;
          }
          case 'annotation': estHeightPct = 4; break;
          case 'image': estHeightPct = 45; break;
          default: estHeightPct = 8;
        }
      }
      const bottomPct = yPct + estHeightPct;
      if (bottomPct > maxBottomPct) maxBottomPct = bottomPct;
    });
    // Floor at the default tall-board size; grow further only when the
    // teacher writes past it (with a small pad).
    const finalPct = maxBottomPct > DEFAULT_BOARD_PCT
      ? maxBottomPct + 5
      : DEFAULT_BOARD_PCT;
    return (finalPct / 100) * height;
  }, [sortedElements, height]);

  // Render individual element based on type, with optional entrance animation
  const renderElement = useCallback((element: BlackboardElement) => {
    const key = element.id;
    const isAnimating = enableAnimations && animatingIds.has(element.id);

    let inner: React.ReactNode = null;

    switch (element.type) {
      case 'text':
        inner = (
          <ChalkText
            element={element as TextElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'latex':
        inner = (
          <LatexEquation
            element={element as LatexElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'shape':
        inner = (
          <ChalkShape
            element={element as ShapeElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'arrow':
        inner = (
          <ChalkArrow
            element={element as ArrowElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'line':
        inner = (
          <ChalkLine
            element={element as LineElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'graph':
        inner = (
          <GraphPlot
            element={element as GraphElement & { expression?: string; color?: string }}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'section':
        inner = (
          <SectionBox
            element={element as SectionElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'diagram':
        inner = (
          <DiagramRenderer
            element={element}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'table':
        inner = (
          <ChalkTable
            element={element as TableElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'bullet_list':
        inner = (
          <ChalkBulletList
            element={element as BulletListElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'comparison':
        inner = (
          <ChalkComparison
            element={element as ComparisonElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'number_line':
        inner = (
          <ChalkNumberLine
            element={element as NumberLineElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'timeline':
        inner = (
          <ChalkTimeline
            element={element as TimelineElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'annotation':
        inner = (
          <ChalkAnnotation
            element={element as AnnotationElement}
            targetElement={elements.get((element as AnnotationElement).targetElementId)}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'svg_raw':
        inner = (
          <SvgRawRenderer
            element={element as SvgRawElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'punnett_square':
        inner = (
          <PunnettSquareRenderer
            element={element as PunnettSquareElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      case 'image':
        inner = (
          <PaperSnippet
            element={element as ImageElement}
            boardWidth={width}
            boardHeight={height}
          />
        );
        break;

      default:
        return null;
    }

    if (!inner) return null;

    // Determine animation class based on element type
    let animClass: string | undefined;
    if (isAnimating) {
      const elType = element.type;
      if (elType === 'line' || elType === 'arrow') {
        animClass = 'bb-stroke-draw';
      } else {
        animClass = 'bb-chalk-reveal';
      }
    }

    // Wrap with measurement + animation group
    return (
      <g
        key={key}
        className={animClass}
        ref={(gEl) => {
          // Measure after render for layout correction
          if (gEl && onElementMeasured && isAnimating) {
            // Use requestAnimationFrame to measure after paint
            requestAnimationFrame(() => {
              try {
                const bbox = gEl.getBBox();
                if (bbox.height > 0) {
                  const heightPercent = (bbox.height / height) * 100;
                  onElementMeasured(element.id, heightPercent);
                }
              } catch {
                // getBBox can fail for hidden elements
              }
            });
          }
        }}
      >
        <StruckElementWrapper element={element} boardWidth={width} boardHeight={height}>
          {inner}
        </StruckElementWrapper>
      </g>
    );
  }, [width, height, enableAnimations, animatingIds, elements, onElementMeasured]);

  // Render grid if enabled
  const renderGrid = useCallback(() => {
    if (!showGrid) return null;

    const lines: JSX.Element[] = [];
    const spacing = 50; // pixels

    // Vertical lines
    for (let x = 0; x <= width; x += spacing) {
      lines.push(
        <line
          key={`vg-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#FAFAF711"
          strokeWidth={1}
        />
      );
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += spacing) {
      lines.push(
        <line
          key={`hg-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#FAFAF711"
          strokeWidth={1}
        />
      );
    }

    return <g className="grid">{lines}</g>;
  }, [showGrid, width, height]);

  return (
    <div
      className={`blackboard-container ${className}`}
      style={{
        // Fill the parent column. The flex parent (`items-stretch`)
        // gives this both 100% width and 100% height; we drop the fixed
        // pixel cap (was maxWidth/maxHeight = BOARD_WIDTH/HEIGHT) so the
        // board grows with the viewport instead of leaving big empty
        // gutters at typical desktop sizes. Aspect ratio is preserved
        // by the SVG inside via preserveAspectRatio="xMinYMin meet" —
        // the wooden frame just fills its slot.
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
        backgroundColor: boardColor,
      }}
    >
      {/* Wooden frame — brown border around the board (matches Padhai247). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '12px solid #5D4037',
          borderRadius: '8px',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
        }}
      />

      {/* Scrollable inner area — sits inside the frame, scrolls vertically
         as the teacher keeps writing past the original viewport. */}
      <div
        style={{
          position: 'absolute',
          inset: '12px',
          overflowY: 'auto',
          overflowX: 'hidden',
          backgroundColor: boardColor,
        }}
      >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${virtualHeightPx}`}
        preserveAspectRatio="xMinYMin meet"
        style={{
          width: '100%',
          height: 'auto',
          backgroundColor: boardColor,
          display: 'block',
        }}
      >
        {/* Definitions for filters and effects */}
        <defs>
          {/* Re-skinned for the paper/worksheet look: identity pass-through so
             "ink" renders crisp (no chalk roughness). Kept as id="chalk" so the
             ~40 filter:url(#chalk) references across renderers need no changes. */}
          <filter id="chalk">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"
            />
          </filter>

          {/* Glow effect */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Board texture gradient */}
          <pattern id="boardTexture" patternUnits="userSpaceOnUse" width="100" height="100">
            <rect width="100" height="100" fill={boardColor} />
            <circle cx="20" cy="30" r="1" fill="#FAFAF705" />
            <circle cx="70" cy="60" r="0.5" fill="#FAFAF705" />
            <circle cx="45" cy="85" r="0.8" fill="#FAFAF705" />
          </pattern>
        </defs>

        {/* Board background with subtle texture */}
        <rect
          width={width}
          height={height}
          fill="url(#boardTexture)"
        />

        {/* Optional grid */}
        {renderGrid()}

        {/* Section boxes (rendered first, lowest z-index) */}
        {sortedElements
          .filter(el => el.type === 'section')
          .map(renderElement)}

        {/* All other elements */}
        {sortedElements
          .filter(el => el.type !== 'section')
          .map(renderElement)}

        {/* Highlights */}
        {highlights.map(highlight => {
          const element = elements.get(highlight.elementId);
          if (!element) return null;
          return (
            <HighlightEffect
              key={`highlight-${highlight.elementId}`}
              highlight={highlight}
              element={element}
              boardWidth={width}
              boardHeight={height}
            />
          );
        })}

        {/* Pointer */}
        <Pointer
          pointer={pointer}
          boardWidth={width}
          boardHeight={height}
        />
      </svg>
      </div>

    </div>
  );
};

export default BlackboardCanvas;
