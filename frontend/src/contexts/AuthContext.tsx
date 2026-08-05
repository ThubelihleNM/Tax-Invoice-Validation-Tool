import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'Administrator' | 'Accountant' | 'Auditor';
  status: 'Active' | 'Inactive' | 'Suspended';
  profile_photo?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  showSessionWarning: boolean;
  setShowSessionWarning: (show: boolean) => void;
  extendSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set default axios base configuration
axios.defaults.baseURL = window.location.origin;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Inactivity timeout refs (15 minutes limit: 900,000ms. Warning at 14 minutes, giving 60 seconds to react)
  const idleTimeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);

  const IDLE_TIME_LIMIT = 14 * 60 * 1000; // 14 minutes before warning
  const WARNING_TIME_LIMIT = 60 * 1000; // 60 seconds warning countdown

  const clearInactivityTimers = () => {
    if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    if (warningTimeoutRef.current) window.clearTimeout(warningTimeoutRef.current);
  };

  const startInactivityTimers = () => {
    clearInactivityTimers();
    if (!token) return; // Only track logged-in users

    // Step 1: Set idle timer for 14 minutes
    idleTimeoutRef.current = window.setTimeout(() => {
      setShowSessionWarning(true);
      
      // Step 2: Set warning timer for 60 seconds to force auto-logout
      warningTimeoutRef.current = window.setTimeout(() => {
        handleAutoLogout();
      }, WARNING_TIME_LIMIT);
    }, IDLE_TIME_LIMIT);
  };

  const handleAutoLogout = async () => {
    clearInactivityTimers();
    setShowSessionWarning(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
    
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.warn('Silent server logout failed', err);
    }
    
    window.location.href = '/login?expired=true';
  };

  const extendSession = () => {
    setShowSessionWarning(false);
    startInactivityTimers();
  };

  // Listen to user events to reset inactivity timers
  useEffect(() => {
    const handleActivity = () => {
      if (token && !showSessionWarning) {
        startInactivityTimers();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, handleActivity));

    if (token) {
      startInactivityTimers();
    }

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearInactivityTimers();
    };
  }, [token, showSessionWarning]);

  // Handle access token refresh interceptor setup
  useEffect(() => {
    // Setup request interceptor to attach JWT token
    const reqInterceptor = axios.interceptors.request.use((config) => {
      const activeToken = token || localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (activeToken) {
        config.headers['Authorization'] = `Bearer ${activeToken}`;
      }
      return config;
    }, (error) => Promise.reject(error));

    // Setup response interceptor to handle token refresh automatically on 401
    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const rToken = localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
          if (rToken) {
            try {
              const res = await axios.post('/api/auth/refresh', { refresh_token: rToken });
              const { access_token, refresh_token: newRToken, user: userData } = res.data;
              
              const isLocal = !!localStorage.getItem('refresh_token');
              if (isLocal) {
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', newRToken);
              } else {
                sessionStorage.setItem('access_token', access_token);
                sessionStorage.setItem('refresh_token', newRToken);
              }
              
              setToken(access_token);
              setUser(userData);
              originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
              return axios(originalRequest);
            } catch (refreshErr) {
              // Refresh token failed, perform logout
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              sessionStorage.removeItem('access_token');
              sessionStorage.removeItem('refresh_token');
              setUser(null);
              setToken(null);
              window.location.href = '/login?expired=true';
            }
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, [token]);

  // Check storage session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      if (savedToken) {
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          const res = await axios.get('/api/users/profile');
          setUser(res.data);
          setToken(savedToken);
        } catch (err) {
          console.warn('Session restoring failed', err);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          sessionStorage.removeItem('access_token');
          sessionStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };
    initializeAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    const res = await axios.post('/api/auth/login', { email, password, remember_me: rememberMe });
    const { access_token, role, user: userData } = res.data;
    
    // We get refresh_token in response when logging in
    const rToken = res.data.user.refresh_token; 
    // In our backend implementation, user record has refresh_token which we read or get from backend
    // Since uvicorn returns token, let's extract it:
    const tempRefresh = res.data.user.refresh_token || 'dummy-refresh';
    
    if (rememberMe) {
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', tempRefresh);
    } else {
      sessionStorage.setItem('access_token', access_token);
      sessionStorage.setItem('refresh_token', tempRefresh);
    }
    
    setToken(access_token);
    setUser(userData);
  };

  const logout = async () => {
    clearInactivityTimers();
    setShowSessionWarning(false);
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      console.warn('Logout api request failed', err);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        updateUser,
        showSessionWarning,
        setShowSessionWarning,
        extendSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
