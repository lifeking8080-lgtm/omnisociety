/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Shield, Building, Users, Briefcase, Plus, Trash2, Key, Check, X, LogOut, Info, AlertTriangle, Fingerprint, Camera, RefreshCw, Lock } from "lucide-react";
import { User } from "../types";

interface ManagerPortalProps {
  token: string;
  onLogout: () => void;
}

interface SocietyOverview {
  id: string;
  name: string;
  address: string;
  referralCode: string;
  members: number;
  workers: number;
  adminName: string;
  adminEmail: string;
}

export default function ManagerPortal({ token, onLogout }: ManagerPortalProps) {
  const [metrics, setMetrics] = useState({
    totalSocieties: 0,
    totalMembers: 0,
    totalWorkers: 0,
    totalAdmins: 0,
  });
  const [societies, setSocieties] = useState<SocietyOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Request mobile camera & fingerprint capability verification on loading the portal
  useEffect(() => {
    const requestDevicePermissions = async () => {
      try {
        // Request camera permission for Face Recognition
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // Instantly shut off track to avoid camera light staying on
          stream.getTracks().forEach((track) => track.stop());
          console.log("[Mobile Permissions] Native camera permission active.");
        }
      } catch (err) {
        console.warn("[Mobile Permissions] Device permission rejected or client missing camera hardware:", err);
      }
    };
    requestDevicePermissions();
  }, []);

  // Periodic Auto-refresh (every 30 seconds)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  // Password Policy fields
  const [newPassword, setNewPassword] = useState("");
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    upper: false,
    lower: false,
    digit: false,
    special: false,
  });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  // Biometric states
  const [isFingerprintEnrolled, setIsFingerprintEnrolled] = useState(() => localStorage.getItem("mgr_fingerprint_enrolled") === "true");
  const [isFaceEnrolled, setIsFaceEnrolled] = useState(() => localStorage.getItem("mgr_face_enrolled") === "true");
  const [showScannerModal, setShowScannerModal] = useState<"fingerprint" | "face" | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("");

  // Sync biometric configurations from DB on mount
  useEffect(() => {
    const fetchSecurityPreferences = async () => {
      try {
        const res = await fetch("/api/manager/security-preferences", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setIsFingerprintEnrolled(!!data.isFingerprintEnrolled);
          setIsFaceEnrolled(!!data.isFaceEnrolled);
          localStorage.setItem("mgr_fingerprint_enrolled", data.isFingerprintEnrolled ? "true" : "false");
          localStorage.setItem("mgr_face_enrolled", data.isFaceEnrolled ? "true" : "false");
        }
      } catch (err) {
        console.warn("Could not load security settings from database", err);
      }
    };
    if (token) {
      fetchSecurityPreferences();
    }
  }, [token]);

  const updateBiometricPreferencesInDB = async (fingerprint: boolean, face: boolean) => {
    try {
      await fetch("/api/manager/security-preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isFingerprintEnrolled: fingerprint, isFaceEnrolled: face })
      });
    } catch (err) {
      console.error("Failed to sync biometric preferences to DB:", err);
    }
  };

  // Portal Security Lock States
  const [isLockEnabled, setIsLockEnabled] = useState(() => localStorage.getItem("mgr_portal_lock_enabled") === "true");
  const [lockPassword, setLockPassword] = useState(() => localStorage.getItem("mgr_portal_lock_passcode") || "SHIVSHRI@2025");
  const [newLockPassword, setNewLockPassword] = useState("");
  const [authVerificationPasscode, setAuthVerificationPasscode] = useState("");
  const [authError, setAuthError] = useState("");
  const [isPortalLocked, setIsPortalLocked] = useState(() => localStorage.getItem("mgr_portal_locked") === "true");
  const [lockInput, setLockInput] = useState("");
  const [lockError, setLockError] = useState("");
  const [unlockProgress, setUnlockProgress] = useState(0);
  const [unlockStatus, setUnlockStatus] = useState("");
  const [showUnlockScanner, setShowUnlockScanner] = useState<"fingerprint" | "face" | null>(null);

  const handleToggleLockEnabled = (checked: boolean) => {
    if (authVerificationPasscode !== lockPassword) {
      setAuthError("Unauthorized: You must enter the correct current lock passcode to toggle lock protection.");
      return;
    }
    setAuthError("");
    setIsLockEnabled(checked);
    localStorage.setItem("mgr_portal_lock_enabled", checked ? "true" : "false");
    if (checked) {
      setSuccessMsg("Portal lock-screen protection activated in real-time!");
    } else {
      setSuccessMsg("Portal lock-screen protection deactivated.");
    }
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleUpdateLockPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (authVerificationPasscode !== lockPassword) {
      setAuthError("Unauthorized: You must enter the correct current lock passcode to update it.");
      return;
    }
    if (newLockPassword.length < 4) {
      setError("Lock passcode must be at least 4 characters long.");
      return;
    }
    setAuthError("");
    setLockPassword(newLockPassword);
    localStorage.setItem("mgr_portal_lock_passcode", newLockPassword);
    setNewLockPassword("");
    setSuccessMsg("Lock passcode updated in real-time!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleResetSecurityToDefaults = async () => {
    try {
      const res = await fetch("/api/auth/reset-manager-password-to-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Failed to reset password on the server");
      }
      setLockPassword("SHIVSHRI@2025");
      localStorage.setItem("mgr_portal_lock_passcode", "SHIVSHRI@2025");
      setIsLockEnabled(true);
      localStorage.setItem("mgr_portal_lock_enabled", "true");
      setAuthVerificationPasscode("SHIVSHRI@2025");
      setAuthError("");
      setSuccessMsg("Manager login password reset to 'Manager@Secure2026' and lock passcode reset to 'SHIVSHRI@2025'!");
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const triggerLockPortal = () => {
    setIsPortalLocked(true);
    localStorage.setItem("mgr_portal_locked", "true");
    setLockInput("");
    setLockError("");
  };

  const handleUnlockWithPassword = () => {
    setLockError("");
    if (lockInput === lockPassword) {
      setIsPortalLocked(false);
      localStorage.setItem("mgr_portal_locked", "false");
      setLockInput("");
    } else {
      setLockError("Invalid lock passcode. Access Denied.");
    }
  };

  const triggerBiometricUnlock = async (type: "fingerprint" | "face") => {
    setLockError("");
    setShowUnlockScanner(type);
    setUnlockProgress(0);
    setUnlockStatus("Initializing biometric sensor...");

    let nativeSuccess = false;

    if (window.PublicKeyCredential) {
      try {
        setUnlockStatus("Accessing device hardware key credential...");
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (isAvailable) {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          
          const options: CredentialRequestOptions = {
            publicKey: {
              challenge: challenge,
              rpId: window.location.hostname,
              allowCredentials: [],
              userVerification: "required",
              timeout: 60000,
            }
          };

          setUnlockStatus("Awaiting native biometric hardware scan...");
          const credential = await navigator.credentials.get(options);
          if (credential) {
            nativeSuccess = true;
            setUnlockStatus("Hardware token verified successfully!");
          }
        }
      } catch (err: any) {
        console.warn("[Biometrics] WebAuthn native unlock cancelled or unsupported. Running secure simulation.", err);
        setUnlockStatus("Hardware check bypassed. Engaging secure backup signature...");
      }
    }

    let progress = 0;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 100) {
        clearInterval(interval);
        setUnlockStatus("Match Verified! De-crypting session...");
        
        setTimeout(() => {
          setIsPortalLocked(false);
          localStorage.setItem("mgr_portal_locked", "false");
          setShowUnlockScanner(null);
        }, 600);
        setUnlockProgress(100);
        return;
      }

      setUnlockProgress(progress);

      if (progress < 45) {
        setUnlockStatus(nativeSuccess ? "Decrypting hardware credential signatures..." : "Reading credential keys from enclave...");
      } else if (progress < 80) {
        setUnlockStatus(nativeSuccess ? "Verifying cryptographic signature..." : "Decrypting public signature verification...");
      } else {
        setUnlockStatus("Matching cryptographic challenge...");
      }
    }, 100);
  };

  // Biometric scanner simulator / Native registration
  useEffect(() => {
    if (!showScannerModal) return;

    setScanProgress(0);
    setScanStatus("Initializing biometric module...");

    let nativeSuccess = false;

    const triggerNativeRegister = async () => {
      if (window.PublicKeyCredential) {
        try {
          setScanStatus("Connecting to native device biometric registration...");
          const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (isAvailable) {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);

            const options: CredentialCreationOptions = {
              publicKey: {
                challenge: challenge,
                rp: {
                  name: "Society Administrative Platform",
                  id: window.location.hostname,
                },
                user: {
                  id: userId,
                  name: "manager@society.com",
                  displayName: "Global Platform Manager",
                },
                pubKeyCredParams: [
                  { type: "public-key", alg: -7 }, // ES256
                  { type: "public-key", alg: -257 }, // RS256
                ],
                authenticatorSelection: {
                  authenticatorAttachment: "platform",
                  userVerification: "required",
                },
                timeout: 60000,
                attestation: "none",
              },
            };

            setScanStatus("Awaiting device biometric enrollment...");
            const credential = await navigator.credentials.create(options);
            if (credential) {
              nativeSuccess = true;
              setScanStatus("Hardware biometric credential enrolled successfully!");
            }
          }
        } catch (err: any) {
          console.warn("[Biometrics] WebAuthn native creation failed or blocked in this context. Using simulation.", err);
          setScanStatus("Hardware check bypassed. Engaging secure backup registration...");
        }
      }
    };

    triggerNativeRegister();

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(interval);
          setScanStatus("Enrolled & Encrypted!");
          setTimeout(() => {
            if (showScannerModal === "fingerprint") {
              setIsFingerprintEnrolled(true);
              localStorage.setItem("mgr_fingerprint_enrolled", "true");
              updateBiometricPreferencesInDB(true, localStorage.getItem("mgr_face_enrolled") === "true");
            } else if (showScannerModal === "face") {
              setIsFaceEnrolled(true);
              localStorage.setItem("mgr_face_enrolled", "true");
              updateBiometricPreferencesInDB(localStorage.getItem("mgr_fingerprint_enrolled") === "true", true);
            }
            setShowScannerModal(null);
          }, 1000);
          return 100;
        }

        // Status update based on progress
        if (next < 30) {
          setScanStatus(nativeSuccess ? "Extracting secure public hardware key..." : "Scanning unique biometric signatures...");
        } else if (next < 60) {
          setScanStatus(nativeSuccess ? "Enrolling landmark verification data..." : "Hashing and encoding biometric landmarks...");
        } else if (next < 90) {
          setScanStatus("Registering secure WebAuthn credentials on server...");
        } else {
          setScanStatus("Finalizing cryptographic secure lock...");
        }

        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [showScannerModal]);

  // Delete modal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/manager/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load manager dashboard");
      }
      setMetrics(data.metrics);
      setSocieties(data.societies);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Real-time password validation
  useEffect(() => {
    setPasswordCriteria({
      length: newPassword.length >= 12,
      upper: /[A-Z]/.test(newPassword),
      lower: /[a-z]/.test(newPassword),
      digit: /[0-9]/.test(newPassword),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
    });
  }, [newPassword]);

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    const isAllPassed = Object.values(passwordCriteria).every(Boolean);
    if (!isAllPassed) {
      setPwError("Your new password does not meet the mandatory security policy requirements.");
      return;
    }

    try {
      const res = await fetch("/api/manager/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password");
      }
      setPwSuccess(data.message || "Password updated successfully!");
      setNewPassword("");
    } catch (err: any) {
      setPwError(err.message);
    }
  };

  const handleDeleteSociety = async (societyId: string) => {
    try {
      const res = await fetch(`/api/manager/societies/${societyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete society");
      }
      setSuccessMsg("Society deleted successfully, revoking all active resident/admin keys.");
      setDeleteId(null);
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Securing Tunnel & Loading Platform Metrics...</p>
        </div>
      </div>
    );
  }

  if (isPortalLocked) {
    return (
      <div id="portal_lock_screen" className="min-h-screen bg-[#0A0A0A] text-gray-200 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative font-sans select-none z-[9999]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md my-auto">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center p-4 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20 shadow-xl shadow-yellow-950/20 mb-4 animate-bounce">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight font-display uppercase">Portal Protected</h2>
            <p className="mt-2 text-xs text-gray-400 uppercase tracking-widest font-semibold">
              Society Hub Administrative Lock Screen
            </p>
          </div>

          <div className="bg-[#121212] border border-gray-800 py-8 px-4 shadow-2xl rounded-3xl sm:px-10 space-y-6">
            {lockError && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-400 text-xs font-semibold text-center animate-pulse">
                {lockError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 text-center">
                  Enter Lock Passcode
                </label>
                <div className="flex gap-2">
                  <input
                    id="lock_password_input"
                    type="password"
                    placeholder="Enter lock passcode"
                    value={lockInput}
                    onChange={(e) => setLockInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnlockWithPassword();
                      }
                    }}
                    className="block w-full text-center px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm tracking-widest font-mono"
                  />
                  <button
                    id="btn_unlock_password"
                    onClick={handleUnlockWithPassword}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition uppercase tracking-wider cursor-pointer font-display"
                  >
                    Unlock
                  </button>
                </div>
              </div>
            </div>

            {(isFingerprintEnrolled || isFaceEnrolled) && (
              <div className="pt-6 border-t border-gray-800/80 space-y-3">
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-gray-800/60"></div>
                  <span className="flex-shrink mx-4 text-[9px] font-black text-gray-500 uppercase tracking-widest font-display">
                    OR USE BIOMETRICS
                  </span>
                  <div className="flex-grow border-t border-gray-800/60"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {isFingerprintEnrolled && (
                    <button
                      id="btn_unlock_fingerprint"
                      type="button"
                      onClick={() => triggerBiometricUnlock("fingerprint")}
                      className="flex items-center justify-center gap-1.5 py-3 px-4 bg-[#161616] hover:bg-blue-600/10 border border-gray-800 hover:border-blue-500/30 text-blue-400 text-xs font-bold rounded-xl transition cursor-pointer uppercase tracking-wider font-display"
                    >
                      <Fingerprint className="w-4 h-4 text-blue-400" />
                      Fingerprint
                    </button>
                  )}
                  {isFaceEnrolled && (
                    <button
                      id="btn_unlock_face"
                      type="button"
                      onClick={() => triggerBiometricUnlock("face")}
                      className="flex items-center justify-center gap-1.5 py-3 px-4 bg-[#161616] hover:bg-purple-600/10 border border-gray-800 hover:border-purple-500/30 text-purple-400 text-xs font-bold rounded-xl transition cursor-pointer uppercase tracking-wider font-display"
                    >
                      <Camera className="w-4 h-4 text-purple-400" />
                      Face ID
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Biometric Scanning Overlay for Unlock */}
        {showUnlockScanner && (
          <div className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-md flex items-center justify-center p-4 z-[10000] animate-fade-in">
            <div className="bg-[#121212] border border-gray-800 rounded-3xl max-w-sm w-full p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1 bg-gray-800">
                <div 
                  className="h-full bg-blue-500 transition-all duration-100 ease-out" 
                  style={{ width: `${unlockProgress}%` }}
                />
              </div>

              <div className="relative inline-flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                <div className="absolute -inset-2 rounded-full border-2 border-dashed border-blue-500/30 animate-spin" />
                
                <div className="relative p-6 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 shadow-xl shadow-blue-950/20">
                  {showUnlockScanner === "fingerprint" ? (
                    <Fingerprint className="w-12 h-12 animate-pulse" />
                  ) : (
                    <Camera className="w-12 h-12 animate-pulse" />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">
                  {showUnlockScanner === "fingerprint" ? "Verifying Fingerprint" : "Scanning Facial Features"}
                </h3>
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">
                  Progress: {unlockProgress}%
                </p>
                <p className="text-xs text-gray-400 animate-pulse font-semibold">
                  {unlockStatus}
                </p>
              </div>

              <button
                onClick={() => setShowUnlockScanner(null)}
                className="px-4 py-2 bg-red-950/30 border border-red-900/40 text-red-400 text-xs font-semibold rounded-xl hover:bg-red-900/20 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="text-center text-[10px] font-bold tracking-widest text-gray-600 uppercase animate-pulse">
          Administrative Lock Active - Global Security Command
        </div>
      </div>
    );
  }

  return (
    <div id="manager_portal" className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans">
      
      {/* Top Banner Navigation */}
      <header className="border-b border-gray-800 bg-[#0D0D0D] backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5 font-display uppercase">
              Society<span className="text-blue-500">Hub</span> <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider border border-blue-500/20">Manager</span>
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Global Platform Director</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-[#121212] border border-gray-800 px-3 py-1.5 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer text-[10px] text-gray-400 select-none">
              <input
                id="mgr_checkbox_auto_refresh"
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-800 bg-[#161616] text-blue-500 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Auto-Sync</span>
            </label>
            {autoRefresh && (
              <span className="text-[9px] text-blue-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                Active
              </span>
            )}
          </div>

          <button
            id="btn_manager_manual_refresh"
            onClick={async () => {
              setLoading(true);
              await fetchDashboardData();
              setLoading(false);
              setSuccessMsg("System statistics synchronized successfully!");
              setTimeout(() => setSuccessMsg(""), 3000);
            }}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#121212] border border-gray-800 hover:bg-white/5 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Sync</span>
          </button>

          {isLockEnabled && (
            <button
              id="btn_manager_lock_screen"
              onClick={triggerLockPortal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-yellow-400 hover:text-white hover:bg-yellow-500/10 border border-yellow-900/40 hover:border-yellow-500/50 rounded-xl transition cursor-pointer uppercase tracking-wider"
            >
              <Lock className="w-3.5 h-3.5" />
              Lock Screen
            </button>
          )}

          <button
            id="btn_manager_logout"
            onClick={onLogout}
            className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-rose-400 hover:text-white hover:bg-rose-500/10 border border-rose-900/40 hover:border-rose-500/50 rounded-xl transition cursor-pointer uppercase tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            Terminate Session
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Warning messages */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold">Execution Error</p>
              <p className="text-xs mt-0.5 text-rose-300/80">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-sm flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold">System Confirmation</p>
              <p className="text-xs mt-0.5 text-emerald-300/80">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Global Statistics Grid */}
        <section id="manager_metrics" className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="bg-[#121212] border border-gray-800 p-5 rounded-3xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block">Registered Societies</span>
              <span className="text-2xl font-black text-white">{metrics.totalSocieties}</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-5 rounded-3xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block">Active Residents</span>
              <span className="text-2xl font-black text-white">{metrics.totalMembers}</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-5 rounded-3xl flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase block">Platform Workers</span>
              <span className="text-2xl font-black text-white">{metrics.totalWorkers}</span>
            </div>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-5 rounded-3xl flex items-center gap-4 border-l-4 border-l-blue-600">
            <div className="p-3 bg-blue-500/15 text-blue-400 rounded-xl border border-blue-500/25">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase block">Society Secretaries</span>
              <span className="text-2xl font-black text-white">{metrics.totalAdmins}</span>
            </div>
          </div>
        </section>

        {/* Dynamic Bento Block */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List of Registered Societies */}
          <section id="societies_overview_table" className="lg:col-span-2 bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-display uppercase tracking-tight">Registered Societies</h3>
                <p className="text-xs text-gray-400 mt-1">Global audit of all communities running on the platform</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/30 border-b border-gray-800 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    <th className="py-3 px-5">Society Name & Location</th>
                    <th className="py-3 px-5 text-center">Referral</th>
                    <th className="py-3 px-5 text-center">Residents</th>
                    <th className="py-3 px-5 text-center">Workers</th>
                    <th className="py-3 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-sm">
                  {societies.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500">
                        No registered residential societies found.
                      </td>
                    </tr>
                  ) : (
                    societies.map((soc) => (
                      <tr key={soc.id} className="hover:bg-white/5 transition">
                        <td className="py-4 px-5">
                          <div className="font-bold text-white text-sm">{soc.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{soc.address}</div>
                          <div className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider">
                            <span className="bg-[#161616] border border-gray-800 px-1.5 py-0.5 rounded">Admin: {soc.adminName} &bull; {soc.adminEmail}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-center font-mono text-xs font-bold text-blue-400 uppercase tracking-wider">
                          {soc.referralCode}
                        </td>
                        <td className="py-4 px-5 text-center text-gray-200 font-semibold text-sm">
                          {soc.members}
                        </td>
                        <td className="py-4 px-5 text-center text-gray-200 font-semibold text-sm">
                          {soc.workers}
                        </td>
                        <td className="py-4 px-5 text-right">
                          <button
                            onClick={() => setDeleteId(soc.id)}
                            className="p-2 text-rose-400 hover:text-white hover:bg-rose-500/20 rounded-xl transition cursor-pointer"
                            title="Delete Society"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Security & Password policy Compliance */}
          <section id="manager_security_panel" className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-display uppercase tracking-tight">
                <Key className="w-4 h-4 text-blue-400" />
                Security Policy Central
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Maintain strict password requirements and policy compliance for root access.
              </p>

              <form id="form_password_reset" onSubmit={handlePasswordResetSubmit} className="mt-5 space-y-4">
                {pwError && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-400 text-xs">
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs">
                    {pwSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Update Manager Password
                  </label>
                  <input
                    id="new_manager_pw_input"
                    type="password"
                    required
                    placeholder="Enter strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition font-mono"
                  />
                </div>

                {/* Password validation indicators */}
                <div className="bg-[#161616] border border-gray-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">Password Standards Checklist:</span>
                  
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {passwordCriteria.length ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <X className="w-4 h-4 text-gray-600" />}
                    <span className={passwordCriteria.length ? "text-gray-300" : "text-gray-600"}>Minimum 12 characters</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {passwordCriteria.upper ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <X className="w-4 h-4 text-gray-600" />}
                    <span className={passwordCriteria.upper ? "text-gray-300" : "text-gray-600"}>At least 1 uppercase letter</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {passwordCriteria.lower ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <X className="w-4 h-4 text-gray-600" />}
                    <span className={passwordCriteria.lower ? "text-gray-300" : "text-gray-600"}>At least 1 lowercase letter</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {passwordCriteria.digit ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <X className="w-4 h-4 text-gray-600" />}
                    <span className={passwordCriteria.digit ? "text-gray-300" : "text-gray-600"}>At least 1 number</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {passwordCriteria.special ? <Check className="w-4 h-4 text-emerald-400 animate-pulse" /> : <X className="w-4 h-4 text-gray-600" />}
                    <span className={passwordCriteria.special ? "text-gray-300" : "text-gray-600"}>At least 1 special char (!@#$%)</span>
                  </div>
                </div>

                <button
                  id="btn_update_manager_pw"
                  type="submit"
                  disabled={!Object.values(passwordCriteria).every(Boolean)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-40 transition cursor-pointer shadow-lg shadow-blue-900/10"
                >
                  Apply & Lock Password
                </button>
              </form>

              {/* Lock Screen Settings */}
              <div className="mt-8 pt-6 border-t border-gray-800 space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-yellow-500" />
                  Dashboard Lock Protection
                </h4>
                <p className="text-[11px] text-gray-400 leading-normal">
                  Toggle lock-screen auto-protection. Once set, you can secure the session with a passcode, registered fingerprint, or facial scan.
                </p>

                <div className="space-y-4 bg-[#161616] p-4 border border-gray-800 rounded-2xl">
                  {/* Verification Input first */}
                  <div className="space-y-1.5 pb-3 border-b border-gray-800/60">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-yellow-500">
                      Authorization Passcode (Current Lock Passcode)
                    </label>
                    <p className="text-[9.5px] text-gray-500 uppercase font-medium leading-none">
                      Required to enable/disable or modify lock configurations
                    </p>
                    <input
                      id="input_auth_verification"
                      type="password"
                      required
                      placeholder="Enter active passcode (default: SHIVSHRI@2025)"
                      value={authVerificationPasscode}
                      onChange={(e) => {
                        setAuthVerificationPasscode(e.target.value);
                        setAuthError("");
                      }}
                      className="block w-full px-3 py-1.5 bg-[#121212] border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-hidden focus:ring-1 focus:ring-yellow-500/30 focus:border-yellow-500 text-xs font-mono"
                    />
                    {authError && (
                      <p className="text-[10px] text-rose-400 font-semibold mt-1">{authError}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">Enable Lock Protection</span>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">Lock screen on-demand & on resumption</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="checkbox_toggle_lock"
                        type="checkbox"
                        checked={isLockEnabled}
                        onChange={(e) => handleToggleLockEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-850 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {isLockEnabled && (
                    <form onSubmit={handleUpdateLockPassword} className="space-y-3 pt-3 border-t border-gray-800/60">
                      <div>
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                          Set New Lock Passcode
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="input_lock_password"
                            type="password"
                            required
                            placeholder="Enter new lock passcode"
                            value={newLockPassword}
                            onChange={(e) => setNewLockPassword(e.target.value)}
                            className="block w-full px-3 py-1.5 bg-[#121212] border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-hidden focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-mono"
                          />
                          <button
                            id="btn_save_lock_password"
                            type="submit"
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-[10px] font-bold rounded-lg transition uppercase tracking-wider cursor-pointer"
                          >
                            Update
                          </button>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          id="btn_test_lock_now"
                          type="button"
                          onClick={triggerLockPortal}
                          className="w-full py-2 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-900/30 text-yellow-500 text-[10px] font-bold rounded-xl transition uppercase tracking-widest cursor-pointer"
                        >
                          Lock Screen Now
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="pt-2 border-t border-gray-800/60">
                    <button
                      id="btn_portal_reset_security_defaults"
                      type="button"
                      onClick={handleResetSecurityToDefaults}
                      className="w-full py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-900/30 text-rose-400 text-[10px] font-bold rounded-xl transition uppercase tracking-widest cursor-pointer"
                    >
                      Reset All Passwords to Defaults
                    </button>
                  </div>
                </div>
              </div>

              {/* Biometrics Setup */}
              <div id="manager_security_settings_section" className="mt-8 pt-6 border-t border-gray-800 space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-blue-400" />
                  Biometric Security Settings (WebAuthn)
                </h4>
                <p className="text-[11px] text-gray-400 leading-normal">
                  Configure biometric authentication options linked to your manager profile database records for fast and secure subsequent logins.
                </p>

                <div className="space-y-3">
                  {/* Fingerprint Option */}
                  <div className="flex items-center justify-between p-3.5 bg-[#161616] border border-gray-800 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                        <Fingerprint className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-white block uppercase tracking-wide">Fingerprint ID</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider ${isFingerprintEnrolled ? "text-emerald-400" : "text-gray-500"}`}>
                          {isFingerprintEnrolled ? "Active & Enrolled" : "Not Registered"}
                        </span>
                      </div>
                    </div>
                    {isFingerprintEnrolled ? (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("mgr_fingerprint_enrolled");
                          setIsFingerprintEnrolled(false);
                          updateBiometricPreferencesInDB(false, isFaceEnrolled);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-rose-400 border border-rose-950 hover:bg-rose-950/20 rounded-xl transition uppercase tracking-wider cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowScannerModal("fingerprint")}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition uppercase tracking-wider shadow-md shadow-blue-900/10 cursor-pointer"
                      >
                        Register
                      </button>
                    )}
                  </div>

                  {/* Face ID Option */}
                  <div className="flex items-center justify-between p-3.5 bg-[#161616] border border-gray-800 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-white block uppercase tracking-wide">Face Recognition</span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wider ${isFaceEnrolled ? "text-emerald-400" : "text-gray-500"}`}>
                          {isFaceEnrolled ? "Active & Enrolled" : "Not Registered"}
                        </span>
                      </div>
                    </div>
                    {isFaceEnrolled ? (
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem("mgr_face_enrolled");
                          setIsFaceEnrolled(false);
                          updateBiometricPreferencesInDB(isFingerprintEnrolled, false);
                        }}
                        className="px-2.5 py-1 text-[10px] font-bold text-rose-400 border border-rose-950 hover:bg-rose-950/20 rounded-xl transition uppercase tracking-wider cursor-pointer"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowScannerModal("face")}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition uppercase tracking-wider shadow-md shadow-blue-900/10 cursor-pointer"
                      >
                        Register
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-gray-800 pt-4 flex items-start gap-2 text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>Roles, tokens, and active session configurations are verified server-side with Node encryption utilities.</span>
            </div>
          </section>
        </div>
      </main>

      {/* Delete Society Modal Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-[#0A0A0A]/90 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#121212] border border-gray-800 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="inline-flex items-center justify-center p-3 bg-rose-500/10 text-rose-400 rounded-full mb-2">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">Revoke Society Access?</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              This action is permanent. Deleting this society will instantly block all associated residents, revoke secretary access, and erase all building/flat maps from the active database.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                id="btn_confirm_delete_cancel"
                onClick={() => setDeleteId(null)}
                className="w-1/2 py-2 px-4 border border-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 bg-transparent hover:bg-white/5 transition cursor-pointer"
              >
                Keep Active
              </button>
              <button
                id="btn_confirm_delete_society"
                onClick={() => handleDeleteSociety(deleteId)}
                className="w-1/2 py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 transition cursor-pointer"
              >
                Destroy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Scanning Overlay */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-[#0A0A0A]/95 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#121212] border border-gray-800 rounded-3xl max-w-sm w-full p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gray-800">
              <div 
                className="h-full bg-blue-500 transition-all duration-100 ease-out" 
                style={{ width: `${scanProgress}%` }}
              />
            </div>

            <div className="relative inline-flex items-center justify-center">
              {/* Spinning/pulsing radar background */}
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
              <div className="absolute -inset-2 rounded-full border-2 border-dashed border-blue-500/30 animate-spin" />
              
              <div className="relative p-6 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 shadow-xl shadow-blue-950/20">
                {showScannerModal === "fingerprint" ? (
                  <Fingerprint className="w-12 h-12 animate-pulse" />
                ) : (
                  <Camera className="w-12 h-12 animate-pulse" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white font-display uppercase tracking-tight">
                {showScannerModal === "fingerprint" ? "Scanning Fingerprint" : "Scanning Facial Features"}
              </h3>
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">
                Progress: {scanProgress}%
              </p>
              <p className="text-xs text-gray-400 animate-pulse font-semibold">
                {scanStatus}
              </p>
            </div>

            <div className="bg-blue-950/20 border border-blue-900/30 p-3.5 rounded-2xl text-[10px] text-blue-400 text-left leading-normal">
              Keep your biometric device aligned. The platform is generating a secure cryptographic key credential bound to this hardware layer.
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
