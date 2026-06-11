'use client';

import { useState, useEffect, useCallback } from 'react';
import { CONTEXT_TYPES, PERCEIVED_TONES, DESIRED_OUTCOMES, FEELINGS, MODES, EXAMPLE_SITUATIONS } from '@/lib/constants';

export default function SituationCard({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    mode: 'response',
    message_text: '',
    context_type: 'online',
    perceived_tone: 'unclear',
    emotional_reaction: 5,
    feeling: 'calm',
    desired_outcome: '',
    optional_note: '',
  });
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [showNote, setShowNote] = useState(false);

  const isComm = formData.mode === 'communication';

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.models && data.models.length > 0) {
        setModels(data.models);
        const defaultModel = data.models.find((m) => m.name.includes('llama3:8b'));
        setSelectedModel(defaultModel ? defaultModel.name : data.models[0].name);
      }
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setModelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // One tap loads a realistic situation into every relevant field.
  function applyExample(ex) {
    setFormData((prev) => ({
      ...prev,
      message_text: ex.message ?? prev.message_text,
      context_type: ex.context_type ?? prev.context_type,
      perceived_tone: ex.perceived_tone ?? prev.perceived_tone,
      feeling: ex.feeling ?? prev.feeling,
      emotional_reaction: ex.emotional_reaction ?? prev.emotional_reaction,
      desired_outcome: ex.desired_outcome ?? prev.desired_outcome,
    }));
  }

  function submit() {
    if (isLoading || !formData.message_text.trim() || models.length === 0) return;
    onSubmit({
      ...formData,
      perceived_tone: isComm ? null : formData.perceived_tone,
      model: selectedModel,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit();
  }

  // Cmd/Ctrl+Enter sends from anywhere in the form — the expected power move.
  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  const examples = EXAMPLE_SITUATIONS[formData.mode] || [];
  const showExamples = !formData.message_text.trim();

  const noModels = !modelsLoading && models.length === 0;

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="card card-elevated">
      {/* Mode Toggle */}
      <div className="mode-toggle" role="group" aria-label="Mode">
        {Object.values(MODES).map((m) => (
          <button
            key={m.value}
            type="button"
            aria-pressed={formData.mode === m.value}
            className={`mode-toggle-option ${formData.mode === m.value ? 'active' : ''}`}
            onClick={() => handleChange('mode', m.value)}
          >
            <span className="mode-toggle-label">{m.label}</span>
            <span className="mode-toggle-tagline">{m.tagline}</span>
          </button>
        ))}
      </div>

      {noModels && (
        <div className="notice notice-error" role="alert">
          Ollama is not running. Start it with <code>ollama serve</code>, then reload.
        </div>
      )}

      {/* Section: the situation */}
      <section className="form-section">
        <div className="form-section-title">{isComm ? 'What you want to say' : 'The situation'}</div>
        <div className="form-group">
          <label className="form-label" htmlFor="message-input">
            {isComm ? 'Your message or situation' : 'Message received'}
          </label>
          <textarea
            id="message-input"
            className="form-textarea"
            placeholder={isComm
              ? 'Describe what you want to communicate — and to whom…'
              : 'Paste the message you received…'}
            value={formData.message_text}
            onChange={(e) => handleChange('message_text', e.target.value)}
            maxLength={1000}
            required
          />
          <div className="form-char-count">{formData.message_text.length}/1000</div>
        </div>

        {showExamples && examples.length > 0 && (
          <div className="example-chips" role="group" aria-label="Example situations to try">
            <span className="example-chips-label">Try an example</span>
            <div className="example-chips-row">
              {examples.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  className="example-chip"
                  onClick={() => applyExample(ex)}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isComm && (
          <div className="form-group">
            <label className="form-label" htmlFor="tone-select">Perceived tone</label>
            <select
              id="tone-select"
              className="form-select"
              value={formData.perceived_tone}
              onChange={(e) => handleChange('perceived_tone', e.target.value)}
            >
              {PERCEIVED_TONES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Section: context & goal */}
      <section className="form-section">
        <div className="form-section-title">Context &amp; goal</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label" htmlFor="context-select">Context</label>
            <select
              id="context-select"
              className="form-select"
              value={formData.context_type}
              onChange={(e) => handleChange('context_type', e.target.value)}
            >
              {CONTEXT_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="outcome-select">Desired outcome</label>
            <select
              id="outcome-select"
              className="form-select"
              value={formData.desired_outcome}
              onChange={(e) => handleChange('desired_outcome', e.target.value)}
            >
              {DESIRED_OUTCOMES.map((opt) => (
                <option key={opt.value || 'none'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Section: your state */}
      <section className="form-section">
        <div className="form-section-title">Your state</div>
        <div className="form-group">
          <label className="form-label" htmlFor="feeling-select">How are you feeling?</label>
          <select
            id="feeling-select"
            className="form-select"
            value={formData.feeling}
            onChange={(e) => handleChange('feeling', e.target.value)}
          >
            {FEELINGS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">How strongly?</label>
          <div className="slider-container">
            <div className="slider-track">
              <input
                type="range"
                className="slider-input"
                min="1"
                max="10"
                value={formData.emotional_reaction}
                onChange={(e) => handleChange('emotional_reaction', parseInt(e.target.value))}
                id="emotion-slider"
                aria-label="How strongly you feel, 1 to 10"
                aria-valuetext={`${formData.emotional_reaction} of 10`}
              />
              <div className="slider-value">{formData.emotional_reaction}</div>
            </div>
            <div className="slider-labels">
              <span>Mild</span>
              <span>Intense</span>
            </div>
          </div>
        </div>

        {showNote ? (
          <div className="form-group" style={{ marginTop: 'var(--space-4)', marginBottom: 0 }}>
            <label className="form-label" htmlFor="note-input">Background (optional)</label>
            <textarea
              id="note-input"
              className="form-textarea form-textarea-sm"
              placeholder="Anything that helps the read…"
              value={formData.optional_note}
              onChange={(e) => handleChange('optional_note', e.target.value)}
              maxLength={500}
              autoFocus
            />
          </div>
        ) : (
          <button type="button" className="note-toggle" onClick={() => setShowNote(true)}>
            + Add background
          </button>
        )}
      </section>

      {/* Submit */}
      <button
        type="submit"
        className={`btn btn-primary btn-full ${isLoading ? 'btn-loading' : ''}`}
        disabled={isLoading || !formData.message_text.trim() || models.length === 0}
      >
        <span className="btn-text">{isComm ? 'Help me say it' : 'Analyze situation'}</span>
      </button>
      <p className="submit-hint">
        <kbd>⌘</kbd> / <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to send
      </p>

      {/* Advanced: model picker, de-emphasized */}
      {!noModels && (
        <div className="advanced-row">
          <label htmlFor="model-select">Model</label>
          {modelsLoading ? (
            <span className="advanced-value">loading…</span>
          ) : (
            <select
              id="model-select"
              className="advanced-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          )}
        </div>
      )}
    </form>
  );
}
