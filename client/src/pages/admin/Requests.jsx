import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import StatusTag from '../../components/StatusTag';
import FormField from '../../components/FormField';
import { formatETB } from '../../components/ProductCard';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

const TYPE_FILTERS = ['All', 'Custom design', 'Wholesale', 'Abroad'];

export default function Requests() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [selectedType, setSelectedType] = useState('All');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [quotePrice, setQuotePrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = selectedType !== 'All' ? `/requests?type=${encodeURIComponent(selectedType)}` : '/requests';
      const res = await api.get(url);
      if (res.data.success) {
        setRequests(res.data.requests);

        // Keep selection or pick first
        const openId = searchParams.get('open');
        if (openId) {
          const match = res.data.requests.find(r => r.id === openId);
          if (match) {
            setSelectedRequest(match);
            setQuotePrice(match.quoteAmount || '');
            searchParams.delete('open');
            setSearchParams(searchParams);
            return;
          }
        }

        if (res.data.requests.length > 0) {
          if (!selectedRequest || !res.data.requests.find(r => r.id === selectedRequest.id)) {
            setSelectedRequest(res.data.requests[0]);
            setQuotePrice(res.data.requests[0].quoteAmount || '');
          }
        } else {
          setSelectedRequest(null);
        }
      }
    } catch (err) {
      showToast('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedType]);

  const selectRequest = (req) => {
    setSelectedRequest(req);
    setQuotePrice(req.quoteAmount || '');
  };

  const handleSendQuote = async () => {
    if (!selectedRequest) return;
    const amount = Number(quotePrice);
    if (!amount || amount <= 0) {
      showToast('Enter a valid quote price in ETB');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/requests/${selectedRequest.id}/quote`, {
        quotePrice: amount,
        quoteText: `Quote: ${amount.toLocaleString('en')} ETB`
      });

      if (res.data.success) {
        showToast('Quote sent to customer');
        fetchRequests();
      }
    } catch (err) {
      showToast(err.message || 'Failed to send quote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConvertToOrder = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/requests/${selectedRequest.id}/convert`, {
        total: Number(quotePrice) || 0
      });

      if (res.data.success) {
        showToast(`Converted to order ${res.data.order.id}`);
        navigate(`/admin/orders?open=${res.data.order.id}`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to convert request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await api.patch(`/requests/${selectedRequest.id}`, {
        status: 'Declined'
      });

      if (res.data.success) {
        showToast('Request declined');
        fetchRequests();
      }
    } catch (err) {
      showToast(err.message || 'Failed to decline request');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout currentTab="req">
      <h1>Requests</h1>

      {/* Filter chips */}
      <div className="rw sc" style={{ margin: '10px 0 16px' }}>
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            className={`chip ${selectedType === t ? 'on' : ''}`}
            onClick={() => setSelectedType(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="two">
        {/* Left column: List */}
        <div>
          {loading ? (
            <p className="mut">Loading requests...</p>
          ) : requests.length > 0 ? (
            requests.map((r) => {
              const isSelected = selectedRequest?.id === r.id;
              return (
                <button
                  key={r.id}
                  className={`card sv ${isSelected ? 'sel' : ''}`}
                  style={{ width: '100%' }}
                  onClick={() => selectRequest(r)}
                  type="button"
                >
                  <StatusTag status={r.type === 'Wholesale' ? 'Quoted' : r.type === 'Abroad' ? 'Shipped' : 'Received'} />
                  <b style={{ marginTop: '6px' }}>{r.name}</b>
                  <span className="mut">{r.date} • {r.status}</span>
                </button>
              );
            })
          ) : (
            <p className="mut">No requests.</p>
          )}
        </div>

        {/* Right column: Selected Detail */}
        {selectedRequest ? (
          <div className="card">
            <div className="li">
              <b style={{ fontSize: '18px' }}>{selectedRequest.name}</b>
              <StatusTag status={selectedRequest.status} />
            </div>

            <p className="mut" style={{ margin: '4px 0 12px' }}>
              {selectedRequest.phone} • {selectedRequest.type} • {selectedRequest.date}
            </p>

            {/* Attributes */}
            <div className="mut" style={{ lineHeight: 1.8, marginBottom: '14px' }}>
              {selectedRequest.d && typeof selectedRequest.d === 'object' && Object.keys(selectedRequest.d).length > 0 ? (
                Object.entries(selectedRequest.d).map(([k, v]) => (
                  <div key={k}>
                    <b style={{ color: 'var(--ink)' }}>{k}:</b> {v}
                  </div>
                ))
              ) : (
                <div>No details provided.</div>
              )}

              {selectedRequest.notes && (
                <div style={{ marginTop: '6px' }}>
                  <b style={{ color: 'var(--ink)' }}>Notes:</b> {selectedRequest.notes}
                </div>
              )}
            </div>

            {/* Attached Reference Photos */}
            {selectedRequest.images && selectedRequest.images.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <b style={{ fontSize: '13px', display: 'block', marginBottom: '6px' }}>Reference photos:</b>
                <div className="rw" style={{ gap: '8px' }}>
                  {selectedRequest.images.map((img) => (
                    <a
                      key={img.id}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line)' }}
                    >
                      <img src={img.url} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Quote and Action controls */}
            <FormField
              id="rqp"
              label="Quote price (ETB)"
              type="number"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              placeholder="e.g. 15000"
            />

            <div className="rw end" style={{ gap: '8px', marginTop: '16px' }}>
              <button
                className="btn out"
                onClick={handleDecline}
                disabled={actionLoading}
                type="button"
              >
                Decline
              </button>
              <button
                className="btn"
                onClick={handleConvertToOrder}
                disabled={actionLoading}
                type="button"
              >
                Convert to order
              </button>
              <button
                className="btn acc"
                onClick={handleSendQuote}
                disabled={actionLoading}
                type="button"
              >
                Send quote
              </button>
            </div>
          </div>
        ) : (
          !loading && <div className="card"><p className="mut">Select a request to view details.</p></div>
        )}
      </div>
    </AdminLayout>
  );
}

