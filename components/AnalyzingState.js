'use client';

import { useState, useEffect } from 'react';

// The one place the app can feel slow: a local model on its first run takes
// 20-40s while it loads into memory. Rather than a static "a few seconds"
// spinner, show real elapsed time and narrate the actual reasoning steps, so
// the wait reads as work rather than a hang.
const STEPS = [
  'Reading the message…',
  'Separating tone from intent…',
  'Weighing your options…',
  'Checking it against what has worked for you…',
  'Putting it in plain words…',
];

const STEP_MS = 3500;       // advance the narration roughly every 3.5s
const FIRST_RUN_HINT_S = 8; // after this, reassure that the first run is slower

export default function AnalyzingState() {
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
    const advance = setInterval(
      () => setStep((s) => Math.min(s + 1, STEPS.length - 1)),
      STEP_MS
    );
    return () => { clearInterval(tick); clearInterval(advance); };
  }, []);

  return (
    <div className="card card-elevated">
      <div className="analyzing-state" role="status" aria-live="polite">
        <div className="analyzing-spinner" />
        <div className="analyzing-text">{STEPS[step]}</div>
        <div className="analyzing-elapsed numeric">{elapsed}s</div>
        {elapsed >= FIRST_RUN_HINT_S && (
          <div className="analyzing-subtext">
            First run loads the model into memory — this one is slower. Later runs are quick.
          </div>
        )}
      </div>
    </div>
  );
}
