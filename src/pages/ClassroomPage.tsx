// AI Classroom page — voice tutor + brand-skinned blackboard, gated to paid
// plans. Resolves the signed-in Firebase user, checks the plan (same pattern
// as PracticeApp), and only then mounts the live VoiceBlackboard.
import React from 'react';
import { VoiceBlackboard } from '../components/VoiceBlackboard';
// firebase.js is plain JS (no types) — imported for side-effect-free helpers.
// @ts-ignore - JS module without declarations
import { onUserChanged, isFirebaseConfigured, getUserDoc } from '../firebase.js';
// @ts-ignore - JS module without declarations
import { planAllows } from '../data/tests.js';

// Map a Firebase uid → a stable positive integer studentId for the backend.
// (The backend keys per-session state by user_id+session_id; this just keeps
// different signed-in users from colliding on the default id.)
function uidToStudentId(uid: string | null | undefined): number {
  if (!uid) return 1;
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0;
  return Math.abs(h) % 1_000_000 + 1;
}

type Gate = 'resolving' | 'allowed' | 'denied';

export function ClassroomPage() {
  // When Firebase isn't configured (local dev, no .env), allow through so the
  // page is reachable for development — mirrors PracticeApp's behavior.
  const [gate, setGate] = React.useState<Gate>(isFirebaseConfigured() ? 'resolving' : 'allowed');
  const [studentId, setStudentId] = React.useState<number>(1);

  // A question can be handed off from the practice page ("Ask the AI tutor").
  // Read + clear it once; the classroom auto-sends it after connecting.
  const [seedPrompt] = React.useState<string | undefined>(() => {
    try {
      const s = sessionStorage.getItem('isatprep:classroom-seed');
      if (s) sessionStorage.removeItem('isatprep:classroom-seed');
      return s || undefined;
    } catch {
      return undefined;
    }
  });

  React.useEffect(() => {
    if (!isFirebaseConfigured()) return undefined;
    const unsub = onUserChanged(async (u: any) => {
      if (!u) { setGate('denied'); return; }
      setStudentId(uidToStudentId(u.uid));
      const doc = await getUserDoc();
      setGate(planAllows((doc && doc.plan) || 'free', 'core') ? 'allowed' : 'denied');
    });
    return () => unsub();
  }, []);

  if (gate === 'resolving') {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-text-muted font-sans">
        Loading your classroom…
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div className="h-screen flex items-center justify-center bg-background font-sans p-6">
        <div className="max-w-md text-center bg-surface border border-border rounded-2xl shadow-soft p-8">
          <h1 className="font-serif text-2xl text-text mb-2">The AI Classroom is a paid feature.</h1>
          <p className="text-text-muted mb-6">
            Unlock the live voice tutor and the interactive board with any paid plan.
          </p>
          <a
            href="index.html#pricing"
            className="inline-block px-5 py-2.5 bg-amber hover:bg-amber-ink text-white rounded-xl transition-colors"
          >
            See plans →
          </a>
          <div className="mt-4">
            <a href="topics.html" className="text-sm text-text-dim hover:text-text">← Back to topics</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <VoiceBlackboard
        studentId={studentId}
        targetExam="sat"
        languageCode="en-US"
        initialPrompt={seedPrompt}
        className="h-full"
      />
    </div>
  );
}

export default ClassroomPage;
