import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (pb.authStore.isValid) {
      setCurrentUser(pb.authStore.model);
    }
    setInitialLoading(false);

    const unsubscribe = pb.authStore.onChange((token, model) => {
      setCurrentUser(model);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      setCurrentUser(authData.record);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const signup = async (email, password, passwordConfirm) => {
    try {
      const record = await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
        emailVisibility: true
      }, { $autoCancel: false });
      
      await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      setCurrentUser(pb.authStore.model);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    pb.authStore.clear();
    setCurrentUser(null);
  };

  // Opens Google's consent screen in a popup and completes the whole
  // OAuth2 code exchange against PocketBase's own endpoints — PocketBase
  // holds the Google client secret server-side, so no token handling or
  // verification happens in this app at all.
  const loginWithGoogle = async () => {
    try {
      const authData = await pb.collection('users').authWithOAuth2({ provider: 'google', $autoCancel: false });
      setCurrentUser(authData.record);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Alternative to password/Google — not a second factor stacked on top of
  // them, so this only ever succeeds for accounts that opted into it via the
  // Security page; password and Google keep working unchanged either way.
  const loginWithTotp = async (email, code) => {
    try {
      const response = await apiServerClient.fetch('/auth/totp-login', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Sign-in failed' };
      }

      pb.authStore.save(data.token, data.record);
      setCurrentUser(data.record);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Re-pulls the current user's own record so fields changed server-side
  // (e.g. totp_enabled, via the 2FA setup/disable endpoints) show up without
  // requiring a full logout/login.
  const refreshUser = async () => {
    try {
      const record = await pb.collection('users').getOne(pb.authStore.record.id);
      pb.authStore.save(pb.authStore.token, record);
      setCurrentUser(record);
      return record;
    } catch (error) {
      return null;
    }
  };

  const requestPasswordReset = async (email) => {
    try {
      await pb.collection('users').requestPasswordReset(email, { $autoCancel: false });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Second half of the reset flow: the token comes from the emailed link.
  // PocketBase invalidates the token once used and rejects expired ones, so a
  // failure here is usually "link already used or too old" rather than a bug.
  // The raw SDK message for that case is "An error occurred while validating
  // the submitted data", which tells a customer nothing — so the per-field
  // errors are passed back for the page to turn into something readable.
  const confirmPasswordReset = async (token, password, passwordConfirm) => {
    try {
      await pb.collection('users').confirmPasswordReset(token, password, passwordConfirm, { $autoCancel: false });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fieldErrors: error?.response?.data || {},
      };
    }
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    login,
    signup,
    loginWithGoogle,
    loginWithTotp,
    refreshUser,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
    initialLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};