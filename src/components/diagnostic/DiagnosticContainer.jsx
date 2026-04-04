import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { updateLeadBooking } from "../../lib/db";

// ─── TYPES & HELPERS ───
const getMaturity = (s) => {
  if (s >= 80) return { l: "High Performing", c: "#4ADE80", b: "rgba(74,222,128,.08)" };
  if (s >= 60) return { l: "Growth Ready", c: "#FFF", b: "rgba(255,255,255,.06)" };
  if (s >= 40) return { l: "Developing", c: "#FBBF24", b: "rgba(251,191,36,.08)" };
  return { l: "Early / Fragmented", c: "#F87171", b: "rgba(248,113,113,.08)" };
};

const R_DEFAULTS = { 
  positioning: "Clarify your value proposition and ICP. Differentiate messaging across all touchpoints.", 
  website: "Audit your conversion journey. Build clear CTAs, landing pages, and lead capture.", 
  demand: "Build repeatable demand channels. Invest in content, SEO, or paid aligned to ICP.", 
  sales: "Formalise your sales process. Implement CRM discipline, follow-up protocols, and tracking.", 
  growth: "Establish performance tracking. Map your full funnel to find and fix drop-offs." 
};

const formatMsg = (msg, uname) => {
  if (!msg) return "";
  return msg
    .replace(/<strong class=['"]uname['"]><\/strong>/g, `{NAME}`) // Handle old format if any
    .replace(/{NAME}/g, `<strong class="uname">${uname}</strong>`)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/<strong>(.*?)<\/strong>/g, '<strong>$1</strong>'); // Keep existing HTML support
};

// ─── COMPONENTS ───
const FloatingBlobs = ({ count = 6 }) => {
  const blobs = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i, size: 80 + Math.random() * 160, x: Math.random() * 100, y: Math.random() * 100,
    dur: 18 + Math.random() * 16, del: Math.random() * -16,
    col: ["#fff", "#A1A1AA", "#71717A", "#D4D4D8"][i % 4], opa: .04 + Math.random() * .04
  })), [count]);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {blobs.map(b => (
        <div key={b.id} className="blob" style={{
          width: b.size, height: b.size, left: `${b.x}%`, top: `${b.y}%`,
          background: b.col, opacity: b.opa,
          animation: `morphB ${b.dur}s ease-in-out ${b.del}s infinite, fY ${b.dur * 0.8}s ease-in-out ${b.del}s infinite`
        }} />
      ))}
    </div>
  );
};

export default function DiagnosticContainer({ initialP, initialSteps }) {
  const [phase, setPhase] = useState("land");
  const [ix, setIx] = useState(0);
  const [data, setData] = useState({});
  const [scores, setScores] = useState({});
  const [hist, setHist] = useState([]);
  const [typing, setTyping] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  const containerRef = useRef(null);

  const P = initialP || [];
  const STEPS = initialSteps || [];
  
  if (!STEPS.length) return <div>Loading diagnostic...</div>;

  const step = STEPS[ix];
  const total = STEPS.length;
  const pct = Math.round((ix / total) * 100);
  const uname = data.fname || "there";

  const saveSubmission = async (finalData, rawAnswers, pillarScores, totalScore) => {
    setIsSubmitting(true);
    try {
      const maturity = getMaturity(totalScore);
      const { data: lead, error } = await supabase
        .from('gtm_leads')
        .insert([{
          fname: finalData.fname || '',
          lname: finalData.lname || '',
          email: finalData.email || '',
          phone: finalData.phone || '',
          company: finalData.company || '',
          website: finalData.website || '',
          industry: finalData.ind || '',
          business_type: finalData.bt || '',
          stage: finalData.stg || '',
          team_size: finalData.tm || '',
          revenue: finalData.rev || '',
          answers: rawAnswers,
          pillar_scores: pillarScores,
          total_score: totalScore,
          maturity_level: maturity.l,
          goals: finalData.goals || [],
          lead_volume: finalData.ql || '',
          timeline: finalData.qt || '',
          status: 'new',
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) throw error;
      if (lead) setSubmissionId(lead.id);
      return lead?.id;
    } catch (err) {
      console.error("Error saving submission:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const next = async (k, v, isScore = false, isForm = false) => {
    const newHist = [...hist, { i: ix, k, sc: isScore, f: isForm }];
    setHist(newHist);
    
    let nextData = { ...data };
    let nextScores = { ...scores };

    if (isScore) {
      nextScores = { ...scores, [k]: v };
      setScores(nextScores);
    } else if (isForm) {
      nextData = { ...data, ...v };
      setData(nextData);
    } else {
      nextData = { ...data, [k]: v };
      setData(nextData);
    }

    if (ix + 1 < total) {
      setTyping(true);
      setTimeout(() => {
        setIx(ix + 1);
        setTyping(false);
      }, 600);
    } else {
      // Calculate final scores and save
      const finalPillarScores = calculatePillarScores(nextScores, P);
      const finalTotalScore = calculateTotalScore(finalPillarScores);
      await saveSubmission(nextData, nextScores, finalPillarScores, finalTotalScore);
      setPhase("results");
    }
  };

  const calculatePillarScores = (s, pillars) => {
    // Assuming each pillar has keys like p0, p1 etc. This depends on STEPS.
    // However, the original code had mapping based on hardcoded pillar IDs.
    // For now I'll use the original logic but make it more robust.
    const ps = {};
    pillars.forEach(p => {
      // Find all steps for this pillar and calculate score
      const pillarSteps = STEPS.filter(st => st.p === p.id);
      if (pillarSteps.length === 0) {
        ps[p.id] = 0;
        return;
      }
      const max = pillarSteps.length * 5;
      const actual = pillarSteps.reduce((sum, st) => sum + (s[st.k] || 0), 0);
      ps[p.id] = Math.round((actual / max) * 100);
    });
    return ps;
  };

  const calculateTotalScore = (pillarScoresMap) => {
    const v = Object.values(pillarScoresMap);
    if (!v.length) return 0;
    return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  };

  const skipToResults = async () => {
    const dummyData = { 
      fname: "Test", lname: "User", email: "test@example.com", 
      company: "KMG Test Corp", rev: "£500K–1M/mo", ind: "Technology / SaaS" 
    };
    const dummyScores = {};
    STEPS.forEach(s => { if (s.t === 'sc') dummyScores[s.k] = 4; });
    
    setData(dummyData);
    setScores(dummyScores);
    
    const finalPillarScores = calculatePillarScores(dummyScores, P);
    const finalTotalScore = calculateTotalScore(finalPillarScores);
    await saveSubmission(dummyData, dummyScores, finalPillarScores, finalTotalScore);
    setPhase("results");
  };

  const back = () => {
    if (hist.length === 0) return;
    const last = hist[hist.length - 1];
    setHist(hist.slice(0, -1));
    setIx(last.i);
    if (last.sc) {
      const s = { ...scores }; delete s[last.k]; setScores(s);
    } else if (last.f) {
      const d = { ...data };
      STEPS[last.i].fields.forEach(f => delete d[f.k]);
      setData(d);
    } else {
      const d = { ...data }; delete d[last.k]; setData(d);
    }
  };

  const submitForm = (e) => {
    e.preventDefault();
    const s = STEPS[ix];
    let v = true;
    let errs = {};
    const formData = {};
    s.fields.forEach(f => {
      const val = document.getElementById(`f_${f.k}`)?.value.trim();
      if (f.req && !val) { v = false; errs[f.k] = "Required"; }
      if (f.type === "email" && val && !val.includes("@")) { v = false; errs[f.k] = "Invalid email"; }
      formData[f.k] = val;
    });
    setErrors(errs);
    if (v) next(s.k, formData, false, true);
  };

  const pillarScores = useMemo(() => calculatePillarScores(scores, P), [scores, P, STEPS]);
  const totalScore = useMemo(() => calculateTotalScore(pillarScores), [pillarScores]);

  if (phase === "land") {
    return (
      <div id="land" style={{ height: "100vh", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <FloatingBlobs count={6} />
        <div style={{ position: "relative", zIndex: 10, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/assets/kmglogo.png" alt="KMG Logo" style={{ height: "32px", width: "auto" }} />
          <span style={{ fontSize: "11px", fontWeight: "500", color: "var(--td)", letterSpacing: ".05em", textTransform: "uppercase" }}>Growth Diagnostic</span>
        </div>
        <div style={{ position: "relative", zIndex: 10, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
          <div style={{ maxWidth: "600px", textAlign: "center" }}>
            <div className="fi" style={{ animationDelay: ".1s" }}><span style={{ display: "inline-block", padding: "5px 14px", borderRadius: "16px", fontSize: "11px", fontWeight: "600", letterSpacing: ".06em", textTransform: "uppercase", color: "#fff", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", marginBottom: "24px" }}>Free · 4 min · Instant Results</span></div>
            <div className="fi" style={{ animationDelay: ".2s" }}><h1 style={{ fontSize: "clamp(32px,5vw,50px)", fontWeight: "800", lineheight: "1.1", color: "#fff", marginBottom: "16px", letterSpacing: "-.03em" }}>Diagnose Your<br /><span style={{ background: "linear-gradient(135deg,#fff,#71717A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Marketing & Sales</span><br />Performance</h1></div>
            <div className="fi" style={{ animationDelay: ".35s" }}><p style={{ fontSize: "15px", lineheight: "1.6", color: "var(--tm)", maxWidth: "460px", margin: "0 auto 32px" }}>Chat with our diagnostic to assess your go-to-market, uncover gaps, and get a scored breakdown of what's holding back growth.</p></div>
            <div className="fi" style={{ animationDelay: ".5s" }}><button onClick={() => setPhase("diag")} style={{ padding: "16px 40px", fontSize: "15px", fontWeight: "700", borderRadius: "12px", background: "#fff", color: "#09090B", boxShadow: "0 4px 20px rgba(255,255,255,.06)", transition: "all .3s" }}>Start Diagnostic →</button></div>
            <div className="fi" style={{ animationDelay: ".65s", marginTop: "36px" }}><p style={{ fontSize: "11px", color: "var(--td)" }}>Chat-style · 5 pillars · Scored out of 100</p></div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "diag") {
    return (
      <div id="diag" style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
        <div className="dh">
          <div className="dht">
            <img src="/assets/kmglogo.png" alt="KMG Logo" style={{ height: "24px", width: "auto" }} />
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontSize: "11px", fontWeight: "600", color: "var(--td)" }}>{pct}%</span><span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ADE80" }}></span></div>
          </div>
          <div className="ptr"><div className="pfl" style={{ width: `${pct}%` }}></div></div>
          {step.sec && <span className="ptg">{step.sec}</span>}
        </div>
        
        <div className="db" ref={containerRef}>
          <div className="di">
            {typing ? (
              <div className="bot-r"><img src="/assets/iconlogo.png" alt="AI Agent" className="bav" style={{ background: "#000", objectFit: "contain" }} /><div className="td"><span></span><span></span><span></span></div></div>
            ) : (
              <div className="fi">
                <div style={{ marginBottom: "20px" }}>
                  <div className="bot-r">
                    <img src="/assets/iconlogo.png" alt="AI Agent" className="bav" style={{ background: "#000", objectFit: "contain" }} />
                    <div className="bmsg">
                      <span dangerouslySetInnerHTML={{ __html: formatMsg(step.m, uname) }} />
                      {step.s && <span className="sub">{step.s}</span>}
                    </div>
                  </div>
                </div>

                <div className="fi" style={{ animationDelay: ".1s" }}>
                  {step.t === "form" && (
                    <form className="ff" onSubmit={submitForm}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", width: "100%" }}>
                        {step.fields.map(f => (
                          <div className="fl" key={f.k} style={{ gridColumn: f.w === "full" ? "span 2" : "span 1" }}>
                            <label>{f.label}{!f.req && <span style={{ color: "var(--td)" }}> (optional)</span>}</label>
                            <input className={`fi-input ${errors[f.k] ? 'err' : ''}`} id={`f_${f.k}`} type={f.type || 'text'} placeholder={f.ph || ''} />
                            {errors[f.k] && <span className="err-msg">{errors[f.k]}</span>}
                          </div>
                        ))}
                      </div>
                      <button className="pbtn" type="submit" style={{ marginTop: "8px" }}>{step.btn || 'Continue →'}</button>
                      {step.tr && <p style={{ fontSize: "11px", color: "var(--td)", textAlign: "center", marginTop: "16px", fontWeight: "500" }}>{step.tr}</p>}
                    </form>
                  )}

                  {(step.t === "sel" || step.t === "sc") && (
                    <div className="oa">
                      {step.o.map((o, i) => {
                        const label = typeof o === "string" ? o : o.l;
                        const value = typeof o === "string" ? o : o.v;
                        return (
                          <button key={i} className="ob" onClick={() => next(step.k, value, step.t === "sc")}>
                            <span className="dt"></span>{label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {step.t === "multi" && (
                    <MultiChoice step={step} onConfirm={(vals) => next(step.k, vals)} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="df">
          <button className="bb" onClick={back} disabled={ix === 0}>← Back</button>
          <span className="sc-pct">{(ix + 1)} of {total}</span>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    const mt = getMaturity(totalScore);
    const wk = Object.entries(pillarScores).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([id, s]) => ({ ...P.find(p => p.id === id), score: s }));
    const str = Object.entries(pillarScores).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([id, s]) => ({ ...P.find(p => p.id === id), score: s }));
    const rcs = wk.map(w => ({ p: w.l, e: w.e, c: w.c, r: R_DEFAULTS[w.id] || "No recommendation available." }));

    const getDiagnosis = () => {
      const a = wk.map(x => x.l.toLowerCase());
      if (totalScore < 40) return `${uname}, your GTM setup is in early stages. The most significant gaps are in ${a[0]} and ${a[1]}, which are likely limiting consistent pipeline generation.`;
      if (totalScore < 60) return `${uname}, your go-to-market shows real potential, but structural gaps in ${a[0]} and ${a[1]} may be holding back conversion and growth.`;
      if (totalScore < 80) return `${uname}, you've built strong foundations. Optimising ${a[0]} and tightening ${a[1]} would move you from good to great.`;
      return `Impressive, ${uname}. Your GTM engine is performing well. Focus on ${a[0]} refinement to maintain momentum.`;
    };

    const handleBookingSubmit = async (bookingData) => {
      setIsSubmitting(true);
      try {
        if (submissionId) {
          await updateLeadBooking(submissionId, bookingData);
        }
        setBookingSuccess(true);
        setTimeout(() => setShowBooking(false), 3000);
      } catch (err) {
        console.error("Booking Error:", err);
        alert("Something went wrong saving your booking. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div id="results" style={{ 
        height: "100vh", overflowX: "hidden", overflowY: "auto", background: "var(--bg)", position: "relative",
        backfaceVisibility: "hidden", transform: "translateZ(0)", WebkitOverflowScrolling: "touch"
      }}>
        {showBooking && (
          <BookingModal 
            data={data} 
            onClose={() => setShowBooking(false)} 
            onSubmit={handleBookingSubmit}
            loading={isSubmitting}
            success={bookingSuccess}
          />
        )}
        {/* Navigation */}
        <div className="rn" style={{ 
          position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)", 
          borderBottom: "1px solid rgba(255,255,255,0.05)", transform: "translateZ(0)" 
        }}>
          <img src="/assets/kmglogo.png" alt="KMG Logo" style={{ height: "24px", width: "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--tm)", fontWeight: "600" }}>{uname}'s Diagnostic Results</span>
            <button onClick={() => location.reload()} style={{ fontSize: "11px", color: "var(--td)", background: "rgba(255,255,255,0.05)", border: "1px solid var(--brd)", padding: "4px 12px", borderRadius: "100px", cursor: "pointer" }}>Retake</button>
          </div>
        </div>

        {/* Main Split Content */}
        <div style={{ 
          maxWidth: "1280px", margin: "0 auto", padding: "60px 40px", 
          display: "grid", gridTemplateColumns: "minmax(400px, 1fr) 1.5fr", gap: "80px",
          position: "relative", zIndex: 1 
        }} className="results-grid">
          
          {/* Left Column: Score & Vision */}
          <div style={{ 
            display: "flex", flexDirection: "column", gap: "40px", position: "sticky", 
            top: "100px", height: "fit-content", transform: "translateZ(0)", backfaceVisibility: "hidden" 
          }}>
            <div className="su" style={{ animationDelay: ".1s" }}>
              <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: ".15em", textTransform: "uppercase", color: "var(--tm)", display: "block", marginBottom: "8px" }}>Overall GTM Maturity</span>
              <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#fff", marginBottom: "32px", letterSpacing: "-0.02em" }}>{data.company || uname}'s Performance</h1>
              
              <div style={{ position: "relative", display: "inline-flex", marginBottom: "24px" }}>
                <ScoreSVG score={totalScore} color={mt.c} />
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center" }}>
                  <span style={{ fontSize: "56px", fontWeight: "800", color: mt.c, lineheight: "1", letterSpacing: "-0.03em" }}>{totalScore}</span>
                  <span style={{ display: "block", fontSize: "12px", color: "var(--td)", marginTop: "-2px", fontWeight: "600" }}>PERCENT</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-start" }}>
                <span style={{ display: "inline-block", padding: "6px 16px", borderRadius: "100px", fontSize: "13px", fontWeight: "800", color: mt.c, background: mt.b, border: `1px solid ${mt.c}30` }}>
                  {mt.l}
                </span>
                <p style={{ fontSize: "15px", lineheight: "1.7", color: "var(--tm)", maxWidth: "400px", marginTop: "12px" }}>
                  {getDiagnosis()}
                </p>
              </div>
            </div>

            {/* Sticky CTA Hook */}
            <div className="su" style={{ 
              animationDelay: ".6s", 
              background: "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)", 
              borderRadius: "28px", padding: "32px", textAlign: "center", 
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
            }}>
              <h3 style={{ fontSize: "18px", fontWeight: "800", color: "#fff", marginBottom: "8px", letterSpacing: "-0.02em" }}>Ready to close the gaps?</h3>
              <p style={{ fontSize: "13px", lineheight: "1.6", color: "var(--tm)", marginBottom: "24px" }}>Book a complimentary GTM architecture review to build your roadmap.</p>
              <button 
                onClick={() => setShowBooking(true)}
                style={{ 
                  width: "100%", padding: "14px", fontSize: "14px", fontWeight: "800", borderRadius: "10px", 
                  background: "#fff", color: "#09090B", transition: "all .3s cubic-bezier(0.4, 0, 0.2, 1)",
                  cursor: "pointer"
                }} onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"} onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}>
                Book a GTM Review →
              </button>
            </div>

            {/* Diagnosis Detail Box */}
            <div className="rc su" style={{ animationDelay: ".3s", background: "rgba(255,255,255,0.02)", padding: "32px", borderRadius: "24px", border: "1px solid var(--brd)" }}>
              <div className="rt" style={{ marginBottom: "16px", fontSize: "13px", fontWeight: "800", color: "var(--td)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Market Perspective</div>
              <p style={{ fontSize: "14px", lineheight: "1.7", color: "var(--ts)" }}>
                Based on your {data.rev} revenue stage, your score of {totalScore} indicates you are {totalScore > 60 ? 'outperforming' : 'aligning with'} typical benchmarks for {data.ind} businesses.
              </p>
            </div>
          </div>

          {/* Right Column: Breakdown & Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>
            
            {/* Pillar Breakdown Section */}
            <div className="rc su" style={{ animationDelay: ".2s" }}>
              <div className="rt" style={{ marginBottom: "24px", fontSize: "14px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em" }}>Component Analysis</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {P.map((p, i) => (
                  <PillarBar key={p.id} p={p} score={pillarScores[p.id]} i={i} />
                ))}
              </div>
            </div>

            {/* Strengths & Priorities Side-by-Side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px" }}>
              <div className="su" style={{ animationDelay: ".4s", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {str.map(s => (
                  <div className="sw-card str" key={s.id} style={{ flex: "1", minWidth: "240px", padding: "24px", position: "relative" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--grn)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Core Strength</div>
                    <div>
                      <div style={{ fontSize: "16px", fontWeight: "700", color: "#fff" }}>{s.l}</div>
                      <div style={{ fontSize: "13px", color: "var(--grn)", fontWeight: "700" }}>{s.score}% Mastery</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="su" style={{ animationDelay: ".45s", display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--td)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Strategic Priorities</div>
                {rcs.map((r, i) => (
                  <div key={i} style={{ padding: "32px", borderRadius: "24px", border: "1px solid var(--brd)", background: "rgba(255,255,255,0.02)", position: "relative" }}>
                    <div style={{ fontSize: "10px", fontWeight: "800", color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>Priority {i + 1}</div>
                    <h4 style={{ fontSize: "18px", fontWeight: "700", color: "#fff", marginBottom: "12px" }}>{r.p}</h4>
                    <p style={{ fontSize: "14px", lineheight: "1.6", color: "var(--tm)", paddingLeft: "16px", borderLeft: "2px solid var(--red)" }}>{r.r}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }
}

function MultiChoice({ step, onConfirm }) {
  const [selected, setSelected] = useState([]);
  const toggle = (v) => {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  };
  return (
    <>
      <div className="oa">
        {step.o.map((o, i) => {
          const isSel = selected.includes(o);
          return (
            <button key={i} className={`ob ${isSel ? 'sel' : ''}`} onClick={() => toggle(o)}>
              <span className="ck">
                {isSel && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="#09090B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </span>
              {o}
            </button>
          )
        })}
      </div>
      <button className="cbtn" disabled={selected.length === 0} onClick={() => onConfirm(selected)}>Confirm →</button>
    </>
  );
}

function ScoreSVG({ score, color }) {
  const ci = 2 * Math.PI * 78;
  const offset = ci - (score / 100) * ci;
  const [currentOffset, setCurrentOffset] = useState(ci);

  useEffect(() => {
    setTimeout(() => setCurrentOffset(offset), 400);
  }, [offset]);

  return (
    <svg width="164" height="164" style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id="sg" x1="0%" y1="0%" x2="100%">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity=".4" />
        </linearGradient>
      </defs>
      <circle cx="82" cy="82" r="78" stroke="var(--el)" strokeWidth="6" fill="none" />
      <circle cx="82" cy="82" r="78" stroke="url(#sg)" strokeWidth="6" fill="none"
        strokeDasharray={ci} strokeDashoffset={currentOffset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 1.8s cubic-bezier(.22,1,.36,1)" }} />
    </svg>
  );
}

function PillarBar({ p, score, i }) {
  const [width, setWidth] = useState(0);
  const [vis, setVis] = useState(false);
  const isStr = score >= 70;
  const isWk = score <= 40;
  const barCol = isStr ? "var(--grn)" : isWk ? "var(--red)" : p.c;

  useEffect(() => {
    setTimeout(() => { setVis(true); setWidth(score); }, 400 + i * 150);
  }, [score, i]);

  return (
    <div style={{ opacity: vis ? 1 : 0, transform: vis ? "translateX(0)" : "translateX(-12px)", transition: "all .5s cubic-bezier(.22,1,.36,1)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
        <span style={{ fontSize: "13px", fontWeight: "500", color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}><span>{p.e}</span>{p.l}</span>
        <span style={{ fontSize: "13px", fontWeight: "700", color: barCol }}>{score}%</span>
      </div>
      <div className="bt"><div className="bf" style={{ width: `${width}%`, background: barCol }}></div></div>
    </div>
  );
}

function BookingModal({ data, onClose, onSubmit, loading, success }) {
  const [form, setForm] = useState({
    name: `${data.fname || ''} ${data.lname || ''}`.trim(),
    email: data.email || '',
    company: data.company || '',
    time: '',
    message: ''
  });

  if (success) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
        <div style={{ background: "var(--pure)", padding: "40px", borderRadius: "24px", border: "1px solid var(--brd)", textAlign: "center", maxWidth: "400px", width: "90%", animation: "slideUp 0.4s easeOut" }}>
          <div style={{ fontSize: "40px", marginBottom: "20px" }}>🎉</div>
          <h2 style={{ fontSize: "24px", fontWeight: "800", color: "#fff", marginBottom: "12px" }}>Booking Confirmed!</h2>
          <p style={{ fontSize: "14px", color: "var(--tm)", lineHeight: "1.6" }}>We've received your request for a GTM Review. We'll be in touch shortly to confirm the calendar invite.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
      <div style={{ background: "var(--pure)", padding: "32px", borderRadius: "24px", border: "1px solid var(--brd)", maxWidth: "500px", width: "95%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: "var(--td)", cursor: "pointer", fontSize: "14px" }}>✕ Close</button>
        
        <h2 style={{ fontSize: "22px", fontWeight: "800", color: "#fff", marginBottom: "8px" }}>Book Your GTM Review</h2>
        <p style={{ fontSize: "13px", color: "var(--tm)", marginBottom: "24px" }}>Select a time and confirm your details. We'll use this info to prepare for our talk.</p>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="fl">
              <label>Full Name</label>
              <input className="fi-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="fl">
              <label>Company</label>
              <input className="fi-input" value={form.company} onChange={e => setForm({...form, company: e.target.value})} required />
            </div>
          </div>
          
          <div className="fl">
            <label>Business Email</label>
            <input className="fi-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </div>

          <div className="fl">
            <label>Preferred Date & Time</label>
            <input className="fi-input" type="datetime-local" value={form.time} onChange={e => setForm({...form, time: e.target.value})} required />
          </div>

          <div className="fl">
            <label>Anything else we should know?</label>
            <textarea 
              className="fi-input" 
              style={{ minHeight: "80px", resize: "none" }} 
              value={form.message} 
              onChange={e => setForm({...form, message: e.target.value})} 
              placeholder="e.g. Specific challenges or goals..."
            />
          </div>

          <button className="pbtn" type="submit" disabled={loading}>
            {loading ? 'Confirming...' : 'Confirm Booking →'}
          </button>
        </form>
      </div>
    </div>
  );
}
