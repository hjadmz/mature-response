'use client';

import { useState } from 'react';
import SituationCard from '@/components/SituationCard';
import AnalysisResult from '@/components/AnalysisResult';
import AnalyzingState from '@/components/AnalyzingState';

export default function HomePage() {
  const [state, setState] = useState('input'); // 'input' | 'loading' | 'result' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

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

  return (
    <div className="page-container">
      <h1 className="page-title">Analyze</h1>
      <p className="page-subtitle">
        Whether you got a message or want to send one, get one calm, clear next step —
        plus the pattern to remember for next time.
      </p>

      {state === 'input' && (
        <SituationCard onSubmit={handleSubmit} isLoading={false} />
      )}

      {state === 'loading' && <AnalyzingState />}

      {state === 'result' && result && (
        <AnalysisResult result={result} onReset={handleReset} />
      )}

      {state === 'error' && (
        <div className="card card-elevated">
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
          <button type="button" className="btn btn-secondary" onClick={handleReset}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
