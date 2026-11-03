import React from 'react';

const STATUS_CLASSES = {
  Received: 't1',
  New: 't1',
  'In production': 't2',
  Quoted: 't2',
  Shipped: 't3',
  Delivered: 't3',
  Converted: 't3',
  Paid: 't3',
  'Partly paid': 't2',
  Unpaid: '',
  Declined: ''
};

export default function StatusTag({ status }) {
  if (!status) return null;
  const cls = STATUS_CLASSES[status] || '';
  return <span className={`tag ${cls}`}>{status}</span>;
}

