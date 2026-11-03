import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import DataTable from '../../components/DataTable';
import StatusTag from '../../components/StatusTag';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
const cleanDigits = (s) => String(s || '').replace(/\D/g, '');
import api from '../../api/client';

export default function Customers() {
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetail, setCustomerDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const url = searchQuery.trim() ? `/customers?search=${encodeURIComponent(searchQuery.trim())}` : '/customers';
      const res = await api.get(url);
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      showToast('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchQuery]);

  const openCustomerDetail = async (c) => {
    setSelectedCustomer(c);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/customers/${encodeURIComponent(c.phone)}`);
      if (res.data.success) {
        setCustomerDetail(res.data.customer);
      }
    } catch (err) {
      showToast('Failed to load customer details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const cleanPhone = (customerDetail?.phone || selectedCustomer?.phone || '').replace(/\D/g, '');

  return (
    <AdminLayout currentTab="cus">
      <div className="rw" style={{ justifyContent: 'space-between', marginBottom: '14px' }}>
        <h1 style={{ margin: 0 }}>Customers</h1>
        <input
          className="in"
          id="q"
          placeholder="Search name or phone"
          aria-label="Search"
          style={{ width: '220px' }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <DataTable headers={['#', 'Name', 'Phone', 'Orders', 'Requests', '']}>
        {loading ? (
          <div className="tr mut">Loading customers...</div>
        ) : customers.length > 0 ? (
          customers.map((c, i) => (
            <div key={c.ph} className="tr">
              <span>{i + 1}</span>
              <b>{c.name || 'Unnamed'}</b>
              <span>{c.phone}</span>
              <span>{c.o}</span>
              <span>{c.r}</span>
              <button className="chip" onClick={() => openCustomerDetail(c)} type="button">
                Open
              </button>
            </div>
          ))
        ) : (
          <div className="tr mut">No customers yet.</div>
        )}
      </DataTable>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => {
            setSelectedCustomer(null);
            setCustomerDetail(null);
          }}
          title={customerDetail?.name || selectedCustomer.name || 'Customer'}
        >
          <p className="mut" style={{ margin: '4px 0 14px' }}>
            {customerDetail?.phone || selectedCustomer.phone}
          </p>

          {loadingDetail ? (
            <p className="mut">Loading history...</p>
          ) : (
            <div>
              <b style={{ display: 'block', margin: '8px 0 4px' }}>Orders</b>
              {customerDetail?.orders?.length > 0 ? (
                customerDetail.orders.map((o) => (
                  <div key={o.id} className="li">
                    <span>
                      {o.id} • {o.type}
                      <div className="mut">{o.desc} • {o.date}</div>
                    </span>
                    <StatusTag status={o.status} />
                  </div>
                ))
              ) : (
                <p className="mut">None.</p>
              )}

              <b style={{ display: 'block', margin: '14px 0 4px' }}>Requests</b>
              {customerDetail?.requests?.length > 0 ? (
                customerDetail.requests.map((r) => (
                  <div key={r.id} className="li">
                    <span>
                      {r.type} • {r.date}
                    </span>
                    <StatusTag status={r.status} />
                  </div>
                ))
              ) : (
                <p className="mut">None.</p>
              )}
            </div>
          )}

          <div className="rw end" style={{ gap: '8px', marginTop: '16px' }}>
            <a className="btn out" href={`tel:${cleanPhone}`}>
              Call
            </a>
            <button
              className="btn out"
              onClick={() => showToast('Telegram message sent (demo)')}
              type="button"
            >
              Telegram
            </button>
            <button
              className="btn"
              onClick={() => {
                setSelectedCustomer(null);
                setCustomerDetail(null);
              }}
              type="button"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
