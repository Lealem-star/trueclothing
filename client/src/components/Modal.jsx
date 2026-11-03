import React, { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 480 }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ov"
      id="ov"
      onClick={(e) => {
        if (e.target.id === 'ov') onClose();
      }}
    >
      <div className="md" style={{ maxWidth }}>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

