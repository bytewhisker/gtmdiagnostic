export const DEFAULT_P = [
  { id: "positioning", l: "Positioning", e: "🎯", c: "#FFFFFF" },
  { id: "website", l: "Website Performance", e: "🌐", c: "#D4D4D8" },
  { id: "demand", l: "Demand Generation", e: "📈", c: "#A1A1AA" },
  { id: "sales", l: "Sales Process", e: "🤝", c: "#E4E4E7" },
  { id: "growth", l: "Growth Readiness", e: "🚀", c: "#C4C4CC" }
];

export const DEFAULT_STEPS = [
  { t: "form", k: "lead", sec: "Let's Get Started", 
    m: "Hey! I'm the KMG Growth Diagnostic. I'll help you figure out what's working and what's not in your marketing and sales. First — who am I speaking with?", 
    btn: "Next →",
    tr: "Your details stay private. We only use this to personalise your diagnostic.",
    fields: [
      { k: "fname", label: "First Name", ph: "John", req: 1, w: "half" },
      { k: "lname", label: "Last Name", ph: "Smith", req: 1, w: "half" },
      { k: "email", label: "Business Email", ph: "john@company.com", type: "email", req: 1, w: "full" }
    ]
  },
  { t: "form", k: "biz", sec: "Business Info", 
    m: "Nice to meet you, {NAME}! Now tell us a bit about your business.", 
    btn: "Let's Go →",
    tr: "No spam, ever. Just high-value growth insights.",
    fields: [
      { k: "company", label: "Business Name", ph: "Acme Inc", req: 1, w: "full" },
      { k: "website", label: "Website", ph: "yourcompany.com", w: "full" },
      { k: "phone", label: "Phone Number", ph: "+44 7700 900000", w: "full" }
    ]
  },
  { t: "sel", k: "ind", m: "Thanks, {NAME}! Let's learn about your business. What **industry** are you in?", sec: "About Your Business", o: ["Technology / SaaS", "Professional Services", "Consulting", "Financial Services", "Healthcare / MedTech", "Manufacturing", "E-commerce / DTC", "Education / EdTech", "Legal Services", "Real Estate / PropTech", "Agency / Creative", "Other"] },
  { t: "sel", k: "bt", m: "And your **business type**?", sec: "About Your Business", o: ["B2B", "B2C", "B2B2C", "Marketplace", "Other"] },
  { t: "sel", k: "stg", m: "What **stage** is your business at, {NAME}?", sec: "About Your Business", o: ["Pre-revenue / Startup", "Early Stage (0–2 years)", "Growth Stage (2–5 years)", "Established (5+ years)", "Scaling / Series B+"] },
  { t: "sel", k: "tm", m: "How large is your **team**?", sec: "About Your Business", o: ["Solo / Founder", "2–5", "6–15", "16–50", "51–200", "200+"] },
  { t: "sel", k: "rev", m: "Approximate **monthly revenue**?", sec: "About Your Business", o: ["Pre-revenue", "£0–50K/mo", "£50K–150K/mo", "£150K–500K/mo", "£500K–1M/mo", "£1M+/mo"] },
  { t: "sc", k: "p0", p: "positioning", m: "Great context, {NAME}. Now let's assess your GTM engine. Starting with **Positioning** — is your core offer clearly defined?", sec: "🎯 Positioning", o: [{ l: "Yes — clear, tested value proposition", v: 5 }, { l: "Partially — we struggle to differentiate", v: 3 }, { l: "No — broad or unclear", v: 1 }] },
  { t: "sc", k: "p1", p: "positioning", m: "Is your messaging **differentiated** from competitors?", sec: "🎯 Positioning", o: [{ l: "Yes — distinct POV and voice", v: 5 }, { l: "Somewhat — similar to others", v: 3 }, { l: "No — we blend in", v: 1 }] },
  { t: "sc", k: "p2", p: "positioning", m: "Do you have defined **ideal customer profiles**?", sec: "🎯 Positioning", o: [{ l: "Yes — documented and used", v: 5 }, { l: "Loosely — general idea", v: 3 }, { l: "No — we sell to anyone", v: 1 }] },
  { t: "sc", k: "p3", p: "positioning", m: "Can your team consistently **explain your value**?", sec: "🎯 Positioning", o: [{ l: "Yes — everyone aligned", v: 5 }, { l: "Sometimes — varies", v: 3 }, { l: "No — inconsistent", v: 1 }] },
  { t: "sc", k: "w0", p: "website", m: "Now **Website Performance**. Is your site generating **inbound leads**?", sec: "🌐 Website", o: [{ l: "Yes — consistent flow", v: 5 }, { l: "Occasionally — a few/month", v: 3 }, { l: "No leads from website", v: 1 }] },
  { t: "sc", k: "w1", p: "website", m: "Is the **conversion journey** clear?", sec: "🌐 Website", o: [{ l: "Yes — clear CTAs and funnels", v: 5 }, { l: "Some CTAs, no structure", v: 3 }, { l: "No clear path", v: 1 }] },
  { t: "sc", k: "w2", p: "website", m: "Do you **track analytics** and conversions?", sec: "🌐 Website", o: [{ l: "Yes — monitor and optimise", v: 5 }, { l: "Have analytics, rarely check", v: 3 }, { l: "Don't track", v: 1 }] },
  { t: "sc", k: "w3", p: "website", m: "Does your site clearly **communicate what you do**?", sec: "🌐 Website", o: [{ l: "Yes — within 5 seconds", v: 5 }, { l: "Somewhat — takes digging", v: 3 }, { l: "Unclear or outdated", v: 1 }] },
  { t: "sc", k: "d0", p: "demand", m: "Moving to **Demand Generation**. Running **campaigns consistently**?", sec: "📈 Demand Gen", o: [{ l: "Yes — ongoing", v: 5 }, { l: "Occasionally — ad hoc", v: 3 }, { l: "No active campaigns", v: 1 }] },
  { t: "sc", k: "d1", p: "demand", m: "Generating **inbound demand** via content/SEO/social?", sec: "📈 Demand Gen", o: [{ l: "Yes — working channels", v: 5 }, { l: "Starting — limited", v: 3 }, { l: "No — all referrals", v: 1 }] },
  { t: "sc", k: "d2", p: "demand", m: "**Repeatable method** for filling pipeline?", sec: "📈 Demand Gen", o: [{ l: "Yes — predictable", v: 5 }, { l: "Partially — inconsistent", v: 3 }, { l: "No — unpredictable", v: 1 }] },
  { t: "sc", k: "d3", p: "demand", m: "**Investing in marketing** relative to goals?", sec: "📈 Demand Gen", o: [{ l: "Yes — budget aligned", v: 5 }, { l: "Under-investing", v: 3 }, { l: "No investment", v: 1 }] },
  { t: "sc", k: "s0", p: "sales", m: "Now **Sales Process**, {NAME}. Have a **defined sales process**?", sec: "🤝 Sales", o: [{ l: "Yes — clear stages", v: 5 }, { l: "Loosely — informal", v: 3 }, { l: "No — ad hoc", v: 1 }] },
  { t: "sc", k: "s1", p: "sales", m: "Leads **followed up within 24hrs**?", sec: "🤝 Sales", o: [{ l: "Yes — always", v: 5 }, { l: "Usually — not always", v: 3 }, { l: "No — slow", v: 1 }] },
  { t: "sc", k: "s2", p: "sales", m: "Using a **CRM**?", sec: "🤝 Sales", o: [{ l: "Yes — actively", v: 5 }, { l: "Have one, rarely use", v: 3 }, { l: "No CRM", v: 1 }] },
  { t: "sc", k: "s3", p: "sales", m: "Know your **close rate and cycle length**?", sec: "🤝 Sales", o: [{ l: "Yes — track both", v: 5 }, { l: "Roughly", v: 3 }, { l: "Don't track", v: 1 }] },
  { t: "sc", k: "g0", p: "growth", m: "Final pillar — **Growth Readiness**. **Tracking performance**?", sec: "🚀 Growth", o: [{ l: "Yes — dashboards", v: 5 }, { l: "Some — inconsistent", v: 3 }, { l: "Don't track", v: 1 }] },
  { t: "sc", k: "g1", p: "growth", m: "Know your biggest **conversion drop-offs**?", sec: "🚀 Growth", o: [{ l: "Yes — funnel mapped", v: 5 }, { l: "Suspect, unvalidated", v: 3 }, { l: "Don't know", v: 1 }] },
  { t: "sc", k: "g2", p: "growth", m: "Team **aligned on growth priorities**?", sec: "🚀 Growth", o: [{ l: "Yes — clear plan", v: 5 }, { l: "Loosely", v: 3 }, { l: "No plan", v: 1 }] },
  { t: "sc", k: "g3", p: "growth", m: "Marketing and sales **integrated or siloed**?", sec: "🚀 Growth", o: [{ l: "Integrated", v: 5 }, { l: "Loosely connected", v: 3 }, { l: "Siloed", v: 1 }] },
  { t: "multi", k: "goals", m: "Almost done, {NAME}! What are your **primary growth goals**?", s: "Select all that apply.", sec: "Goals", o: ["More inbound leads", "Better lead quality", "Better conversion", "Stronger positioning", "Launch new product", "Scale sales", "Build GTM foundations"] },
  { t: "sel", k: "ql", m: "How many **leads/month** do you currently generate?", sec: "Final Details", o: ["0–10", "10–30", "30–100", "100–300", "300+"] },
  { t: "sel", k: "qt", m: "And your **timeline** for growth?", sec: "Final Details", o: ["Immediately", "1–3 months", "3–6 months", "6–12 months", "Just exploring"] },
];
