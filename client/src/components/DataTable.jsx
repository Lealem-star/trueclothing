import React from 'react';

export default function DataTable({ headers = [], children, emptyText = 'No items found.' }) {
  return (
    <div className="tb">
      {headers.length > 0 && (
        <div className="tr th">
          {headers.map((h, i) => (
            <span key={i}>{h}</span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

