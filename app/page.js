'use client';

import { useState, useRef, useEffect } from 'react';
import SituationCard from '@/components/SituationCard';
import AnalysisResult from '@/components/AnalysisResult';
import AnalyzingState from '@/components/AnalyzingState';

export default function HomePage() {
  const [state, setState] = useState('input'); // 'input' | 'loading' | 'result' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const retryRef = useRef(null);

  // A failed analysis unmounts the button the user pressed, so focus would
  // fall to <body> and the next Tab would restart at the navbar. Put it on
  // "Try again" instead — the one thing they need next.
  useEffect(() => {
    if (state === 'error') retryRef.current?.focus();
  }, [state]);

  // Returning to the form also unmounts the button that was pressed, so put
  // focus in the message field — but never on first load, where stealing
  // focus would scroll the page before the reader has seen it.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (state === 'input') document.getElementById('message-input')?.focus();
  }, [state]);

  async function handleSubmit(formData) {
    setState('loading');
    setError('');
    setHint('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Analysis failed.');
        setHint(data.hint || '');
        setState('error');
        return;
      }

      setResult(data);
      setState('result');
    } catch (err) {
      setError('Could not reach the app.');
      setHint('Check that the server is running, then try again.');
      setState('error');
    }
  }

  function handleReset() {
    setState('input');
    setResult(null);
    setError('');
    setHint('');
  }

  // The form stays mounted through loading and failure so a message the user
  // spent minutes on is never thrown away by a dependency that wasn't running.
  // Only the result state unmounts it: "start over" genuinely means a new
  // situation. Hidden rather than unmounted, so /api/models isn't refetched.
  const formMounted = state === 'input' || state === 'loading' || state === 'error';

  return (
    <div className="page-container">
      <h1 className="page-title">Analyze</h1>
      <p className="page-subtitle">
        Whether you got a message or want to send one, get one calm, clear next step —
        plus the pattern to remember for next time.
      </p>

      {state === 'error' && (
        <div className="card card-elevated" role="alert">
          <div className="eyebrow" style={{ color: 'var(--color-error)', marginBottom: 'var(--space-2)' }}>
            Analysis failed
          </div>
          <p style={{ color: 'var(--fg-1)', marginBottom: hint ? 'var(--space-2)' : 'var(--space-5)' }}>
            {error}
          </p>
          {hint && (
            <p style={{ color: 'var(--fg-2)', fontSize: 'var(--step--1)', marginBottom: 'var(--space-5)' }}>
              {hint}
            </p>
          )}
          <button type="button" className="btn btn-secondary" onClick={handleReset} ref={retryRef}>
            Try again
          </button>
          <p style={{ color: 'var(--fg-3)', fontSize: 'var(--step--1)', marginTop: 'var(--space-3)', marginBottom: 0 }}>
            Nothing you typed was lost.
          </p>
        </div>
      )}

      {state === 'loading' && <AnalyzingState />}

      {formMounted && (
        <div hidden={state !== 'input'}>
          <SituationCard onSubmit={handleSubmit} isLoading={state === 'loading'} />
        </div>
      )}

      {state === 'result' && result && (
        <AnalysisResult result={result} onReset={handleReset} />
      )}
    </div>
  );
}
