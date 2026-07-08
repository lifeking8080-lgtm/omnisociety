/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Shield, Key, Building2, HelpCircle } from "lucide-react";
import { User, Society } from "./types";
import LoginScreen from "./components/LoginScreen";
import ManagerLogin from "./components/ManagerLogin";
import ManagerPortal from "./components/ManagerPortal";
import AdminPortal from "./components/AdminPortal";
import ResidentPortal from "./components/ResidentPortal";

export default function App() {
  const [token, setToken] = useState<string>("");
  const [role, setRole] = useState<"manager" | "admin" | "resident" | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [society, setSociety] = useState<Society | null>(null);
  const [view, setView] = useState<"standard_login" | "manager_login" | "dashboard">("standard_login");
  const [loading, setLoading] = useState<boolean>(true);

  // Check active session on initial mount
  useEffect(() => {
    const checkActiveSession = async () => {
      const savedToken = localStorage.getItem("society_auth_token");
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${savedToken}`,
          },
        });

        const data = await res.json();
        if (res.ok) {
          setToken(savedToken);
          setRole(data.role);
          setUser(data.user);
          setSociety(data.society);
          setView("dashboard");
        } else {
          // Token is invalid/expired
          localStorage.removeItem("society_auth_token");
        }
      } catch (err) {
        console.error("Session verification failed", err);
      } finally {
        setLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  const handleLoginSuccess = (newToken: string, loggedUser: User, loggedSociety: Society | null = null) => {
    localStorage.setItem("society_auth_token", newToken);
    setToken(newToken);
    setRole(loggedUser.role);
    setUser(loggedUser);
    setSociety(loggedSociety);
    setView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("society_auth_token");
    setToken("");
    setRole(null);
    setUser(null);
    setSociety(null);
    setView("standard_login");
  };

  const handleSocietyCreated = (newSociety: Society) => {
    setSociety(newSociety);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3.5 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-900/20 animate-pulse mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight font-display">SocietyHub Ecosystem</h2>
          <div className="flex items-center justify-center gap-1.5 text-gray-400 text-xs font-semibold">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            Authenticating Secure Connection...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-gray-200 font-sans">
      
      {/* Primary Dashboard / Views routing */}
      {view === "standard_login" && (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onNavigateToManager={() => setView("manager_login")}
        />
      )}

      {view === "manager_login" && (
        <ManagerLogin
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setView("standard_login")}
        />
      )}

      {view === "dashboard" && (
        <>
          {role === "manager" && (
            <ManagerPortal token={token} onLogout={handleLogout} />
          )}

          {role === "admin" && (
            <AdminPortal
              token={token}
              initialSociety={society}
              onLogout={handleLogout}
              onSocietyCreated={handleSocietyCreated}
            />
          )}

          {role === "resident" && (
            <ResidentPortal token={token} onLogout={handleLogout} />
          )}
        </>
      )}

      {/* Persistent floating manager portal shortcut (Lock/Shield)
          "The main manager link should be always visible (in a small icon or menu) so the main admin can quickly switch..."
          If already manager, they are in the portal. If other roles or logged out, this provides quick navigation to separate manager login page! */}
      {role !== "manager" && (
        <button
          id="floating_manager_toggle"
          onClick={() => {
            if (role) {
              // Log out current session to allow manager login cleanly
              localStorage.removeItem("society_auth_token");
              setToken("");
              setRole(null);
              setUser(null);
              setSociety(null);
            }
            setView("manager_login");
          }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-[#121212] hover:bg-[#161616] text-blue-400 hover:text-blue-300 p-3 sm:p-3.5 rounded-full shadow-2xl border border-gray-800 transition duration-300 group z-50 cursor-pointer flex items-center gap-2"
          title="Switch to Global Manager Portal"
        >
          <Shield className="w-5 h-5 shrink-0 animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-[9px] font-bold uppercase tracking-widest text-white whitespace-nowrap">
            Manager Access
          </span>
        </button>
      )}
    </div>
  );
}
