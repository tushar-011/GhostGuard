"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  onAuthStateChanged,
} from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  idToken: null,
  loading: true,
  isFirebaseActive: false,
  login: async () => {},
  signup: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
  getIdToken: async () => null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setUser(currentUser);
          setIdToken(token);
          if (typeof window !== "undefined") {
            window.localStorage.setItem("ghostguard_id_token", token);
            window.localStorage.setItem("ghostguard_auth", "true");
            window.localStorage.setItem("ghostguard_mode", "LIVE");
            if (currentUser.email) {
              window.localStorage.setItem("ghostguard_email", currentUser.email);
            }
          }
        } catch (err) {
          console.warn("[AuthContext] Failed to get user token:", err);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setIdToken(null);
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("ghostguard_id_token");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase Authentication is not configured.");
    }
    const result = await signInWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ghostguard_id_token", token);
    }
    return result.user;
  };

  const signup = async (email, password) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase Authentication is not configured.");
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const token = await result.user.getIdToken();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ghostguard_id_token", token);
    }
    return result.user;
  };

  const loginWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth || !googleProvider) {
      throw new Error("Firebase Google Authentication is not configured.");
    }
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ghostguard_id_token", token);
    }
    return result.user;
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ghostguard_id_token");
      window.localStorage.removeItem("ghostguard-demo-session");
      window.localStorage.removeItem("ghostguard_auth");
      window.localStorage.removeItem("ghostguard_mode");
      window.localStorage.removeItem("ghostguard_email");
    }
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
    setUser(null);
    setIdToken(null);
  };

  const fetchIdToken = async (forceRefresh = false) => {
    if (user && typeof user.getIdToken === "function") {
      const token = await user.getIdToken(forceRefresh);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ghostguard_id_token", token);
      }
      return token;
    }
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("ghostguard_id_token");
    }
    return null;
  };

  const value = {
    user,
    idToken,
    loading,
    isFirebaseActive: isFirebaseConfigured,
    login,
    signup,
    loginWithGoogle,
    logout,
    getIdToken: fetchIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;

