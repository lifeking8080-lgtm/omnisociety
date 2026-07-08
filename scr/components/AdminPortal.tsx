/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Building2, Users, Briefcase, Plus, Check, X, LogOut, Key, Copy, CheckCircle, MapPin, Grid, Info, UserCheck, ShieldAlert, Trash2, UserMinus, RefreshCw } from "lucide-react";
import { User, Society, Building, JoinRequest, Worker, Query } from "../types";

interface AdminPortalProps {
  token: string;
  initialSociety: Society | null;
  onLogout: () => void;
  onSocietyCreated: (society: Society) => void;
}

export default function AdminPortal({ token, initialSociety, onLogout, onSocietyCreated }: AdminPortalProps) {
  const [society, setSociety] = useState<Society | null>(initialSociety);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [residents, setResidents] = useState<User[]>([]);
  const [queries, setQueries] = useState<Query[]>([]);
  const [activeTab, setActiveTab] = useState<"requests" | "residents" | "workers" | "map" | "queries">("requests");
  const [confirmingResidentId, setConfirmingResidentId] = useState<string | null>(null);
  const [confirmingWorkerId, setConfirmingWorkerId] = useState<string | null>(null);

  // Setup Form states (if no society yet)
  const [socName, setSocName] = useState(() => localStorage.getItem("admin_socName") || "");
  const [socAddress, setSocAddress] = useState(() => localStorage.getItem("admin_socAddress") || "");
  const [buildingsCount, setBuildingsCount] = useState(() => {
    const val = localStorage.getItem("admin_buildingsCount");
    return val ? Number(val) : 2;
  });
  const [floorsCount, setFloorsCount] = useState(() => {
    const val = localStorage.getItem("admin_floorsCount");
    return val ? Number(val) : 4;
  });
  const [flatsCount, setFlatsCount] = useState(() => {
    const val = localStorage.getItem("admin_flatsCount");
    return val ? Number(val) : 4;
  });

  const [autoRefresh, setAutoRefresh] = useState(true);

  // New Worker Form states
  const [workerName, setWorkerName] = useState("");
  const [workerRole, setWorkerRole] = useState("Security Guard");
  const [workerContact, setWorkerContact] = useState("");
  const [workerRating, setWorkerRating] = useState(5.0);

  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSocietyDetails = async () => {
    try {
      const res = await fetch("/api/societies/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        // Expected for new admin registrations before society creation
        return;
      }
      setSociety(data.society);
      setRequests(data.requests);
      setResidents(data.residents);
      setQueries(data.queries || []);
    } catch (err: any) {
      // Ignored silently for setup screen
    }
  };

  useEffect(() => {
    fetchSocietyDetails();
  }, [token]);

  // Sync setup form values to localStorage
  useEffect(() => {
    localStorage.setItem("admin_socName", socName);
  }, [socName]);

  useEffect(() => {
    localStorage.setItem("admin_socAddress", socAddress);
  }, [socAddress]);

  useEffect(() => {
    localStorage.setItem("admin_buildingsCount", String(buildingsCount));
  }, [buildingsCount]);

  useEffect(() => {
    localStorage.setItem("admin_floorsCount", String(floorsCount));
  }, [floorsCount]);

  useEffect(() => {
    localStorage.setItem("admin_flatsCount", String(flatsCount));
  }, [flatsCount]);

  // Auto-refresh society details (including pending requests & resident queries) every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchSocietyDetails();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, token]);

  const handleCreateSocietySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socName.trim() || !socAddress.trim()) {
      setError("Please fill in all society info fields.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/societies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: socName,
          address: socAddress,
          buildingsCount,
          floorsPerBuilding: floorsCount,
          flatsPerFloor: flatsCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create society");
      }

      setSociety(data.society);
      onSocietyCreated(data.society);
      setSuccess("Your society and digital building map have been created successfully!");
      // Clear localStorage draft variables
      localStorage.removeItem("admin_socName");
      localStorage.removeItem("admin_socAddress");
      localStorage.removeItem("admin_buildingsCount");
      localStorage.removeItem("admin_floorsCount");
      localStorage.removeItem("admin_flatsCount");
      fetchSocietyDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveRequest = async (requestId: string, status: "approved" | "rejected") => {
    try {
      const res = await fetch(`/api/societies/requests/${requestId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve request");
      }

      setSuccess(`Request successfully ${status}!`);
      fetchSocietyDetails();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResolveQuery = async (queryId: string) => {
    try {
      const res = await fetch(`/api/societies/queries/${queryId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resolve query");
      }

      setSuccess("Resident query marked as resolved!");
      fetchSocietyDetails();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerName.trim() || !workerContact.trim()) {
      setError("Worker name and contact are required");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/societies/workers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: workerName,
          role: workerRole,
          contact: workerContact,
          rating: workerRating,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add worker");
      }

      setSuccess("New helper registered successfully!");
      setWorkerName("");
      setWorkerContact("");
      setWorkerRating(5.0);
      fetchSocietyDetails();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveResident = async (residentId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/societies/residents/${residentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove resident");
      }

      setSuccess("Resident successfully removed and flat vacated!");
      setConfirmingResidentId(null);
      fetchSocietyDetails();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRemoveWorker = async (workerId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/societies/workers/${workerId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove helper");
      }

      setSuccess("Helper successfully removed from registry!");
      setConfirmingWorkerId(null);
      fetchSocietyDetails();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopyCode = () => {
    if (society?.referralCode) {
      navigator.clipboard.writeText(society.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper metrics computation
  const getFlatStats = () => {
    if (!society) return { total: 0, occupied: 0, vacant: 0 };
    let total = 0;
    let occupied = 0;
    society.buildings.forEach((b) => {
      b.floors.forEach((f) => {
        f.flats.forEach((fl) => {
          total++;
          if (fl.status === "occupied") occupied++;
        });
      });
    });
    return {
      total,
      occupied,
      vacant: total - occupied,
    };
  };

  const stats = getFlatStats();

  // RENDER: Setup Society View
  if (!society) {
    return (
      <div id="society_setup_container" className="min-h-screen bg-[#0A0A0A] text-gray-200 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl w-full mx-auto bg-[#121212] py-8 px-6 shadow-2xl rounded-3xl border border-gray-800 my-auto">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-950/30 mb-3">
              <Building2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight font-display uppercase">Create Society</h2>
            <p className="text-xs text-gray-400 mt-1">
              Initialize your virtual society architecture by specifying your block layout.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-950/20 border border-rose-900/50 rounded-xl text-rose-400 text-xs font-medium flex gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="form_create_society" onSubmit={handleCreateSocietySubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Society Name
              </label>
              <input
                id="create_soc_name"
                type="text"
                required
                placeholder="e.g. Green Meadows Society"
                value={socName}
                onChange={(e) => setSocName(e.target.value)}
                className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                Society Address
              </label>
              <input
                id="create_soc_address"
                type="text"
                required
                placeholder="e.g. 102, Garden Valley Highway, Sector 4"
                value={socAddress}
                onChange={(e) => setSocAddress(e.target.value)}
                className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Buildings/Blocks
                </label>
                <input
                  id="create_soc_buildings"
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={buildingsCount}
                  onChange={(e) => setBuildingsCount(Number(e.target.value))}
                  className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white text-sm transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Floors per Block
                </label>
                <input
                  id="create_soc_floors"
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={floorsCount}
                  onChange={(e) => setFloorsCount(Number(e.target.value))}
                  className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white text-sm transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                  Flats per Floor
                </label>
                <input
                  id="create_soc_flats"
                  type="number"
                  min="1"
                  max="12"
                  required
                  value={flatsCount}
                  onChange={(e) => setFlatsCount(Number(e.target.value))}
                  className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white text-sm transition"
                />
              </div>
            </div>

            <div className="bg-[#161616] p-4 border border-gray-800 rounded-2xl text-xs text-gray-400 leading-relaxed pt-3">
              <span className="font-bold text-gray-300 uppercase block mb-1">Interactive Mapping Enabled</span>
              This structure generates a live building map. Inhabitants can pick a vacant flat in this grid, and their access stays active permanently after secretary confirmation.
            </div>

            <button
              id="btn_create_society_submit"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition cursor-pointer shadow-lg shadow-blue-900/10"
            >
              {loading ? "Generating Society Map..." : "Deploy Residential Map"}
            </button>
          </form>
        </div>

        <div className="text-center text-xs text-gray-600 mt-6">
          <button id="btn_admin_setup_logout" onClick={onLogout} className="text-gray-500 hover:text-blue-400 font-bold uppercase tracking-wider transition cursor-pointer">
            Log Out Account
          </button>
        </div>
      </div>
    );
  }

  // RENDER: Standard Dashboard View
  return (
    <div id="admin_portal_view" className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans">
      
      {/* Top Secretary Navigation Bar */}
      <header className="bg-[#0D0D0D] border-b border-gray-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 font-display uppercase">
              {society.name} <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-500/20 uppercase">Secretary</span>
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 text-blue-500" /> {society.address}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Active Referral code Box */}
          <div className="bg-blue-950/20 border border-blue-900/30 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Referral Code:</span>
            <span className="text-xs font-mono font-black text-white tracking-wider">{society.referralCode}</span>
            <button
              id="btn_copy_referral"
              onClick={handleCopyCode}
              className="p-1 hover:bg-blue-900/30 rounded-lg text-blue-400 hover:text-blue-300 transition cursor-pointer"
              title="Copy referral code"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            id="btn_admin_logout"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-white hover:bg-rose-500/10 border border-rose-900/40 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {success && (
          <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
            <span>{success}</span>
          </div>
        )}

        {/* Dynamic Metric Statistics Cards */}
        <section id="society_admin_metrics" className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#121212] border border-gray-800 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Blocks</span>
            <span className="text-xl font-extrabold text-white font-display">{society.buildings.length}</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Flat Units</span>
            <span className="text-xl font-extrabold text-white font-display">{stats.total}</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Occupied Flats</span>
            <span className="text-xl font-extrabold text-rose-400 font-display">{stats.occupied}</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-4 rounded-2xl shadow-xs">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Vacant Flats</span>
            <span className="text-xl font-extrabold text-emerald-400 font-display">{stats.vacant}</span>
          </div>

          <div className="bg-[#121212] border border-gray-800 p-4 rounded-2xl shadow-xs col-span-2 md:col-span-1 border-l-4 border-l-blue-600">
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">Pending Joins</span>
            <span className="text-xl font-extrabold text-blue-400 font-display">{requests.filter(r => r.status === "pending").length}</span>
          </div>
        </section>

        {/* Tab Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 mb-6 gap-4">
          <div className="flex overflow-x-auto gap-2">
            <button
              id="tab_admin_requests"
              onClick={() => setActiveTab("requests")}
              className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 px-4 transition cursor-pointer ${
                activeTab === "requests"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Pending Joins ({requests.filter(r => r.status === "pending").length})
            </button>
            <button
              id="tab_admin_residents"
              onClick={() => setActiveTab("residents")}
              className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 px-4 transition cursor-pointer ${
                activeTab === "residents"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Residents Directory ({residents.length})
            </button>
            <button
              id="tab_admin_workers"
              onClick={() => setActiveTab("workers")}
              className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 px-4 transition cursor-pointer ${
                activeTab === "workers"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Daily Helpers ({society.workers?.length || 0})
            </button>
            <button
              id="tab_admin_map"
              onClick={() => setActiveTab("map")}
              className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 px-4 transition cursor-pointer ${
                activeTab === "map"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Building Map
            </button>
            <button
              id="tab_admin_queries"
              onClick={() => setActiveTab("queries")}
              className={`pb-3 text-xs font-bold uppercase tracking-widest border-b-2 px-4 transition cursor-pointer ${
                activeTab === "queries"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-300"
              }`}
            >
              Resident Queries ({queries.filter((q) => q.status === "pending").length})
            </button>
          </div>

          {(activeTab === "queries" || activeTab === "requests") && (
            <div className="flex items-center gap-3 self-end sm:self-auto pb-2 sm:pb-0 pr-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 select-none">
                <input
                  id="checkbox_auto_refresh"
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-800 bg-[#161616] text-blue-500 focus:ring-blue-500/20 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Auto-refresh (30s)</span>
              </label>
              {autoRefresh && (
                <span className="text-[10px] text-blue-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span>
                  Active
                </span>
              )}
            </div>
          )}
        </div>

        {/* Tab Contents */}
        
        {/* TAB 1: PENDING REQUESTS */}
        {activeTab === "requests" && (
          <section id="section_pending_requests" className="bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base font-display uppercase tracking-tight">Resident Approval Board</h3>
                <p className="text-xs text-gray-400 mt-1">Approve incoming resident requests to release their flat allocation</p>
              </div>
              <button
                id="btn_manual_refresh_pending_joins"
                onClick={async () => {
                  setLoading(true);
                  await fetchSocietyDetails();
                  setLoading(false);
                }}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#161616] border border-gray-800 hover:border-gray-700 hover:bg-white/5 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                <span>Refresh Joins</span>
              </button>
            </div>

            <div className="divide-y divide-gray-800/40">
              {requests.filter(r => r.status === "pending").length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-xs uppercase tracking-wider font-semibold leading-loose">
                  No pending resident requests at the moment.<br />Share referral code <strong className="font-mono text-blue-400 font-black bg-[#161616] border border-gray-800 px-2 py-1 rounded-md text-sm tracking-wide">{society.referralCode}</strong> to onboard residents.
                </div>
              ) : (
                requests
                  .filter(r => r.status === "pending")
                  .map((req) => (
                    <div key={req.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{req.residentName}</span>
                          <span className="bg-[#161616] text-gray-300 border border-gray-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {req.building}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Mobile: <strong className="text-gray-200">{req.mobile}</strong> &bull; Flat: <strong className="text-blue-400">{req.flat} (Floor {req.floor})</strong>
                        </div>
                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                          Submitted on {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolveRequest(req.id, "rejected")}
                          className="px-3.5 py-1.5 border border-gray-800 hover:bg-rose-500/10 text-rose-400 text-xs font-bold rounded-xl transition cursor-pointer uppercase tracking-wider"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleResolveRequest(req.id, "approved")}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-900/10 cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        )}

        {/* TAB 2: RESIDENT DIRECTORY */}
        {activeTab === "residents" && (
          <section id="section_residents_directory" className="bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800">
              <h3 className="font-bold text-white text-base font-display uppercase tracking-tight">Resident Directory</h3>
              <p className="text-xs text-gray-400 mt-1">List of verified and active residents in the society database</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/30 border-b border-gray-800 text-[10px] font-bold uppercase text-gray-500 tracking-widest">
                    <th className="py-3.5 px-5">Resident Name</th>
                    <th className="py-3.5 px-5">Mobile Contact</th>
                    <th className="py-3.5 px-5 text-center">Block</th>
                    <th className="py-3.5 px-5 text-center">Floor</th>
                    <th className="py-3.5 px-5 text-center">Flat Number</th>
                    <th className="py-3.5 px-5 text-right">Status & Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-sm">
                  {residents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 text-xs uppercase tracking-wider font-semibold">
                        No approved residents in directory yet.
                      </td>
                    </tr>
                  ) : (
                    residents.map((res) => (
                      <tr key={res.id} className="hover:bg-white/5 transition">
                        <td className="py-4 px-5 font-bold text-white">{res.name}</td>
                        <td className="py-4 px-5 text-gray-300">{res.mobile}</td>
                        <td className="py-4 px-5 text-center font-semibold text-gray-200">{res.flatInfo?.building}</td>
                        <td className="py-4 px-5 text-center text-gray-350">{res.flatInfo?.floor}</td>
                        <td className="py-4 px-5 text-center font-bold text-blue-400">{res.flatInfo?.flat}</td>
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl uppercase tracking-wider">
                              <UserCheck className="w-3.5 h-3.5" /> Approved
                            </span>
                            {confirmingResidentId === res.id ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleRemoveResident(res.id)}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-xl transition uppercase tracking-wider cursor-pointer"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setConfirmingResidentId(null)}
                                  className="px-2 py-1.5 border border-gray-800 hover:bg-white/5 text-gray-400 text-[10px] font-bold rounded-xl transition uppercase tracking-wider cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmingResidentId(res.id)}
                                className="px-2.5 py-1.5 border border-rose-900/40 hover:bg-rose-500/10 text-rose-400 text-[10px] font-bold rounded-xl transition cursor-pointer uppercase tracking-wider flex items-center gap-1"
                                title="Remove Resident"
                              >
                                <UserMinus className="w-3 h-3" /> Remove
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 3: DAILY HELPERS / WORKERS */}
        {activeTab === "workers" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            {/* Workers Directory List */}
            <div className="lg:col-span-2 bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-800">
                <h3 className="font-bold text-white text-base font-display uppercase tracking-tight">Society Helper Registry</h3>
                <p className="text-xs text-gray-400 mt-1">Daily staff allowed entry inside the gated premises</p>
              </div>

              <div className="divide-y divide-gray-800/40">
                {(!society.workers || society.workers.length === 0) ? (
                  <div className="p-12 text-center text-gray-500 text-xs uppercase tracking-wider font-semibold">
                    No helpers registered yet. Add plumbers, electricians, or guards below.
                  </div>
                ) : (
                  society.workers.map((worker) => (
                    <div key={worker.id} className="p-6 flex items-center justify-between gap-4 hover:bg-white/5 transition">
                      <div>
                        <div className="font-bold text-white text-sm">{worker.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Role: <strong className="text-gray-200">{worker.role}</strong> &bull; Phone: <strong className="text-blue-400">{worker.contact}</strong>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className="text-xs font-bold text-white bg-[#161616] border border-gray-800 px-3 py-1.5 rounded-xl">
                          &starf; {worker.rating.toFixed(1)} / 5.0
                        </span>
                        {confirmingWorkerId === worker.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleRemoveWorker(worker.id)}
                              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-xl transition uppercase tracking-wider cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmingWorkerId(null)}
                              className="px-2 py-1.5 border border-gray-800 hover:bg-white/5 text-gray-400 text-[10px] font-bold rounded-xl transition uppercase tracking-wider cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmingWorkerId(worker.id)}
                            className="p-2 border border-rose-900/40 hover:bg-rose-500/10 text-rose-400 rounded-xl transition cursor-pointer"
                            title="Remove Helper"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Worker Form */}
            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-2xl h-fit">
              <h3 className="font-bold text-white text-base mb-4 font-display uppercase tracking-tight">Onboard Helper</h3>
              
              <form id="form_add_worker" onSubmit={handleAddWorkerSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Helper Full Name
                  </label>
                  <input
                    id="worker_name_input"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Job Profile / Role
                  </label>
                  <select
                    id="worker_role_select"
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value)}
                    className="block w-full py-2.5 px-4 bg-[#161616] border border-gray-800 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                  >
                    <option value="Security Guard">Security Guard</option>
                    <option value="Electrician">Electrician</option>
                    <option value="Plumber">Plumber</option>
                    <option value="Gardener">Gardener</option>
                    <option value="Garbage Collector">Garbage Collector</option>
                    <option value="Housekeeping">Housekeeping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Contact Number
                  </label>
                  <input
                    id="worker_contact_input"
                    type="tel"
                    required
                    placeholder="+91 98765 00123"
                    value={workerContact}
                    onChange={(e) => setWorkerContact(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white placeholder-gray-650 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Initial Rating (1-5)
                  </label>
                  <input
                    id="worker_rating_input"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    required
                    value={workerRating}
                    onChange={(e) => setWorkerRating(Number(e.target.value))}
                    className="block w-full px-4 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white text-sm transition"
                  />
                </div>

                <button
                  id="btn_add_worker_submit"
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/10 transition cursor-pointer"
                >
                  Register Helper
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: BUILDING MAP */}
        {activeTab === "map" && (
          <section id="section_building_map" className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-2xl animate-fade-in">
            <div className="mb-6 border-b border-gray-800 pb-4">
              <h3 className="font-bold text-white text-base font-display uppercase tracking-tight">Digital Building Grid</h3>
              <p className="text-xs text-gray-400 mt-1">Visual representation of flat occupancies. Emerald denotes empty units, while Rose indicates occupied units.</p>
            </div>

            <div className="space-y-8">
              {society.buildings.map((building) => (
                <div key={building.name} className="border border-gray-800 rounded-2xl p-5 bg-[#161616]/30">
                  <h4 className="font-bold text-white text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Grid className="w-4 h-4 text-blue-500" />
                    {building.name} Overview
                  </h4>

                  <div className="space-y-3">
                    {/* Reverse floor ordering so floor 4 is at the top, mimicking a real building! */}
                    {[...building.floors].reverse().map((floor) => (
                      <div key={floor.number} className="flex items-center gap-4 border-b border-gray-800/40 pb-2 last:border-0 last:pb-0">
                        <span className="text-xs font-bold text-gray-400 w-16 shrink-0 uppercase tracking-wider">
                          Floor {floor.number}
                        </span>

                        <div className="grid grid-cols-2 sm:grid-cols-6 lg:grid-cols-8 gap-2.5 w-full">
                          {floor.flats.map((flat) => {
                            const isOccupied = flat.status === "occupied";
                            return (
                              <div
                                key={flat.number}
                                className={`p-2.5 rounded-xl text-center border transition relative group cursor-default ${
                                  isOccupied
                                    ? "bg-rose-950/20 border-rose-900/30 text-rose-400 hover:bg-rose-950/40"
                                    : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400 hover:bg-emerald-950/40"
                                }`}
                              >
                                <div className="text-xs font-black tracking-wide">{flat.number}</div>
                                <div className="text-[9px] font-bold uppercase tracking-widest mt-1 opacity-80">
                                  {isOccupied ? "Occupied" : "Vacant"}
                                </div>

                                {/* Tooltip on hover showing resident details */}
                                {isOccupied && flat.residentName && (
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-black border border-gray-800 text-white text-[10px] p-2.5 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition duration-200 shadow-xl z-30">
                                    <span className="font-bold block text-white">{flat.residentName}</span>
                                    <span className="text-gray-500 block mt-0.5 uppercase tracking-wider text-[8px] font-semibold">Registered Inhabitant</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 5: RESIDENT QUERIES */}
        {activeTab === "queries" && (
          <section id="section_resident_queries" className="bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-white text-base font-display uppercase tracking-tight">Resident Queries & Support</h3>
                <p className="text-xs text-gray-400 mt-1">Review, address, and resolve inquiries or maintenance issues raised by inhabitants.</p>
              </div>
              <button
                id="btn_manual_refresh_queries"
                onClick={async () => {
                  setLoading(true);
                  await fetchSocietyDetails();
                  setLoading(false);
                }}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-3.5 py-2 bg-[#161616] border border-gray-800 hover:border-gray-700 hover:bg-white/5 text-gray-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                <span>Refresh Queries</span>
              </button>
            </div>

            <div className="divide-y divide-gray-800/40">
              {queries.length === 0 ? (
                <div className="p-12 text-center text-gray-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                  No resident queries have been raised yet.
                </div>
              ) : (
                queries.map((query) => {
                  const statusLower = (query.status || "").toLowerCase();
                  let statusStyle = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                  
                  if (statusLower === "submitted") {
                    statusStyle = "bg-blue-500/10 text-blue-400 border border-blue-500/20";
                  } else if (statusLower === "received by society secretary") {
                    statusStyle = "bg-purple-500/10 text-purple-400 border border-purple-500/20";
                  } else if (statusLower === "under review") {
                    statusStyle = "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20";
                  } else if (statusLower === "assigned") {
                    statusStyle = "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
                  } else if (statusLower === "in progress") {
                    statusStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                  } else if (statusLower === "resolved" || statusLower === "resolved") {
                    statusStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                  } else if (statusLower === "closed") {
                    statusStyle = "bg-gray-500/10 text-gray-400 border border-gray-500/20";
                  } else {
                    if (statusLower === "pending") {
                      statusStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                    } else if (statusLower === "resolved") {
                      statusStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                    }
                  }

                  return (
                    <div key={query.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${
                            query.type === "Other" 
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}>
                            {query.type}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${statusStyle}`}>
                            {query.status}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                            From: {query.residentName} ({query.flatInfo})
                          </span>
                        </div>

                        {query.customText && (
                          <div className="p-4 bg-amber-500/[0.02] border border-amber-500/10 rounded-2xl max-w-2xl">
                            <p className="text-amber-100 font-handwritten text-lg tracking-wide leading-relaxed">
                              "{query.customText}"
                            </p>
                            <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-widest text-right mt-1.5">
                              Handwritten Message Ink
                            </span>
                          </div>
                        )}

                        <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                          Submitted: {new Date(query.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-gray-500">Update Status</label>
                          <select
                            value={query.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              try {
                                const res = await fetch(`/api/societies/queries/${query.id}/status`, {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: JSON.stringify({ status: newStatus }),
                                });
                                if (!res.ok) {
                                  const data = await res.json();
                                  throw new Error(data.error || "Failed to update status");
                                }
                                setSuccess(`Query status successfully shifted to ${newStatus}!`);
                                fetchSocietyDetails();
                                setTimeout(() => setSuccess(""), 4000);
                              } catch (err: any) {
                                setError(err.message);
                              }
                            }}
                            className="py-1.5 px-3 bg-[#161616] border border-gray-850 hover:border-gray-800 rounded-xl text-xs font-semibold text-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                          >
                            <option value="Submitted">Submitted</option>
                            <option value="Received by Society Secretary">Received by Society Secretary</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Assigned">Assigned</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Closed">Closed</option>
                            {/* backward compat options */}
                            {query.status === "pending" && <option value="pending">pending</option>}
                            {query.status === "resolved" && <option value="resolved">resolved</option>}
                          </select>
                        </div>

                        {statusLower !== "resolved" && statusLower !== "closed" && (
                          <button
                            onClick={() => handleResolveQuery(query.id)}
                            className="self-end px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-900/10 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer h-fit sm:mt-4"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Quick Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
