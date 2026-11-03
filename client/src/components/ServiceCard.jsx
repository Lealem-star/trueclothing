import React from 'react';

const SERVICE_ICONS = {
  'Wholesale': '📦',
  'Custom design': '✨',
  'Abroad': '✈️',
  'Fabric sourcing': '🧵'
};

export default function ServiceCard({ title, description, onClick, serviceKey }) {
  const icon = SERVICE_ICONS[serviceKey] || '✨';

  return (
    <button className="card sv" onClick={onClick} type="button">
      <div className="service-icon-banner">{icon}</div>
      <b style={{ fontSize: '16px', color: 'var(--ink)' }}>{title}</b>
      <span className="mut" style={{ marginTop: '4px', lineHeight: 1.45 }}>{description}</span>
      <span className="service-arrow">
        Learn more & Request <span>→</span>
      </span>
    </button>
  );
}
