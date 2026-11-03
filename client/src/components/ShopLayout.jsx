import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function ShopLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, toggleLang, t } = useLanguage();
  const { customer, admin } = useAuth();
  const { settings } = useSettings();

  const currentPath = location.pathname;
  const isHome = currentPath === '/';
  const isReq = currentPath === '/request';
  const isAccount = currentPath === '/account';

  const cleanPhone = (settings.phone || '').replace(/\D/g, '');
  const telegramHref = settings.telegramUrl?.startsWith('http')
    ? settings.telegramUrl
    : `https://${settings.telegramUrl}`;

  return (
    <div>
      {/* Top Luxury Announcement Bar */}
      <div className="announcement-bar">
        <div className="announcement-text">
          <span className="announcement-gold">✨ Addis Ababa Atelier:</span>
          <span>Bespoke Shifon & Habesha Kemis Tailoring • Worldwide Express Delivery via DHL/EMS</span>
        </div>
        <div className="announcement-links">
          <a className="announcement-link" href={`tel:${cleanPhone}`}>
            📞 {settings.phone}
          </a>
          <span>•</span>
          <a className="announcement-link" href={telegramHref} target="_blank" rel="noreferrer">
            ✈️ Telegram Channel
          </a>
        </div>
      </div>

      {/* Main Luxury Header */}
      <header className="hd">
        <div className="brand-wrap" onClick={() => navigate('/')}>
          <img
            src="/logo-dress-mark.png"
            alt="True Clothing Logo"
            className="brand-logo-img"
          />
          <div className="brand-info">
            <span className="lg font-display">True Clothing</span>
            <span className="brand-sub">Habesha & Shifon Atelier</span>
          </div>
        </div>

        <nav>
          {/* Quick Call Pill */}
          <a className="call-atelier-pill" href={`tel:${cleanPhone}`}>
            <span className="pulse-dot"></span>
            <span>{settings.phone}</span>
          </a>

          <button
            className={`chip ${isHome ? 'on' : ''}`}
            onClick={() => navigate('/')}
            type="button"
          >
            {t('home')}
          </button>

          <button
            className={`chip ${isReq ? 'on' : ''}`}
            onClick={() => navigate('/request')}
            type="button"
          >
            ✨ {t('req')}
          </button>

          <button
            className={`chip ${isAccount ? 'on' : ''}`}
            onClick={() => navigate('/account')}
            type="button"
          >
            {customer ? '👤 Client Portal' : admin ? 'Admin' : t('in')}
          </button>

          <button className="chip" onClick={toggleLang} type="button" title="Switch Language">
            <span>🇪🇹</span>
            <span>{lang === 'en' ? 'አማ' : 'EN'}</span>
          </button>
        </nav>
      </header>

      {/* Page Content */}
      <main className="ct">{children}</main>

      {/* Floating Telegram Support Widget */}
      <a
        className="floating-telegram-btn"
        href={telegramHref}
        target="_blank"
        rel="noreferrer"
        title="Chat with us on Telegram"
      >
        <span style={{ fontSize: '18px' }}>✈️</span>
        <span>Chat on Telegram</span>
      </a>

      {/* Luxury Footer */}
      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--soft)', marginTop: '48px', padding: '36px 16px 28px' }}>
        <div className="ct" style={{ padding: 0 }}>
          <div className="fg" style={{ gap: '28px', marginBottom: '28px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <img
                  src="/logo-dress-mark.png"
                  alt="True Clothing Logo"
                  style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                />
                <div>
                  <b className="lg font-display" style={{ fontSize: '18px', display: 'block' }}>{settings.businessName || 'True Clothing'}</b>
                  <span className="brand-sub" style={{ fontSize: '10px' }}>Habesha & Shifon Atelier</span>
                </div>
              </div>
              <p className="mut" style={{ lineHeight: 1.6, maxWidth: '440px' }}>
                Authentic Ethiopian Shifon dresses, traditional royal Habesha Kemis, and premium fabrics.
                Custom tailored by master artisans in Addis Ababa with worldwide delivery to your doorstep.
              </p>
              <div className="rw" style={{ marginTop: '12px', gap: '10px' }}>
                <a className="chip" href={`tel:${cleanPhone}`}>
                  📞 {settings.phone}
                </a>
                <a className="chip" href={telegramHref} target="_blank" rel="noreferrer">
                  ✈️ @Trueclothing16
                </a>
              </div>
            </div>

            <div>
              <b style={{ fontSize: '14px', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Accepted Payment Methods
              </b>
              <div className="rw" style={{ gap: '8px', marginBottom: '16px' }}>
                {settings.payTelebirr && (
                  <span className="chip" style={{ background: '#005CB915', color: '#005CB9', borderColor: '#005CB940' }}>
                    📱 Telebirr
                  </span>
                )}
                {settings.payCbeBirr && (
                  <span className="chip" style={{ background: '#6A1A7D15', color: '#6A1A7D', borderColor: '#6A1A7D40' }}>
                    🏦 CBE Birr
                  </span>
                )}
                {settings.payBank && (
                  <span className="chip" style={{ background: '#10B98115', color: '#047857', borderColor: '#10B98140' }}>
                    💳 Bank Transfer
                  </span>
                )}
              </div>

              <b style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                Atelier Location:
              </b>
              <p className="mut" style={{ margin: 0 }}>
                Addis Ababa, Ethiopia • Mercato & Bole Showrooms
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--mut)' }}>
            <span>© {new Date().getFullYear()} True Clothing. Handcrafted Ethiopian Heritage Fashion.</span>
            <span style={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}>
              Staff Portal
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
