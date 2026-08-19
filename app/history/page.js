'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import RiskBadge from '@/components/RiskBadge';
import OutcomeLogger from '@/components/OutcomeLogger';
import { ENGAGEMENT_LEVELS, CONTEXT_TYPES, OUTCOME_OPTIONS } from '@/lib/constants';

// Dot color per logged outcome — mirrors the Insights palette.
const OUTCOME_COLORS = {
  successful: 'var(--color-success)',
  neutral: 'var(--fg-3)',
  escalated: 'var(--color-error)',
  ignored: 'var(--fg-2)',
  unsure: 'var(--fg-3)',
};
const OUTCOME_LABELS = Object.fromEntries(OUTCOME_OPTIONS.map((o) => [o.value, o.label]));

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextFilter, setContextFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all'); // all | pending | logged
  const [readError, setReadError] = useState('');
  const [actionError, setActionError] = useState('');
  const headingRef = useRef(null);
  const requestId = useRef(0);

  const fetchEntries = useCallback(async (search, context) => {
    const id = ++requestId.current; // a slower earlier fetch must not repaint
    try {
      const params = new URLSearchParams();
      params.set('limit', '500'); // the route's max; below it, "needs outcome" is exact
      if (context && context !== 'all') params.set('context', context);
      if (search && search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/entries?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.entries)) throw new Error(data.error || 'Unreadable response');
      if (id !== requestId.current) return;
      setEntries(data.entries);
      setReadError('');
    } catch (err) {
      if (id !== requestId.current) return;
      // An unreadable history is not an empty history — never say "none yet".
      console.error('Failed to load entries:', err);
      setReadError('Could not read your history.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  // One debounced effect owns both inputs. With two timers a filter change
  // could land after a search and repaint the previous filter's results.
  useEffect(() => {
    const t = setTimeout(() => fetchEntries(searchQuery, contextFilter), 300);
    return () => clearTimeout(t);
  }, [searchQuery, contextFilter, fetchEntries]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    setActionError('');
    try {
      const res = await fetch(`/api/entries?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      setExpandedId(null);
      await fetchEntries(searchQuery, contextFilter);
      // The card that had focus is gone; put it somewhere deliberate.
      document.querySelector('.history-card-toggle')?.focus()
        || document.getElementById('history-search')?.focus();
    } catch (err) {
      console.error('Failed to delete entry:', err);
      setActionError('Could not delete that entry. It is still saved.');
    }
  }

  async function handleExport() {
    // Fetch rather than navigate: a failure here should be a message in the
    // page, not the app replaced by a raw JSON error document.
    setActionError('');
    try {
      const res = await fetch('/api/entries?export=1');
      if (!res.ok) throw new Error('export failed');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `mature-response-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export:', err);
      setActionError('Could not export — your history file could not be read.');
    }
  }

  async function handleEraseAll() {
    if (!window.confirm('Erase ALL history? Every entry will be permanently deleted from this computer.')) return;
    if (!window.confirm('This cannot be undone. Erase everything?')) return;
    setActionError('');
    try {
      const res = await fetch('/api/entries?all=true', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.deleted !== 'number') throw new Error('erase failed');
      setExpandedId(null);
      await fetchEntries(searchQuery, contextFilter);
      headingRef.current?.focus(); // the list is gone; announce where we are
    } catch (err) {
      console.error('Failed to erase history:', err);
      setActionError('Nothing was erased — the history file could not be written.');
    }
  }

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id);
  }


  // Outcome status is filtered client-side (it already rides along on each entry).
  const visibleEntries = entries.filter((e) => {
    if (outcomeFilter === 'pending') return !e.outcome;
    if (outcomeFilter === 'logged') return !!e.outcome;
    return true;
  });

  function formatDate(dateStr) {
    // SQLite stores "YYYY-MM-DD HH:MM:SS" (UTC). Safari rejects the space form,
    // so normalize to ISO 8601 (T separator) before parsing.
    const d = new Date(dateStr.replace(' ', 'T') + 'Z');
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  }

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">History</h1>
        <div className="card card-elevated">
          <div className="analyzing-state">
            <div className="analyzing-spinner"></div>
            <div className="analyzing-text">Loading history...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title" ref={headingRef} tabIndex={-1}>History</h1>
      <p className="page-subtitle">Past analyses. Click to expand and log outcomes.</p>

      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search messages..."
          aria-label="Search messages"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          id="history-search"
        />
        <select
          className="filter-select"
          value={contextFilter}
          onChange={(e) => setContextFilter(e.target.value)}
          id="context-filter"
          aria-label="Filter by context"
        >
          <option value="all">All Contexts</option>
          {CONTEXT_TYPES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={outcomeFilter}
          onChange={(e) => setOutcomeFilter(e.target.value)}
          id="outcome-filter"
          aria-label="Filter by outcome status"
        >
          <option value="all">All Outcomes</option>
          <option value="pending">Needs Outcome</option>
          <option value="logged">Outcome Logged</option>
        </select>
      </div>

      {actionError && (
        <div className="notice notice-error" role="alert">{actionError}</div>
      )}

      {readError ? (
        <div className="notice notice-error" role="alert">
          {readError}{' '}
          <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 'var(--space-3)' }}
            onClick={() => fetchEntries(searchQuery, contextFilter)}>
            Retry
          </button>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">
            {searchQuery || contextFilter !== 'all' || outcomeFilter !== 'all' ? 'No Matches' : 'No Analyses Yet'}
          </div>
          <div className="empty-state-text">
            {searchQuery || contextFilter !== 'all' || outcomeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Go to the Analyze tab and submit your first situation.'}
          </div>
        </div>
      ) : (
        <>
        {entries.length >= 500 && (
          <p style={{ color: 'var(--fg-3)', fontSize: 'var(--step--1)', marginBottom: 'var(--space-3)' }}>
            Showing the 500 most recent.
          </p>
        )}
        <div className="history-list">
          {visibleEntries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const engagement = ENGAGEMENT_LEVELS[entry.engagement_level];
            const context = CONTEXT_TYPES.find((c) => c.value === entry.context_type);

            return (
              <div
                key={entry.id}
                className={`history-card ${isExpanded ? 'expanded' : ''}`}
              >
                {/* Only the summary is the control. The panel below is a
                    sibling, not a descendant: inside a button, its text would
                    be flattened into one enormous accessible name and could
                    not be selected or copied. */}
                <button
                  type="button"
                  className="history-card-toggle"
                  onClick={() => toggleExpand(entry.id)}
                  aria-expanded={isExpanded}
                >
                  <span className="history-message">&ldquo;{entry.message_text}&rdquo;</span>
                  <span className="history-meta">
                    {entry.mode === 'communication' && (
                      <span className="badge mode-badge">Communicate</span>
                    )}
                    {engagement && (
                      <span className={`badge engagement-badge engagement-${entry.engagement_level}`}>
                        {engagement.label}
                      </span>
                    )}
                    <RiskBadge level={entry.risk_level} />
                    {entry.outcome ? (
                      <span className="outcome-tag">
                        <span className="dot" style={{ background: OUTCOME_COLORS[entry.outcome] || 'var(--fg-3)' }} />
                        {OUTCOME_LABELS[entry.outcome] || entry.outcome}
                      </span>
                    ) : (
                      <span className="outcome-tag outcome-tag-pending">Needs outcome</span>
                    )}
                    <span className="history-time">{formatDate(entry.created_at)}</span>
                  </span>
                </button>

                {isExpanded && (
                  <div className="history-expanded-content">
                    {/* The full message, selectable — the clamped copy in the
                        button above cannot be dragged over. */}
                    <p className="history-message-full">&ldquo;{entry.message_text}&rdquo;</p>

                    {/* Suggested Response */}
                    {entry.recommended_response && (
                      <div className="result-response-box" style={{ marginBottom: 'var(--space-4)' }}>
                        <div className="result-response-label eyebrow">
                          {entry.mode === 'communication' ? 'Suggested Message' : 'Suggested Response'}
                        </div>
                        <p className="result-response-text">{entry.recommended_response}</p>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="result-reason">{entry.reason}</div>

                    {/* Coaching Insight */}
                    {entry.coaching_insight && (
                      <div className="coaching-insight" style={{ marginBottom: 'var(--space-4)' }}>
                        <div className="coaching-insight-header coaching-insight-label eyebrow">Coaching Insight</div>
                        <p className="coaching-insight-text">{entry.coaching_insight}</p>
                      </div>
                    )}

                    {/* Quiet metadata */}
                    <div style={{ fontFamily: 'var(--type-mono)', fontSize: '11px', color: 'var(--fg-3)', marginBottom: 'var(--space-4)' }}>
                      {[
                        context?.label,
                        entry.feeling ? `felt ${entry.feeling}` : null,
                        entry.confidence != null ? `${entry.confidence}% confidence` : null,
                        entry.intent_guess ? `intent: ${entry.intent_guess}` : null,
                        entry.model_used,
                      ].filter(Boolean).join('  ·  ')}
                    </div>

                    {/* Outcome Logger */}
                    <OutcomeLogger
                      entryId={entry.id}
                      existingOutcome={entry.outcome}
                      onLogged={() => fetchEntries(searchQuery, contextFilter)}
                    />

                    <div className="entry-actions">
                      <button type="button" className="btn-delete" onClick={(e) => handleDelete(entry.id, e)}>
                        Delete this entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Your data, your controls: take it with you, or make it gone. */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-6)' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExport}>
            Export all (JSON)
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleEraseAll}>
            Erase all history
          </button>
        </div>
      )}
    </div>
  );
}
