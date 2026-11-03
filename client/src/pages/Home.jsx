import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ShopLayout from '../components/ShopLayout';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import ServiceCard from '../components/ServiceCard';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import api from '../api/client';

const CATEGORIES = [
  { key: 'All', icon: '✨', labelEn: 'All Items', labelAm: 'ሁሉም' },
  { key: 'Shifon', icon: '👗', labelEn: 'Shifon Dresses', labelAm: 'የሽፎን ቀሚሶች' },
  { key: 'Habesha', icon: '👑', labelEn: 'Habesha Kemis', labelAm: 'የሀበሻ ቀሚሶች' },
  { key: 'Fabric', icon: '🧵', labelEn: 'Luxury Fabric', labelAm: 'ጨርቆች' }
];

const TESTIMONIALS = [
  {
    name: 'Bethlehem Mengistu',
    location: 'Washington DC, USA',
    text: 'Ordered my wedding Habesha Kemis with royal gold tibeb. It arrived in 6 days and the bust and length fit like a glove! True Clothing made my wedding day unforgettable.',
    rating: 5,
    tag: 'Bridal Order'
  },
  {
    name: 'Dawit Kassaye',
    location: 'Addis Ababa (Mercato)',
    text: 'We order wholesale shifon fabric rolls every month for our boutique. Highest quality imported silk and reliable delivery every single time.',
    rating: 5,
    tag: 'Wholesale Partner'
  },
  {
    name: 'Sara Tesfaye',
    location: 'Dubai, UAE',
    text: 'Sent them a photo of a modern dress from Instagram. The tailors sewed it exactly as requested and sent me photos on Telegram before shipping. 10/10 service!',
    rating: 5,
    tag: 'Custom Design'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const { lang, t } = useLanguage();
  const { settings } = useSettings();
  const { showToast } = useToast();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured'); // 'featured', 'price-low', 'price-high'

  const fetchProducts = async (cat) => {
    setLoading(true);
    try {
      const url = cat && cat !== 'All' ? `/products?category=${cat}` : '/products';
      const res = await api.get(url);
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      showToast('Could not load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(selectedCategory);
  }, [selectedCategory]);

  const scrollToGrid = () => {
    const el = document.getElementById('grid');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const cleanPhone = (settings.phone || '').replace(/\D/g, '');

  // Filtered & Sorted products
  const displayedProducts = useMemo(() => {
    let result = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.nameEn?.toLowerCase().includes(q) ||
          p.nameAm?.includes(q) ||
          p.descriptionEn?.toLowerCase().includes(q) ||
          p.descriptionAm?.includes(q)
      );
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    }

    return result;
  }, [products, searchQuery, sortBy]);

  // Featured dress for hero showcase
  const featuredHeroProduct = products.find(p => p.category === 'HABESHA') || products[0];

  return (
    <ShopLayout>
      {/* Editorial Luxury Hero Section */}
      <section className="hero">
        <div className="hero-left">
          <div className="hero-badge">
            <span>✨</span>
            <span>Bespoke Ethiopian Atelier • Addis Ababa</span>
          </div>

          <h1>{t('h1')}</h1>

          <p className="hero-sub">
            Handcrafted pure silk <b>shifon dresses</b>, traditional royal gold <b>Habesha Kemis</b>, and luxury sheer fabrics.
            Tailored to your exact body measurements with worldwide express shipping.
          </p>

          <div className="rw" style={{ marginTop: '8px', gap: '10px' }}>
            <button className="btn acc" onClick={scrollToGrid} type="button">
              <span>🛍️</span>
              <span>{t('browse')}</span>
            </button>
            <a className="btn out" href={`tel:${cleanPhone}`}>
              <span>📞</span>
              <span>{t('call')}</span>
            </a>
            <button
              className="chip"
              onClick={() => navigate('/request?tab=Custom design')}
              type="button"
              style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', borderColor: 'rgba(255, 255, 255, 0.25)' }}
            >
              ✂️ Custom Tailoring
            </button>
          </div>

          {/* Trust points */}
          <div className="rw" style={{ gap: '16px', marginTop: '12px', fontSize: '12px', color: '#E2E1F5' }}>
            <span>⭐ <b>4.9/5</b> Rating (500+ Brides)</span>
            <span>•</span>
            <span>✈️ <b>Worldwide Delivery</b> (US, UK, UAE)</span>
            <span>•</span>
            <span>🪡 <b>Custom cm Fit</b></span>
          </div>
        </div>

        {/* Right side: Floating Showcase */}
        <div className="hero-showcase">
          {featuredHeroProduct && (
            <div
              className="hero-card-preview"
              onClick={() => setSelectedProduct(featuredHeroProduct)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ position: 'relative' }}>
                {featuredHeroProduct.images?.[0]?.url && (
                  <img
                    src={featuredHeroProduct.images[0].url}
                    alt={featuredHeroProduct.nameEn}
                    className="hero-card-img"
                  />
                )}
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(30, 27, 75, 0.85)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#F2B705', fontWeight: '700' }}>
                  👑 ATELIER SHOWCASE
                </div>
              </div>

              <div>
                <b style={{ color: '#FFFFFF', fontSize: '15px', display: 'block' }}>
                  {featuredHeroProduct.nameEn}
                </b>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ color: '#F2B705', fontWeight: '800', fontSize: '16px' }}>
                    {Number(featuredHeroProduct.price).toLocaleString()} ETB
                  </span>
                  <span style={{ color: '#FFFFFF', fontSize: '12px', textDecoration: 'underline' }}>
                    Order Now →
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trust & Value Strip */}
      <section className="trust-strip">
        <div className="trust-item">
          <div className="trust-icon-wrap">🪡</div>
          <div className="trust-content">
            <b>Bespoke Measurements</b>
            <p>Tailored to your exact bust, waist, hip & length.</p>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon-wrap">✈️</div>
          <div className="trust-content">
            <b>Worldwide Delivery</b>
            <p>Fast express delivery to US, UK, Europe, UAE & Canada.</p>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon-wrap">👑</div>
          <div className="trust-content">
            <b>Authentic Habesha Tibeb</b>
            <p>Handcrafted gold embroidery & pure shemma cotton.</p>
          </div>
        </div>

        <div className="trust-item">
          <div className="trust-icon-wrap">💬</div>
          <div className="trust-content">
            <b>Direct Video & Telegram</b>
            <p>Live fitting consultations and updates on Telegram.</p>
          </div>
        </div>
      </section>

      {/* Catalog & Filter Header */}
      <div id="grid">
        <div className="catalog-header">
          {/* Category Chips with icons */}
          <div className="rw sc">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                className={`chip ${selectedCategory === cat.key ? 'on' : ''}`}
                onClick={() => setSelectedCategory(cat.key)}
              >
                <span>{cat.icon}</span>
                <span>{lang === 'am' ? cat.labelAm : cat.labelEn}</span>
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="rw" style={{ gap: '10px' }}>
            <div className="catalog-search-wrap">
              <span style={{ marginRight: '6px', opacity: 0.6 }}>🔍</span>
              <input
                type="text"
                placeholder="Search dresses, silk, fabrics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--mut)' }}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              className="in"
              style={{ width: 'auto', minHeight: '42px', padding: '0 12px', borderRadius: '24px', fontSize: '13px' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="g">
        {loading ? (
          <p className="mut" style={{ padding: '24px 0' }}>Loading collection...</p>
        ) : displayedProducts.length > 0 ? (
          displayedProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onClick={(prod) => setSelectedProduct(prod)}
            />
          ))
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '36px 0', textAlign: 'center' }}>
            <span style={{ fontSize: '36px' }}>👗</span>
            <p className="mut" style={{ marginTop: '8px' }}>
              {searchQuery ? `No dresses match "${searchQuery}".` : t('noProducts')}
            </p>
          </div>
        )}
      </div>

      {/* What We Do Services Section */}
      <section className="services-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-dark)' }}>
              Tailoring & Logistics
            </span>
            <h2 style={{ margin: '4px 0 0' }}>{t('whatWeDo')}</h2>
          </div>
          <button
            className="chip"
            onClick={() => navigate('/request')}
            type="button"
            style={{ borderColor: 'var(--gold-border)' }}
          >
            Submit Custom Request →
          </button>
        </div>

        <div className="g2">
          <ServiceCard
            serviceKey="Wholesale"
            title={t('wholesaleTitle')}
            description={t('wholesaleSub') + ' — Competitive bulk rates for boutiques and diaspora traders.'}
            onClick={() => navigate('/request?tab=Wholesale')}
          />
          <ServiceCard
            serviceKey="Custom design"
            title={t('customTitle')}
            description={t('customSub') + ' — Send any dress photo, choose your fabric, and our masters sew it.'}
            onClick={() => navigate('/request?tab=Custom design')}
          />
          <ServiceCard
            serviceKey="Abroad"
            title={t('abroadTitle')}
            description={t('abroadSub') + ' — Guaranteed delivery dates for diaspora weddings, graduations & holidays.'}
            onClick={() => navigate('/request?tab=Abroad')}
          />
          <ServiceCard
            serviceKey="Fabric sourcing"
            title={t('fabricTitle')}
            description={t('fabricSub') + ' — Premium sheer chiffon, silk organza, and handwoven Shemma.'}
            onClick={() => navigate('/request?tab=Custom design')}
          />
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section style={{ margin: '48px 0 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-dark)' }}>
            Simple & Transparent
          </span>
          <h2 style={{ margin: '4px 0 0' }}>How True Clothing Works</h2>
        </div>

        <div className="how-it-works-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <b style={{ fontSize: '16px', display: 'block', marginBottom: '6px' }}>1. Choose or Send Design</b>
            <p className="mut" style={{ margin: 0, lineHeight: 1.5 }}>
              Browse our ready-made styles or submit a request with your photos and measurements (Bust, Waist, Hip, Length).
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <b style={{ fontSize: '16px', display: 'block', marginBottom: '6px' }}>2. Handcrafted in Addis Ababa</b>
            <p className="mut" style={{ margin: 0, lineHeight: 1.5 }}>
              Master artisans sew your garment with authentic Shemma or pure silk chiffon. We send fitting updates directly on Telegram.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <b style={{ fontSize: '16px', display: 'block', marginBottom: '6px' }}>3. Fast Doorstep Delivery</b>
            <p className="mut" style={{ margin: 0, lineHeight: 1.5 }}>
              Pick up in Addis Ababa, enjoy express city courier, or receive via DHL/EMS anywhere in the US, Europe, or Middle East.
            </p>
          </div>
        </div>
      </section>

      {/* Customer Testimonials & Diaspora Social Proof */}
      <section style={{ margin: '40px 0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold-dark)' }}>
            Customer Love
          </span>
          <h2 style={{ margin: '4px 0 0' }}>Trusted by Diaspora & Local Clients</h2>
        </div>

        <div className="g2">
          {TESTIMONIALS.map((review, i) => (
            <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#F2B705', fontSize: '15px' }}>★★★★★</span>
                <span className="tag t1" style={{ fontSize: '11px' }}>{review.tag}</span>
              </div>
              <p style={{ fontStyle: 'italic', margin: '4px 0', fontSize: '13.5px', lineHeight: 1.5, color: 'var(--ink)' }}>
                "{review.text}"
              </p>
              <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                <b style={{ fontSize: '13px', display: 'block' }}>{review.name}</b>
                <span className="mut" style={{ fontSize: '11.5px' }}>📍 {review.location}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Product Order Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          onOrderPlaced={() => {
            fetchProducts(selectedCategory);
          }}
        />
      )}
    </ShopLayout>
  );
}
