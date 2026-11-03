import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import RequestOrder from './pages/RequestOrder';
import Account from './pages/Account';
import AdminLogin from './pages/admin/AdminLogin';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import Products from './pages/admin/Products';
import Requests from './pages/admin/Requests';
import Customers from './pages/admin/Customers';
import Settings from './pages/admin/Settings';
import { useAuth } from './context/AuthContext';

function ProtectedAdminRoute({ children }) {
  const { admin } = useAuth();
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public Customer Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/request" element={<RequestOrder />} />
      <Route path="/account" element={<Account />} />
      <Route path="/portal" element={<Account />} />

      {/* Admin Login */}
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <Dashboard />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedAdminRoute>
            <Orders />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedAdminRoute>
            <Products />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedAdminRoute>
            <Requests />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/customers"
        element={
          <ProtectedAdminRoute>
            <Customers />
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedAdminRoute>
            <Settings />
          </ProtectedAdminRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

