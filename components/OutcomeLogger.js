'use client';

import { useState } from 'react';
import { OUTCOME_OPTIONS } from '@/lib/constants';

export default function OutcomeLogger({ entryId, existingOutcome, onLogged }) {
  const [selectedOutcome, setSelectedOutcome] = useState(existingOutcome || '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!existingOutcome);

  async function handleSave() {
    if (!selectedOutcome) return;
    setSaving(true);
    try {
      const res = await fetch('/api/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entryId,
          outcome: selectedOutcome,
          outcome_notes: notes,
        }),
      });
      if (res.ok) {
        setSaved(true);
        if (onLogged) onLogged(selectedOutcome);
      }
    } catch (err) {
      console.error('Failed to save outcome:', err);
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    const outcomeLabel = OUTCOME_OPTIONS.find((o) => o.value === (existingOutcome || selectedOutcome));
    return (
      <div className="outcome-logged">
        <span>Outcome logged: <strong>{outcomeLabel?.label || selectedOutcome}</strong></span>
      </div>
    );
  }

  return (
    <div className="outcome-logger">
      <label className="form-label">How did it go?</label>
      <div className="outcome-options">
        {OUTCOME_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`outcome-option ${selectedOutcome === opt.value ? 'selected' : ''}`}
            onClick={() => setSelectedOutcome(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {selectedOutcome && (
        <>
          <textarea
            className="form-textarea form-textarea-sm"
            placeholder="Any notes on what happened? (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
          <div style={{ marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className={`btn btn-primary btn-sm ${saving ? 'btn-loading' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              <span className="btn-text">Save Outcome</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
