/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Shield, Phone, Key, Mail, User as UserIcon, Building2, CheckCircle2, Clock } from "lucide-react";
import { User, Society, Building } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: User, society: Society | null) => void;
  onNavigateToManager: () => void;
}

export default function LoginScreen({ onLoginSuccess, onNavigateToManager }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<"resident" | "admin">("resident");
  const [isAdminRegister, setIsAdminRegister] = useState(false);

  // Common UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resident Form Fields
  const [mobile, setMobile] = useState("");
  const [referralCode, setReferralCode] = useState("");
  
  // Resident Registration Fields (Step 2)
  const [registrationStep, setRegistrationStep] = useState(1); // 1 = Login Check, 2 = Fill Registration, 3 = Pending Info
  const [residentName, setResidentName] = useState("");
  const [availableSociety, setAvailableSociety] = useState<{ id: string; name: string; address: string; buildings: Building[] } | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [selectedFloor, setSelectedFloor] = useState<number | "">("");
  const [selectedFlat, setSelectedFlat] = useState<number | "">("");

  // Admin Form Fields
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminMobile, setAdminMobile] = useState("");

  const handleResidentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resident-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, referralCode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (data.status === "unregistered") {
        setAvailableSociety(data.society);
        if (data.society.buildings && data.society.buildings.length > 0) {
          setSelectedBuilding(data.society.buildings[0].name);
        }
        setRegistrationStep(2);
      } else if (data.status === "pending") {
        onLoginSuccess(data.token, data.user, data.society);
      } else if (data.status === "approved") {
        onLoginSuccess(data.token, data.user, data.society);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResidentRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!residentName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (selectedFloor === "" || selectedFlat === "") {
      setError("Please select both floor and flat");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/resident-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: residentName,
          mobile,
          referralCode,
          building: selectedBuilding,
          floor: Number(selectedFloor),
          flat: Number(selectedFlat),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      onLoginSuccess(data.token, data.user, data.society);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const url = isAdminRegister ? "/api/auth/admin-register" : "/api/auth/admin-login";
    const bodyObj = isAdminRegister
      ? { name: adminName, email: adminEmail, password: adminPassword, mobile: adminMobile }
      : { email: adminEmail, password: adminPassword };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Fetch admin details
      onLoginSuccess(data.token, data.user, data.society || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedBldObj = availableSociety?.buildings.find(b => b.name === selectedBuilding);
  const selectedFlrObj = selectedBldObj?.floors.find(f => f.number === Number(selectedFloor));

  return (
    <div id="login_container" className="min-h-screen bg-[#0A0A0A] text-gray-200 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative font-sans">
      {/* Corner link to Manager Portal */}
      <button
        id="btn_manager_link"
        onClick={onNavigateToManager}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-blue-400 bg-[#121212] hover:bg-[#161616] border border-gray-800 hover:border-blue-600/30 rounded-xl transition duration-200 cursor-pointer uppercase tracking-wider"
      >
        <Shield className="w-3.5 h-3.5" />
        Manager Portal
      </button>

      <div className="sm:mx-auto sm:w-full sm:max-w-md my-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-950/30 mb-4">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight font-display uppercase">
            Society<span className="text-blue-500">Hub</span>
          </h2>
          <p className="mt-2 text-xs text-gray-400 uppercase tracking-widest font-semibold">
            Secure residential ecosystem management
          </p>
        </div>

        {/* Outer Form Card */}
        <div className="bg-[#121212] py-8 px-4 shadow-2xl rounded-3xl border border-gray-800 sm:px-10">
          
          {/* Tab Selector - Hide during step 2 registration */}
          {registrationStep === 1 && (
            <div className="flex border-b border-gray-800 mb-6">
              <button
                id="tab_resident"
                onClick={() => { setActiveTab("resident"); setError(""); }}
                className={`w-1/2 pb-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${
                  activeTab === "resident"
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-800"
                }`}
              >
                Resident Portal
              </button>
              <button
                id="tab_admin"
                onClick={() => { setActiveTab("admin"); setError(""); }}
                className={`w-1/2 pb-3 text-center text-xs font-bold uppercase tracking-wider border-b-2 transition duration-200 cursor-pointer ${
                  activeTab === "admin"
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-800"
                }`}
              >
                Secretary / Admin
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-400 text-xs font-medium flex items-start gap-2">
              <Shield className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* RESIDENT PORTAL WORKFLOW */}
          {activeTab === "resident" && (
            <div>
              {registrationStep === 1 ? (
                /* Resident Step 1: Login Check */
                <form id="form_resident_login" onSubmit={handleResidentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Mobile Number
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="resident_mobile"
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Referral Code
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Key className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="resident_referral"
                        type="text"
                        required
                        placeholder="e.g. GREEN123"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm tracking-wide uppercase transition font-mono"
                      />
                    </div>
                  </div>

                  <button
                    id="btn_resident_submit"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-blue-900/10"
                  >
                    {loading ? "Verifying..." : "Access Dashboard"}
                  </button>

                  <p className="text-[10px] text-center text-gray-500 mt-2">
                    Enter the referral code shared by your Society secretary to log in.
                  </p>
                </form>
              ) : (
                /* Resident Step 2: Unregistered Resident Profile Builder */
                <form id="form_resident_register" onSubmit={handleResidentRegisterSubmit} className="space-y-4">
                  <div className="bg-blue-950/20 p-4 rounded-2xl border border-blue-900/30 mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase block">Found Society</span>
                    <h4 className="text-sm font-bold text-white">{availableSociety?.name}</h4>
                    <p className="text-xs text-gray-400 mt-0.5">{availableSociety?.address}</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Your Full Name
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="new_resident_name"
                        type="text"
                        required
                        placeholder="John Doe"
                        value={residentName}
                        onChange={(e) => setResidentName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Building Block
                      </label>
                      <select
                        id="select_building"
                        value={selectedBuilding}
                        onChange={(e) => {
                          setSelectedBuilding(e.target.value);
                          setSelectedFloor("");
                          setSelectedFlat("");
                        }}
                        className="block w-full py-2.5 px-3 bg-[#161616] border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                      >
                        {availableSociety?.buildings.map((b) => (
                          <option key={b.name} value={b.name} className="bg-[#121212]">
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Floor
                      </label>
                      <select
                        id="select_floor"
                        required
                        value={selectedFloor}
                        onChange={(e) => {
                          setSelectedFloor(e.target.value ? Number(e.target.value) : "");
                          setSelectedFlat("");
                        }}
                        className="block w-full py-2.5 px-3 bg-[#161616] border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                      >
                        <option value="" className="bg-[#121212]">Select</option>
                        {selectedBldObj?.floors.map((f) => (
                          <option key={f.number} value={f.number} className="bg-[#121212]">
                            Floor {f.number}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                        Flat Number
                      </label>
                      <select
                        id="select_flat"
                        required
                        value={selectedFlat}
                        disabled={selectedFloor === ""}
                        onChange={(e) => setSelectedFlat(e.target.value ? Number(e.target.value) : "")}
                        className="block w-full py-2.5 px-3 bg-[#161616] border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition disabled:opacity-40"
                      >
                        <option value="" className="bg-[#121212]">Select</option>
                        {selectedFlrObj?.flats.map((fl) => (
                          <option key={fl.number} value={fl.number} disabled={fl.status === "occupied"} className="bg-[#121212]">
                            {fl.number} {fl.status === "occupied" ? "(Occupied)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      id="btn_back_to_step1"
                      type="button"
                      onClick={() => setRegistrationStep(1)}
                      className="w-1/3 py-2.5 px-4 border border-gray-800 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 bg-transparent hover:bg-white/5 transition cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      id="btn_resident_register_submit"
                      type="submit"
                      disabled={loading}
                      className="w-2/3 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-blue-900/10"
                    >
                      {loading ? "Submitting..." : "Request"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ADMIN PORTAL WORKFLOW */}
          {activeTab === "admin" && (
            <form id="form_admin_auth" onSubmit={handleAdminSubmit} className="space-y-4">
              {isAdminRegister && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <UserIcon className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="admin_reg_name"
                        type="text"
                        required
                        placeholder="Secretary Aman Gupta"
                        value={adminName}
                        onChange={(e) => setAdminName(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                      Mobile Number
                    </label>
                    <div className="relative rounded-xl shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        id="admin_reg_mobile"
                        type="tel"
                        required
                        placeholder="+91 99988 87776"
                        value={adminMobile}
                        onChange={(e) => setAdminMobile(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="admin_auth_email"
                    type="email"
                    required
                    placeholder="secretary@gmail.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Password
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    id="admin_auth_password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                  />
                </div>
              </div>

              <button
                id="btn_admin_submit"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-blue-900/10"
              >
                {loading ? "Authenticating..." : isAdminRegister ? "Register Secretary Account" : "Access Admin Portal"}
              </button>

              <div className="text-center mt-3">
                <button
                  id="btn_toggle_admin_register"
                  type="button"
                  onClick={() => setIsAdminRegister(!isAdminRegister)}
                  className="text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 transition cursor-pointer"
                >
                  {isAdminRegister ? "Already registered? Login here" : "Don't have a society registered? Create account"}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[10px] font-bold tracking-widest text-gray-600 uppercase">
        &copy; 2026 SocietyHub. Robust Encryption & Strict Session Compliance.
      </div>
    </div>
  );
}
