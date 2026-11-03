import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import DataTable from '../../components/DataTable';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatETB } from '../../components/ProductCard';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

export default function Products() {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form fields
  const [nameEn, setNameEn] = useState('');
  const [nameAm, setNameAm] = useState('');
  const [category, setCategory] = useState('Shifon');
  const [price, setPrice] = useState('');
  const [sizesStr, setSizesStr] = useState('S, M, L');
  const [descEn, setDescEn] = useState('');
  const [descAm, setDescAm] = useState('');
  const [published, setPublished] = useState(true);

  // Image uploads
  const [existingImages, setExistingImages] = useState([]);
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Inline delete confirm state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/admin/all');
      if (res.data.success) {
        setProducts(res.data.products);
      }
    } catch (err) {
      showToast('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openAddModal();
    }
  }, [searchParams]);

  const openAddModal = () => {
    setEditingProduct(null);
    setNameEn('');
    setNameAm('');
    setCategory('Shifon');
    setPrice('');
    setSizesStr('S, M, L');
    setDescEn('');
    setDescAm('');
    setPublished(true);
    setExistingImages([]);
    setDeletedImageIds([]);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setNameEn(p.nameEn || '');
    setNameAm(p.nameAm || '');
    const catMap = { SHIFON: 'Shifon', HABESHA: 'Habesha', FABRIC: 'Fabric' };
    setCategory(catMap[p.category] || p.category || 'Shifon');
    setPrice(p.price || '');
    setSizesStr(Array.isArray(p.sizes) ? p.sizes.join(', ') : '');
    setDescEn(p.descriptionEn || '');
    setDescAm(p.descriptionAm || '');
    setPublished(p.published !== false);
    setExistingImages(p.images || []);
    setDeletedImageIds([]);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setModalOpen(true);
  };

  const handleTogglePublished = async (product) => {
    const nextVal = !product.published;
    try {
      const res = await api.patch(`/products/${product.id}/publish`, { published: nextVal });
      if (res.data.success) {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, published: nextVal } : p));
        showToast(nextVal ? 'Published' : 'Hidden from the shop');
      }
    } catch (err) {
      showToast('Failed to toggle publish status');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (confirmDeleteId === id) {
      try {
        const res = await api.delete(`/products/${id}`);
        if (res.data.success) {
          showToast('Product deleted');
          setConfirmDeleteId(null);
          fetchProducts();
        }
      } catch (err) {
        showToast(err.message || 'Failed to delete product');
      }
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleImageFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const currentTotal = existingImages.length - deletedImageIds.length + newImageFiles.length;
    const remaining = 5 - currentTotal;
    if (remaining <= 0) {
      showToast('Maximum 5 images allowed');
      return;
    }

    const added = files.slice(0, remaining);
    const addedPreviews = added.map(f => URL.createObjectURL(f));

    setNewImageFiles(prev => [...prev, ...added]);
    setNewImagePreviews(prev => [...prev, ...addedPreviews]);
  };

  const removeExistingImage = (imageId) => {
    setDeletedImageIds(prev => [...prev, imageId]);
  };

  const removeNewImage = (idx) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== idx));
    setNewImagePreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!nameEn.trim() || !(Number(price) > 0)) {
      showToast('Enter a name and a valid price');
      return;
    }

    const catUpperMap = {
      'Shifon': 'SHIFON',
      'Habesha': 'HABESHA',
      'Fabric': 'FABRIC'
    };

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('nameEn', nameEn.trim());
      if (nameAm.trim()) formData.append('nameAm', nameAm.trim());
      formData.append('category', catUpperMap[category] || 'SHIFON');
      formData.append('price', Number(price));
      formData.append('descriptionEn', descEn.trim() || 'Product description');
      if (descAm.trim()) formData.append('descriptionAm', descAm.trim());
      formData.append('published', String(published));

      const parsedSizes = sizesStr.split(',').map(s => s.trim()).filter(Boolean);
      formData.append('sizes', JSON.stringify(parsedSizes));

      if (deletedImageIds.length > 0) {
        formData.append('deleteImageIds', JSON.stringify(deletedImageIds));
      }

      newImageFiles.forEach(file => {
        formData.append('images', file);
      });

      let res;
      if (editingProduct) {
        res = await api.patch(`/products/${editingProduct.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        res = await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res.data.success) {
        showToast(editingProduct ? 'Product updated' : 'Product saved');
        setModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout currentTab="prod">
      <div className="rw" style={{ justifyContent: 'space-between', marginBottom: '14px' }}>
        <h1 style={{ margin: 0 }}>Products</h1>
        <button className="btn acc" onClick={openAddModal} type="button">
          Add product
        </button>
      </div>

      <DataTable headers={['#', 'Name', 'Category', 'Price', 'Published', '']}>
        {loading ? (
          <div className="tr mut">Loading products...</div>
        ) : products.length > 0 ? (
          products.map((p, i) => (
            <div key={p.id} className="tr">
              <span>{i + 1}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {p.images?.[0]?.url && (
                  <img
                    src={p.images[0].url}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                )}
                <span>{p.nameEn}</span>
              </div>
              <span>{p.category}</span>
              <span>{formatETB(p.price)}</span>
              <label className="ck">
                <input
                  type="checkbox"
                  checked={Boolean(p.published)}
                  onChange={() => handleTogglePublished(p)}
                  aria-label="Published"
                />
                {p.published ? 'Yes' : 'No'}
              </label>
              <span className="rw">
                <button className="chip" onClick={() => openEditModal(p)} type="button">
                  Edit
                </button>
                <button
                  className="chip"
                  onClick={() => handleDeleteProduct(p.id)}
                  type="button"
                  style={confirmDeleteId === p.id ? { background: '#ef4444', color: '#fff' } : undefined}
                >
                  {confirmDeleteId === p.id ? 'Sure?' : 'Delete'}
                </button>
              </span>
            </div>
          ))
        ) : (
          <div className="tr mut">No products yet.</div>
        )}
      </DataTable>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editingProduct ? 'Edit' : 'Add'} product`}
        maxWidth={520}
      >
        <form onSubmit={handleSaveProduct}>
          <FormField
            id="pn"
            label="Name (English)"
            value={nameEn}
            onChange={(e) => setNameEn(e.target.value)}
            placeholder="e.g. Modern Silk Shifon"
            required
          />

          <FormField
            id="pnam"
            label="Name (Amharic - optional)"
            value={nameAm}
            onChange={(e) => setNameAm(e.target.value)}
            placeholder="ለምሳሌ፡ ዘመናዊ የሽፎን ቀሚስ"
          />

          <div className="fg">
            <FormField
              id="pc"
              label="Category"
              type="select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={['Shifon', 'Habesha', 'Fabric']}
            />

            <FormField
              id="pp"
              label="Price (ETB)"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="2500"
              required
            />
          </div>

          <FormField
            id="ps"
            label="Sizes (comma separated)"
            value={sizesStr}
            onChange={(e) => setSizesStr(e.target.value)}
            placeholder="S, M, L, XL"
          />

          <FormField
            id="pd"
            label="Description (English)"
            type="textarea"
            rows={2}
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            placeholder="Product details, fabric composition..."
          />

          <FormField
            id="pdam"
            label="Description (Amharic - optional)"
            type="textarea"
            rows={2}
            value={descAm}
            onChange={(e) => setDescAm(e.target.value)}
            placeholder="የምርቱ ዝርዝር መግለጫ..."
          />

          {/* Image upload and previews */}
          <div style={{ margin: '12px 0 8px' }}>
            <label className="lb">Product Images (up to 5)</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageFileChange}
              className="in"
              style={{ padding: '6px' }}
            />

            {/* Existing images */}
            {existingImages.filter(img => !deletedImageIds.includes(img.id)).length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <span className="mut" style={{ fontSize: '12px' }}>Existing images:</span>
                <div className="img-previews">
                  {existingImages.filter(img => !deletedImageIds.includes(img.id)).map(img => (
                    <div key={img.id} className="img-thumb-wrap">
                      <img src={img.url} alt="" />
                      <button
                        type="button"
                        className="del-btn"
                        onClick={() => removeExistingImage(img.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Newly added images */}
            {newImagePreviews.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <span className="mut" style={{ fontSize: '12px' }}>New images to upload:</span>
                <div className="img-previews">
                  {newImagePreviews.map((src, idx) => (
                    <div key={idx} className="img-thumb-wrap">
                      <img src={src} alt="New upload" />
                      <button
                        type="button"
                        className="del-btn"
                        onClick={() => removeNewImage(idx)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <label className="ck" style={{ margin: '10px 0' }}>
            <input
              type="checkbox"
              id="pb"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published (visible in shop)
          </label>

          <div className="rw end">
            <button
              className="btn out"
              onClick={() => setModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button className="btn acc" type="submit" disabled={submitting}>
              {submitting ? '...' : 'Save product'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

