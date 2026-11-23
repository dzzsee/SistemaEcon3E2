import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../services/api.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const hideToast = useCallback(() => setToast(null), []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(hideToast, 3200);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [st, bal] = await Promise.all([api.getStatus(), api.getBalance()]);
      setStatus(st);
      setBalance(bal);
    } catch (error) {
      if (error?.message === 'no-auth') {
        await api.logout();
        setSession(null);
        showToast('Tu sesión expiró. Inicia sesión de nuevo.', 'error');
      } else {
        showToast(error?.message || 'No se pudieron cargar los datos.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    let activo = true;
    (async () => {
      const s = await api.getSession();
      if (!activo) return;
      setSession(s);
      setChecked(true);
      if (s) await loadData();
    })();
    return () => {
      activo = false;
    };
  }, [loadData]);

  const login = useCallback(
    async (usuario, pin) => {
      const resultado = await api.login(usuario, pin);
      if (resultado.success) {
        setSession(resultado.user);
        showToast(`Bienvenido, ${resultado.user.nombre}.`);
        await loadData();
      }
      return resultado;
    },
    [loadData, showToast]
  );

  const logout = useCallback(async () => {
    await api.logout();
    setSession(null);
    setStatus(null);
    setBalance(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const value = useMemo(
    () => ({
      session,
      checked,
      status,
      balance,
      loading,
      toast,
      showToast,
      hideToast,
      login,
      logout,
      refresh
    }),
    [session, checked, status, balance, loading, toast, showToast, hideToast, login, logout, refresh]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp debe usarse dentro de AppProvider.');
  return context;
}
