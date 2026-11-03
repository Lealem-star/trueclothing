import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Customer state
  const [customer, setCustomer] = useState(() => {
    const saved = localStorage.getItem('tc_customer');
    return saved ? JSON.parse(saved) : null;
  });
  const [customerToken, setCustomerToken] = useState(() => {
    return localStorage.getItem('tc_customer_token') || null;
  });

  // Admin state
  const [admin, setAdmin] = useState(() => {
    const saved = localStorage.getItem('tc_admin');
    return saved ? JSON.parse(saved) : null;
  });
  const [adminToken, setAdminToken] = useState(() => {
    return localStorage.getItem('tc_admin_token') || null;
  });

  // Verify admin session on mount
  useEffect(() => {
    if (adminToken) {
      api.get('/auth/admin/me')
        .then(res => {
          setAdmin(res.data.admin);
          localStorage.setItem('tc_admin', JSON.stringify(res.data.admin));
        })
        .catch(() => {
          logoutAdmin();
        });
    }
  }, []);

  // Customer OTP actions
  const requestOtp = async (phone) => {
    const res = await api.post('/auth/otp/request', { phone });
    return res.data;
  };

  const verifyOtp = async (phone, code) => {
    const res = await api.post('/auth/otp/verify', { phone, code });
    if (res.data.success) {
      setCustomer(res.data.customer);
      setCustomerToken(res.data.token);
      localStorage.setItem('tc_customer', JSON.stringify(res.data.customer));
      localStorage.setItem('tc_customer_token', res.data.token);
    }
    return res.data;
  };

  const updateCustomerName = async (name) => {
    const res = await api.patch('/me/profile', { name });
    if (res.data.success) {
      const updated = { ...customer, name: res.data.customer.name };
      setCustomer(updated);
      localStorage.setItem('tc_customer', JSON.stringify(updated));
    }
    return res.data;
  };

  // Customer password actions
  const loginCustomer = async (identifier, password) => {
    const res = await api.post('/auth/customer/login', { identifier, password });
    if (res.data.success) {
      setCustomer(res.data.customer);
      setCustomerToken(res.data.token);
      localStorage.setItem('tc_customer', JSON.stringify(res.data.customer));
      localStorage.setItem('tc_customer_token', res.data.token);
    }
    return res.data;
  };

  const registerCustomer = async ({ name, phone, username, password }) => {
    const res = await api.post('/auth/customer/register', { name, phone, username, password });
    if (res.data.success) {
      setCustomer(res.data.customer);
      setCustomerToken(res.data.token);
      localStorage.setItem('tc_customer', JSON.stringify(res.data.customer));
      localStorage.setItem('tc_customer_token', res.data.token);
    }
    return res.data;
  };

  const setCustomerAuth = (auth) => {
    if (auth && auth.customer && auth.token) {
      setCustomer(auth.customer);
      setCustomerToken(auth.token);
      localStorage.setItem('tc_customer', JSON.stringify(auth.customer));
      localStorage.setItem('tc_customer_token', auth.token);
    }
  };

  const changeCustomerPassword = async (currentPassword, newPassword) => {
    const res = await api.patch('/me/password', { currentPassword, newPassword });
    return res.data;
  };

  const logoutCustomer = () => {
    setCustomer(null);
    setCustomerToken(null);
    localStorage.removeItem('tc_customer');
    localStorage.removeItem('tc_customer_token');
  };

  // Admin actions
  const loginAdmin = async (username, password) => {
    const res = await api.post('/auth/admin/login', { username, password });
    if (res.data.success) {
      setAdmin(res.data.admin);
      setAdminToken(res.data.token);
      localStorage.setItem('tc_admin', JSON.stringify(res.data.admin));
      localStorage.setItem('tc_admin_token', res.data.token);
    }
    return res.data;
  };

  const logoutAdmin = async () => {
    try {
      await api.post('/auth/admin/logout');
    } catch {}
    setAdmin(null);
    setAdminToken(null);
    localStorage.removeItem('tc_admin');
    localStorage.removeItem('tc_admin_token');
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        customerToken,
        requestOtp,
        verifyOtp,
        loginCustomer,
        registerCustomer,
        setCustomerAuth,
        updateCustomerName,
        changeCustomerPassword,
        logoutCustomer,
        admin,
        adminToken,
        loginAdmin,
        logoutAdmin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

