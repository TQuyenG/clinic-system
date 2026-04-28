// client/src/hooks/useToast.js
import { useState, useCallback } from 'react';

/**
 * Hook para gerenciar notificações Toast
 * Retorna: { showToast, toastState, closeToast }
 */
const useToast = () => {
  const [toastState, setToastState] = useState({
    show: false,
    type: 'info',
    message: '',
    duration: 3000,
  });

  // Mostrar toast
  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToastState({
      show: true,
      type,
      message,
      duration,
    });
  }, []);

  // Fechar toast
  const closeToast = useCallback(() => {
    setToastState(prev => ({ ...prev, show: false }));
  }, []);

  // Helpers para cada tipo
  const success = (message) => showToast(message, 'success', 3000);
  const error = (message) => showToast(message, 'error', 3000);
  const warning = (message) => showToast(message, 'warning', 3000);
  const info = (message) => showToast(message, 'info', 3000);

  return {
    showToast,
    closeToast,
    toastState,
    toast: {
      success,
      error,
      warning,
      info,
    },
  };
};

export default useToast;
