'use client';

import { useState } from 'react';
import RiskBadge from './RiskBadge';
import { ENGAGEMENT_LEVELS, INTENT_TYPES, DESIRED_OUTCOME_LABELS } from '@/lib/constants';

function ConfidenceMeter({ confidence }) {
  let desc = 'High confidence in this read';
  if (confidence < 40) desc = 'Low confidence — caution is warranted';
  else if (confidence < 60) desc = 'Moderate confidence — clarifying first is wiser';
  else if (confidence < 80) desc = 'Good confidence in this read';

  return (
    <div className="confidence-meter">
      <div className="confidence-head">
        <span className="eyebrow">Confidence</span>
        <span className="confidence-number">{confidence}</span>
      </div>
      <div className="confidence-bar-track">
        <div className="confidence-bar-fill" style={{ width: `${confidence}%` }} />
      </div>
      <span className="confidence-desc">{desc}</span>
    </div>
  );
}

export default function AnalysisResult({ result, onReset }) {
  const [copied, setCopied] = useState(false);

  const isComm = result.mode === 'communication';
  const engagement = ENGAGEMENT_LEVELS[result.engagement_level] || ENGAGEMENT_LEVELS.wait;
  const intent = INTENT_TYPES[result.intent_guess] || INTENT_TYPES.unclear;
  const desiredLabel = DESIRED_OUTCOME_LABELS[result.desired_outcome];

  async function copyResponse() {
    if (!result.recommended_response) return;
    try {
      await navigator.clipboard.writeText(result.recommended_response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = result.recommended_response;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="result-container">
      {/* Action banner — the single anchor */}
      <div className="result-action-banner">
        <div>
          <div className="result-action-label eyebrow">
            {isComm ? 'Recommended Approach' : 'Recommended Action'}
          </div>
          <div className="result-action-text">{engagement.label}</div>
        </div>
        <RiskBadge level={result.risk_level} />
      </div>

      {/* Confidence */}
      <ConfidenceMeter confidence={result.confidence || 50} />

      {/* Suggested Response / Message */}
      <div className="result-response-box">
        <div className="result-response-label eyebrow">
          {isComm ? 'Suggested Message' : 'Suggested Response'}
        </div>
        {result.recommended_response ? (
          <>
            <p className="result-response-text">{result.recommended_response}</p>
            <button
              className={`copy-btn ${copied ? 'copied' : ''}`}
              onClick={copyResponse}
              type="button"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </>
        ) : (
          <p className="result-response-text result-response-empty">
            {isComm
              ? 'Add a little more context above and try again.'
              : result.engagement_level === 'wait'
                ? 'Hold off — wait before responding.'
                : 'No response needed — best to ignore.'}
          </p>
        )}
      </div>

      {/* Reason */}
      <div className="result-reason">{result.reason}</div>

      {/* Coaching Insight — the teaching layer */}
      {result.coaching_insight && (
        <div className="coaching-insight">
          <div className="coaching-insight-header coaching-insight-label eyebrow">Coaching Insight</div>
          <p className="coaching-insight-text">{result.coaching_insight}</p>
          {result.tag_seen_count > 0 && (
            <p className="lesson-seen">
              You have met this lesson {result.tag_seen_count} time{result.tag_seen_count > 1 ? 's' : ''} before.
            </p>
          )}
        </div>
      )}

      {/* Meta */}
      <div className="result-meta">
        <span className="chip">Intent: {intent.label}</span>
        {desiredLabel && <span className="chip">Goal: {desiredLabel}</span>}
      </div>

      {/* Reset */}
      <div style={{ marginTop: 'var(--space-8)' }}>
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          {isComm ? 'Start over' : 'Analyze another'}
        </button>
      </div>
    </div>
  );
}
