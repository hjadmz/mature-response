'use client';

import { ENGAGEMENT_LEVELS, COACHING_TAGS } from '@/lib/constants';

export default function InsightsPanel({ insights }) {
  if (!insights || insights.totalEntries === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No insights yet</div>
        <div className="empty-state-text">
          Analyze a few situations and the lessons you keep meeting will collect here.
          Log how they turned out to see which strategies actually work for you.
        </div>
      </div>
    );
  }

  const { overallStats = [], engagementStats = [], recurringLessons = [], totalWithOutcomes, totalEntries } = insights;
  const hasOutcomes = totalWithOutcomes > 0;
  const distinctLessons = recurringLessons.length;

  const outcomeColors = {
    successful: 'var(--color-success)',
    neutral: 'var(--fg-3)',
    escalated: 'var(--color-error)',
    ignored: 'var(--fg-2)',
    unsure: 'var(--fg-3)',
  };

  // Best strategy needs at least 3 logged uses to be meaningful (no small-sample noise).
  let bestStrategy = null;
  if (engagementStats.length > 0) {
    const withRate = engagementStats
      .filter((e) => e.total >= 3)
      .map((e) => ({ ...e, successRate: Math.round((e.successful / e.total) * 100) }))
      .sort((a, b) => b.successRate - a.successRate);
    if (withRate.length > 0) bestStrategy = withRate[0];
  }

  return (
    <div className="insights-grid">
      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{totalEntries}</div>
          <div className="stat-label">Analyzed</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{distinctLessons}</div>
          <div className="stat-label">Distinct Lessons</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalWithOutcomes}</div>
          <div className="stat-label">Outcomes Logged</div>
        </div>
        {bestStrategy && (
          <div className="stat-card">
            <div className="stat-number">{bestStrategy.successRate}%</div>
            <div className="stat-label">
              Best: {ENGAGEMENT_LEVELS[bestStrategy.engagement_level]?.label || bestStrategy.engagement_level}
            </div>
          </div>
        )}
      </div>

      {/* Lessons you keep meeting — the learning loop */}
      {recurringLessons.length > 0 && (
        <div className="insight-card">
          <div className="form-label" style={{ marginBottom: 'var(--space-4)' }}>Lessons You Keep Meeting</div>
          {recurringLessons.map((lesson) => (
            <div key={lesson.tag} className={`lesson-row ${lesson.count > 1 ? 'recurring' : ''}`}>
              <span className="lesson-row-text">{COACHING_TAGS[lesson.tag] || lesson.tag}</span>
              <span className="lesson-row-count">×{lesson.count}</span>
            </div>
          ))}
        </div>
      )}

      {totalWithOutcomes < totalEntries && (
        <div className="insight-card">
          <div className="empty-state-text" style={{ maxWidth: 'none', textAlign: 'left' }}>
            {hasOutcomes
              ? `You've logged how ${totalWithOutcomes} of ${totalEntries} situations turned out. Logging more on the History tab is what teaches the tool which strategies actually work for you — the more you log, the sharper the suggestions get.`
              : 'Log how your situations turned out (on the History tab) to unlock which strategies defuse and which escalate — for you specifically. Future analyses then weight toward what has worked.'}
          </div>
        </div>
      )}
      {hasOutcomes && (
        <>
          {/* What's worked, by action */}
          {engagementStats.length > 0 && (
            <div className="insight-card">
              <div className="form-label" style={{ marginBottom: 'var(--space-4)' }}>What&rsquo;s Worked For You</div>
              {engagementStats.map((stat) => {
                const successPct = stat.total > 0 ? Math.round((stat.successful / stat.total) * 100) : 0;
                const escalatedPct = stat.total > 0 ? Math.round((stat.escalated / stat.total) * 100) : 0;
                const engLabel = ENGAGEMENT_LEVELS[stat.engagement_level]?.label || stat.engagement_level;
                return (
                  <div key={stat.engagement_level} className="insight-bar-container">
                    <div className="insight-bar-label">
                      <span style={{ color: 'var(--fg-1)', fontWeight: 500 }}>{engLabel}</span>
                      <span className="num">{successPct}% went well · {escalatedPct}% escalated · {stat.total} logged</span>
                    </div>
                    <div className="insight-bar-track" style={{ position: 'relative' }}>
                      <div className="insight-bar-fill" style={{ width: `${successPct}%`, background: 'var(--color-success)', position: 'absolute', left: 0 }} />
                      <div className="insight-bar-fill" style={{ width: `${escalatedPct}%`, background: 'var(--color-error)', position: 'absolute', right: 0 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Outcome distribution */}
          <div className="insight-card">
            <div className="form-label" style={{ marginBottom: 'var(--space-4)' }}>Outcome Distribution</div>
            {overallStats.map((stat) => {
              const pct = Math.round((stat.count / totalWithOutcomes) * 100);
              return (
                <div key={stat.outcome} className="insight-bar-container">
                  <div className="insight-bar-label">
                    <span style={{ color: 'var(--fg-2)', textTransform: 'capitalize' }}>{stat.outcome}</span>
                    <span className="num">{pct}% ({stat.count})</span>
                  </div>
                  <div className="insight-bar-track">
                    <div className="insight-bar-fill" style={{ width: `${pct}%`, background: outcomeColors[stat.outcome] || 'var(--fg-2)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
