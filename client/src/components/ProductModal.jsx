import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import FormField from './FormField';
import { formatETB, formatUSD } from './ProductCard';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

export default function ProductModal({ product, isOpen, onClose, onOrderPlaced }) {
  const { lang, t } = useLanguage();
  const { customer, setCustomerAuth } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerUsername, setCustomerUsername] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [redirectingToChapa, setRedirectingToChapa] = useState(false);

  const handleGoToLiveChapa = async () => {
    if (!confirmedOrder) return;
    setRedirectingToChapa(true);
    try {
      const res = await api.post('/payments/live/init', {
        orderId: confirmedOrder.id,
        phone: confirmedOrder.customerPhone,
        customerName: confirmedOrder.customerName
      });

      if (res.data?.success && res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        throw new Error(res.data?.error || 'Could not initialize Chapa checkout');
      }
    } catch (err) {
      showToast(err.message || 'Payment initiation failed');
      setRedirectingToChapa(false);
    }
  };

  useEffect(() => {
    if (product) {
      const sizes = Array.isArray(product.sizes) ? product.sizes : [];
      setSelectedSize(sizes[0] || '');
      setQuantity(1);
      setSelectedImageIndex(0);
      setNotes('');
      setConfirmedOrder(null);
      if (customer) {
        setCustomerName(customer.name || '');
        setCustomerPhone(customer.phone || '');
      }
    }
  }, [product, customer]);

  if (!product) return null;

  const displayName = (lang === 'am' && product.nameAm) ? product.nameAm : (product.nameEn || product.en);
  const displayDesc = (lang === 'am' && product.descriptionAm) ? product.descriptionAm : (product.descriptionEn || product.desc);
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const images = product.images && product.images.length > 0 ? product.images : [];
  const currentImageUrl = images[selectedImageIndex]?.url;

  const handleOrder = async () => {
    const name = customerName.trim();
    const phone = customerPhone.trim();

    if (!name || phone.length < 8) {
      showToast('Enter a name and a valid phone number');
      return;
    }

    if (!customer && customerPassword && customerPassword.length < 4) {
      showToast('Password must be at least 4 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/orders', {
        customerName: name,
        customerPhone: phone,
        username: !customer && customerUsername.trim() ? customerUsername.trim() : undefined,
        password: !customer && customerPassword ? customerPassword : undefined,
        items: [
          {
            productId: product.id,
            size: selectedSize || null,
            quantity
          }
        ],
        notes: notes.trim() || null,
        honeypot
      });

      if (res.data.success) {
        if (res.data.auth) {
          setCustomerAuth(res.data.auth);
        }
        setConfirmedOrder(res.data.order);
        showToast(t('orderSent'));
        if (onOrderPlaced) onOrderPlaced(res.data.order);
      }
    } catch (err) {
      showToast(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setConfirmedOrder(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} maxWidth={540}>
      {confirmedOrder ? (
        <div>
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <img
              src="/logo-dress-mark.png"
              alt="True Clothing"
              style={{ width: '68px', height: '68px', objectFit: 'contain', margin: '0 auto 6px', display: 'block' }}
            />
            <h3 style={{ margin: '10px 0 6px', fontSize: '24px' }}>{t('orderConfirmed')}</h3>
            <p className="mut" style={{ margin: '4px 0 16px', fontSize: '15px' }}>
              {t('thankYou')}{' '}
              <b style={{ color: '#F2B705', fontSize: '20px', background: '#1E1B4B', padding: '2px 8px', borderRadius: '6px' }}>
                {confirmedOrder.code}
              </b>
            </p>

            <div className="card" style={{ textAlign: 'left', margin: '16px 0', border: '1px solid var(--gold-border)' }}>
              <div className="li">
                <b>Order {confirmedOrder.code}</b>
                <span className="tag t1">{t('statusReceived')}</span>
              </div>
              <div className="mut" style={{ marginTop: '8px', lineHeight: 1.5 }}>
                <div><b>Items:</b> {confirmedOrder.description}</div>
                <div><b>Total:</b> {formatETB(confirmedOrder.total)} ({formatUSD(confirmedOrder.total)})</div>
                <div><b>Customer:</b> {confirmedOrder.customerName} ({confirmedOrder.customerPhone})</div>
              </div>
            </div>

            {/* Direct Chapa Online Payment */}
            {confirmedOrder.paymentStatus !== 'PAID' ? (
              <div style={{ margin: '18px 0 8px' }}>
                <button
                  type="button"
                  className="btn acc"
                  disabled={redirectingToChapa}
                  onClick={handleGoToLiveChapa}
                  style={{
                    width: '100%',
                    minHeight: '48px',
                    background: '#1E1B4B',
                    color: '#F2B705',
                    fontWeight: 700,
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 14px rgba(30, 27, 75, 0.2)',
                    cursor: redirectingToChapa ? 'wait' : 'pointer'
                  }}
                >
                  {redirectingToChapa ? (
                    <span>Connecting to Live Chapa... ⏳</span>
                  ) : (
                    <>
                      <span>💳</span>
                      <span>Pay {formatETB(confirmedOrder.total)} Now</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div
                style={{
                  margin: '14px 0',
                  padding: '12px 16px',
                  background: 'rgba(22, 163, 74, 0.1)',
                  border: '1px solid #16a34a',
                  color: '#16a34a',
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '14px'
                }}
              >
                ✓ Payment Received & Verified via Chapa
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button
              className="chip"
              onClick={handleClose}
              type="button"
              style={{ minWidth: '100px', padding: '8px 22px', cursor: 'pointer' }}
            >
              {t('cancel') || 'Close'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Main Product Image */}
          {currentImageUrl && (
            <div
              style={{
                width: '100%',
                height: '280px',
                borderRadius: '14px',
                overflow: 'hidden',
                marginBottom: '14px',
                border: '1px solid var(--line)',
                background: '#131033',
                position: 'relative'
              }}
            >
              <img
                src={currentImageUrl}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(30, 27, 75, 0.85)',
                  color: '#F2B705',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700'
                }}
              >
                {product.category}
              </span>
            </div>
          )}

          {/* Multiple Image Thumbnails */}
          {images.length > 1 && (
            <div className="rw sc" style={{ gap: '8px', marginBottom: '14px' }}>
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: selectedImageIndex === idx ? '2px solid #F2B705' : '1px solid var(--line)',
                    padding: 0,
                    background: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          <h3 style={{ margin: '0 0 4px', fontSize: '22px' }}>{displayName}</h3>
          <p className="mut" style={{ margin: '4px 0 10px', lineHeight: 1.5 }}>{displayDesc}</p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '8px 0 14px' }}>
            <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--ink)' }}>
              {formatETB(product.price)}
            </span>
            <span className="mut" style={{ fontSize: '13px' }}>
              ({formatUSD(product.price)})
            </span>
          </div>

          {/* Sizes */}
          {sizes.length > 0 && (
            <div style={{ margin: '14px 0 8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="lb" style={{ margin: 0 }}>{t('size')}</label>
                <span className="mut" style={{ fontSize: '11.5px' }}>Custom tailoring available</span>
              </div>
              <div className="rw" style={{ marginTop: '6px' }}>
                {sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`chip ${selectedSize === s ? 'on' : ''}`}
                    onClick={() => setSelectedSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Stepper */}
          <div style={{ margin: '14px 0 8px' }}>
            <label className="lb" style={{ margin: '0 0 6px' }}>{t('quantity')}</label>
            <div className="rw">
              <button
                type="button"
                className="chip"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Less"
                style={{ width: '42px', height: '42px', fontSize: '18px' }}
              >
                −
              </button>
              <b style={{ minWidth: '36px', textAlign: 'center', fontSize: '16px' }}>{quantity}</b>
              <button
                type="button"
                className="chip"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="More"
                style={{ width: '42px', height: '42px', fontSize: '18px' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Customer info */}
          {customer ? (
            <div style={{ background: 'var(--soft)', padding: '10px 14px', borderRadius: '10px', margin: '12px 0', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Ordering as <b>{customer.name || customer.username || customer.phone}</b></span>
              <span className="tag t3">Signed In</span>
            </div>
          ) : null}

          <div className="fg" style={{ marginTop: '10px' }}>
            <FormField
              id="f1"
              label={t('fullName')}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Almaz Ayana"
              required
            />

            <FormField
              id="f2"
              label={t('phone')}
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="09... / +251..."
              required
            />
          </div>

          {!customer && (
            <div style={{ background: 'rgba(218, 165, 32, 0.06)', border: '1px solid var(--gold-border)', borderRadius: '10px', padding: '12px 14px', margin: '10px 0 14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Create Account (Track this order anytime)
              </div>
              <div className="fg" style={{ margin: 0 }}>
                <FormField
                  id="f-user"
                  label="Username"
                  value={customerUsername}
                  onChange={(e) => setCustomerUsername(e.target.value)}
                  placeholder="e.g. almaz26"
                />
                <FormField
                  id="f-pass"
                  label="Password"
                  type="password"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  placeholder="Create a password (min 4 chars)"
                />
              </div>
              <p className="mut" style={{ fontSize: '12px', margin: '4px 0 0' }}>
                Choose a username and password to log in later and follow up on production and delivery.
              </p>
            </div>
          )}

          <FormField
            id="order-notes"
            label="Special Requests / Custom Measurements (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Bust 92cm, waist 74cm, or desired delivery date"
          />

          {/* Hidden Honeypot */}
          <input
            type="text"
            name="hp_true_val"
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />

          <div className="rw end" style={{ gap: '10px', marginTop: '20px' }}>
            <button className="btn out" onClick={handleClose} type="button">
              {t('cancel')}
            </button>
            <button
              className="btn acc"
              onClick={handleOrder}
              disabled={submitting}
              type="button"
            >
              {submitting ? 'Placing order...' : `👑 ${t('order')} • ${formatETB(product.price * quantity)}`}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
