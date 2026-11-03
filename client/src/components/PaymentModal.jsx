import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { formatETB, formatUSD } from './ProductCard';
import api from '../api/client';
import { useToast } from '../context/ToastContext';

export default function PaymentModal({ isOpen, onClose, order, onPaymentSuccess }) {
  const { showToast } = useToast();

  const [step, setStep] = useState('select'); // 'select' | 'initiating' | 'live_checkout' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Live Chapa checkout URL and transaction reference
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [liveTxRef, setLiveTxRef] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [verifyingNow, setVerifyingNow] = useState(false);

  const pollingTimerRef = useRef(null);

  // Initialize state when order opens
  useEffect(() => {
    if (order) {
      setStep('select');
      setErrorMessage('');
      setSuccessData(null);
      setCheckoutUrl('');
      setLiveTxRef('');
    }
  }, [order, isOpen]);

  // Clean up polling timer on unmount or close
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  if (!isOpen || !order) return null;

  const totalAmount = Number(order.total) || 0;

  // 1. Initialize Live Chapa Checkout (api.chapa.co with secret key)
  const handleInitiateLiveCheckout = async (redirectDirectly = false) => {
    setStep('initiating');
    setErrorMessage('');
    try {
      const res = await api.post('/payments/live/init', {
        orderId: order.id || order.internalId,
        phone: order.customerPhone,
        customerName: order.customerName
      });

      if (res.data?.success && res.data?.checkout_url) {
        if (redirectDirectly) {
          window.location.href = res.data.checkout_url;
          return;
        }
        setCheckoutUrl(res.data.checkout_url);
        setLiveTxRef(res.data.tx_ref);
        setStep('live_checkout');
        startLiveVerificationPolling(res.data.tx_ref);
      } else {
        throw new Error(res.data?.error || 'Could not initialize live checkout');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Live payment initiation failed');
      setStep('error');
    }
  };

  // Poll live transaction verification
  const startLiveVerificationPolling = (txRef) => {
    if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);

    pollingTimerRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/payments/verify/${encodeURIComponent(txRef)}`);
        if (res.data?.success && res.data?.verified) {
          clearInterval(pollingTimerRef.current);
          setSuccessData({
            payment_method: 'chapa_live',
            processor_reference: res.data.data?.reference || txRef
          });
          setStep('success');
          showToast('Live Chapa payment confirmed!');
          if (onPaymentSuccess) onPaymentSuccess(res.data.data);
        }
      } catch (err) {
        // Continue polling
      }
    }, 3500);
  };

  // Manual Check Now button for live checkout
  const handleCheckLivePaymentNow = async () => {
    if (!liveTxRef) return;
    setVerifyingNow(true);
    try {
      const res = await api.get(`/payments/verify/${encodeURIComponent(liveTxRef)}`);
      if (res.data?.success && res.data?.verified) {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        setSuccessData({
          payment_method: 'chapa_live',
          processor_reference: res.data.data?.reference || liveTxRef
        });
        setStep('success');
        showToast('Live Chapa payment verified successfully!');
        if (onPaymentSuccess) onPaymentSuccess(res.data.data);
      } else {
        showToast('Payment not completed yet. Please complete checkout in Chapa.');
      }
    } catch (err) {
      showToast(err.message || 'Verification check failed');
    } finally {
      setVerifyingNow(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        onClose();
      }}
      title="Secure Checkout via Chapa"
    >
      {/* STEP 1: SELECT METHOD */}
      {step === 'select' && (
        <div>
          {/* Order Summary Strip */}
          <div
            style={{
              background: '#1E1B4B',
              color: '#FFFFFF',
              borderRadius: '12px',
              padding: '16px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 14px rgba(30,27,75,0.15)'
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: '#F2B705', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Order #{order.code?.replace('#', '')}
              </span>
              <div style={{ fontSize: '13px', color: '#D9D8F0', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {order.description || 'Bespoke Order'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#F2B705' }}>
                {formatETB(totalAmount)}
              </div>
              <div style={{ fontSize: '11px', color: '#D9D8F0' }}>
                {formatUSD(totalAmount)}
              </div>
            </div>
          </div>

          {/* PRIMARY LIVE CHECKOUT */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(242, 183, 5, 0.12) 0%, rgba(30, 27, 75, 0.05) 100%)',
              border: '2px solid #F2B705',
              borderRadius: '14px',
              padding: '24px 20px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: '#B8860B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>⚡ Live Chapa Checkout</span>
            </div>
            <h3 style={{ margin: '8px 0 6px', fontSize: '18px', color: 'var(--ink)' }}>
              Pay with Telebirr, CBE Birr, or Bank Card
            </h3>
            <p className="mut" style={{ margin: '0 0 20px', fontSize: '13px', lineHeight: 1.5 }}>
              Proceed to the official Chapa payment gateway with bank-grade 256-bit SSL encryption.
            </p>
            <button
              type="button"
              className="btn acc"
              onClick={() => handleInitiateLiveCheckout(true)}
              style={{
                width: '100%',
                minHeight: '48px',
                background: '#1E1B4B',
                color: '#F2B705',
                fontSize: '15px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(30,27,75,0.2)'
              }}
            >
              <span>🔒</span>
              <span>Proceed to Live Chapa ({formatETB(totalAmount)})</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: INITIATING SPINNER */}
      {step === 'initiating' && (
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              border: '4px solid var(--line)',
              borderTopColor: '#F2B705',
              borderRadius: '50%',
              margin: '0 auto 18px',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <h3 style={{ margin: '0 0 6px', color: 'var(--ink)' }}>Connecting to Live Chapa...</h3>
          <p className="mut" style={{ margin: 0, fontSize: '13px' }}>
            Redirecting to official 256-bit encrypted checkout for {formatETB(totalAmount)}
          </p>
        </div>
      )}

      {/* STEP 3: LIVE CHAPA INLINE CHECKOUT IFRAME */}
      {step === 'live_checkout' && (
        <div style={{ padding: '0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#1E1B4B',
              color: '#FFFFFF',
              borderRadius: '10px 10px 0 0',
              fontSize: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#F2B705' }}>🔒</span>
              <span style={{ fontWeight: 600 }}>Chapa Official Live Gateway</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <a
                href={checkoutUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#F2B705',
                  textDecoration: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  border: '1px solid rgba(242,183,5,0.4)',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}
              >
                ↗ Open Full Window
              </a>
              <button
                type="button"
                onClick={() => setStep('select')}
                style={{ background: 'none', border: 'none', color: '#D9D8F0', cursor: 'pointer', fontSize: '16px', padding: 0 }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ width: '100%', height: '540px', background: '#FFFFFF', position: 'relative' }}>
            <iframe
              src={checkoutUrl}
              title="Chapa Live Checkout"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block'
              }}
              allow="payment *"
            />
          </div>

          <div
            style={{
              padding: '12px 16px',
              background: 'var(--soft)',
              borderRadius: '0 0 10px 10px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite'
                }}
              />
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                Auto-verifying payment with bank...
              </span>
            </div>

            <button
              type="button"
              className="btn acc"
              onClick={handleCheckLivePaymentNow}
              disabled={verifyingNow}
              style={{ fontSize: '12px', padding: '6px 14px', background: '#1E1B4B', color: '#F2B705' }}
            >
              {verifyingNow ? 'Checking...' : '✓ Confirm & Check Status'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS CELEBRATION */}
      {step === 'success' && (
        <div style={{ textAlign: 'center', padding: '24px 10px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              color: '#FFFFFF',
              fontSize: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.35)'
            }}
          >
            ✓
          </div>

          <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Payment Verified Live via Chapa
          </span>
          <h2 style={{ margin: '6px 0 8px', fontSize: '24px', color: 'var(--ink)' }}>
            Payment Completed!
          </h2>
          <p className="mut" style={{ margin: '0 0 20px', fontSize: '14px' }}>
            Thank you! <b>{formatETB(totalAmount)}</b> was received for Order <b>#{order.code?.replace('#', '')}</b>.
          </p>

          <div
            style={{
              background: 'var(--soft)',
              borderRadius: '12px',
              padding: '14px 18px',
              border: '1px solid var(--line)',
              textAlign: 'left',
              fontSize: '13px',
              marginBottom: '22px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="mut">Order Code:</span>
              <b>#{order.code?.replace('#', '')}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="mut">Payment Gateway:</span>
              <span style={{ fontWeight: 700, color: '#0088cc' }}>CHAPA (LIVE)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="mut">Amount Paid:</span>
              <b>{formatETB(totalAmount)}</b>
            </div>
            {successData?.processor_reference && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span className="mut">Reference:</span>
                <code style={{ fontSize: '12px', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                  {successData.processor_reference}
                </code>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
              <span className="mut">Status:</span>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>PAID IN FULL</span>
            </div>
          </div>

          <button
            className="btn acc"
            type="button"
            onClick={onClose}
            style={{ width: '100%', minHeight: '46px', fontSize: '15px' }}
          >
            Done
          </button>
        </div>
      )}

      {/* STEP 5: ERROR */}
      {step === 'error' && (
        <div style={{ textAlign: 'center', padding: '24px 10px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px'
            }}
          >
            ⚠️
          </div>
          <h3 style={{ margin: '0 0 6px', color: 'var(--ink)' }}>Payment Unsuccessful</h3>
          <p className="mut" style={{ margin: '0 0 20px', fontSize: '13.5px' }}>
            {errorMessage || 'Unable to connect to Chapa payment gateway.'}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn out"
              type="button"
              onClick={() => setStep('select')}
              style={{ flex: 1, minHeight: '42px' }}
            >
              Try Again
            </button>
            <button
              className="chip"
              type="button"
              onClick={onClose}
              style={{ flex: 1, minHeight: '42px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}