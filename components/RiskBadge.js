'use client';

export default function RiskBadge({ level }) {
  const config = {
    low: { label: 'Low Risk', className: 'risk-badge-low' },
    medium: { label: 'Medium Risk', className: 'risk-badge-medium' },
    high: { label: 'High Risk', className: 'risk-badge-high' },
  };

  const { label, className } = config[level] || config.medium;

  return (
    <span className={`risk-badge ${className}`}>
      <span className="risk-dot"></span>
      {label}
    </span>
  );
}
