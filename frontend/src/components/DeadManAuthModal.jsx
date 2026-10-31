"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  X,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  CheckCircle2,
  AlertOctagon,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";

export default function DeadManAuthModal({ isOpen, onClose, onArmed, accountCount = 0 }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isGoogleVerified, setIsGoogleVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentUser = auth?.currentUser;
  const isGoogleUser = Boolean(
    currentUser?.providerData?.some((p) => p.providerId === "google.com")
  );

  const handleGoogleReauth = async () => {
    setError("");
    setLoading(true);
    try {
      if (currentUser && typeof reauthenticateWithPopup === "function") {
        await reauthenticateWithPopup(currentUser, googleProvider);
        setIsGoogleVerified(true);
      } else {
        // Fallback for mock/local environment
        setIsGoogleVerified(true);
      }
    } catch (err) {
      console.error("Google re-auth error:", err);
      setError(
        err.code === "auth/popup-closed-by-user"
          ? "Re-authentication popup was closed before completion."
          : err.message || "Google re-authentication failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleArmSwitch = async (e) => {
    e?.preventDefault();
    setError("");

    if (confirmation.trim() !== "PURGE") {
      setError('You must type "PURGE" exactly to confirm.');
      return;
    }

    setLoading(true);

    try {
      // 1. Re-authentication verification if user has active Firebase session
      if (currentUser) {
        if (isGoogleUser) {
          if (!isGoogleVerified) {
            throw new Error("Please re-authenticate with Google first.");
          }
        } else {
          if (!password) {
            throw new Error("Please enter your account password to verify identity.");
          }
          if (currentUser.email) {
            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);
          }
        }
      }

      // 2. Trigger Dead Man's Switch protocol via callback
      if (onArmed) {
        await onArmed({ confirmation: "PURGE", password });
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Arming Dead Man Switch failed:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid password. Re-authentication rejected.");
      } else {
        setError(err.message || "Failed to arm Dead Man's Switch.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    confirmation.trim() === "PURGE" &&
    (isGoogleUser ? isGoogleVerified : (password.length > 0 || !currentUser));

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dead-man-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      style={{
        zIndex: 9999,
        backgroundColor: "rgba(10, 15, 12, 0.85)",
        backdropFilter: "blur(6px)",
      }}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{
          maxWidth: "520px",
          width: "92%",
          backgroundColor: "#161f19",
          border: "1px solid rgba(239, 68, 68, 0.4)",
          borderRadius: "14px",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)",
          color: "#f1f5ee",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-head"
          style={{
            borderBottom: "1px solid rgba(239, 68, 68, 0.25)",
            padding: "16px 20px",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "rgba(239, 68, 68, 0.18)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
              }}
            >
              <AlertOctagon size={20} />
            </div>
            <div>
              <h2
                id="dead-man-title"
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  margin: 0,
                  color: "#fecaca",
                  letterSpacing: "-0.01em",
                }}
              >
                Emergency Protocol: Dead Man's Switch
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#ef4444",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                ⚠️ Tactical Perimeter Decommission
              </span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            style={{
              color: "#94a3b8",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "20px" }}>
          {/* Warning Banner */}
          <div
            style={{
              backgroundColor: "rgba(127, 29, 29, 0.25)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <AlertTriangle
              size={18}
              style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }}
            />
            <div style={{ fontSize: "12.5px", color: "#fca5a5", lineHeight: "1.55" }}>
              <strong>Extreme Security Action:</strong> This procedure immediately transitions{" "}
              <strong>all {accountCount > 0 ? accountCount : "audited"} discovered accounts</strong>{" "}
              to <code style={{ color: "#f87171", background: "rgba(0,0,0,0.3)", padding: "1px 4px", borderRadius: "4px" }}>MARKED_FOR_DELETION</code>.
              Your audit log will record a high-severity decommission event.
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.2)",
                border: "1px solid #dc2626",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                color: "#fecaca",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ShieldAlert size={16} style={{ color: "#ef4444", flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                backgroundColor: "rgba(22, 101, 52, 0.3)",
                border: "1px solid #16a34a",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                color: "#bbf7d0",
                fontSize: "12.5px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <CheckCircle2 size={16} style={{ color: "#4ade80", flexShrink: 0 }} />
              <span>Dead Man's Switch activated! Perimeter queued for deletion.</span>
            </div>
          )}

          <form onSubmit={handleArmSwitch} style={{ display: "grid", gap: "16px" }}>
            {/* Step 1: Re-authentication */}
            <div
              style={{
                background: "rgba(25, 37, 28, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#e2ece1",
                  marginBottom: "8px",
                }}
              >
                <KeyRound size={15} style={{ color: "#b8d8b2" }} />
                1. Re-Authenticate Session
              </label>

              {isGoogleUser ? (
                <div>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
                    Your session is signed in via Google OAuth. Confirm your credentials before arming.
                  </p>
                  {isGoogleVerified ? (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "rgba(34, 197, 94, 0.15)",
                        border: "1px solid rgba(34, 197, 94, 0.4)",
                        color: "#4ade80",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={14} /> Identity Verified (Google)
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleReauth}
                      disabled={loading}
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#ffffff",
                        padding: "8px 14px",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <KeyRound size={14} /> Re-authenticate with Google
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
                    Enter your GhostGuard account password to verify identity:
                  </p>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                      disabled={loading}
                      required={Boolean(currentUser)}
                      style={{
                        width: "100%",
                        padding: "10px 42px 10px 12px",
                        backgroundColor: "#0d1510",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "8px",
                        color: "#ffffff",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Strict Confirmation */}
            <div
              style={{
                background: "rgba(25, 37, 28, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "14px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "#e2ece1",
                  marginBottom: "6px",
                }}
              >
                2. Type <span style={{ color: "#ef4444" }}>PURGE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder='Type "PURGE" in uppercase'
                disabled={loading}
                autoComplete="off"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  backgroundColor: "#0d1510",
                  border:
                    confirmation.trim() === "PURGE"
                      ? "1px solid #ef4444"
                      : "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "8px",
                  color: "#f87171",
                  fontWeight: 700,
                  fontSize: "13px",
                  letterSpacing: "1px",
                  outline: "none",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "6px",
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#94a3b8",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel / Abort
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                style={{
                  backgroundColor: isFormValid && !loading ? "#dc2626" : "rgba(220, 38, 38, 0.25)",
                  border: "1px solid #ef4444",
                  color: isFormValid && !loading ? "#ffffff" : "#fca5a5",
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: isFormValid && !loading ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow:
                    isFormValid && !loading
                      ? "0 0 16px rgba(239, 68, 68, 0.45)"
                      : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Arming Protocol...
                  </>
                ) : (
                  <>
                    <AlertOctagon size={15} />
                    Arm Dead Man's Switch
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

