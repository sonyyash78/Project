import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, subscriptionService } from '../api/api';

const AuthContext = createContext(null);

const PREMIUM_PLANS = ['pro', 'premium', 'ultimate'];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);

  const refreshSubscription = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSubscription(null);
      return;
    }
    try {
      const sub = await subscriptionService.getMySubscription();
      setSubscription(sub);
      setUser((prev) => {
        if (!prev || !sub?.plan_slug) return prev;
        const updated = { ...prev, subscription_plan: sub.plan_slug };
        localStorage.setItem('user', JSON.stringify(updated));
        return updated;
      });
    } catch {
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const profile = await authService.getMe();
          setUser(profile);
          localStorage.setItem('user', JSON.stringify(profile));
          try {
            const sub = await subscriptionService.getMySubscription();
            setSubscription(sub);
          } catch {
            setSubscription(null);
          }
        } catch (error) {
          console.error('Failed to verify session token:', error);
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            try {
              const refreshData = await authService.refreshToken(refreshToken);
              localStorage.setItem('token', refreshData.access_token);
              localStorage.setItem('refresh_token', refreshData.refresh_token);
              const profile = await authService.getMe();
              setUser(profile);
              localStorage.setItem('user', JSON.stringify(profile));
              const sub = await subscriptionService.getMySubscription();
              setSubscription(sub);
            } catch (refreshError) {
              console.error('Refresh token also failed:', refreshError);
              logout();
            }
          } else {
            logout();
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      setSubscription(null);
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  const login = async (email, password, rememberMe = false) => {
    setLoading(true);
    try {
      const data = await authService.login(email, password, rememberMe);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      const profile = await authService.getMe();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
      try {
        const sub = await subscriptionService.getMySubscription();
        setSubscription(sub);
      } catch {
        setSubscription(null);
      }
      return profile;
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name, email, password) => {
    setLoading(true);
    try {
      const newUser = await authService.signup(name, email, password);
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch (e) {
        // Ignore
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
    setSubscription(null);
  };

  const isAdmin = () => user && user.role === 'admin';

  const planName = subscription?.plan_name || user?.subscription_plan?.toUpperCase() || 'FREE';
  const planSlug = subscription?.plan_slug || user?.subscription_plan || 'free';
  const isPremium = PREMIUM_PLANS.includes(planSlug.toLowerCase());

  const updateUser = (updatedProfile) => {
    setUser(updatedProfile);
    localStorage.setItem('user', JSON.stringify(updatedProfile));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        subscription,
        isPremium,
        planName,
        planSlug,
        refreshSubscription,
        login,
        signup,
        logout,
        isAdmin,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
