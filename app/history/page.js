'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [searchTimeout, setSearchTimeout] = useState(null);

  const fetchEntries = useCallback(async (search, context) => {
    try {
      const params = new URLSearchParams();
      if (context && context !== 'all') params.set('context', context);
      if (search && search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/entries?${params.toString()}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err) {
      console.error('Failed to load entries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // searchQuery is intentionally excluded: search refetches are debounced in
    // handleSearchChange, so depending on it here would fetch on every keystroke.
    fetchEntries(searchQuery, contextFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextFilter, fetchEntries]);

  // Debounced search
  function handleSearchChange(value) {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      fetchEntries(value, contextFilter);
    }, 300);
    setSearchTimeout(timeout);
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await fetch(`/api/entries?id=${id}`, { method: 'DELETE' });
      setExpandedId(null);
      fetchEntries(searchQuery, contextFilter);
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  }

  function toggleExpand(id) {
    setExpandedId(expandedId === id ? null : id);
  }

  function handleCardKey(e, id) {
    // Space/Enter activate the card like a button (it is keyboard-focusable).
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand(id);
    }
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
      <h1 className="page-title">History</h1>
      <p className="page-subtitle">Past analyses. Click to expand and log outcomes.</p>

      {/* Search & Filter Bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search messages..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          id="history-search"
        />
        <select
          className="filter-select"
          value={contextFilter}
          onChange={(e) => setContextFilter(e.target.value)}
          id="context-filter"
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

      {visibleEntries.length === 0 ? (
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
        <div className="history-list">
          {visibleEntries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const engagement = ENGAGEMENT_LEVELS[entry.engagement_level];
            const context = CONTEXT_TYPES.find((c) => c.value === entry.context_type);

            return (
              <div
                key={entry.id}
                className={`history-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleExpand(entry.id)}
                onKeyDown={(e) => handleCardKey(e, entry.id)}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
              >
                <div className="history-message">&ldquo;{entry.message_text}&rdquo;</div>
                <div className="history-meta">
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
                </div>

                {isExpanded && (
                  <div className="history-expanded-content" onClick={(e) => e.stopPropagation()}>
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
      )}
    </div>
  );
}
