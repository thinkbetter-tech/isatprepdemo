// Question Explanation Animations — renderer.
// Reads ?q=N from the URL, looks up that question in EXPLAIN_DATA /
// EXPLAIN_BEATS, and drives a two-column walkthrough: passage on the left
// (with role-styled highlights that build up beat by beat), answer choices
// on the right (knocked one by one, correct one rings amber at the end).
//
// Different architecture from the lesson pages: the passage and choices
// panels persist for the whole runtime. The active beat's payload tells
// the renderer which highlights are on, which choices are eliminated,
// what trace caption to show, and when to ring the correct answer.

import React from 'react';
import { EXPLAIN_DATA, EXPLAIN_BEATS } from './data/explainBeats.js';

const { useState, useEffect, useRef, useMemo } = React;

// ── URL routing ─────────────────────────────────────────────────────────

function getQuestionId() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("q");
  const n = parseInt(raw, 10);
  return (n >= 1 && n <= 4) ? n : 1;
}

// ── Audio time tracking ─────────────────────────────────────────────────

function useAudioTime(audioRef) {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let raf = 0;
    const tick = () => {
      setTime(audio.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const onSeek = () => setTime(audio.currentTime);
    audio.addEventListener("play", start);
    audio.addEventListener("pause", stop);
    audio.addEventListener("ended", stop);
    audio.addEventListener("seeked", onSeek);
    return () => {
      audio.removeEventListener("play", start);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("ended", stop);
      audio.removeEventListener("seeked", onSeek);
      stop();
    };
  }, [audioRef]);
  return time;
}

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function findActiveBeat(currentTime, beats) {
  let active = null;
  for (const beat of beats) {
    if (beat.offset <= currentTime) active = beat;
    else break;
  }
  return active;
}

// ── Passage rendering with highlight roles ─────────────────────────────
// Strips any ||...|| visible-underline markers (used by Q1) so we can
// match highlight spans against the clean text. Then segments the
// passage into a list of { text, role | null } pieces by locating each
// highlight span in the clean text.

function stripUnderlineMarkers(text) {
  // ||span|| → span; remembers nothing, the role does the styling.
  return text.replace(/\|\|/g, "");
}

function segmentPassage(passageText, highlights) {
  const text = stripUnderlineMarkers(passageText);
  if (!highlights || highlights.length === 0) {
    return [{ text, role: null }];
  }
  // Resolve each highlight to a {start, end, role, caption} interval.
  // If a span isn't found (e.g. a typo in the beats file), skip it.
  const intervals = [];
  highlights.forEach((h) => {
    const idx = text.indexOf(h.span);
    if (idx >= 0) intervals.push({ start: idx, end: idx + h.span.length, role: h.role, caption: h.caption });
  });
  intervals.sort((a, b) => a.start - b.start);
  // Walk the text, emitting plain or highlighted segments. Overlap-free
  // by design — the authoring rule for this lesson is non-overlapping spans.
  const segments = [];
  let cursor = 0;
  intervals.forEach((iv) => {
    if (iv.start > cursor) {
      segments.push({ text: text.slice(cursor, iv.start), role: null });
    }
    if (iv.start >= cursor) {
      segments.push({ text: text.slice(iv.start, iv.end), role: iv.role });
      cursor = iv.end;
    }
  });
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), role: null });
  }
  return segments;
}

// ── Header ──────────────────────────────────────────────────────────────

function Header({ data, audioRef, currentTime }) {
  return (
    <header className="explain-header">
      <a href="practice.html" className="explain-back mono">← Back to practice</a>
      <div className="explain-header-title">
        <span className="brand-mark mono">i</span>
        <span className="serif">{data.title}</span>
        <span className="explain-header-type mono">{data.type}</span>
      </div>
      <div className="explain-header-clock mono">
        {formatTime(currentTime)} / {formatTime(data.duration)}
      </div>
      <audio ref={audioRef}
             src={data.audio}
             controls
             preload="auto"
             className="explain-audio" />
    </header>
  );
}

// ── Passage panel ──────────────────────────────────────────────────────

function PassagePanel({ data, activeBeat }) {
  const highlights = activeBeat && activeBeat.payload.highlights || [];
  const trace = activeBeat && activeBeat.payload.trace;

  // Extract the question prompt + intro lines from the passage. Many of
  // these passages lead with a brief italicized framing paragraph (Q1
  // has one); split on the first \n\n if present.
  const [intro, body] = useMemo(() => {
    const split = data.passage.split("\n\n");
    return split.length > 1
      ? [split[0], split.slice(1).join("\n\n")]
      : [null, data.passage];
  }, [data.passage]);

  const introSegments = intro ? segmentPassage(intro, highlights) : null;
  const bodySegments = segmentPassage(body, highlights);

  // Captions: pull the caption (if any) per highlight in display order.
  // Show them as a thin column to the right of the passage so they index
  // each role without crowding the prose.
  const captionedHighlights = highlights.filter((h) => h.caption);

  return (
    <div className="explain-passage">
      <div className="explain-passage-prompt mono">{data.prompt}</div>
      <div className="explain-passage-text serif">
        {intro && (
          <p className="explain-passage-intro">
            {renderSegments(introSegments)}
          </p>
        )}
        <p className="explain-passage-body">
          {renderSegments(bodySegments)}
        </p>
      </div>
      {captionedHighlights.length > 0 && (
        <div className="explain-passage-captions">
          {captionedHighlights.map((h, i) => (
            <div key={`${h.role}-${i}`}
                 className={`explain-caption-pill role-${h.role} mono`}>
              <span className="explain-caption-dot" />
              <span className="explain-caption-text">{h.caption}</span>
            </div>
          ))}
        </div>
      )}
      {trace && (
        <div className="explain-trace serif">{trace.caption}</div>
      )}
    </div>
  );
}

function renderSegments(segments) {
  return segments.map((seg, i) => {
    if (seg.role) {
      return (
        <span key={i} className={`explain-hl role-${seg.role}`}>
          {seg.text}
        </span>
      );
    }
    return <React.Fragment key={i}>{seg.text}</React.Fragment>;
  });
}

// ── Choices panel ──────────────────────────────────────────────────────
// Each choice is in one of three states derived from the active beat:
//   • "dim"        — neutral, untouched
//   • "eliminated" — struck through, brief reason in italic beneath
//   • "correct"    — amber ring, checkmark glyph
// The teacher knocks A/C/D in sequence within a single "knock" beat —
// the renderer staggers their appearance via CSS animation delays based
// on the position in payload.knocked.

function ChoicesPanel({ data, activeBeat }) {
  const knocked = (activeBeat && activeBeat.payload.knocked) || [];
  const ringCorrect = activeBeat && activeBeat.payload.ringCorrect;
  const finalAnswer = activeBeat && activeBeat.payload.answer;

  // Determine each choice's state.
  const choiceState = {};
  data.choices.forEach((c) => {
    let state = "dim";
    if (finalAnswer && c.letter === finalAnswer) state = "correct";
    else if (ringCorrect && c.letter === data.correct) state = "correct";
    else if (knocked.find((k) => k.letter === c.letter)) state = "eliminated";
    choiceState[c.letter] = state;
  });
  // Reason text per knocked letter.
  const knockReasons = {};
  knocked.forEach((k, idx) => { knockReasons[k.letter] = { reason: k.reason, idx }; });

  return (
    <div className="explain-choices">
      <div className="explain-choices-header">
        <div className="explain-choices-type mono">{data.type}</div>
        <div className="explain-choices-subtitle serif">{data.typeSubtitle}</div>
      </div>
      <div className="explain-choices-list">
        {data.choices.map((c) => {
          const state = choiceState[c.letter];
          const knock = knockReasons[c.letter];
          return (
            <div key={c.letter}
                 className={`explain-choice state-${state}`}
                 style={knock ? { animationDelay: `${0.2 + knock.idx * 1.6}s` } : undefined}>
              <div className="explain-choice-letter serif">{c.letter}</div>
              <div className="explain-choice-body">
                <div className="explain-choice-text">{c.text}</div>
                {knock && (
                  <div className="explain-choice-reason mono"
                       style={{ animationDelay: `${0.6 + knock.idx * 1.6}s` }}>
                    {knock.reason}
                  </div>
                )}
              </div>
              {state === "correct" && (
                <div className="explain-choice-check" aria-hidden="true">✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Intro overlay ──────────────────────────────────────────────────────
// During the "intro" phase, a large stamp overlays the stage announcing
// the question type. It fades out as the next beat takes over.

function IntroOverlay({ activeBeat }) {
  if (!activeBeat || activeBeat.phase !== "intro") return null;
  const { introText, introSubtitle } = activeBeat.payload;
  return (
    <div className="explain-intro-overlay">
      <div className="explain-intro-stamp serif">{introText}</div>
      {introSubtitle && (
        <div className="explain-intro-subtitle mono">{introSubtitle}</div>
      )}
    </div>
  );
}

// ── Answer overlay ─────────────────────────────────────────────────────
// During the "answer" phase, a final stamp appears center-stage with the
// correct letter and the move name.

function AnswerOverlay({ activeBeat, data }) {
  if (!activeBeat || activeBeat.phase !== "answer") return null;
  const { answer, caption } = activeBeat.payload;
  return (
    <div className="explain-answer-overlay">
      <div className="explain-answer-stamp">
        <span className="explain-answer-label mono">Answer</span>
        <span className="explain-answer-letter serif">{answer}</span>
      </div>
      {caption && (
        <div className="explain-answer-caption serif">{caption}</div>
      )}
    </div>
  );
}

// ── App ─────────────────────────────────────────────────────────────────

function ExplainApp() {
  const questionId = getQuestionId();
  const data = EXPLAIN_DATA[questionId];
  const beats = EXPLAIN_BEATS[questionId];
  const audioRef = useRef(null);
  const currentTime = useAudioTime(audioRef);
  const activeBeat = useMemo(
    () => findActiveBeat(currentTime, beats),
    [currentTime, beats]
  );

  if (!data) {
    return (
      <div className="explain-app">
        <div className="explain-missing">
          <h2 className="serif">Question not found.</h2>
          <p className="mono"><a href="practice.html">← Back to practice</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="explain-app">
      <Header data={data} audioRef={audioRef} currentTime={currentTime} />
      <div className="explain-body">
        <PassagePanel data={data} activeBeat={activeBeat} />
        <ChoicesPanel data={data} activeBeat={activeBeat} />
      </div>
      <IntroOverlay activeBeat={activeBeat} />
      <AnswerOverlay activeBeat={activeBeat} data={data} />
    </div>
  );
}

export { ExplainApp };
