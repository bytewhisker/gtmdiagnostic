import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  BarChart3, Users, Settings, LogOut, Search, Download,
  Calendar, ChevronDown, Save, Plus, X,
  ChevronRight, ChevronLeft, Trash2, Bell, BellOff
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { fetchSubmissions, fetchDiagnosticConfig, updateDiagnosticConfig, fetchLeads, updateLeadStatus, updateLeadNotes, updateLeadBookingStatus } from "../lib/db";
import { useNavigate } from "react-router-dom";
import { DEFAULT_STEPS, DEFAULT_P } from "../lib/constants";
import notificationSound from "../assets/notification.mp3";

// ─── ADMIN DASHBOARD COMPONENTS ───

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [submissions, setSubmissions] = useState([]);
  const [leads, setLeads] = useState([]);
  const [config, setConfig] = useState({ pillars: null, steps: null });
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeStatusLead, setActiveStatusLead] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Notification Sound — pre-create and unlock on first user interaction
  const audioRef = useRef(null);
  const audioUnlocked = useRef(false);

  useEffect(() => {
    const audio = new Audio(notificationSound);
    audio.volume = 0.5;
    audio.preload = "auto";
    audioRef.current = audio;

    // Unlock autoplay on first click anywhere — required by browsers
    const unlock = () => {
      if (audioUnlocked.current) return;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audioUnlocked.current = true;
      }).catch(() => {});
      document.removeEventListener("click", unlock);
    };
    document.addEventListener("click", unlock);
    return () => document.removeEventListener("click", unlock);
  }, []);

  const playPing = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(e => console.error("Audio play blocked:", e));
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
    }
  };

  const showPushNotification = (lead) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const isBooking = lead.is_booked;
    const name = `${lead.fname || ""} ${lead.lname || ""}`.trim() || "Someone";
    const company = lead.company ? ` · ${lead.company}` : "";
    const score = lead.total_score ? ` · Score: ${lead.total_score}/100` : "";
    new Notification(
      isBooking ? "New GTM Review Booking" : "New Lead — GTM Diagnostic",
      {
        body: isBooking
          ? `${name}${company} has booked a GTM Strategy Review${score}`
          : `${name}${company} just completed the diagnostic${score}`,
        icon: "/assets/kmglogo.png",
        badge: "/assets/kmglogo.png",
        tag: isBooking ? "gtm-booking" : "gtm-lead",   // groups same-type notifications
        renotify: true,                                  // re-alerts even if tag matches
        silent: true,                                    // we handle sound ourselves
      }
    );
  };

  useEffect(() => {
    setNotificationsEnabled("Notification" in window && Notification.permission === "granted");
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user.email !== "kmgadmingtm21@gmail.com") {
        await supabase.auth.signOut();
        navigate("/gtmlogin");
      }
    };
    checkAuth();
    loadData();

    // ── Real-Time Sync (Background Refresh) ──
    const channel = supabase
      .channel('public:gtm_leads_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gtm_leads' }, (payload) => {
        // Silent background fetch to ensure ALL stats and lists are perfectly in sync
        loadData(true);
        
        const isBooking = payload.new?.is_booked === true;
        
        // If it's a booking, and it wasn't already booked (or we don't know yet)
        const isNewBooking = payload.eventType === 'INSERT' && isBooking;
        const wasJustBooked = payload.eventType === 'UPDATE' && isBooking && payload.old?.is_booked !== true;

        if ((isNewBooking || wasJustBooked) && !muteNotifications) {
          console.log("🔥 NEW BOOKING DETECTED:", payload.new);
          setActiveToast(payload.new);
          playPing();
          showPushNotification(payload.new);
          // Auto-hide toast after 8 seconds
          setTimeout(() => setActiveToast(null), 8000);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const [subData, leadsData, confData] = await Promise.all([
      fetchSubmissions(),
      fetchLeads(),
      fetchDiagnosticConfig()
    ]);
    setSubmissions(subData || []);
    setLeads(leadsData || []);
    setConfig(confData);
    if (!silent) setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/gtmlogin");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: "var(--bg)", color: "#fff", position: "relative" }}>
      
      {/* ── REAL-TIME TOAST ALERT ── */}
      {activeToast && (
        <div style={{
          position: "fixed", top: "24px", left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, background: "#065F46", border: "1px solid #10B981", 
          borderRadius: "16px", padding: "16px 24px", color: "#fff",
          display: "flex", alignItems: "center", gap: "16px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          animation: "slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)"
        }}>
          <div style={{ fontSize: "24px" }}>🔥</div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: "800", textTransform: "uppercase", opacity: 0.8, letterSpacing: "0.05em" }}>New Booking Received!</div>
            <div style={{ fontSize: "16px", fontWeight: "700" }}>{activeToast.fname} {activeToast.lname} from {activeToast.company}</div>
          </div>
          <button 
            onClick={() => setActiveToast(null)}
            style={{ marginLeft: "12px", background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "4px 8px", borderRadius: "8px", cursor: "pointer", fontSize: "11px" }}
          >
            Dismiss
          </button>
        </div>
      )}
      {/* Global Toast Feedback */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "100px", left: "50%", transform: "translateX(-50%)",
          zIndex: 10000, background: "rgba(39,39,42,0.95)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)", borderRadius: "100px",
          padding: "10px 24px", color: "#fff", fontSize: "13px", fontWeight: "600",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)", animation: "slideInUp 0.3s ease-out"
        }}>
          {toast}
        </div>
      )}

      {/* Mobile Header - Premium Refined Version */}
      {isMobile && (
        <div style={{ 
          padding: "16px 24px", borderBottom: "1px solid var(--brd)", 
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(9,9,11,0.95)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 100, transition: "all 0.3s"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ padding: "6px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <img src="/assets/kmglogo.png" alt="KMG Logo" style={{ height: "14px", width: "auto" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontWeight: "900", fontSize: "14px", letterSpacing: "0.02em", color: "#fff", lineHeight: 1 }}>ADMIN</span>
              <span style={{ fontSize: "9px", fontWeight: "700", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>Dashboard</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!notificationsEnabled ? (
              <button 
                onClick={requestNotificationPermission}
                style={{
                  background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.2)",
                  borderRadius: "8px", padding: "8px 16px", fontSize: "11px", fontWeight: "700",
                  color: "#93C5FD", cursor: "pointer", animation: "pulse 2s infinite"
                }}
              >
                🔔 Notify Me
              </button>
            ) : (
              <button
                onClick={() => {
                  setMuteNotifications(!muteNotifications);
                  setToast(muteNotifications ? "Alerts unmuted" : "Alerts muted");
                  setTimeout(() => setToast(null), 2000);
                }}
                style={{
                  background: muteNotifications ? "rgba(255,255,255,0.03)" : "rgba(74,222,128,0.08)", 
                  border: `1px solid ${muteNotifications ? "rgba(255,255,255,0.08)" : "rgba(74,222,128,0.2)"}`,
                  color: muteNotifications ? "#63636B" : "#4ADE80",
                  cursor: "pointer", display: "flex", alignItems: "center", padding: "10px", borderRadius: "12px",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              >
                {muteNotifications ? <BellOff size={18} /> : (
                  <div style={{ position: "relative" }}>
                    <Bell size={18} />
                    <div style={{ position: "absolute", top: "-2px", right: "-2px", width: "8px", height: "8px", background: "#4ADE80", borderRadius: "50%", border: "2px solid #09090B" }} />
                  </div>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sidebar (Desktop only now) */}
      {!isMobile && (
        <div style={{ 
          width: "280px", 
          borderRight: "1px solid var(--brd)", 
          padding: "32px 24px", 
          display: "flex", 
          flexDirection: "column",
          gap: "40px",
          height: "100vh",
          position: "sticky",
          top: 0
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 10px" }}>
            <img src="/assets/kmglogo.png" alt="KMG Logo" style={{ height: "24px", width: "auto" }} />
            <span style={{ fontWeight: "700", fontSize: "16px", letterSpacing: "-0.01em" }}>KMG Admin</span>
          </div>

          <div style={{ padding: "0 10px" }}>
            {!notificationsEnabled ? (
              <button 
                onClick={requestNotificationPermission}
                style={{
                  width: "100%", padding: "12px", borderRadius: "12px", 
                  background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)",
                  color: "#93C5FD", fontSize: "13px", fontWeight: "600", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "10px", transition: "all 0.2s"
                }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(96,165,250,0.1)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(96,165,250,0.05)"}
              >
                <Bell size={18} /> Enable Notifications
              </button>
            ) : (
              <div 
                onClick={() => setMuteNotifications(!muteNotifications)}
                style={{ 
                  display: "flex", alignItems: "center", justifyContent: "space-between", 
                  padding: "12px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--brd)", cursor: "pointer", transition: "border 0.2s"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {muteNotifications ? <BellOff size={16} color="#63636B" /> : <Bell size={16} color="#4ADE80" />}
                  <span style={{ fontSize: "13px", fontWeight: "600", color: muteNotifications ? "#63636B" : "#fff" }}>
                    {muteNotifications ? "Muted" : "Live Alerts"}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px", height: "18px", borderRadius: "20px", 
                    background: muteNotifications ? "#27272A" : "rgba(74,222,128,0.2)",
                    position: "relative", transition: "background 0.3s"
                  }}>
                    <div style={{ 
                      position: "absolute", top: "3px", 
                      left: muteNotifications ? "4px" : "17px",
                      width: "12px", height: "12px", borderRadius: "50%", 
                      background: muteNotifications ? "#52525B" : "#4ADE80",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                    }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <NavBtn active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<BarChart3 size={18} />} label="Overview" />
            <NavBtn active={activeTab === "submissions"} onClick={() => setActiveTab("submissions")} icon={<Users size={18} />} label="Submissions" />
            <NavBtn active={activeTab === "questions"} onClick={() => setActiveTab("questions")} icon={<Settings size={18} />} label="Manage Questions" />
          </nav>

          <div style={{ marginTop: "auto", padding: "0 10px" }}>
            <button 
              onClick={handleLogout}
              style={{ 
                display: "flex", alignItems: "center", gap: "10px", 
                background: "none", border: "none", color: "var(--td)", 
                fontSize: "14px", fontWeight: "500", cursor: "pointer",
                transition: "color 0.2s"
              }}
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main style={{ 
        flex: 1, 
        padding: isMobile ? "24px 20px 100px 20px" : "40px 60px", 
        overflowY: "auto" 
      }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
            <div className="td"><span></span><span></span><span></span></div>
          </div>
        ) : (
          <div style={{ animation: "fadeIn 0.5s ease-out" }}>
            {activeTab === "overview" && <OverviewTab leads={leads} isMobile={isMobile} />}
            {activeTab === "submissions" && <SubmissionsTab leads={leads} setLeads={setLeads} onUpdate={() => loadData(true)} isMobile={isMobile} onOpenStatusPicker={setActiveStatusLead} config={config} />}
            {activeTab === "questions" && <QuestionsTab config={config} onUpdate={() => loadData(true)} isMobile={isMobile} />}
          </div>
        )}
      </main>

      {/* Global Status Update Modal (Mobile Bottom Sheet) */}
      {isMobile && activeStatusLead && (
        <>
          <div 
            onClick={() => setActiveStatusLead(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 10000, animation: "fadeIn 0.2s ease-out" }} 
          />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, 
            background: "#111113", borderTop: "1px solid #27272A", 
            borderTopLeftRadius: "30px", borderTopRightRadius: "30px",
            padding: "24px 24px 48px 24px", zIndex: 10001,
            animation: "slideInUp 0.3s cubic-bezier(.22,1,.36,1)",
            boxShadow: "0 -20px 60px rgba(0,0,0,0.8)"
          }}>
            <div style={{ width: "40px", height: "4px", background: "#27272A", borderRadius: "2px", margin: "0 auto 24px auto" }} />
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Lead Status</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#fff" }}>{activeStatusLead.fname} {activeStatusLead.lname}</div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {STATUS_OPTS.map(s => {
                const m = STATUS_META[s];
                const active = activeStatusLead.status === s || (!activeStatusLead.status && s === "new");
                return (
                  <button 
                    key={s} 
                    onClick={async () => {
                      const id = activeStatusLead.id;
                      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: s } : l));
                      setActiveStatusLead(null);
                      try { await updateLeadStatus(id, s); } catch(e) { console.error(e); }
                    }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "16px 20px", borderRadius: "16px", border: "1px solid #27272A",
                      background: active ? "rgba(255,255,255,0.05)" : "transparent",
                      color: active ? m.color : "#A1A1AA", fontSize: "15px", fontWeight: "600",
                      cursor: "pointer", transition: "all 0.2s"
                    }}
                  >
                    <span>{m.label}</span>
                    {active && <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: m.color, boxShadow: `0 0 10px ${m.color}` }} />}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setActiveStatusLead(null)}
              style={{ width: "100%", marginTop: "20px", padding: "16px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "none", color: "#63636B", fontWeight: "700", fontSize: "14px", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {/* Mobile Bottom Navigation (Your "Red Box" Example) */}
      {isMobile && (
        <div style={{
          position: "fixed", bottom: "20px", left: "20px", right: "20px",
          height: "64px", background: "rgba(18,18,21,0.85)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px",
          display: "flex", alignItems: "center", justifyContent: "space-around",
          zIndex: 1000, boxShadow: "0 10px 40px rgba(0,0,0,0.4)"
        }}>
          <BottomTab active={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<BarChart3 size={20} />} label="Dash" />
          <BottomTab active={activeTab === "submissions"} onClick={() => setActiveTab("submissions")} icon={<Users size={20} />} label="Leads" />
          <BottomTab active={activeTab === "questions"} onClick={() => setActiveTab("questions")} icon={<Settings size={20} />} label="Flow" />
          <BottomTab active={false} onClick={handleLogout} icon={<LogOut size={20} />} label="Exit" color="#F87171" />
        </div>
      )}
    </div>
  );
};

// ─── BOTTOM TAB COMPONENT ───
const BottomTab = ({ active, onClick, icon, label, color }) => (
  <button 
    onClick={onClick}
    style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
      background: "none", border: "none", cursor: "pointer", padding: "8px 12px",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative"
    }}
  >
    <div style={{ 
      color: active ? (color || "#fff") : "rgba(161, 161, 170, 0.5)",
      transition: "all 0.3s",
      transform: active ? "translateY(-2px) scale(1.1)" : "none"
    }}>
      {icon}
    </div>
    <span style={{ 
      fontSize: "9px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em",
      color: active ? (color || "#fff") : "rgba(161, 161, 170, 0.5)",
      transition: "all 0.3s"
    }}>
      {label}
    </span>
    {active && (
      <div style={{ 
        position: "absolute", bottom: "-4px", width: "4px", height: "4px", 
        borderRadius: "50%", background: color || "#fff", boxShadow: `0 0 10px ${color || "#fff"}`
      }} />
    )}
  </button>
);


// Define any auxiliary components used across multiple sections here
const Loader2 = ({ className, size }) => (
  <svg 
    className={className} 
    width={size} height={size} 
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: "spin 1s linear infinite" }}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </svg>
);

const NavBtn = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    style={{ 
      display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", 
      borderRadius: "12px", border: "none", width: "100%", textAlign: "left",
      fontSize: "14px", fontWeight: "600", transition: "all 0.2s", cursor: "pointer",
      background: active ? "rgba(255, 255, 255, 0.05)" : "transparent",
      color: active ? "#fff" : "var(--tm)",
      boxShadow: active ? "inset 0 0 0 1px rgba(255, 255, 255, 0.1)" : "none"
    }}
  >
    <div style={{ opacity: active ? 1 : 0.6 }}>{icon}</div>
    {label}
  </button>
);

const OverviewTab = ({ leads, isMobile }) => {
  const avgScore = leads.length ? Math.round(leads.reduce((a, b) => a + (b.total_score || 0), 0) / leads.length) : 0;
  const bookedCount = leads.filter(l => l.is_booked).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "24px" : "32px" }}>
      <div>
        <h2 style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "8px" }}>Overview</h2>
        <p style={{ color: "var(--tm)", fontSize: "14px" }}>Performance summary.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: "20px" }}>
        <StatCard label="Total Leads" value={leads.length} icon={<Users size={20} color="#fff" />} trend="+12% this week" />
        <StatCard label="Booked Reviews" value={bookedCount} icon={<Calendar size={20} color="#4ADE80" />} trend="High Intent" />
        <StatCard label="Avg. Diagnostic Score" value={`${avgScore}/100`} icon={<BarChart3 size={20} color="#fff" />} trend="Steady" />
      </div>

      <div style={{ 
        background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: "24px", padding: "32px",
        marginTop: "16px"
      }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>Recent Activity</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {leads.slice(0, 5).map((l, i) => (
            <div key={i} style={{ 
              display: "flex", alignItems: "center", gap: "16px", padding: "16px", 
              borderRadius: "16px", border: "1px solid var(--brd)", background: "rgba(255, 255, 255, 0.02)" 
            }}>
              <div style={{ 
                width: "40px", height: "40px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.05)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: "700" 
              }}>
                {l.fname?.[0] || "?"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "600", fontSize: "14px" }}>{l.fname} {l.lname}</div>
                <div style={{ color: "var(--td)", fontSize: "12px" }}>{l.company} · {new Date(l.created_at).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: "700", color: "#4ADE80", fontSize: "16px" }}>{l.total_score}</div>
                <div style={{ fontSize: "10px", color: "var(--td)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Score</div>
              </div>
            </div>
          ))}
          {!leads.length && <p style={{ color: "var(--td)", textAlign: "center", padding: "20px" }}>No submissions yet.</p>}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, icon, trend, tooltip }) => (
  <div style={{ 
    background: "linear-gradient(145deg, var(--bg2) 0%, #151518 100%)", 
    border: "1px solid var(--brd)", borderRadius: "24px", padding: "28px",
    display: "flex", flexDirection: "column", gap: "16px",
    position: "relative", overflow: "hidden"
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ 
        width: "44px", height: "44px", borderRadius: "14px", background: "rgba(255, 255, 255, 0.05)",
        display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.05)"
      }}>{icon}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span style={{ fontSize: "11px", color: "#4ADE80", fontWeight: "700", letterSpacing: "0.02em" }}>{trend}</span>
        {tooltip && <span style={{ fontSize: "9px", color: "var(--td)", textTransform: "uppercase" }}>{tooltip}</span>}
      </div>
    </div>
    <div>
      <div style={{ color: "var(--tm)", fontSize: "13px", fontWeight: "600", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "32px", fontWeight: "800", letterSpacing: "-0.02em", color: "#fff" }}>{value}</div>
    </div>
  </div>
);

// ─── SUBMISSIONS TAB HELPERS ───

const PILLAR_META = {
  positioning: { label: "Positioning" },
  website:     { label: "Website" },
  demand:      { label: "Demand Gen" },
  sales:       { label: "Sales" },
  growth:      { label: "Growth" },
};

const maturityOf = (score) => {
  if (score >= 80) return { label: "High Performing", color: "#4ADE80", bg: "rgba(74,222,128,.12)", border: "rgba(74,222,128,.25)" };
  if (score >= 60) return { label: "Growth Ready",   color: "#E4E4E7", bg: "rgba(228,228,231,.08)", border: "rgba(228,228,231,.2)" };
  if (score >= 40) return { label: "Developing",     color: "#FBBF24", bg: "rgba(251,191,36,.12)", border: "rgba(251,191,36,.25)" };
  return            { label: "Early",               color: "#F87171", bg: "rgba(248,113,113,.12)", border: "rgba(248,113,113,.25)" };
};

const accentOf = (score) => {
  if (score >= 80) return "#4ADE80";
  if (score >= 60) return "#71717A";
  if (score >= 40) return "#FBBF24";
  return "#F87171";
};

const STATUS_OPTS = ["new", "contacted", "in_conversation", "won", "lost"];
const STATUS_META = {
  new:             { label: "New",            bg: "transparent",            color: "#E4E4E7", border: "1px solid #52525B" },
  contacted:       { label: "Contacted",      bg: "rgba(96,165,250,.15)",   color: "#93C5FD", border: "1px solid rgba(96,165,250,.3)" },
  in_conversation: { label: "In Conversation",bg: "rgba(251,191,36,.15)",   color: "#FBBF24", border: "1px solid rgba(251,191,36,.3)" },
  won:             { label: "Won",            bg: "rgba(74,222,128,.15)",   color: "#4ADE80", border: "1px solid rgba(74,222,128,.3)" },
  lost:            { label: "Lost",           bg: "rgba(248,113,113,.07)", color: "#71717A", border: "1px solid rgba(248,113,113,.25)" },
};

const relativeDate = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  === 1) return "Yesterday";
  if (days  < 7)   return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const weakestPillar = (pillarScores) => {
  if (!pillarScores || !Object.keys(pillarScores).length) return null;
  const [id] = Object.entries(pillarScores).sort(([, a], [, b]) => a - b)[0];
  return PILLAR_META[id]?.label || id;
};

const startOfWeek = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7); // Monday-based
  return d;
};

// ─── TOAST ───
const Toast = ({ message, onHide }) => {
  useEffect(() => { const t = setTimeout(onHide, 2800); return () => clearTimeout(t); }, [onHide]);
  return (
    <div style={{
      position: "fixed", bottom: "32px", right: "32px", zIndex: 9999,
      background: "#18181B", border: "1px solid #27272A", borderRadius: "12px",
      padding: "12px 20px", fontSize: "13px", fontWeight: "600", color: "#E4E4E7",
      boxShadow: "0 8px 32px rgba(0,0,0,.5)", animation: "fadeIn 0.2s ease-out"
    }}>
      {message}
    </div>
  );
};

// ─── SCORE RING ───
const ScoreRing = ({ score, size = 100 }) => {
  const mt = maturityOf(score);
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#27272A" strokeWidth="6" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={mt.color} strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={mt.color} fontSize={size * 0.22} fontWeight="800" style={{ transform: `rotate(90deg) translate(0, -${size/2*2}px)` }}>
      </text>
    </svg>
  );
};

// ─── STATUS BADGE (non-interactive display for mobile cards) ───
const LeadStatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <div style={{
      padding: "4px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: "700",
      background: m.bg, color: m.color, border: m.border,
      letterSpacing: "0.03em", whiteSpace: "nowrap", textTransform: "uppercase"
    }}>
      {m.label}
    </div>
  );
};

// ─── STATUS BADGE PICKER (for desktop) ───
const StatusBadgePicker = ({ status, leadId, onUpdate, onClose }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sm = STATUS_META[status] || STATUS_META.new;

  useEffect(() => {
    const handler = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        if (onClose) onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const isMobile = window.innerWidth < 1024;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", zIndex: open ? 100 : 1 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          padding: "4px 12px", borderRadius: "100px", fontSize: "11px", fontWeight: "700",
          background: sm.bg, color: sm.color, border: sm.border,
          cursor: "pointer", letterSpacing: "0.03em", whiteSpace: "nowrap"
        }}
      >
        {sm.label}
      </button>
      {open && (
        <>
          {/* Backdrop for mobile centered menu */}
          {isMobile && (
            <div 
              style={{ 
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", 
                backdropFilter: "blur(4px)", zIndex: 10000 
              }} 
              onClick={(e) => { e.stopPropagation(); setOpen(false); if (onClose) onClose(); }}
            />
          )}

          <div style={{
            position: isMobile ? "fixed" : "absolute", 
            top: isMobile ? "50%" : "calc(100% + 6px)", 
            left: isMobile ? "50%" : 0, 
            transform: isMobile ? "translate(-50%, -50%)" : "none",
            zIndex: 10001,
            background: "#111113", border: "1px solid #27272A", borderRadius: "20px",
            padding: "8px", minWidth: isMobile ? "240px" : "160px", 
            boxShadow: "0 20px 50px rgba(0,0,0,.8)",
            animation: isMobile ? "scaleIn 0.2s ease-out" : "fadeIn 0.15s ease-out"
          }}>
            {isMobile && (
              <div style={{ 
                padding: "16px 12px 8px 12px", fontSize: "11px", fontWeight: "800", 
                color: "#52525B", textTransform: "uppercase", letterSpacing: "0.08em" 
              }}>
                Update Status
              </div>
            )}
            {STATUS_OPTS.map(s => {
              const m = STATUS_META[s];
              return (
                <button key={s} onClick={(e) => { e.stopPropagation(); onUpdate(leadId, s); setOpen(false); if (onClose) onClose(); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: isMobile ? "14px 16px" : "8px 12px", borderRadius: "12px", 
                    fontSize: isMobile ? "14px" : "12px", fontWeight: "600",
                    background: s === status ? "rgba(255,255,255,.05)" : "transparent",
                    color: m.color, border: "none", cursor: "pointer",
                    transition: "background 0.15s", marginBottom: "2px"
                  }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                  onMouseOut={e => e.currentTarget.style.background = s === status ? "rgba(255,255,255,.05)" : "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {m.label}
                    {s === status && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.color }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
      <style>{`
        @keyframes scaleIn { from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
};

// ─── DETAIL PANEL ───
const LeadDetailPanel = ({ lead, onClose, onStatusUpdate, isMobile, configSteps }) => {
  const [notes, setNotes] = useState(lead.admin_notes || "");
  const [openPillars, setOpenPillars] = useState({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(lead.booking_status || "pending");
  const debounceRef = useRef(null);
  const mt = maturityOf(lead.total_score || 0);
  const ps = lead.pillar_scores || {};
  const answers = lead.answers || {};

  const pillarsArr = Object.entries(ps).map(([id, pct]) => ({
    id, pct, ...PILLAR_META[id], label: PILLAR_META[id]?.label || id
  })).sort((a, b) => b.pct - a.pct);

  const strengths = pillarsArr.filter(p => p.pct >= 60).slice(0, 2);
  const weaknesses = pillarsArr.filter(p => p.pct < 60).slice(0, 3);

  const pillarQuestions = useMemo(() => {
    const grouped = {};
    const stepsToUse = configSteps || DEFAULT_STEPS;
    stepsToUse.filter(s => s.t === 'sc').forEach(step => {
      if (!grouped[step.p]) grouped[step.p] = [];
      grouped[step.p].push(step);
    });
    return grouped;
  }, [configSteps]);

  const saveNotes = useCallback(async (text) => {
    setSavingNotes(true);
    try { await updateLeadNotes(lead.id, text); } catch (e) { console.error(e); } finally { setSavingNotes(false); }
  }, [lead.id]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveNotes(val), 1000);
  };

  const barColor = (pct) => pct >= 70 ? "#4ADE80" : pct >= 40 ? "#71717A" : "#F87171";
  const dotColor = (v) => v === 5 ? "#4ADE80" : v === 3 ? "#FBBF24" : "#F87171";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(4px)", zIndex: 500
      }} />
      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: isMobile ? "100%" : "clamp(360px, 60%, 780px)",
        background: "#0E0E10", borderLeft: isMobile ? "none" : "1px solid #27272A",
        overflowY: "auto", zIndex: 1101, animation: isMobile ? "slideInUp 0.3s ease-out" : "slideInRight 0.28s cubic-bezier(.22,1,.36,1)"
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? "20px" : "28px 32px", borderBottom: "1px solid #27272A",
          position: "sticky", top: 0, background: "#0E0E10", zIndex: 10,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start"
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: "800", color: "#fff", letterSpacing: "-0.01em", marginBottom: "2px" }}>
              {lead.fname} {lead.lname}
            </div>
            <div style={{ fontSize: "13px", color: "#A1A1AA", marginBottom: "8px" }}>{lead.company}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
             <button onClick={onClose} style={{
              width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,.05)",
              border: "none", color: "#A1A1AA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div style={{ padding: isMobile ? "20px" : "32px", display: "flex", flexDirection: "column", gap: "32px" }}>
          
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "-12px" }}>
            <StatusBadgePicker status={lead.status || "new"} leadId={lead.id} onUpdate={onStatusUpdate} />
            {lead.email && <a href={`mailto:${lead.email}`} style={{ fontSize: "12px", color: "#4ADE80", textDecoration: "none", padding: "4px 10px", background: "rgba(74,222,128,0.05)", borderRadius: "6px" }}>{lead.email}</a>}
          </div>

          {/* S1: Score Overview */}
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "center", gap: "24px" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <ScoreRing score={lead.total_score || 0} size={isMobile ? 120 : 96} />
              <div style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isMobile ? "28px" : "22px", fontWeight: "800", color: mt.color
              }}>
                {lead.total_score || 0}
              </div>
            </div>
            <div style={{ textAlign: isMobile ? "center" : "left" }}>
              <div style={{
                display: "inline-flex", padding: "4px 14px", borderRadius: "100px",
                background: mt.bg, color: mt.color, border: `1px solid ${mt.border}`,
                fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px"
              }}>
                {mt.label}
              </div>
              <div style={{ fontSize: "13px", color: "#A1A1AA", lineHeight: "1.5", maxWidth: "320px" }}>
                {lead.total_score >= 80 ? "High-performing GTM engine. Focus on refinement and scale." :
                 lead.total_score >= 60 ? "Strong foundations with clear room to optimise key pillars." :
                 lead.total_score >= 40 ? "Structural gaps are limiting consistent pipeline generation." :
                 "Early-stage setup. Foundational GTM work needed across most pillars."}
                </div>
              </div>
            </div>


          {/* S2: Pillar Breakdown */}
          {pillarsArr.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Pillar Breakdown</div>
              {pillarsArr.map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#A1A1AA", width: "110px", flexShrink: 0 }}>{p.label}</div>
                  <div style={{ flex: 1, height: "6px", background: "#1A1A1E", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${p.pct}%`, background: barColor(p.pct), borderRadius: "3px", transition: "width 0.6s ease" }} />
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "700", color: barColor(p.pct), width: "36px", textAlign: "right" }}>{p.pct}%</div>
                </div>
              ))}
            </div>
          )}

          {/* S3: Strengths & Weaknesses */}
          {(strengths.length > 0 || weaknesses.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#4ADE80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Strengths</div>
                {strengths.map(p => (
                  <div key={p.id} style={{ padding: "12px 14px", background: "rgba(74,222,128,.06)", border: "1px solid rgba(74,222,128,.15)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#4ADE80" }}>{p.label}</div>
                    <div style={{ fontSize: "11px", color: "#A1A1AA", marginTop: "2px" }}>{p.pct}%</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "#F87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Needs Work</div>
                {weaknesses.map(p => (
                  <div key={p.id} style={{ padding: "12px 14px", background: "rgba(248,113,113,.06)", border: "1px solid rgba(248,113,113,.15)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#F87171" }}>{p.label}</div>
                    <div style={{ fontSize: "11px", color: "#A1A1AA", marginTop: "2px" }}>{p.pct}% — {
                      p.id === "positioning" ? "Clarify value proposition and ICP." :
                      p.id === "website"     ? "Audit conversion journey and CTAs." :
                      p.id === "demand"      ? "Build repeatable demand channels." :
                      p.id === "sales"       ? "Formalise process and CRM discipline." :
                                              "Establish performance tracking and funnel mapping."
                    }</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* S1b: Booking info — Enhanced Premium UI */}
          {lead.is_booked && (
            <div style={{ 
              background: "linear-gradient(135deg, rgba(96,165,250,.08) 0%, rgba(96,165,250,.02) 100%)", 
              border: "1px solid rgba(96,165,250,.25)", borderRadius: "18px", padding: "24px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              marginBottom: "32px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div style={{ 
                    width: "40px", height: "40px", borderRadius: "12px", background: "rgba(96,165,250,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(96,165,250,0.2)"
                  }}>
                    <Calendar size={18} color="#93C5FD" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", fontWeight: "800", color: "#93C5FD", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>GTM Review Requested</div>
                    
                    {/* ──── Booking Contact Info ──── */}
                    {(lead.booking_info?.name || lead.booking_info?.email || lead.booking_info?.company) && (
                      <div style={{ 
                        background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px", 
                        marginBottom: "16px", border: "1px solid rgba(255,255,255,0.05)",
                        display: "flex", flexDirection: "column", gap: "12px"
                      }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                          <div>
                            <div style={{ fontSize: "9px", fontWeight: "700", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Full Name</div>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>{lead.booking_info.name}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: "9px", fontWeight: "700", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Company</div>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff" }}>{lead.booking_info.company}</div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: "9px", fontWeight: "700", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Business Email</div>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#93C5FD" }}>{lead.booking_info.email}</div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ fontSize: "9px", fontWeight: "700", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Preferred Date & Time</div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff", letterSpacing: "-0.01em" }}>
                        {lead.booking_info?.time ? new Date(lead.booking_info.time).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" }) : "Time not set"}
                      </div>
                    </div>

                    {lead.booking_info?.message && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ fontSize: "9px", fontWeight: "700", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>Anything else</div>
                        <div style={{ 
                          fontSize: "13px", color: "rgba(161, 161, 170, 0.8)",
                          padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "10px",
                          fontStyle: "italic", border: "1px solid rgba(255,255,255,0.05)"
                        }}>
                          "{lead.booking_info.message}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const next = bookingStatus === "completed" ? "pending" : "completed";
                    setBookingStatus(next);
                    try { await updateLeadBookingStatus(lead.id, next); } catch(e) { console.error(e); }
                  }}
                  style={{
                    padding: "8px 16px", borderRadius: "10px", fontSize: "11px", fontWeight: "800", cursor: "pointer", flexShrink: 0,
                    background: bookingStatus === "completed" ? "rgba(74,222,128,.12)" : "rgba(255,255,255,.07)",
                    color: bookingStatus === "completed" ? "#4ADE80" : "#E4E4E7",
                    border: `1px solid ${bookingStatus === "completed" ? "rgba(74,222,128,.25)" : "rgba(255,255,255,.1)"}`,
                    transition: "all 0.2s"
                  }}>
                  {bookingStatus === "completed" ? "✓ Completed" : "Mark Done"}
                </button>
              </div>
            </div>
          )}

          {/* S4: Their Answers */}
          {Object.keys(pillarQuestions).length > 0 && Object.keys(answers).length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Their Answers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(pillarQuestions).map(([pid, steps]) => {
                  const isOpen = openPillars[pid];
                  const meta = PILLAR_META[pid] || {};
                  return (
                    <div key={pid} style={{ border: "1px solid #27272A", borderRadius: "12px", overflow: "hidden" }}>
                      <button onClick={() => setOpenPillars(o => ({ ...o, [pid]: !o[pid] }))}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          width: "100%", padding: "12px 16px", background: "rgba(255,255,255,.02)",
                          border: "none", color: "#E4E4E7", cursor: "pointer", fontSize: "13px", fontWeight: "600"
                        }}>
                        <span>{meta.label || pid}</span>
                        <ChevronDown size={14} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                      </button>
                      {isOpen && (
                        <div style={{ padding: "12px 16px", borderTop: "1px solid #27272A", display: "flex", flexDirection: "column", gap: "12px" }}>
                          {steps.map(step => {
                            const rawVal = answers[step.k];
                            const chosen = step.o?.find(o => o.v === rawVal);
                            return (
                              <div key={step.k}>
                                <div style={{ fontSize: "12px", color: "#A1A1AA", marginBottom: "4px", lineHeight: "1.4" }}
                                  dangerouslySetInnerHTML={{ __html: (step.m || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/{NAME}/g, "") }} />
                                {chosen && (
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor(rawVal), flexShrink: 0 }} />
                                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#E4E4E7" }}>{chosen.l}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* S5: Goals & Context */}
          <div>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>Goals & Context</div>
            {lead.goals?.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "16px" }}>
                {lead.goals.map((g, i) => (
                  <span key={i} style={{ padding: "5px 12px", background: "rgba(255,255,255,.04)", border: "1px solid #27272A", borderRadius: "100px", fontSize: "12px", color: "#A1A1AA" }}>{g}</span>
                ))}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                ["Industry",     lead.industry],
                ["Type",         lead.business_type],
                ["Stage",        lead.stage],
                ["Team Size",    lead.team_size],
                ["Revenue",      lead.revenue],
                ["Leads/Month",  lead.lead_volume],
                ["Timeline",     lead.timeline],
                ["Website",      lead.website],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>{label}</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#E4E4E7" }}>
                    {label === "Website" ? (
                      <a href={val.startsWith("http") ? val : `https://${val}`} target="_blank" rel="noreferrer"
                        style={{ color: "#4ADE80", textDecoration: "none" }}>{val}</a>
                    ) : val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* S6: Notes */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "800", color: "#63636B", textTransform: "uppercase", letterSpacing: "0.08em" }}>Admin Notes</div>
              {savingNotes && <span style={{ fontSize: "11px", color: "#63636B" }}>Saving…</span>}
            </div>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Add meeting notes, follow-up reminders, or context..."
              rows={4}
              style={{
                width: "100%", padding: "12px 14px", background: "#0A0A0C", border: "1px solid #27272A",
                borderRadius: "10px", color: "#E4E4E7", fontSize: "13px", lineHeight: "1.6",
                resize: "vertical", fontFamily: "inherit", outline: "none"
              }}
              onFocus={e => e.target.style.borderColor = "#3F3F46"}
              onBlur={e => { e.target.style.borderColor = "#27272A"; saveNotes(notes); }}
            />
          </div>

        </div>
      </div>
    </>
  );
};

// ─── SUBMISSIONS TAB ───
const SubmissionsTab = ({ leads, setLeads, onUpdate, isMobile, onOpenStatusPicker, config }) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [scoreFilter,  setScoreFilter]  = useState("all");
  const [dateFilter,   setDateFilter]   = useState("all");
  const [search,       setSearch]       = useState("");
  const [selectedLead, setSelectedLead] = useState(null);
  const [toast,        setToast]        = useState(null);
  const [currentPage,  setCurrentPage]  = useState(1);
  const pageSize = 10;

  // ── Stat cards ──
  const thisWeekStart  = startOfWeek(0);
  const lastWeekStart  = startOfWeek(-1);
  const thisWeekCount  = leads.filter(l => new Date(l.created_at) >= thisWeekStart).length;
  const lastWeekCount  = leads.filter(l => new Date(l.created_at) >= lastWeekStart && new Date(l.created_at) < thisWeekStart).length;
  const weekDelta      = thisWeekCount - lastWeekCount;
  const avgScore       = leads.length ? Math.round(leads.reduce((a, b) => a + (b.total_score || 0), 0) / leads.length) : 0;
  const pendingCount   = leads.filter(l => (l.status || "new") === "new").length;
  const bookedCount    = leads.filter(l => l.is_booked).length;

  // ── Filtered list ──
  const filtered = useMemo(() => {
    let out = [...leads];
    if (statusFilter !== "all") out = out.filter(l => (l.status || "new") === statusFilter);
    if (scoreFilter  !== "all") {
      const [lo, hi] = { "80-100": [80,100], "60-79": [60,79], "40-59": [40,59], "0-39": [0,39] }[scoreFilter] || [0,100];
      out = out.filter(l => (l.total_score || 0) >= lo && (l.total_score || 0) <= hi);
    }
    if (dateFilter !== "all") {
      const now = new Date();
      const cutoff = dateFilter === "today"     ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
                   : dateFilter === "this_week" ? startOfWeek(0)
                   : dateFilter === "this_month"? new Date(now.getFullYear(), now.getMonth(), 1)
                   : null;
      if (cutoff) out = out.filter(l => new Date(l.created_at) >= cutoff);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(l =>
        [l.fname, l.lname, l.email, l.company].some(v => (v || "").toLowerCase().includes(q))
      );
    }
    return out;
  }, [leads, statusFilter, scoreFilter, dateFilter, search]);

  // Reset to page 1 on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, scoreFilter, dateFilter, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const displayedLeads = filtered.slice(startIndex, startIndex + pageSize);

  // ── Status update ──
  const handleStatusUpdate = useCallback(async (id, status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => ({ ...prev, status }));
    try {
      await updateLeadStatus(id, status);
      setToast("Status updated");
    } catch (err) {
      console.error(err);
      onUpdate();
    }
  }, [selectedLead, setLeads, onUpdate]);

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = [
      "Date", "First Name", "Last Name", "Email", "Company", "Website", "Phone",
      "Industry", "Business Type"
    ];
    
    const rows = filtered.map(l => [
      new Date(l.created_at).toLocaleString(),
      l.fname || "",
      l.lname || "",
      l.email || "",
      l.company || "",
      l.website || "",
      l.phone || "",
      l.industry || "",
      l.business_type || ""
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

    const csv = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `GTM_Leads_Profile_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const mt = maturityOf(avgScore);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "20px" : "24px" }}>

      {/* ── Page header ── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? "16px" : "0" }}>
        <div>
          <h2 style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "4px" }}>Submissions</h2>
          <p style={{ color: "#A1A1AA", fontSize: "14px" }}>{leads.length} leads total.</p>
        </div>
        <button onClick={exportCSV} style={{
          display: "flex", alignItems: "center", gap: "8px", padding: isMobile ? "8px 16px" : "10px 20px",
          background: "rgba(255,255,255,.05)", border: "1px solid #27272A", borderRadius: "10px",
          color: "#E4E4E7", fontSize: "13px", fontWeight: "600", cursor: "pointer",
          width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "center" : "flex-start"
        }}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(5, 1fr)", gap: "12px" }}>
        {[
          { label: "Total Leads",        value: leads.length },
          { label: "This Week",          value: thisWeekCount },
          { label: "Avg Score",          value: avgScore,      color: mt.color },
          { label: "Booked",             value: bookedCount,   color: bookedCount > 0 ? "#4ADE80" : undefined },
          { label: "Pending",            value: pendingCount },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#111113", border: "1px solid #1F1F23", borderRadius: "16px", padding: isMobile ? "16px" : "20px" }}>
            <div style={{ fontSize: isMobile ? "20px" : "26px", fontWeight: "800", color: color || "#fff", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#52525B", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: "8px" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Status chips */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px", scrollbarWidth: "none" }}>
          {[["all","All"], ["new","New"], ["contacted","Cont."], ["in_conversation","Talk"], ["won","Won"]].map(([v, lbl]) => (
            <button key={v} onClick={() => setStatusFilter(v)} style={{
              padding: "6px 14px", borderRadius: "100px", fontSize: "12px", fontWeight: "600", cursor: "pointer",
              background: statusFilter === v ? "#fff" : "transparent",
              color: statusFilter === v ? "#09090B" : "#71717A",
              border: statusFilter === v ? "1px solid #fff" : "1px solid #27272A",
              transition: "all 0.15s", whiteSpace: "nowrap"
            }}>{lbl}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)} style={{
            flex: 1, padding: "8px", borderRadius: "8px", background: "#111113", border: "1px solid #27272A",
            color: "#A1A1AA", fontSize: "12px", outline: "none"
          }}>
            {[["all","Scores"],["80-100","80–100"],["60-79","60–79"],["40-59","40–59"]].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{
            flex: 1, padding: "8px", borderRadius: "8px", background: "#111113", border: "1px solid #27272A",
            color: "#A1A1AA", fontSize: "12px", outline: "none"
          }}>
            {[["all","Time"],["today","Today"],["this_week","Week"]].map(([v,l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#52525B" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..."
            style={{
              width: "100%", padding: "8px 12px 8px 34px", background: "#111113",
              border: "1px solid #27272A", borderRadius: "8px", color: "#E4E4E7",
              fontSize: "13px", outline: "none"
            }}
          />
        </div>
      </div>

      {/* ── Content ── */}
      {filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: "12px" }}>
          <div style={{ fontSize: "32px" }}>📭</div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#E4E4E7" }}>No leads yet</div>
        </div>
      ) : isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {displayedLeads.map((lead) => {
            const mt = maturityOf(lead.total_score || 0);
            return (
              <div 
                key={lead.id} 
                onClick={() => setSelectedLead(lead)}
                style={{
                  background: "#111113", border: "1px solid #1F1F23", borderRadius: "18px",
                  padding: "20px", display: "flex", flexDirection: "column", gap: "16px",
                  position: "relative", cursor: "pointer",
                  transition: "transform 0.2s"
                }}
                onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
                onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {/* Visual Accent */}
                <div style={{ 
                  position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", 
                  background: accentOf(lead.total_score) 
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <div style={{ fontWeight: "800", fontSize: "16px", color: "#fff", letterSpacing: "-0.01em" }}>
                        {lead.fname} {lead.lname}
                      </div>
                      {lead.is_booked && (
                        <div style={{ 
                          padding: "3px 8px", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)",
                          borderRadius: "6px", color: "#4ADE80", fontSize: "9px", fontWeight: "800", textTransform: "uppercase"
                        }}>
                          ✓ Booked
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: "13px", color: "#63636B", fontWeight: "500" }}>{lead.company || "No Company"}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "20px", fontWeight: "900", color: maturityOf(lead.total_score).color, lineHeight: 1 }}>{lead.total_score}</div>
                    <div style={{ fontSize: "9px", color: "#52525B", textTransform: "uppercase", fontWeight: "700", marginTop: "4px" }}>Score</div>
                  </div>
                </div>

                <div style={{ 
                  display: "flex", justifyContent: "space-between", alignItems: "center", 
                  borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "14px" 
                }}>
                  <div onClick={e => { e.stopPropagation(); onOpenStatusPicker(lead); }}>
                    <LeadStatusBadge status={lead.status || "new"} />
                  </div>
                  <div style={{ fontSize: "12px", color: "#52525B", fontWeight: "500" }}>{relativeDate(lead.created_at)}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ borderRadius: "16px", border: "1px solid #1A1A1E", background: "var(--bg2)" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,.02)", borderBottom: "1px solid #1A1A1E" }}>
                <th style={{ width: "3px", padding: 0 }} />
                <th style={tHeadStyle}>Lead</th>
                <th style={tHeadStyle}>Company</th>
                <th style={tHeadStyle}>Score</th>
                <th style={tHeadStyle}>Maturity</th>
                <th style={tHeadStyle}>Status</th>
                <th style={tHeadStyle}>Review</th>
                <th style={{ ...tHeadStyle, textAlign: "right" }}>Date</th>
                <th style={{ width: "40px" }} />
              </tr>
            </thead>
            <tbody style={{ verticalAlign: "middle" }}>
              {displayedLeads.map((lead) => {
                const score = lead.total_score || 0;
                const accent = accentOf(score);
                const mt2 = maturityOf(score);
                const wk = weakestPillar(lead.pillar_scores);
                return (
                  <tr key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    style={{ borderBottom: "1px solid #141416", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,.025)"}
                    onMouseOut={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Accent bar */}
                    <td style={{ width: "3px", padding: 0, background: accent }} />
                    {/* Lead */}
                    <td style={tCellStyle}>
                      <div style={{ fontWeight: "600", color: "#fff", fontSize: "14px" }}>{lead.fname} {lead.lname}</div>
                      <div style={{ color: "#63636B", fontSize: "12px" }}>{lead.email}</div>
                    </td>
                    {/* Company */}
                    <td style={{ ...tCellStyle, color: "#A1A1AA" }}>{lead.company || "—"}</td>
                    {/* Score */}
                    <td style={tCellStyle}>
                      <div style={{ fontSize: "18px", fontWeight: "800", color: mt2.color, lineHeight: 1 }}>{score}</div>
                      {wk && <div style={{ fontSize: "10px", color: "#52525B", marginTop: "2px" }}>{wk} weakest</div>}
                    </td>
                    {/* Maturity badge */}
                    <td style={tCellStyle}>
                      <span style={{
                        padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: "800",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        background: mt2.bg, color: mt2.color, border: `1px solid ${mt2.border}`,
                        whiteSpace: "nowrap"
                      }}>
                        {mt2.label}
                      </span>
                    </td>
                    {/* Status */}
                    <td style={tCellStyle} onClick={e => e.stopPropagation()}>
                      <StatusBadgePicker status={lead.status || "new"} leadId={lead.id} onUpdate={handleStatusUpdate} />
                    </td>
                    {/* Review booking */}
                    <td style={tCellStyle}>
                      {lead.is_booked ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "100px", fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.04em",
                          background: lead.booking_status === "completed" ? "rgba(74,222,128,.12)" : "rgba(96,165,250,.12)",
                          color: lead.booking_status === "completed" ? "#4ADE80" : "#93C5FD",
                          border: `1px solid ${lead.booking_status === "completed" ? "rgba(74,222,128,.25)" : "rgba(96,165,250,.25)"}` }}>
                          <Calendar size={9} /> {lead.booking_status === "completed" ? "Done" : "Booked"}
                        </span>
                      ) : (
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#3F3F46", textTransform: "uppercase", letterSpacing: "0.05em" }}>Not Booked</span>
                      )}
                    </td>
                    {/* Date */}
                    <td style={{ ...tCellStyle, textAlign: "right", color: "#52525B", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {relativeDate(lead.created_at)}
                    </td>
                    {/* Chevron */}
                    <td style={{ padding: "0 12px 0 0", color: "#3F3F46", textAlign: "center" }}>
                      <ChevronRight size={14} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ 
          display: "flex", alignItems: "center", justifyContent: "space-between", 
          padding: "16px 20px", background: "#111113", border: "1px solid #1A1A1E", 
          borderRadius: "14px", marginTop: "8px"
        }}>
          <div style={{ fontSize: "13px", color: "#63636B", fontWeight: "600" }}>
            Page <span style={{ color: "#fff" }}>{currentPage}</span> of {totalPages}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              disabled={currentPage === 1}
              onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                width: "40px", height: "40px", borderRadius: "10px", 
                background: "rgba(255,255,255,.05)", border: "1px solid #27272A",
                color: currentPage === 1 ? "#3F3F46" : "#fff", cursor: currentPage === 1 ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s"
              }}>
              <ChevronLeft size={18} />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              style={{
                width: "40px", height: "40px", borderRadius: "10px", 
                background: "rgba(255,255,255,.05)", border: "1px solid #27272A",
                color: currentPage === totalPages ? "#3F3F46" : "#fff", cursor: currentPage === totalPages ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s"
              }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Detail panel ── */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusUpdate={handleStatusUpdate}
          isMobile={isMobile}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onHide={() => setToast(null)} />}
    </div>
  );
};

const tHeadStyle = { padding: "16px 20px", color: "var(--td)", fontWeight: "600", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" };
const tCellStyle = { padding: "16px 20px", verticalAlign: "middle" };

const BookingsTab = ({ submissions, onUpdate }) => {
  const bookings = submissions.filter(s => s.lead_data?.is_booked);
  const [loadingId, setLoadingId] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const toggleStatus = async (id, currentStatus) => {
    setLoadingId(id);
    const sub = submissions.find(s => s.id === id);
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    const nextLeadData = { ...sub.lead_data, booking_status: nextStatus };
    try {
      const { error } = await supabase.from('submissions').update({ lead_data: nextLeadData }).eq('id', id);
      if (error) throw error;
      onUpdate();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "8px" }}>Meeting Bookings</h2>
        <p style={{ color: "var(--tm)", fontSize: "14px" }}>Intent-driven discovery call requests.</p>
      </div>

      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: "20px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "rgba(255, 255, 255, 0.03)", borderBottom: "1px solid var(--brd)" }}>
              <th style={tHeadStyle}>Lead & Company</th>
              <th style={tHeadStyle}>Requested Time</th>
              <th style={tHeadStyle}>Status</th>
              <th style={tHeadStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((s, i) => {
              const d = s.lead_data;
              const status = d.booking_status || 'pending';
              
              return (
                <tr key={i} style={{ borderBottom: "1px solid var(--brd)", background: status === 'completed' ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                  <td style={tCellStyle}>
                    <div style={{ fontWeight: "700" }}>{d.fname} {d.lname}</div>
                    <div style={{ color: "var(--tm)", fontSize: "12px" }}>{d.company} · {d.email}</div>
                  </td>
                  <td style={tCellStyle}>
                    <div style={{ fontWeight: "600", fontSize: "13px" }}>{new Date(d.booking_info?.time).toLocaleDateString()}</div>
                    <div style={{ fontSize: "12px", color: "var(--tm)" }}>at {new Date(d.booking_info?.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={tCellStyle}>
                    <StatusBadge status={status} />
                  </td>
                  <td style={tCellStyle}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button 
                        onClick={() => setSelectedBooking(s)}
                        style={{ padding: "8px 16px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--brd)", color: "#fff", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                        View Info
                      </button>
                      <button 
                        onClick={() => toggleStatus(s.id, status)}
                        disabled={loadingId === s.id}
                        style={{ 
                          padding: "8px 16px", borderRadius: "10px", 
                          background: status === 'completed' ? 'rgba(74,222,128,0.1)' : 'var(--tx)', 
                          color: status === 'completed' ? 'var(--grn)' : 'var(--bg)', 
                          fontSize: "12px", fontWeight: "800", cursor: "pointer",
                          border: status === 'completed' ? '1px solid var(--grn-br)' : 'none'
                        }}>
                        {status === 'completed' ? '✓ Completed' : 'Mark Done'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!bookings.length && <tr><td colSpan="4" style={{ padding: "40px", textAlign: "center", color: "var(--td)" }}>No bookings found.</td></tr>}
          </tbody>
        </table>
      </div>

      {selectedBooking && (
        <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  );
};

const BookingDetailModal = ({ booking, onClose }) => {
  const d = booking.lead_data;
  const b = d.booking_info || {};
  const mt = getMaturity(booking.total_score);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: "32px", width: "100%", maxWidth: "540px", padding: "40px", position: "relative", animation: "slideDown 0.3s ease-out" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "32px", right: "32px", background: "none", border: "none", color: "var(--td)", cursor: "pointer", fontSize: "14px", fontWeight: "700" }}>✕</button>
        
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "inline-flex", padding: "4px 12px", borderRadius: "100px", background: mt.b, color: mt.c, fontSize: "11px", fontWeight: "800", marginBottom: "12px", border: `1px solid ${mt.c}30` }}>
            {mt.l} · {booking.total_score}%
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", letterSpacing: "-0.01em" }}>GTM Review Request</h2>
          <p style={{ color: "var(--tm)", fontSize: "14px" }}>Submitted on {new Date(booking.created_at).toLocaleDateString()}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--brd)", borderRadius: "20px", padding: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--td)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "4px" }}>Meeting Time</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{new Date(b.time).toLocaleString([], { dateStyle: 'full', timeStyle: 'short' })}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <div style={detailLabel}>Full Name</div>
              <div style={detailValue}>{d.fname} {d.lname}</div>
            </div>
            <div>
              <div style={detailLabel}>Company</div>
              <div style={detailValue}>{d.company}</div>
            </div>
          </div>

          <div>
            <div style={detailLabel}>Contact Email</div>
            <div style={detailValue}>{d.email}</div>
          </div>

          {b.message && (
            <div>
              <div style={detailLabel}>Message / Goals</div>
              <div style={{ ...detailValue, fontStyle: "italic", lineHeight: "1.6", color: "var(--tm)" }}>"{b.message}"</div>
            </div>
          )}
        </div>
        
        <button className="pbtn" onClick={onClose} style={{ marginTop: "40px" }}>Close Information</button>
      </div>
    </div>
  );
};

const detailLabel = { fontSize: "11px", fontWeight: "800", color: "var(--td)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" };
const detailValue = { fontSize: "15px", fontWeight: "600", color: "#fff" };

const StatusBadge = ({ status }) => {
  const styles = {
    pending: { bg: "rgba(251,191,36,0.1)", col: "var(--ylw)", label: "Pending Intake" },
    completed: { bg: "rgba(74,222,128,0.1)", col: "var(--grn)", label: "Review Completed" }
  };
  const s = styles[status] || styles.pending;
  return (
    <div style={{ display: "inline-flex", padding: "5px 12px", borderRadius: "100px", background: s.bg, color: s.col, fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.02em" }}>
      {s.label}
    </div>
  );
};

const getMaturity = (s) => {
  if (s >= 80) return { l: "High Performing", c: "#4ADE80", b: "rgba(74,222,128,.1)" };
  if (s >= 60) return { l: "Growth Ready", c: "#FFF", b: "rgba(255,255,255,.1)" };
  if (s >= 40) return { l: "Developing", c: "#FBBF24", b: "rgba(251,191,36,.1)" };
  return { l: "Early", c: "#F87171", b: "rgba(248,113,113,.1)" };
};

const QuestionsTab = ({ config, onUpdate, isMobile }) => {
  const [localSteps, setLocalSteps] = useState(config.steps || DEFAULT_STEPS);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config.steps) {
      setLocalSteps(config.steps);
    } else {
      setLocalSteps(DEFAULT_STEPS);
    }
  }, [config.steps]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateDiagnosticConfig('steps', localSteps);
      onUpdate();
      alert("Questions updated successfully!");
    } catch (err) {
      alert("Failed to update: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateStep = (index, field, value) => {
    const next = [...localSteps];
    next[index] = { ...next[index], [field]: value };
    setLocalSteps(next);
  };

  const addOption = (stepIndex) => {
    const next = [...localSteps];
    if (typeof next[stepIndex].o[0] === 'string') {
      next[stepIndex].o.push("New Option");
    } else {
      next[stepIndex].o.push({ l: "New Option", v: 1 });
    }
    setLocalSteps(next);
  };

  const removeOption = (stepIndex, optIndex) => {
    const next = [...localSteps];
    next[stepIndex].o.splice(optIndex, 1);
    setLocalSteps(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div style={{ 
        display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", gap: "20px",
        background: "var(--bg2)", padding: isMobile ? "20px" : "24px 32px", borderRadius: "24px", border: "1px solid var(--brd)"
      }}>
        <div>
          <h2 style={{ fontSize: isMobile ? "20px" : "24px", fontWeight: "800", letterSpacing: "-0.02em", marginBottom: "4px" }}>Manage Questions</h2>
          <p style={{ color: "var(--tm)", fontSize: "14px" }}>Customize your diagnostic flow.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="pbtn" 
          style={{ width: isMobile ? "100%" : "auto", padding: "12px 28px", display: "flex", gap: "10px", alignItems: "center", height: "48px" }}
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          Save Configuration
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {localSteps.map((s, i) => (
          <div key={i} style={{ 
            background: "var(--bg2)", border: "1px solid var(--brd)", borderRadius: isMobile ? "24px" : "32px", padding: isMobile ? "24px" : "40px",
            display: "flex", flexDirection: "column", gap: isMobile ? "24px" : "32px",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden"
          }}>
            {/* Step Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ 
                  width: "40px", height: "40px", borderRadius: "14px", background: "var(--tx)", color: "var(--bg)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "800"
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: "var(--td)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "2px" }}>
                    {s.t === 'form' ? 'Lead Generation' : s.t === 'sc' ? 'Scoring Question' : 'Context Question'}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: "700", color: "#fff" }}>
                    {s.sec || (s.p ? `Pillar: ${s.p.charAt(0).toUpperCase() + s.p.slice(1)}` : 'Step Configuration')}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                {s.t === 'sc' && (
                  <div style={{ 
                    background: "var(--grn-bg)", color: "var(--grn)", padding: "6px 14px", 
                    borderRadius: "100px", fontSize: "12px", fontWeight: "700", border: "1px solid var(--grn-br)" 
                  }}>
                    Interactive Scoring
                  </div>
                )}
                <button 
                  onClick={() => {
                    const next = [...localSteps];
                    next.splice(i, 1);
                    setLocalSteps(next);
                  }}
                  style={{ background: "none", border: "none", color: "var(--td)", cursor: "pointer", display: "flex", padding: "8px" }}
                  title="Remove Step"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <label style={{ fontSize: "14px", fontWeight: "700", color: "var(--tm)" }}>Question or Message Content</label>
              <textarea 
                className="fi-input"
                style={{ 
                  width: "100%", background: "rgba(0,0,0,0.2)", resize: "vertical", minHeight: "100px",
                  padding: "20px", fontSize: "15px", lineHeight: "1.6", border: "1px solid var(--brd)"
                }}
                value={s.m}
                onChange={(e) => updateStep(i, 'm', e.target.value)}
                placeholder="Enter the text that appears to the user..."
              />
              <div style={{ display: "flex", gap: "16px" }}>
                <p style={{ fontSize: "12px", color: "var(--td)" }}>Use <b>{`{NAME}`}</b> to show the user's name.</p>
                <p style={{ fontSize: "12px", color: "var(--td)" }}>Use <b>**bold text**</b> for highlights.</p>
              </div>
            </div>

            {/* Options Section */}
            {s.o && (
              <div style={{ 
                background: "rgba(255,255,255,0.02)", borderRadius: "24px", padding: isMobile ? "20px" : "32px",
                border: "1px solid var(--brd)", display: "flex", flexDirection: "column", gap: "24px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>Answer Options</h4>
                    <p style={{ color: "var(--td)", fontSize: "13px" }}>Define choices and their corresponding points.</p>
                  </div>
                  <button 
                    onClick={() => addOption(i)}
                    className="pbtn"
                    style={{ 
                      width: "auto", height: "40px", fontSize: "13px", padding: "0 20px",
                      background: "rgba(255,255,255,0.05)", border: "1px solid var(--brd)", color: "#fff"
                    }}
                  >
                    <Plus size={16} /> Add Option
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {s.o.map((o, oi) => {
                    const isObj = typeof o !== 'string';
                    return (
                      <div key={oi} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div style={{ 
                          flex: 1, display: "flex", alignItems: "center", gap: "12px",
                          background: "var(--bg)", padding: "12px 16px", borderRadius: "14px",
                          border: "1px solid var(--brd)"
                        }}>
                          <span style={{ color: "var(--td)", fontSize: "12px", fontWeight: "700", minWidth: "20px" }}>{oi + 1}</span>
                          <input 
                            className="fi-input" 
                            style={{ background: "transparent", border: "none", padding: 0, fontSize: "14px", width: "100%", boxShadow: "none" }} 
                            value={isObj ? o.l : o}
                            onChange={(e) => {
                              const nextOptions = [...s.o];
                              if (isObj) nextOptions[oi] = { ...o, l: e.target.value };
                              else nextOptions[oi] = e.target.value;
                              updateStep(i, 'o', nextOptions);
                            }}
                          />
                        </div>
                        {isObj && (
                          <div style={{ 
                            width: "100px", display: "flex", alignItems: "center", gap: "8px",
                            background: "var(--bg)", padding: "12px 16px", borderRadius: "14px", border: "1px solid var(--brd)"
                          }}>
                            <span style={{ color: "var(--td)", fontSize: "10px", fontWeight: "700" }}>PTS</span>
                            <input 
                              type="number"
                              className="fi-input" 
                              style={{ background: "transparent", border: "none", padding: 0, fontSize: "14px", width: "100%", textAlign: "center", boxShadow: "none" }} 
                              value={o.v}
                              onChange={(e) => {
                                const nextOptions = [...s.o];
                                nextOptions[oi] = { ...o, v: parseInt(e.target.value) || 0 };
                                updateStep(i, 'o', nextOptions);
                              }}
                            />
                          </div>
                        )}
                        <button 
                          onClick={() => removeOption(i, oi)}
                          style={{ 
                            width: "44px", height: "44px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.05)", 
                            border: "1px solid rgba(239, 68, 68, 0.1)", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}

        <button 
          onClick={() => {
            const next = [...localSteps, { t: "sc", p: "growth", m: "New Question", sec: "🚀 Custom", o: [{ l: "Option 1", v: 5 }, { l: "Option 2", v: 0 }] }];
            setLocalSteps(next);
          }}
          style={{ 
            width: "100%", padding: "24px", borderRadius: "32px", border: "2px dashed var(--brd)",
            background: "rgba(255,255,255,0.02)", color: "var(--tm)", fontWeight: "700",
            cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px"
          }}
          onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--tm)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--brd)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        >
          <Plus size={20} /> Add Another Diagnostic Step
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
