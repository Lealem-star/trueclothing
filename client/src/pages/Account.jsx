import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import StatusTag from '../components/StatusTag';
import PaymentModal from '../components/PaymentModal';
import { formatETB, formatUSD } from '../components/ProductCard';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const ORDER_STEPS = ['Received', 'In production', 'Shipped', 'Delivered'];

export default function Account() {
  const navigate = useNavigate();
  const { lang, toggleLang, t } = useLanguage();
  const { settings } = useSettings();
  const {
    customer,
    admin,
    loginCustomer,
    registerCustomer,
    requestOtp,
    verifyOtp,
    updateCustomerName,
    changeCustomerPassword,
    logoutCustomer
  } = useAuth();
  const { showToast } = useToast();

  // -------------------------------------------------------------
  // CUSTOMER PORTAL STATE (When signed in)
  // -------------------------------------------------------------
  const [portalTab, setPortalTab] = useState('overview'); // 'overview' | 'orders' | 'requests' | 'profile'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Orders filter & search
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');

  // Requests filter
  const [requestFilter, setRequestFilter] = useState('ALL');

  // Profile editing
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  // Online Chapa Payment
  const [payingOrder, setPayingOrder] = useState(null);

  // -------------------------------------------------------------
  // GUEST SIGN IN GATEWAY STATE (When not signed in)
  // -------------------------------------------------------------
  const [authMode, setAuthMode] = useState('password'); // 'password' | 'register' | 'otp'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [otpStep, setOtpStep] = useState(0);
  const [otpCode, setOtpCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Load customer data whenever customer is active
  useEffect(() => {
    if (customer) {
      setProfileName(customer.name || '');
      fetchCustomerData();
    }
  }, [customer]);

  const fetchCustomerData = async () => {
    setLoadingData(true);
    try {
      const [ordersRes, reqsRes] = await Promise.all([
        api.get('/me/orders'),
        api.get('/me/requests')
      ]);
      if (ordersRes.data.success) setOrders(ordersRes.data.orders);
      if (reqsRes.data.success) setRequests(reqsRes.data.requests);
    } catch (err) {
      console.warn('Could not load account data:', err.message);
    } finally {
      setLoadingData(false);
    }
  };

  // Check URL parameters when customer returns from Live Chapa Checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isPaymentSuccess = params.get('payment') === 'success';
    const txRef = params.get('tx_ref');
    const orderCode = params.get('order');

    if (isPaymentSuccess && txRef) {
      api.get(`/payments/verify/${encodeURIComponent(txRef)}`)
        .then((res) => {
          if (res.data?.success && res.data?.verified) {
            showToast(`🎉 Payment verified live via Chapa! Order ${orderCode || ''} is now PAID in full.`);
            fetchCustomerData();
          }
        })
        .catch(() => {});
    }
  }, []);

  // Direct 1-click launch to Live Chapa Checkout
  const handlePayOrderWithLiveChapa = async (orderToPay) => {
    try {
      showToast('Connecting to Live Chapa Checkout... ⏳');
      const res = await api.post('/payments/live/init', {
        orderId: orderToPay.internalId || orderToPay.id,
        phone: customer?.phone || orderToPay.customerPhone,
        customerName: customer?.name || orderToPay.customerName
      });

      if (res.data?.success && res.data?.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        throw new Error(res.data?.error || 'Could not launch Chapa checkout');
      }
    } catch (err) {
      showToast(err.message || 'Payment launch failed');
    }
  };

  // Profile Save
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      showToast('Name cannot be empty');
      return;
    }
    setSavingProfile(true);
    try {
      await updateCustomerName(profileName.trim());
      showToast('Profile name updated');
    } catch (err) {
      showToast(err.message || 'Failed to update name');
    } finally {
      setSavingProfile(false);
    }
  };

  // Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 4) {
      showToast('New password must be at least 4 characters');
      return;
    }
    if (newPw !== confirmPw) {
      showToast('Passwords do not match');
      return;
    }
    setChangingPw(true);
    try {
      await changeCustomerPassword(currentPw, newPw);
      showToast('Password changed successfully');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      showToast(err.message || 'Failed to update password');
    } finally {
      setChangingPw(false);
    }
  };

  // Sign in handlers
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      showToast('Enter your username or phone and password');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await loginCustomer(identifier.trim(), password);
      if (res.success) {
        showToast('Signed in to Customer Portal');
      }
    } catch (err) {
      showToast(err.message || 'Invalid username or password');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim() || regPhone.trim().length < 8 || !regUsername.trim() || regPassword.length < 4) {
      showToast('Please fill all fields (password at least 4 characters)');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await registerCustomer({
        name: regName.trim(),
        phone: regPhone.trim(),
        username: regUsername.trim(),
        password: regPassword
      });
      if (res.success) {
        showToast('Account registered successfully! Welcome.');
      }
    } catch (err) {
      showToast(err.message || 'Registration failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (phoneInput.trim().length < 8) {
      showToast('Enter a valid phone number');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await requestOtp(phoneInput.trim());
      if (res.success) {
        setOtpStep(1);
        if (res.devCode) {
          setDevCodeHint(res.devCode);
          showToast(`Code sent! (Dev code: ${res.devCode})`);
        } else {
          showToast('Verification code sent');
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to send code');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (otpCode.trim().length !== 6) {
      showToast('Enter the 6-digit code');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await verifyOtp(phoneInput.trim(), otpCode.trim());
      if (res.success) {
        setOtpStep(0);
        showToast('Signed in successfully');
      }
    } catch (err) {
      showToast(err.message || 'Wrong code');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Helper stats
  const activeOrders = orders.filter((o) => ['Received', 'In production', 'RECEIVED', 'IN_PRODUCTION'].includes(o.status));
  const deliveredOrders = orders.filter((o) => ['Delivered', 'DELIVERED'].includes(o.status));
  const quotesCount = requests.filter((r) => r.quoteAmount || (r.quote && String(r.quote).trim().length > 0)).length;
  const totalSpentETB = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Latest active order for spotlight
  const latestActiveOrder = activeOrders[0] || orders[0];

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (orderFilter !== 'ALL') {
      if (orderFilter === 'RECEIVED' && !['Received', 'RECEIVED'].includes(o.status)) return false;
      if (orderFilter === 'IN_PRODUCTION' && !['In production', 'IN_PRODUCTION'].includes(o.status)) return false;
      if (orderFilter === 'SHIPPED' && !['Shipped', 'SHIPPED'].includes(o.status)) return false;
      if (orderFilter === 'DELIVERED' && !['Delivered', 'DELIVERED'].includes(o.status)) return false;
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase();
      const matchId = (o.id || '').toLowerCase().includes(q);
      const matchDesc = (o.desc || '').toLowerCase().includes(q);
      if (!matchId && !matchDesc) return false;
    }
    return true;
  });

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (requestFilter === 'ALL') return true;
    return (r.type || '').toUpperCase().includes(requestFilter);
  });

  // Customer Initials
  const getInitials = (name, phone) => {
    if (!name) return phone ? phone.slice(-2) : 'TC';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const cleanPhone = (settings.phone || '').replace(/\D/g, '');
  const telegramHref = settings.telegramUrl?.startsWith('http')
    ? settings.telegramUrl
    : `https://${settings.telegramUrl}`;

  // =============================================================
  // 1. GUEST GATEWAY VIEW (When not signed in)
  // =============================================================
  if (!customer) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {/* Simple Top Navigation */}
        <header style={{ background: '#141236', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => navigate('/')}>
            <img src="/logo-dress-mark.png" alt="Logo" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff', padding: '2px' }} />
            <div>
              <b style={{ fontSize: '16px', display: 'block', color: '#fff' }}>True Clothing</b>
              <span style={{ fontSize: '10px', color: '#F2B705', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Client Portal</span>
            </div>
          </div>
          <button className="chip" onClick={() => navigate('/')} type="button" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
            ← Back to Shop
          </button>
        </header>

        {/* Portal Sign-in Box */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px 16px' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '32px 26px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)', borderRadius: '18px' }}>
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <img
                src="/logo-dress-mark.png"
                alt="True Clothing"
                style={{ width: '60px', height: '60px', objectFit: 'contain', margin: '0 auto 10px', display: 'block' }}
              />
              <span style={{ color: '#F2B705', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Atelier Client Portal
              </span>
              <h2 style={{ margin: '4px 0 6px', fontSize: '24px', color: 'var(--ink)' }}>
                {authMode === 'register' ? 'Register New Account' : 'Client Sign In'}
              </h2>
              <p className="mut" style={{ margin: 0, fontSize: '13px' }}>
                {authMode === 'register'
                  ? 'Create an account to track your bespoke tailoring and orders'
                  : 'Access your private tailoring dashboard, orders, and wholesale quotes'}
              </p>
            </div>

            {/* Mode 1: Password Login */}
            {authMode === 'password' && (
              <form onSubmit={handlePasswordLogin}>
                <FormField
                  id="p-id"
                  label="Username or Phone"
                  placeholder="e.g. 0911... or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
                <FormField
                  id="p-pw"
                  label="Password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button className="btn acc" type="submit" disabled={authSubmitting} style={{ width: '100%', minHeight: '46px', marginTop: '16px', fontSize: '15px' }}>
                  {authSubmitting ? 'Signing in...' : 'Sign In to Portal'}
                </button>

                <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--line)', textAlign: 'center', fontSize: '13px' }}>
                  <div style={{ marginBottom: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setAuthMode('otp')}
                      style={{ background: 'none', border: 'none', color: '#B8860B', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                    >
                      📲 Sign in with SMS one-time code
                    </button>
                  </div>
                  <div>
                    <span className="mut">First time ordering? </span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      style={{ background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', fontWeight: 700, padding: 0, textDecoration: 'underline' }}
                    >
                      Register an account
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Mode 2: Register */}
            {authMode === 'register' && (
              <form onSubmit={handleRegister}>
                <FormField
                  id="r-name"
                  label="Full Name"
                  placeholder="e.g. Alemayehu Mekonen"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  required
                />
                <FormField
                  id="r-ph"
                  label="Phone Number"
                  type="tel"
                  placeholder="09... / +251..."
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  required
                />
                <FormField
                  id="r-user"
                  label="Username"
                  placeholder="e.g. alemayehu26"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                />
                <FormField
                  id="r-pw"
                  label="Password"
                  type="password"
                  placeholder="Minimum 4 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                <button className="btn acc" type="submit" disabled={authSubmitting} style={{ width: '100%', minHeight: '46px', marginTop: '16px', fontSize: '15px' }}>
                  {authSubmitting ? 'Creating account...' : 'Create Client Account'}
                </button>
                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
                  <span className="mut">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('password')}
                    style={{ background: 'none', border: 'none', color: 'var(--ink)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* Mode 3: OTP */}
            {authMode === 'otp' && (
              <div>
                <p className="mut" style={{ textAlign: 'center', fontSize: '13px', margin: '0 0 16px' }}>
                  Enter your phone number. We will send a 6-digit verification code.
                </p>
                {otpStep === 1 ? (
                  <form onSubmit={handleVerifyCode}>
                    <FormField
                      id="otp-code"
                      label="6-digit code"
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      required
                    />
                    {devCodeHint && (
                      <p className="mut" style={{ color: '#F2B705', fontSize: '12px' }}>
                        Development OTP: <b>{devCodeHint}</b>
                      </p>
                    )}
                    <div className="rw end" style={{ gap: '10px', marginTop: '14px' }}>
                      <button className="chip" onClick={() => setOtpStep(0)} type="button">
                        Change phone
                      </button>
                      <button className="btn acc" type="submit" disabled={authSubmitting}>
                        {authSubmitting ? '...' : 'Verify & Enter'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSendCode}>
                    <FormField
                      id="otp-ph"
                      label="Phone number"
                      type="tel"
                      placeholder="09..."
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      required
                    />
                    <button className="btn acc" type="submit" disabled={authSubmitting} style={{ width: '100%', minHeight: '46px', marginTop: '14px' }}>
                      {authSubmitting ? '...' : 'Send Verification Code'}
                    </button>
                  </form>
                )}
                <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '13px' }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode('password')}
                    style={{ background: 'none', border: 'none', color: '#B8860B', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Back to Password Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Staff portal link */}
            <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)' }}>
              Are you staff?{' '}
              <a
                href="/admin/login"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/admin/login');
                }}
                style={{ color: 'var(--muted)', textDecoration: 'underline' }}
              >
                Staff Admin sign in
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =============================================================
  // 2. SIGNED-IN CUSTOMER PORTAL DASHBOARD VIEW
  // =============================================================
  const initials = getInitials(customer.name, customer.phone);

  return (
    <div className="portal-layout">
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div className="portal-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* PORTAL SIDEBAR */}
      <aside className={`portal-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Brand Block */}
        <div className="portal-brand-block" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/logo-dress-mark.png" alt="True Clothing" className="portal-brand-logo" />
          <div>
            <span className="portal-brand-title">True Clothing</span>
            <span className="portal-brand-badge">Client Portal</span>
          </div>
        </div>

        {/* Customer Profile Snippet */}
        <div className="portal-user-snippet">
          <div className="portal-avatar">{initials}</div>
          <div className="portal-user-meta">
            <div className="portal-user-name" title={customer.name || customer.username || customer.phone}>
              {customer.name || customer.username || 'Valued Client'}
            </div>
            <div className="portal-user-phone">{customer.phone}</div>
            <span style={{ fontSize: '10px', color: '#F2B705', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              ✓ Verified Client
            </span>
          </div>
        </div>

        {/* Portal Nav Items */}
        <nav className="portal-nav-list">
          <button
            type="button"
            className={`portal-nav-item ${portalTab === 'overview' ? 'active' : ''}`}
            onClick={() => {
              setPortalTab('overview');
              setMobileMenuOpen(false);
            }}
          >
            <span style={{ fontSize: '16px' }}>📊</span>
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className={`portal-nav-item ${portalTab === 'orders' ? 'active' : ''}`}
            onClick={() => {
              setPortalTab('orders');
              setMobileMenuOpen(false);
            }}
          >
            <span style={{ fontSize: '16px' }}>📦</span>
            <span>My Orders</span>
            {activeOrders.length > 0 && (
              <span className="portal-nav-badge">{activeOrders.length} active</span>
            )}
          </button>

          <button
            type="button"
            className={`portal-nav-item ${portalTab === 'requests' ? 'active' : ''}`}
            onClick={() => {
              setPortalTab('requests');
              setMobileMenuOpen(false);
            }}
          >
            <span style={{ fontSize: '16px' }}>✨</span>
            <span>Custom & Wholesale</span>
            {quotesCount > 0 && (
              <span className="portal-nav-badge" style={{ background: '#16a34a', color: '#fff' }}>Quote Ready</span>
            )}
          </button>

          <button
            type="button"
            className={`portal-nav-item ${portalTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setPortalTab('profile');
              setMobileMenuOpen(false);
            }}
          >
            <span style={{ fontSize: '16px' }}>👤</span>
            <span>Profile & Security</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="portal-sidebar-footer">
          <button
            type="button"
            className="portal-nav-item"
            onClick={() => navigate('/')}
            style={{ color: '#D9D8F0' }}
          >
            <span>🛍️</span>
            <span>Browse Shop Catalog</span>
          </button>

          <button
            type="button"
            className="portal-nav-item"
            onClick={logoutCustomer}
            style={{ color: '#f87171' }}
          >
            <span>🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* PORTAL MAIN CONTENT AREA */}
      <div className="portal-content-wrap">
        {/* Mobile Header Bar */}
        <div className="portal-mobile-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '0 4px' }}
            >
              ☰
            </button>
            <b style={{ fontSize: '16px' }}>Client Portal</b>
          </div>
          <button
            className="chip"
            onClick={() => navigate('/')}
            type="button"
            style={{ fontSize: '12px', padding: '4px 10px', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Shop
          </button>
        </div>

        {/* Top Sticky Bar */}
        <header className="portal-topbar">
          <div className="portal-topbar-title">
            <span>
              {portalTab === 'overview' && '📊 Atelier Dashboard'}
              {portalTab === 'orders' && '📦 My Orders & Tracking'}
              {portalTab === 'requests' && '✨ Bespoke & Wholesale Inquiries'}
              {portalTab === 'profile' && '👤 Client Profile & Security'}
            </span>
          </div>

          <div className="portal-topbar-actions">
            <a
              className="call-atelier-pill"
              href={`tel:${cleanPhone}`}
              title="Call Atelier"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
            >
              <span className="pulse-dot" />
              <span>📞 {settings.phone}</span>
            </a>

            <a
              className="chip"
              href={telegramHref}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
            >
              ✈️ Telegram
            </a>

            <button className="chip" onClick={toggleLang} type="button" style={{ padding: '6px 10px', fontSize: '12px' }}>
              <span>🇪🇹</span>
              <span>{lang === 'en' ? 'አማ' : 'EN'}</span>
            </button>

            <button
              className="btn acc"
              onClick={() => navigate('/')}
              type="button"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              🛍️ Shop Catalog
            </button>
          </div>
        </header>

        {/* MAIN BODY BY TAB */}
        <main className="portal-main-body">
          {loadingData ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div className="spinner" />
              <p className="mut" style={{ marginTop: '12px', fontSize: '15px' }}>Loading your orders & tailor updates...</p>
            </div>
          ) : portalTab === 'overview' ? (
            /* ========================================================
               TAB 1: DASHBOARD OVERVIEW
               ======================================================== */
            <div>
              {/* Welcome Headline */}
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ margin: '0 0 6px', fontSize: '26px', color: 'var(--ink)' }}>
                  Welcome back, {customer.name || customer.username || 'Client'}! 👋
                </h1>
                <p className="mut" style={{ margin: 0, fontSize: '14px' }}>
                  Here is the live status of your True Clothing tailoring orders, custom measurements, and wholesale quotes.
                </p>
              </div>

              {/* 4 Stat Cards */}
              <div className="portal-stats-grid">
                <div className="portal-stat-card">
                  <div className="portal-stat-icon" style={{ background: '#EEF2FF', color: '#4338CA' }}>
                    📦
                  </div>
                  <div>
                    <div className="portal-stat-val">{orders.length}</div>
                    <div className="portal-stat-lbl">Total Orders Placed</div>
                  </div>
                </div>

                <div className="portal-stat-card">
                  <div className="portal-stat-icon" style={{ background: '#FEF3C7', color: '#B45309' }}>
                    ✂️
                  </div>
                  <div>
                    <div className="portal-stat-val">{activeOrders.length}</div>
                    <div className="portal-stat-lbl">In Active Tailoring</div>
                  </div>
                </div>

                <div className="portal-stat-card">
                  <div className="portal-stat-icon" style={{ background: '#DCFCE7', color: '#15803D' }}>
                    🚚
                  </div>
                  <div>
                    <div className="portal-stat-val">{deliveredOrders.length}</div>
                    <div className="portal-stat-lbl">Delivered to You</div>
                  </div>
                </div>

                <div className="portal-stat-card">
                  <div className="portal-stat-icon" style={{ background: '#F3E8FF', color: '#7E22CE' }}>
                    ✨
                  </div>
                  <div>
                    <div className="portal-stat-val">{requests.length}</div>
                    <div className="portal-stat-lbl">Custom Requests</div>
                  </div>
                </div>
              </div>

              {/* Spotlight on Most Recent Active Order */}
              {latestActiveOrder ? (
                <div className="portal-active-order-banner">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#F2B705', color: '#141236', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', fontSize: '14px' }}>
                        Order {latestActiveOrder.id}
                      </span>
                      <span style={{ color: '#D9D8F0', fontSize: '13px' }}>
                        {latestActiveOrder.type} • Placed {latestActiveOrder.date}
                      </span>
                    </div>
                    <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      Live Status: {latestActiveOrder.status}
                    </span>
                  </div>

                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', color: '#fff' }}>
                    {latestActiveOrder.desc}
                  </h3>
                  <div style={{ color: '#F2B705', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                    {formatETB(latestActiveOrder.total)} ({formatUSD(latestActiveOrder.total)})
                  </div>

                  {/* 4-step Progress Bar */}
                  <div className="bar" style={{ background: 'rgba(255,255,255,0.2)', height: '6px', margin: '14px 0 8px' }}>
                    {ORDER_STEPS.map((s, i) => {
                      const curIdx = ORDER_STEPS.indexOf(latestActiveOrder.status);
                      const isDone = i < curIdx || curIdx === 3;
                      const isCur = i === curIdx;
                      return (
                        <i
                          key={s}
                          style={{
                            background: isDone || isCur ? '#F2B705' : 'transparent',
                            opacity: isCur ? 1 : isDone ? 0.8 : 0.2
                          }}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#D9D8F0' }}>
                    <span>1. Received & Verified</span>
                    <span>2. In Tailoring & Weaving</span>
                    <span>3. Shipped / Dispatched</span>
                    <span>4. Delivered</span>
                  </div>

                  <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {latestActiveOrder.pay !== 'PAID' && (
                      <button
                        type="button"
                        className="btn acc"
                        onClick={() => handlePayOrderWithLiveChapa(latestActiveOrder)}
                        style={{
                          fontSize: '12.5px',
                          padding: '6px 14px',
                          background: '#F2B705',
                          color: '#141236',
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>💳</span>
                        <span>Pay Live via Chapa</span>
                      </button>
                    )}
                    <a
                      className="btn acc"
                      href={`tel:${cleanPhone}`}
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                      📞 Call Tailor
                    </a>
                    <a
                      className="btn out"
                      href={telegramHref}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: '12px', padding: '6px 14px', color: '#fff', borderColor: 'rgba(255,255,255,0.4)' }}
                    >
                      ✈️ Message on Telegram
                    </a>
                    <button
                      className="chip"
                      onClick={() => setPortalTab('orders')}
                      type="button"
                      style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}
                    >
                      View All Orders →
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Quick Action Shortcuts */}
              <div style={{ marginBottom: '12px' }}>
                <b style={{ fontSize: '16px', color: 'var(--ink)' }}>Need a New Dress or Custom Order?</b>
              </div>
              <div className="portal-actions-grid">
                <div className="portal-action-card" onClick={() => navigate('/')}>
                  <div className="portal-action-icon">👗</div>
                  <div>
                    <div className="portal-action-title">Ready-Made Dresses</div>
                    <div className="portal-action-sub">Browse our latest shifon & kemis</div>
                  </div>
                </div>

                <div className="portal-action-card" onClick={() => navigate('/request?tab=Custom+design')}>
                  <div className="portal-action-icon">✂️</div>
                  <div>
                    <div className="portal-action-title">Custom Design</div>
                    <div className="portal-action-sub">Upload photo & custom measurements</div>
                  </div>
                </div>

                <div className="portal-action-card" onClick={() => navigate('/request?tab=Wholesale')}>
                  <div className="portal-action-icon">📦</div>
                  <div>
                    <div className="portal-action-title">Wholesale Inquiries</div>
                    <div className="portal-action-sub">Bulk trader orders with tailor quote</div>
                  </div>
                </div>

                <div className="portal-action-card" onClick={() => navigate('/request?tab=Abroad')}>
                  <div className="portal-action-icon">✈️</div>
                  <div>
                    <div className="portal-action-title">Worldwide Express</div>
                    <div className="portal-action-sub">Deliver your kemis abroad via DHL</div>
                  </div>
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="card" style={{ padding: '20px' }}>
                <div className="li" style={{ marginBottom: '14px' }}>
                  <b style={{ fontSize: '16px' }}>Recent Order History</b>
                  <button
                    className="chip"
                    onClick={() => setPortalTab('orders')}
                    type="button"
                    style={{ fontSize: '12px' }}
                  >
                    View All ({orders.length}) →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                    <p className="mut" style={{ margin: '0 0 12px' }}>You haven’t placed any orders yet.</p>
                    <button className="btn acc" onClick={() => navigate('/')} type="button">
                      Browse Shop Catalog
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {orders.slice(0, 3).map((o) => (
                      <div
                        key={o.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          background: 'var(--soft)',
                          borderRadius: '10px',
                          flexWrap: 'wrap',
                          gap: '8px'
                        }}
                      >
                        <div>
                          <b style={{ color: 'var(--ink)', fontSize: '15px' }}>{o.id}</b>
                          <span className="mut" style={{ marginLeft: '8px', fontSize: '13px' }}>{o.type}</span>
                          <div className="mut" style={{ fontSize: '13px', marginTop: '2px' }}>
                            {o.desc}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{formatETB(o.total)}</span>
                          <StatusTag status={o.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : portalTab === 'orders' ? (
            /* ========================================================
               TAB 2: MY ORDERS (FULL LIST & TRACKING)
               ======================================================== */
            <div>
              <div className="li" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '22px' }}>My Orders</h2>
                  <p className="mut" style={{ margin: 0, fontSize: '13px' }}>
                    Track tailoring and dispatch status for all your orders.
                  </p>
                </div>
                <button className="btn acc" onClick={() => navigate('/')} type="button">
                  + New Order
                </button>
              </div>

              {/* Status Filter Chips & Search Bar */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
                <div className="rw" style={{ gap: '6px' }}>
                  {[
                    { key: 'ALL', label: `All (${orders.length})` },
                    { key: 'RECEIVED', label: 'Received' },
                    { key: 'IN_PRODUCTION', label: 'In Tailoring' },
                    { key: 'SHIPPED', label: 'Shipped' },
                    { key: 'DELIVERED', label: 'Delivered' }
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className={`chip ${orderFilter === chip.key ? 'on' : ''}`}
                      onClick={() => setOrderFilter(chip.key)}
                      style={{ fontSize: '13px' }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <div style={{ marginLeft: 'auto', minWidth: '180px' }}>
                  <input
                    type="text"
                    className="in"
                    placeholder="Search by code or dress..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p className="mut" style={{ fontSize: '15px', margin: '0 0 12px' }}>
                    {orderSearch ? 'No orders match your search.' : 'No orders found for this filter.'}
                  </p>
                  <button className="btn out" onClick={() => { setOrderFilter('ALL'); setOrderSearch(''); }} type="button">
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredOrders.map((o) => {
                    const stepIndex = ORDER_STEPS.indexOf(o.status);
                    return (
                      <div key={o.id} className="card" style={{ padding: '22px', border: '1px solid var(--line)' }}>
                        <div className="li" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ background: '#1E1B4B', color: '#F2B705', fontWeight: 800, padding: '3px 10px', borderRadius: '6px', fontSize: '15px' }}>
                                Order {o.id}
                              </span>
                              <span className="tag t3">{o.type}</span>
                              <span className="mut" style={{ fontSize: '13px' }}>Placed: {o.date}</span>
                            </div>
                            <h3 style={{ margin: '8px 0 2px', fontSize: '17px', color: 'var(--ink)' }}>
                              {o.desc}
                            </h3>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <StatusTag status={o.status} />
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '4px 8px',
                                borderRadius: '6px',
                                background: o.pay === 'PAID' ? '#DCFCE7' : '#FEF3C7',
                                color: o.pay === 'PAID' ? '#15803D' : '#92400E'
                              }}
                            >
                              Payment: {o.pay || 'UNPAID'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Timeline Bar */}
                        <div style={{ margin: '16px 0 8px' }}>
                          <div className="bar">
                            {ORDER_STEPS.map((s, i) => (
                              <i
                                key={s}
                                className={i < stepIndex || stepIndex === 3 ? 'd' : i === stepIndex ? 'c' : ''}
                              />
                            ))}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                            <span>1. Received</span>
                            <span>2. In Tailoring</span>
                            <span>3. Shipped</span>
                            <span>4. Delivered</span>
                          </div>
                        </div>

                        {/* Total and Actions */}
                        <div
                          style={{
                            marginTop: '16px',
                            paddingTop: '14px',
                            borderTop: '1px solid var(--line)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}
                        >
                          <div>
                            <span className="mut" style={{ fontSize: '12px' }}>Order Total: </span>
                            <b style={{ fontSize: '18px', color: 'var(--ink)' }}>{formatETB(o.total)}</b>
                            <span className="mut" style={{ fontSize: '13px', marginLeft: '6px' }}>({formatUSD(o.total)})</span>
                          </div>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            {o.pay !== 'PAID' && (
                              <button
                                type="button"
                                className="btn acc"
                                onClick={() => handlePayOrderWithLiveChapa(o)}
                                style={{
                                  fontSize: '12.5px',
                                  padding: '6px 14px',
                                  background: '#0088cc',
                                  color: '#fff',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                <span>💳</span>
                                <span>Pay Live via Chapa</span>
                              </button>
                            )}
                            <a
                              className="btn out"
                              href={`tel:${cleanPhone}`}
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              📞 Call Tailor
                            </a>
                            <a
                              className="btn acc"
                              href={telegramHref}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '12px', padding: '6px 12px' }}
                            >
                              ✈️ Message on Telegram
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : portalTab === 'requests' ? (
            /* ========================================================
               TAB 3: CUSTOM TAILORING & WHOLESALE INQUIRIES
               ======================================================== */
            <div>
              <div className="li" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px', fontSize: '22px' }}>Bespoke Designs & Wholesale</h2>
                  <p className="mut" style={{ margin: 0, fontSize: '13px' }}>
                    View your custom tailoring measurements, photos, and tailor wholesale quotes.
                  </p>
                </div>
                <button className="btn acc" onClick={() => navigate('/request')} type="button">
                  + Submit New Request
                </button>
              </div>

              {/* Type Filter */}
              <div className="rw" style={{ gap: '6px', marginBottom: '18px' }}>
                {[
                  { key: 'ALL', label: `All Requests (${requests.length})` },
                  { key: 'CUSTOM', label: 'Custom Designs' },
                  { key: 'WHOLESALE', label: 'Wholesale' },
                  { key: 'ABROAD', label: 'Abroad Delivery' }
                ].map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`chip ${requestFilter === f.key ? 'on' : ''}`}
                    onClick={() => setRequestFilter(f.key)}
                    style={{ fontSize: '13px' }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {filteredRequests.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <p className="mut" style={{ margin: '0 0 12px', fontSize: '15px' }}>No requests found.</p>
                  <button className="btn acc" onClick={() => navigate('/request')} type="button">
                    Submit a Custom Tailoring Request
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredRequests.map((r) => (
                    <div key={r.id} className="card" style={{ padding: '22px', border: '1px solid var(--line)' }}>
                      <div className="li" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--ink)' }}>
                              {r.type}
                            </span>
                            <span className="mut" style={{ fontSize: '13px' }}>Submitted: {r.date}</span>
                          </div>
                          {r.name && (
                            <p className="mut" style={{ margin: '2px 0 0', fontSize: '13px' }}>
                              Contact: {r.name} ({r.phone})
                            </p>
                          )}
                        </div>
                        <StatusTag status={r.status} />
                      </div>

                      {/* Tailor Official Quote Highlight */}
                      {r.quote && (
                        <div
                          style={{
                            background: '#F0FDF4',
                            border: '1.5px solid #86EFAC',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            margin: '14px 0 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.06em' }}>
                              Official Tailor Quote
                            </span>
                            <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803D', marginTop: '2px' }}>
                              {typeof r.quote === 'number' ? formatETB(r.quote) : r.quote}
                            </div>
                            {r.quoteText && (
                              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#14532D' }}>
                                {r.quoteText}
                              </p>
                            )}
                          </div>
                          <a
                            className="btn acc"
                            href={`tel:${cleanPhone}`}
                            style={{ background: '#16A34A', borderColor: '#16A34A', color: '#fff', fontSize: '13px' }}
                          >
                            Accept & Proceed
                          </a>
                        </div>
                      )}

                      {/* Converted to order badge */}
                      {r.orderCode && (
                        <div style={{ background: 'rgba(242, 183, 5, 0.1)', border: '1px solid #F2B705', padding: '8px 12px', borderRadius: '8px', margin: '8px 0', fontSize: '13px', color: 'var(--ink)', fontWeight: 600 }}>
                          ✓ This request was approved and converted into Order <b>#{r.orderCode}</b>!
                        </div>
                      )}

                      {/* Details Breakdown */}
                      {r.d && typeof r.d === 'object' && (
                        <div style={{ background: 'var(--soft)', borderRadius: '10px', padding: '12px 16px', margin: '12px 0' }}>
                          <b style={{ fontSize: '13px', color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                            Submitted Specifications & Measurements:
                          </b>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', fontSize: '13px' }}>
                            {Object.entries(r.d).map(([k, v]) => (
                              <div key={k}>
                                <span className="mut">{k}: </span>
                                <b style={{ color: 'var(--ink)' }}>{String(v)}</b>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {r.notes && (
                        <p className="mut" style={{ fontSize: '13px', margin: '6px 0', fontStyle: 'italic' }}>
                          "{r.notes}"
                        </p>
                      )}

                      {/* Attached Reference Photos */}
                      {r.images && r.images.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                            Attached Reference Photos ({r.images.length}):
                          </span>
                          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {r.images.map((img, idx) => (
                              <a
                                key={idx}
                                href={img.url}
                                target="_blank"
                                rel="noreferrer"
                                style={{ display: 'block', width: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--line)' }}
                              >
                                <img src={img.url} alt="Reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : portalTab === 'profile' ? (
            /* ========================================================
               TAB 4: CLIENT PROFILE & SECURITY
               ======================================================== */
            <div style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '22px' }}>Client Profile & Security</h2>
                <p className="mut" style={{ margin: 0, fontSize: '13px' }}>
                  Manage your personal details and account password.
                </p>
              </div>

              {/* Profile Card */}
              <div className="card" style={{ padding: '22px', marginBottom: '20px' }}>
                <b style={{ fontSize: '16px', color: 'var(--ink)', display: 'block', marginBottom: '14px' }}>
                  Personal Information
                </b>

                <form onSubmit={handleSaveProfile}>
                  <FormField
                    id="prof-name"
                    label="Full Name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="e.g. Alemayehu Mekonen"
                    required
                  />

                  <div className="fg" style={{ marginTop: '10px' }}>
                    <div>
                      <label className="lb">Verified Phone Number</label>
                      <input
                        type="text"
                        className="in"
                        value={customer.phone}
                        disabled
                        style={{ background: 'var(--soft)', cursor: 'not-allowed', color: 'var(--ink)' }}
                      />
                    </div>
                    <div>
                      <label className="lb">Account Username</label>
                      <input
                        type="text"
                        className="in"
                        value={customer.username ? `@${customer.username}` : 'No username set'}
                        disabled
                        style={{ background: 'var(--soft)', cursor: 'not-allowed', color: 'var(--ink)' }}
                      />
                    </div>
                  </div>

                  <div className="rw end" style={{ marginTop: '14px' }}>
                    <button className="btn acc" type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save Name Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Change Password Card */}
              <div className="card" style={{ padding: '22px', marginBottom: '20px' }}>
                <b style={{ fontSize: '16px', color: 'var(--ink)', display: 'block', marginBottom: '4px' }}>
                  Change Portal Password
                </b>
                <p className="mut" style={{ fontSize: '13px', margin: '0 0 14px' }}>
                  Set a new password to sign in with your username or phone.
                </p>

                <form onSubmit={handleChangePassword}>
                  <FormField
                    id="cp-old"
                    label="Current Password"
                    type="password"
                    placeholder="Enter current password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                  />

                  <div className="fg" style={{ marginTop: '10px' }}>
                    <FormField
                      id="cp-new"
                      label="New Password"
                      type="password"
                      placeholder="At least 4 characters"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      required
                    />
                    <FormField
                      id="cp-conf"
                      label="Confirm New Password"
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      required
                    />
                  </div>

                  <div className="rw end" style={{ marginTop: '14px' }}>
                    <button className="btn acc" type="submit" disabled={changingPw}>
                      {changingPw ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Atelier Support & Direct Contact Card */}
              <div className="card" style={{ padding: '20px', background: 'var(--soft)', border: '1px solid var(--line)' }}>
                <b style={{ fontSize: '15px', color: 'var(--ink)', display: 'block', marginBottom: '6px' }}>
                  Atelier Support & Direct Inquiries
                </b>
                <p className="mut" style={{ fontSize: '13px', margin: '0 0 12px' }}>
                  Have questions about fittings, fabric choices, or delivery schedules? Our team is available directly.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <a className="btn out" href={`tel:${cleanPhone}`} style={{ fontSize: '13px' }}>
                    📞 Call Atelier: {settings.phone}
                  </a>
                  <a className="btn acc" href={telegramHref} target="_blank" rel="noreferrer" style={{ fontSize: '13px' }}>
                    ✈️ Telegram Channel
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* Online Chapa Payment Modal */}
      <PaymentModal
        isOpen={!!payingOrder}
        onClose={() => setPayingOrder(null)}
        order={payingOrder}
        onPaymentSuccess={() => {
          fetchCustomerData();
          setPayingOrder(null);
        }}
      />
    </div>
  );
}
