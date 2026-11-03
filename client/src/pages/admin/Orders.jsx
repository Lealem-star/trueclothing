import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import DataTable from '../../components/DataTable';
import StatusTag from '../../components/StatusTag';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatETB } from '../../components/ProductCard';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

const STATUS_FILTERS = ['All', 'Received', 'In production', 'Shipped', 'Delivered'];
const PAYMENT_OPTIONS = ['Unpaid', 'Partly paid', 'Paid'];

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const [orders, setOrders] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalStatus, setOrderModalStatus] = useState('Received');
  const [orderModalTotal, setOrderModalTotal] = useState(0);
  const [orderModalPay, setOrderModalPay] = useState('Unpaid');
  const [orderModalNotes, setOrderModalNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);

  // Add Order Manual Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('Ready-made');
  const [newDesc, setNewDesc] = useState('');
  const [newTotal, setNewTotal] = useState('');
  const [submittingNew, setSubmittingNew] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStatus !== 'All') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/orders?${params.toString()}`);
      if (res.data.success) {
        setOrders(res.data.orders);

        // Check if query param `open` is present
        const openCode = searchParams.get('open');
        if (openCode) {
          const match = res.data.orders.find(o => o.id === openCode || o.internalId === openCode);
          if (match) {
            openOrderDetail(match);
            searchParams.delete('open');
            setSearchParams(searchParams);
          }
        }
      }
    } catch (err) {
      showToast('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus, searchQuery]);

  const openOrderDetail = (order) => {
    setSelectedOrder(order);
    setOrderModalStatus(order.status || 'Received');
    setOrderModalTotal(order.total || 0);
    setOrderModalPay(order.pay || 'Unpaid');
    setOrderModalNotes(order.notes || '');
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) return;
    setSavingOrder(true);
    try {
      const res = await api.patch(`/orders/${selectedOrder.internalId || selectedOrder.id}`, {
        status: orderModalStatus,
        paymentStatus: orderModalPay,
        total: Number(orderModalTotal),
        notes: orderModalNotes
      });

      if (res.data.success) {
        showToast('Order saved');
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save order');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!selectedOrder) return;
    if (!window.confirm(`Are you sure you want to delete order ${selectedOrder.id}?`)) return;

    try {
      const res = await api.delete(`/orders/${selectedOrder.internalId || selectedOrder.id}`);
      if (res.data.success) {
        showToast('Order deleted');
        setSelectedOrder(null);
        fetchOrders();
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete order');
    }
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!newName.trim() || newPhone.trim().length < 8) {
      showToast('Enter a customer name and phone number');
      return;
    }

    const typeEnumMap = {
      'Ready-made': 'READY_MADE',
      'Custom design': 'CUSTOM_DESIGN',
      'Wholesale': 'WHOLESALE',
      'Abroad': 'ABROAD'
    };

    setSubmittingNew(true);
    try {
      const res = await api.post('/orders/admin', {
        customerName: newName.trim(),
        customerPhone: newPhone.trim(),
        type: typeEnumMap[newType] || 'READY_MADE',
        description: newDesc.trim() || 'Manual order',
        total: Number(newTotal) || 0
      });

      if (res.data.success) {
        showToast('Order added');
        setShowAddModal(false);
        setNewName('');
        setNewPhone('');
        setNewDesc('');
        setNewTotal('');
        fetchOrders();
      }
    } catch (err) {
      showToast(err.message || 'Failed to create order');
    } finally {
      setSubmittingNew(false);
    }
  };

  return (
    <AdminLayout currentTab="ord">
      <div className="rw" style={{ justifyContent: 'space-between', marginBottom: '10px' }}>
        <h1 style={{ margin: 0 }}>Orders</h1>
        <div className="rw">
          <input
            className="in"
            id="q"
            placeholder="Search name or phone"
            aria-label="Search"
            style={{ width: '220px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn acc" onClick={() => setShowAddModal(true)} type="button">
            Add order
          </button>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="rw sc" style={{ margin: '10px 0 14px' }}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={`chip ${selectedStatus === s ? 'on' : ''}`}
            onClick={() => setSelectedStatus(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <DataTable headers={['ID', 'Customer', 'Type', 'Status', 'Total', '']}>
        {loading ? (
          <div className="tr mut">Loading orders...</div>
        ) : orders.length > 0 ? (
          orders.map((o) => (
            <div key={o.id} className="tr">
              <b>{o.id}</b>
              <span>{o.name}</span>
              <span>{o.type}</span>
              <span><StatusTag status={o.status} /></span>
              <span>{formatETB(o.total)}</span>
              <button className="chip" onClick={() => openOrderDetail(o)} type="button">
                Open
              </button>
            </div>
          ))
        ) : (
          <div className="tr mut">No orders match.</div>
        )}
      </DataTable>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Order ${selectedOrder.id}`}
        >
          <p className="mut" style={{ margin: '4px 0 12px' }}>
            {selectedOrder.name} • {selectedOrder.phone}
            <br />
            {selectedOrder.type}: {selectedOrder.desc}
          </p>

          <label className="lb">Status</label>
          <div className="rw sc" style={{ marginBottom: '10px' }}>
            {STATUS_FILTERS.filter(s => s !== 'All').map((st) => (
              <button
                key={st}
                type="button"
                className={`chip ${orderModalStatus === st ? 'on' : ''}`}
                onClick={() => setOrderModalStatus(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="fg">
            <FormField
              id="ot"
              label="Total (ETB)"
              type="number"
              value={orderModalTotal}
              onChange={(e) => setOrderModalTotal(e.target.value)}
            />

            <FormField
              id="op"
              label="Payment"
              type="select"
              value={orderModalPay}
              onChange={(e) => setOrderModalPay(e.target.value)}
              options={PAYMENT_OPTIONS}
            />
          </div>

          <FormField
            id="order-notes"
            label="Notes"
            type="textarea"
            rows={2}
            value={orderModalNotes}
            onChange={(e) => setOrderModalNotes(e.target.value)}
            placeholder="Staff notes..."
          />

          <div className="rw end" style={{ justifyContent: 'space-between', marginTop: '16px' }}>
            <button className="chip" onClick={handleDeleteOrder} type="button">
              Delete
            </button>
            <div className="rw">
              <button
                className="btn out"
                onClick={() => showToast('Telegram notification sent')}
                type="button"
              >
                Notify on Telegram
              </button>
              <button
                className="btn acc"
                onClick={handleSaveOrder}
                disabled={savingOrder}
                type="button"
              >
                {savingOrder ? '...' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Order Manual Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add order"
      >
        <form onSubmit={handleCreateOrder}>
          <FormField
            id="nn"
            label="Customer name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />

          <FormField
            id="np"
            label="Phone"
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            required
          />

          <FormField
            id="nt"
            label="Type"
            type="select"
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            options={['Ready-made', 'Custom design', 'Wholesale', 'Abroad']}
          />

          <FormField
            id="nd"
            label="Description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="garment description..."
          />

          <FormField
            id="nm"
            label="Total (ETB)"
            type="number"
            value={newTotal}
            onChange={(e) => setNewTotal(e.target.value)}
          />

          <div className="rw end">
            <button
              className="btn out"
              onClick={() => setShowAddModal(false)}
              type="button"
            >
              Cancel
            </button>
            <button className="btn acc" type="submit" disabled={submittingNew}>
              {submittingNew ? '...' : 'Add order'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

