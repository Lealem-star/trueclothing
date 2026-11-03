import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import StatusTag from '../../components/StatusTag';
import Modal from '../../components/Modal';
import FormField from '../../components/FormField';
import { formatETB } from '../../components/ProductCard';
import { useToast } from '../../context/ToastContext';
import api from '../../api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [stats, setStats] = useState({
    newOrders: 0,
    openRequests: 0,
    inProduction: 0,
    customers: 0
  });
  const [needsAttention, setNeedsAttention] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual Add Order Modal
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderType, setOrderType] = useState('Ready-made');
  const [orderDesc, setOrderDesc] = useState('');
  const [orderTotal, setOrderTotal] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.stats);
        setNeedsAttention(res.data.needsAttention);
        setRecentActivity(res.data.recentActivity);
      }
    } catch (err) {
      showToast('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!orderName.trim() || orderPhone.trim().length < 8) {
      showToast('Enter a customer name and valid phone');
      return;
    }

    const typeEnumMap = {
      'Ready-made': 'READY_MADE',
      'Custom design': 'CUSTOM_DESIGN',
      'Wholesale': 'WHOLESALE',
      'Abroad': 'ABROAD'
    };

    setSubmittingOrder(true);
    try {
      const res = await api.post('/orders/admin', {
        customerName: orderName.trim(),
        customerPhone: orderPhone.trim(),
        type: typeEnumMap[orderType] || 'READY_MADE',
        description: orderDesc.trim() || 'Manual order',
        total: Number(orderTotal) || 0
      });

      if (res.data.success) {
        showToast('Order added');
        setShowAddOrder(false);
        setOrderName('');
        setOrderPhone('');
        setOrderDesc('');
        setOrderTotal('');
        fetchDashboard();
      }
    } catch (err) {
      showToast(err.message || 'Failed to add order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <AdminLayout currentTab="dash">
      <h1>Dashboard</h1>

      {/* Quick Actions */}
      <div className="rw" style={{ marginBottom: '14px' }}>
        <button
          className="btn out"
          onClick={() => navigate('/admin/products?new=1')}
          type="button"
        >
          Add product
        </button>
        <button
          className="btn acc"
          onClick={() => setShowAddOrder(true)}
          type="button"
        >
          Add order
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="st">
        <div className="card">
          <span className="mut">New orders</span>
          <b>{stats.newOrders}</b>
        </div>
        <div className="card">
          <span className="mut">Open requests</span>
          <b>{stats.openRequests}</b>
        </div>
        <div className="card">
          <span className="mut">In production</span>
          <b>{stats.inProduction}</b>
        </div>
        <div className="card">
          <span className="mut">Customers</span>
          <b>{stats.customers}</b>
        </div>
      </div>

      {/* Two Columns: Needs Attention & Recent Activity */}
      <div className="two" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        {/* Needs attention */}
        <div className="card">
          <b>Needs attention</b>
          {loading ? (
            <p className="mut">Loading...</p>
          ) : needsAttention.length > 0 ? (
            needsAttention.map((item) => (
              <div key={item.id} className="li">
                <span>
                  {item.title}
                  <div className="mut">{item.subtitle} • {item.date}</div>
                </span>
                <StatusTag status={item.status} />
                <button
                  className="chip"
                  onClick={() => {
                    if (item.kind === 'order') {
                      navigate(`/admin/orders?open=${item.id}`);
                    } else {
                      navigate(`/admin/requests?open=${item.id}`);
                    }
                  }}
                  type="button"
                >
                  Open
                </button>
              </div>
            ))
          ) : (
            <p className="mut" style={{ marginTop: '10px' }}>Nothing waiting.</p>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <b>Recent activity</b>
          {recentActivity.length > 0 ? (
            recentActivity.map((msg, idx) => (
              <div key={idx} className="li">
                <span style={{ fontSize: '13px' }}>{msg}</span>
              </div>
            ))
          ) : (
            <p className="mut" style={{ marginTop: '10px' }}>No recent activity.</p>
          )}
        </div>
      </div>

      {/* Add Order Modal */}
      <Modal
        isOpen={showAddOrder}
        onClose={() => setShowAddOrder(false)}
        title="Add order"
      >
        <form onSubmit={handleCreateOrder}>
          <FormField
            id="nn"
            label="Customer name"
            value={orderName}
            onChange={(e) => setOrderName(e.target.value)}
            required
          />

          <FormField
            id="np"
            label="Phone"
            type="tel"
            value={orderPhone}
            onChange={(e) => setOrderPhone(e.target.value)}
            required
          />

          <FormField
            id="nt"
            label="Type"
            type="select"
            value={orderType}
            onChange={(e) => setOrderType(e.target.value)}
            options={['Ready-made', 'Custom design', 'Wholesale', 'Abroad']}
          />

          <FormField
            id="nd"
            label="Description"
            value={orderDesc}
            onChange={(e) => setOrderDesc(e.target.value)}
            placeholder="Description of garments"
          />

          <FormField
            id="nm"
            label="Total (ETB)"
            type="number"
            value={orderTotal}
            onChange={(e) => setOrderTotal(e.target.value)}
          />

          <div className="rw end">
            <button
              className="btn out"
              onClick={() => setShowAddOrder(false)}
              type="button"
            >
              Cancel
            </button>
            <button className="btn acc" type="submit" disabled={submittingOrder}>
              {submittingOrder ? '...' : 'Add order'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}

