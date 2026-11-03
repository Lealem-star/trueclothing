import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export function formatETB(amount) {
  return `${Number(amount || 0).toLocaleString('en')} ETB`;
}

// Approximate ETB to USD for diaspora shoppers
export function formatUSD(amount) {
  const usd = Math.round((Number(amount || 0) / 125) * 10) / 10;
  return `~ $${usd} USD`;
}

const CATEGORY_META = {
  SHIFON: { label: 'Shifon Dress', icon: '👗', badge: 'Pure Silk', badgeCls: 'badge-dark' },
  HABESHA: { label: 'Habesha Kemis', icon: '👑', badge: 'Royal Tibeb', badgeCls: 'badge-gold' },
  FABRIC: { label: 'Luxury Fabric', icon: '🧵', badge: 'Grade-A', badgeCls: 'badge-dark' }
};

export default function ProductCard({ product, onClick }) {
  const { lang, t } = useLanguage();
  const displayName = (lang === 'am' && product.nameAm) ? product.nameAm : (product.nameEn || product.en);
  const displayDesc = (lang === 'am' && product.descriptionAm) ? product.descriptionAm : (product.descriptionEn || product.desc);

  const rawCat = (product.category || 'SHIFON').toUpperCase();
  const meta = CATEGORY_META[rawCat] || CATEGORY_META.SHIFON;
  const primaryImage = product.images?.[0]?.url;

  const sizes = Array.isArray(product.sizes) ? product.sizes : [];

  return (
    <div className="product-card" onClick={() => onClick(product)}>
      {/* 3:4 Portrait Image Container */}
      <div className="product-img-wrap">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={displayName}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F2B705',
              fontSize: '44px',
              fontWeight: '700'
            }}
          >
            {displayName[0] || 'T'}
          </div>
        )}

        {/* Floating Badges */}
        <div className="badge-overlay-top">
          <span className={`prod-badge ${meta.badgeCls}`}>
            {meta.icon} {meta.badge}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="product-info">
        <h3 className="product-title">{displayName}</h3>
        <p className="product-desc-snippet">{displayDesc}</p>

        {/* Sizes Preview */}
        {sizes.length > 0 && (
          <div className="product-sizes-pill-row">
            {sizes.map((s) => (
              <span key={s} className="size-mini-tag">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Footer: Price + Quick Order Button */}
        <div className="product-footer-row">
          <div className="product-price-block">
            <span className="product-price">{formatETB(product.price)}</span>
            <span className="product-price-usd">{formatUSD(product.price)}</span>
          </div>

          <button
            type="button"
            className="order-mini-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClick(product);
            }}
          >
            {t('order')} →
          </button>
        </div>
      </div>
    </div>
  );
}
