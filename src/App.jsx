import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DiagnosticContainer from "./components/diagnostic/DiagnosticContainer";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import { fetchDiagnosticConfig } from "./lib/db";

import { DEFAULT_P, DEFAULT_STEPS } from "./lib/constants";

export default function App() {
  const [config, setConfig] = useState({ pillars: DEFAULT_P, steps: DEFAULT_STEPS, loading: true });

  useEffect(() => {
    async function loadConfig() {
      const { pillars, steps } = await fetchDiagnosticConfig();
      setConfig({ 
        pillars: pillars || DEFAULT_P, 
        steps: steps || DEFAULT_STEPS, 
        loading: false 
      });
    }
    loadConfig();
  }, []);

  if (config.loading) {
    return (
      <div style={{ 
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", 
        background: "#09090B", position: "relative", overflow: "hidden" 
      }}>
        <style>
          {`
            @keyframes logo-pulse {
              0% { transform: scale(0.95); opacity: 0.6; }
              50% { transform: scale(1); opacity: 1; }
              100% { transform: scale(0.95); opacity: 0.6; }
            }
          `}
        </style>
        <img 
          src="/assets/kmglogo.png" 
          alt="KMG Branding" 
          style={{ 
            height: "40px", width: "auto", 
            animation: "logo-pulse 2s infinite ease-in-out" 
          }} 
        />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiagnosticContainer initialP={config.pillars} initialSteps={config.steps} />} />
        <Route path="/gtmlogin" element={<AdminLogin />} />
        <Route path="/gtmdashboard" element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
