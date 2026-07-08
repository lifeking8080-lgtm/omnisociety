/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Building2, Home, Users, Briefcase, RefreshCw, LogOut, Phone, ShieldAlert, CheckCircle, Info, Star, HelpCircle } from "lucide-react";
import { User, Society } from "../types";

interface ResidentPortalProps {
  token: string;
  onLogout: () => void;
}

export default function ResidentPortal({ token, onLogout }: ResidentPortalProps) {
  const [resident, setResident] = useState<User | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [secretary, setSecretary] = useState<{ name: string; email?: string; mobile: string; role: string } | null>(null);
  const [queries, setQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // New query form states
  const [queryType, setQueryType] = useState<string>("I need help");
  const [customText, setCustomText] = useState<string>("");
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [querySuccess, setQuerySuccess] = useState("");
  const [queryError, setQueryError] = useState("");

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/resident/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch resident dashboard");
      }
      setResident(data.user);
      setSociety(data.society);
      setSecretary(data.secretary);
      setQueries(data.queries || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  // Dynamic 30-second background auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      // Refresh silently without full-page spinner (keeps forms/navigation intact)
      fetch("/api/resident/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) setResident(data.user);
          if (data.society) setSociety(data.society);
          if (data.secretary) setSecretary(data.secretary);
          if (data.queries) setQueries(data.queries);
        })
        .catch((err) => console.error("Silent background refresh failed", err));
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryError("");
    setQuerySuccess("");
    setSubmittingQuery(true);

    try {
      const res = await fetch("/api/resident/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: queryType,
          customText: queryType === "Other" ? customText : "",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit query");
      }

      setQuerySuccess("Query successfully dispatched to the secretary!");
      setCustomText("");
      fetchDashboard();
      setTimeout(() => setQuerySuccess(""), 4000);
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setSubmittingQuery(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center font-sans">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-widest">Validating Registry...</p>
        </div>
      </div>
    );
  }

  if (!resident || !society) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4 text-center font-sans">
        <div className="max-w-md w-full bg-[#121212] p-8 shadow-2xl rounded-3xl border border-gray-800 space-y-5">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h3 className="text-lg font-bold text-white font-display uppercase tracking-tight">Record Disconnected</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            We couldn't retrieve your building or flat records. Please contact support or re-authenticate.
          </p>
          <button
            id="btn_disconnect_logout"
            onClick={onLogout}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 transition shadow-lg shadow-blue-900/10 cursor-pointer"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // PORTAL VARIANT A: Resident is PENDING APPROVAL
  if (resident.status === "pending") {
    return (
      <div id="pending_approval_screen" className="min-h-screen bg-[#0A0A0A] text-gray-200 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-md w-full mx-auto bg-[#121212] py-8 px-6 shadow-2xl rounded-3xl border border-gray-800 my-auto text-center space-y-5">
          <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
            <RefreshCw className={`w-8 h-8 ${refreshing ? "animate-spin" : ""}`} />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-black text-white font-display uppercase tracking-tight">Awaiting Approval</h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your request to join <strong className="text-blue-400 font-bold">{society.name}</strong> is currently pending verification.
            </p>
          </div>

          {/* Allocation Details Summary card */}
          <div className="bg-[#161616] border border-gray-800 p-4 rounded-2xl text-left space-y-2">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block border-b border-gray-850 pb-1.5">
              Flat Allocation Details:
            </span>
            <div className="text-xs text-gray-300 flex justify-between">
              <span className="text-gray-500">Resident Name:</span>
              <strong className="text-white font-bold">{resident.name}</strong>
            </div>
            <div className="text-xs text-gray-300 flex justify-between">
              <span className="text-gray-500">Registered Mobile:</span>
              <strong className="text-white font-mono">{resident.mobile}</strong>
            </div>
            <div className="text-xs text-gray-300 flex justify-between">
              <span className="text-gray-500">Allocated Block:</span>
              <strong className="text-white font-bold">{resident.flatInfo?.building}</strong>
            </div>
            <div className="text-xs text-gray-300 flex justify-between">
              <span className="text-gray-500">Flat Number:</span>
              <strong className="text-blue-400 font-bold">
                {resident.flatInfo?.flat} (Floor {resident.flatInfo?.floor})
              </strong>
            </div>
          </div>

          <div className="p-3 bg-blue-950/20 border border-blue-900/30 rounded-xl text-blue-400 text-[10px] leading-normal flex items-start gap-2 text-left">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <span>Once the Society Secretary approves your join request, you will automatically bypass this lock and gain access to helper contacts.</span>
          </div>

          <div className="flex gap-3">
            <button
              id="btn_pending_logout"
              onClick={onLogout}
              className="w-1/3 py-2.5 px-4 border border-gray-850 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
            >
              Sign Out
            </button>
            <button
              id="btn_pending_refresh"
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-2/3 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Checking..." : "Refresh Status"}
            </button>
          </div>
        </div>

        <div className="text-center text-[9px] uppercase tracking-widest text-gray-600">
          SocietyHub Security Core &bull; Secured State
        </div>
      </div>
    );
  }

  // PORTAL VARIANT B: Resident IS APPROVED
  return (
    <div id="resident_dashboard_view" className="min-h-screen bg-[#0A0A0A] text-gray-200 font-sans">
      
      {/* Top Header Navigation bar */}
      <header className="bg-[#0D0D0D] border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black tracking-tight text-white font-display uppercase">
              Welcome Home, {resident.name}!
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-blue-500" /> {resident.flatInfo?.building} &bull; Flat {resident.flatInfo?.flat}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-wider">Society Hub</span>
            <span className="text-xs text-blue-400 font-extrabold">{society.name}</span>
          </div>

          <button
            id="btn_resident_logout"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-rose-400 border border-rose-900/40 hover:text-white hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Banner with confirmation */}
        <div className="bg-blue-600 text-white p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="p-3 bg-white/10 rounded-xl">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight uppercase font-display">Authorized Inhabitant Profile</h2>
              <p className="text-xs text-white/80 mt-0.5">Your residency status is permanently verified by the secretary.</p>
            </div>
          </div>
          <div className="bg-black/20 border border-white/10 px-4 py-2 rounded-xl text-center shrink-0">
            <span className="text-[10px] font-bold uppercase block text-white/70 tracking-wider">Assigned Flat</span>
            <span className="text-sm font-black tracking-wide">{resident.flatInfo?.building} - {resident.flatInfo?.flat}</span>
          </div>
        </div>

        {/* Dynamic Bento Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Daily Helpers contact card directory */}
          <div className="lg:col-span-2 bg-[#121212] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base font-display uppercase tracking-tight">Gated Society Helpers</h3>
                <p className="text-xs text-gray-400 mt-1">Contact verified plumbers, electricians, or guards on-duty inside the society</p>
              </div>
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider bg-[#161616] border border-gray-850 px-3 py-1 rounded-xl">
                {society.workers?.length || 0} Listed
              </span>
            </div>

            <div className="divide-y divide-gray-800/40">
              {(!society.workers || society.workers.length === 0) ? (
                <div className="p-12 text-center text-gray-500 text-xs font-semibold uppercase tracking-wider leading-relaxed">
                  No verified helpers are registered in your society directory yet.<br />Contact your secretary to onboard service staff.
                </div>
              ) : (
                society.workers.map((worker) => (
                  <div key={worker.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{worker.name}</span>
                        <span className="bg-[#161616] text-blue-400 border border-gray-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          {worker.role}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-500" />
                        On-Call: <strong className="text-gray-200 ml-0.5 font-mono">{worker.contact}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-right">
                        <div className="text-xs font-bold text-gray-200 flex items-center gap-1 justify-end">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{worker.rating.toFixed(1)}</span>
                        </div>
                        <span className="text-[9px] text-gray-500 font-bold block mt-0.5 uppercase tracking-wider">Community Rated</span>
                      </div>

                      {/* Direct phone launch button */}
                      <a
                        href={`tel:${worker.contact}`}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-900/10 uppercase tracking-widest text-center min-w-20"
                      >
                        Call
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar Info Blocks */}
          <div className="space-y-8">
            {/* Society Admin profile info */}
            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-2xl">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2 font-display uppercase tracking-tight">
                <Users className="w-4.5 h-4.5 text-blue-500" />
                Administrative
              </h3>
              
              <div className="space-y-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  For gated inquiries, building issues, or maintenance checks, reach out to your Secretary admin.
                </p>

                <div className="bg-[#161616] p-4 border border-gray-800 rounded-2xl">
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">Society Secretary</span>
                  {secretary ? (
                    <>
                      <div className="font-bold text-white mt-1">{secretary.name}</div>
                      <div className="text-[9px] text-blue-400 font-bold uppercase tracking-wider mt-0.5">Role: {secretary.role || "Secretary"}</div>
                      {secretary.email && (
                        <div className="text-xs text-gray-400 mt-1">{secretary.email}</div>
                      )}
                      <div className="text-xs text-blue-400 font-bold mt-3 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {secretary.mobile}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1 italic">No secretary currently linked.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Raise a Query Section */}
            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="font-bold text-white text-base flex items-center gap-2 font-display uppercase tracking-tight">
                <HelpCircle className="w-4.5 h-4.5 text-blue-500" />
                Raise Query to Secretary
              </h3>

              <p className="text-xs text-gray-400 leading-relaxed">
                Need help or have an issue? Send a direct note to your society secretary.
              </p>

              {querySuccess && (
                <div className="p-3 bg-emerald-950/25 border border-emerald-900/50 rounded-xl text-emerald-400 text-xs font-semibold animate-fade-in">
                  {querySuccess}
                </div>
              )}

              {queryError && (
                <div className="p-3 bg-rose-950/25 border border-rose-900/50 rounded-xl text-rose-400 text-xs font-semibold animate-fade-in">
                  {queryError}
                </div>
              )}

              <form onSubmit={handleQuerySubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                    Query Type
                  </label>
                  <select
                    value={queryType}
                    onChange={(e) => setQueryType(e.target.value)}
                    className="block w-full px-3.5 py-2.5 bg-[#161616] border border-gray-800 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                  >
                    <option value="I need help">I need help</option>
                    <option value="I have a maintenance issue">I have a maintenance issue</option>
                    <option value="Other">Other (Custom Note)</option>
                  </select>
                </div>

                {queryType === "Other" && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Handwritten Note
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Write your custom query here..."
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      className="block w-full px-4 py-3 bg-[#161616] border border-gray-850 rounded-xl text-amber-100 font-handwritten text-lg leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500/30 placeholder-gray-650 transition tracking-wide resize-none"
                    />
                    <span className="text-[9px] text-gray-500 font-semibold block uppercase tracking-widest text-right">
                      Custom Ink Input Enabled
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingQuery}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-900/10 cursor-pointer text-center block"
                >
                  {submittingQuery ? "Transmitting..." : "Send to Secretary"}
                </button>
              </form>

              {/* Resident's Query History */}
              {queries.length > 0 && (
                <div className="pt-4 border-t border-gray-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">
                      My Submitted Notes ({queries.length})
                    </span>
                    <button
                      id="btn_manual_refresh_resident_queries"
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
                      title="Refresh query statuses manually"
                    >
                      <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                      <span>Refresh</span>
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                    {queries.map((q) => {
                      const statusLower = (q.status || "").toLowerCase();
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
                        // fallback legacy status checks
                        if (statusLower === "pending") {
                          statusStyle = "bg-amber-500/10 text-amber-400 border border-amber-500/20";
                        } else if (statusLower === "resolved") {
                          statusStyle = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                        }
                      }

                      return (
                        <div key={q.id} className="p-3 bg-[#161616] border border-gray-800/60 rounded-xl space-y-1.5 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-gray-200">{q.type}</span>
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider shrink-0 ${statusStyle}`}>
                              {q.status}
                            </span>
                          </div>
                          {q.customText && (
                            <p className="text-amber-200/90 font-handwritten text-base italic leading-snug pl-1.5 border-l border-amber-500/25 bg-amber-500/[0.02] py-0.5 rounded-r">
                              "{q.customText}"
                            </p>
                          )}
                          <span className="text-[9px] text-gray-500 block text-right">
                            {new Date(q.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Quick tips & Security parameters */}
            <div className="bg-[#121212] border border-gray-800 rounded-3xl p-6 shadow-2xl">
              <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2 font-display uppercase tracking-tight">
                <HelpCircle className="w-4.5 h-4.5 text-blue-500" />
                Advisories
              </h3>

              <ul className="text-xs text-gray-400 space-y-3 list-disc pl-4 leading-relaxed">
                <li>Never share your **Referral Code** (<strong className="font-mono text-blue-400">{society.referralCode}</strong>) with unregistered delivery agents.</li>
                <li>Verify helper entries directly using the contact logs listed in the Helpers registry.</li>
                <li>Inform the secretary immediately if you shift flats or vacancy status.</li>
              </ul>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
