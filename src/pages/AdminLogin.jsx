import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Lock, Mail, Loader2, ChevronRight } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Restriction to only allow the specific admin email
      if (email !== import.meta.env.VITE_ADMIN_EMAIL) {
        await supabase.auth.signOut();
        throw new Error("You are not authorized as an admin.");
      }

      navigate("/gtmdashboard");
    } catch (err) {
      setError(err.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      background: "var(--bg)",
      position: "relative",
      padding: "20px"
    }}>
      {/* Background decoration */}
      <div style={{
        position: "absolute",
        width: "400px",
        height: "400px",
        background: "rgba(255, 255, 255, 0.03)",
        filter: "blur(100px)",
        borderRadius: "50%",
        top: "10%",
        left: "10%",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        width: "300px",
        height: "300px",
        background: "rgba(255, 255, 255, 0.02)",
        filter: "blur(80px)",
        borderRadius: "50%",
        bottom: "10%",
        right: "10%",
        zIndex: 0
      }} />

      <div style={{ 
        maxWidth: "400px", 
        width: "100%", 
        position: "relative", 
        zIndex: 1,
        animation: "fadeIn 0.6s ease-out" 
      }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ 
            width: "48px", 
            height: "48px", 
            background: "#fff", 
            color: "#000", 
            borderRadius: "12px", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: "20px", 
            fontWeight: "800",
            margin: "0 auto 16px"
          }}>K</div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#fff", letterSpacing: "-0.02em" }}>Admin Portal</h1>
          <p style={{ color: "var(--tm)", marginTop: "8px", fontSize: "14px" }}>Secure access to GTM Diagnostic dashboard</p>
        </div>

        <div style={{ 
          background: "var(--bg2)", 
          border: "1px solid var(--brd)", 
          borderRadius: "24px", 
          padding: "32px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--tm)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--td)" }} />
                <input 
                  type="email" 
                  placeholder="admin@kmg.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="fi-input"
                  style={{ paddingLeft: "44px", width: "100%" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ fontSize: "12px", fontWeight: "600", color: "var(--tm)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--td)" }} />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="fi-input"
                  style={{ paddingLeft: "44px", width: "100%" }}
                />
              </div>
            </div>

            {error && (
              <div style={{ 
                padding: "12px", 
                borderRadius: "10px", 
                background: "rgba(248, 113, 113, 0.1)", 
                border: "1px solid rgba(248, 113, 113, 0.2)", 
                color: "var(--red)", 
                fontSize: "13px",
                textAlign: "center"
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="pbtn"
              style={{ 
                marginTop: "10px", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "8px",
                height: "48px"
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  Sign In <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "32px" }}>
          <button 
            onClick={() => navigate("/")}
            style={{ 
              background: "none", 
              border: "none", 
              color: "var(--td)", 
              fontSize: "13px", 
              cursor: "pointer",
              transition: "color 0.2s"
            }}
            onMouseOver={(e) => e.target.style.color = "var(--tm)"}
            onMouseOut={(e) => e.target.style.color = "var(--td)"}
          >
            ← Back to Diagnostic
          </button>
        </div>
      </div>
    </div>
  );
}
