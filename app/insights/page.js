'use client';

import { useState, useEffect, useCallback } from 'react';
import InsightsPanel from '@/components/InsightsPanel';

export default function InsightsPage() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/insights');
      const data = await res.json();
      setInsights(data);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">Insights</h1>
        <div className="card card-elevated">
          <div className="analyzing-state">
            <div className="analyzing-spinner"></div>
            <div className="analyzing-text">Loading insights...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Insights</h1>
      <p className="page-subtitle">
        The lessons you keep meeting, and what has actually worked for you. Logged
        outcomes feed back into future suggestions.
      </p>
      <InsightsPanel insights={insights} />
    </div>
  );
}
