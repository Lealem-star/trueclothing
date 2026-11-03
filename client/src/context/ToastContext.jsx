import React, { createContext, useContext, useState, useRef } from 'react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toastMessage, setToastMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef(null);

  const showToast = (message) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMessage(message);
    setIsOpen(true);
    timerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 2800);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div id="t" className={`toast ${isOpen ? 'on' : ''}`} role="status">
        {toastMessage}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

