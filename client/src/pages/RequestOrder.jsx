import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import ShopLayout from '../components/ShopLayout';
import FormField from '../components/FormField';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const TAB_FIELDS = {
  'Custom design': [
    { label: 'Fabric and color', type: 'text', key: 'Fabric and color', ph: 'e.g. Silk Chiffon, Emerald Green' },
    { label: 'Bust (cm)', type: 'number', key: 'Bust (cm)', ph: '90' },
    { label: 'Waist (cm)', type: 'number', key: 'Waist (cm)', ph: '75' },
    { label: 'Hip (cm)', type: 'number', key: 'Hip (cm)', ph: '100' },
    { label: 'Length (cm)', type: 'number', key: 'Length (cm)', ph: '145' },
    { label: 'Needed by', type: 'date', key: 'Needed by', ph: '' }
  ],
  'Wholesale': [
    { label: 'Quantity (pieces)', type: 'text', key: 'Quantity (pieces)', ph: 'e.g. 50' },
    { label: 'Product or fabric', type: 'text', key: 'Product or fabric', ph: 'e.g. Shifon dresses & habesha fabrics' }
  ],
  'Abroad': [
    { label: 'Delivery city and country', type: 'text', key: 'Delivery city and country', ph: 'e.g. Dubai, UAE / London, UK' },
    { label: 'Needed by', type: 'date', key: 'Needed by', ph: '' },
    { label: 'Design or fabric', type: 'text', key: 'Design or fabric', ph: 'e.g. Habesha Kemis with gold embroidery' }
  ]
};

export default function RequestOrder() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { customer, setCustomerAuth } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const initialTab = searchParams.get('tab') || 'Custom design';
  const [activeTab, setActiveTab] = useState(
    ['Custom design', 'Wholesale', 'Abroad'].includes(initialTab) ? initialTab : 'Custom design'
  );

  const [fullName, setFullName] = useState(customer?.name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [customerUsername, setCustomerUsername] = useState('');
  const [customerPassword, setCustomerPassword] = useState('');
  const [fieldValues, setFieldValues] = useState({});
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [confirmedRequest, setConfirmedRequest] = useState(null);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['Custom design', 'Wholesale', 'Abroad'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (customer) {
      if (!fullName) setFullName(customer.name || '');
      if (!phone) setPhone(customer.phone || '');
    }
  }, [customer]);

  const handleFieldChange = (key, value) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const remainingSlots = 4 - images.length;
    if (remainingSlots <= 0) {
      showToast('Maximum 4 photos allowed');
      return;
    }

    const newFiles = files.slice(0, remainingSlots);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));

    setImages((prev) => [...prev, ...newFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || phone.trim().length < 8) {
      showToast('Enter a name and a valid phone number');
      return;
    }

    if (!customer && customerPassword && customerPassword.length < 4) {
      showToast('Password must be at least 4 characters');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', activeTab);
      formData.append('name', fullName.trim());
      formData.append('phone', phone.trim());
      if (!customer && customerUsername.trim()) formData.append('username', customerUsername.trim());
      if (!customer && customerPassword) formData.append('password', customerPassword);
      formData.append('notes', notes.trim());
      formData.append('details', JSON.stringify(fieldValues));
      if (honeypot) formData.append('honeypot', honeypot);

      // Append up to 4 images
      images.forEach((img) => {
        formData.append('images', img);
      });

      const res = await api.post('/requests', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        if (res.data.auth) {
          setCustomerAuth(res.data.auth);
        }
        showToast(t('reqSent'));
        setConfirmedRequest(res.data.request);
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const cleanPhone = (settings.phone || '').replace(/\D/g, '');
  const telegramHref = settings.telegramUrl?.startsWith('http')
    ? settings.telegramUrl
    : `https://${settings.telegramUrl}`;

  return (
    <ShopLayout>
      <h1 style={{ margin: '8px 0 16px', fontSize: '24px' }}>{t('requestTitle')}</h1>

      {confirmedRequest ? (
        <div className="card" style={{ maxWidth: '520px', margin: '20px auto', padding: '24px', textAlign: 'center' }}>
          <img
            src="/logo-dress-mark.png"
            alt="True Clothing"
            style={{ width: '68px', height: '68px', objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
          />
          <h2 style={{ margin: '12px 0 6px' }}>Request Received!</h2>
          <p className="mut" style={{ margin: '4px 0 16px' }}>
            We received your <b>{confirmedRequest.type}</b> request. Our team will review the details and reach out on Telegram or by phone.
          </p>

          <div className="rw end" style={{ justifyContent: 'space-between', gap: '8px', margin: '20px 0' }}>
            <a className="btn out" href={`tel:${cleanPhone}`} style={{ flex: 1 }}>
              {t('callUs')}
            </a>
            <a className="btn acc" href={telegramHref} target="_blank" rel="noreferrer" style={{ flex: 1 }}>
              {t('chatTelegram')}
            </a>
          </div>

          <div className="rw" style={{ justifyContent: 'center', gap: '10px' }}>
            <button
              className="chip"
              onClick={() => {
                setConfirmedRequest(null);
                setFieldValues({});
                setImages([]);
                setImagePreviews([]);
                setNotes('');
              }}
              type="button"
            >
              Submit another request
            </button>
            <button
              className="btn"
              onClick={() => navigate('/account')}
              type="button"
            >
              View in account
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Request Type Tabs */}
          <div className="rw sc" style={{ marginBottom: '16px' }}>
            {['Custom design', 'Wholesale', 'Abroad'].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`chip ${activeTab === tab ? 'on' : ''}`}
                onClick={() => {
                  setActiveTab(tab);
                  setFieldValues({});
                }}
              >
                {tab === 'Custom design' ? t('customTitle') : tab === 'Wholesale' ? t('wholesaleTitle') : t('abroadTitle')}
              </button>
            ))}
          </div>

          {/* Customer contact fields */}
          {customer && (
            <div style={{ background: 'var(--soft)', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Submitting as <b>{customer.name || customer.username || customer.phone}</b></span>
              <span className="tag t3">Signed In</span>
            </div>
          )}

          <div className="fg">
            <FormField
              id="rn"
              label={t('fullName')}
              placeholder="Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <FormField
              id="rph"
              label={t('phone')}
              type="tel"
              placeholder="09..."
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {!customer && (
            <div style={{ background: 'rgba(218, 165, 32, 0.06)', border: '1px solid var(--gold-border)', borderRadius: '10px', padding: '12px 14px', margin: '8px 0 14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                Account Registration (To track your custom requests & quotes)
              </div>
              <div className="fg" style={{ margin: 0 }}>
                <FormField
                  id="rq-user"
                  label="Username (optional)"
                  value={customerUsername}
                  onChange={(e) => setCustomerUsername(e.target.value)}
                  placeholder="e.g. almaz26"
                />
                <FormField
                  id="rq-pass"
                  label="Password (optional)"
                  type="password"
                  value={customerPassword}
                  onChange={(e) => setCustomerPassword(e.target.value)}
                  placeholder="Create a password (min 4 chars)"
                />
              </div>
              <p className="mut" style={{ fontSize: '12px', margin: '4px 0 0' }}>
                Create a password so you can sign in anytime to view your wholesale quotes, request status, and orders.
              </p>
            </div>
          )}

          {/* Tab specific fields */}
          <div className="fg" style={{ marginTop: '4px' }}>
            {TAB_FIELDS[activeTab]?.map((f, i) => (
              <FormField
                key={f.key}
                id={`q${i}`}
                label={f.label}
                type={f.type}
                placeholder={f.ph}
                value={fieldValues[f.key] || ''}
                onChange={(e) => handleFieldChange(f.key, e.target.value)}
              />
            ))}
          </div>

          {/* Reference Photos for Custom design */}
          {activeTab === 'Custom design' && (
            <div style={{ marginTop: '14px' }}>
              <label className="lb">{t('referencePhotos')}</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageChange}
                disabled={images.length >= 4}
                className="in"
                style={{ padding: '6px' }}
              />

              {imagePreviews.length > 0 && (
                <div className="img-previews">
                  {imagePreviews.map((src, idx) => (
                    <div key={idx} className="img-thumb-wrap">
                      <img src={src} alt="Preview" />
                      <button
                        type="button"
                        className="del-btn"
                        onClick={() => removeImage(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div style={{ marginTop: '8px' }}>
            <FormField
              id="qn"
              label={t('notes')}
              type="textarea"
              rows={3}
              placeholder="Any details on fabric, color, deadlines..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Honeypot trap */}
          <input
            type="text"
            name="hp_tc_check"
            style={{ display: 'none' }}
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />

          <div className="rw end">
            <button className="btn acc" type="submit" disabled={submitting}>
              {submitting ? '...' : t('sendRequest')}
            </button>
          </div>
        </form>
      )}
    </ShopLayout>
  );
}

