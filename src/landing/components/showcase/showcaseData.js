// Centralized dummy data for product showcase slides.
// All values use VERA domain terminology — no lorem ipsum.

export const PROJECTS = [
  { code: "EE-01", title: "SmartGrid Optimizer", score: 91.2, team: 4, badge: "top" },
  { code: "EE-02", title: "MedAlert IoT System", score: 88.7, team: 3, badge: "high" },
  { code: "EE-03", title: "EcoTrack Sensors", score: 82.1, team: 5, badge: "high" },
  { code: "EE-04", title: "AutoDrive AI", score: 79.5, team: 4, badge: "mid" },
  { code: "EE-05", title: "RoboArm Control", score: 74.3, team: 3, badge: "mid" },
  { code: "EE-06", title: "DataVault", score: 68.9, team: 4, badge: "low" },
];

export const JURORS = [
  { initials: "EA", name: "Prof. E. Aslan", affiliation: "Electrical Eng.", status: "done", color: "#3b82f6" },
  { initials: "MY", name: "Dr. M. Yilmaz", affiliation: "Computer Sci.", status: "editing", color: "#8b5cf6" },
  { initials: "SK", name: "A.Prof. S. Kaya", affiliation: "Mechanical Eng.", status: "inprogress", color: "#ec4899" },
];

export const CRITERIA = [
  { key: "technical", name: "Technical Competence", max: 30, weight: "30%", color: "#f59e0b" },
  { key: "design", name: "Written Communication", max: 30, weight: "30%", color: "#22c55e" },
  { key: "delivery", name: "Oral Presentation", max: 30, weight: "30%", color: "#3b82f6" },
  { key: "teamwork", name: "Teamwork & Collaboration", max: 10, weight: "10%", color: "#ef4444" },
];

export const OUTCOMES = [
  { code: "PO-1", pct: 84, status: "met" },
  { code: "PO-2", pct: 79, status: "met" },
  { code: "PO-3", pct: 68, status: "borderline" },
  { code: "PO-4", pct: 91, status: "met" },
  { code: "PO-5", pct: 76, status: "met" },
  { code: "PO-6", pct: 52, status: "notmet" },
];

export const PERIODS = [
  { name: "Spring 2025", status: "active" },
  { name: "Fall 2024", status: "locked" },
];

export const ACTIVITY_FEED = [
  { action: "scored EE-03", who: "Prof. E. Aslan", time: "2m ago", initials: "EA", color: "#3b82f6" },
  { action: "started session", who: "Dr. M. Yilmaz", time: "5m ago", initials: "MY", color: "#8b5cf6" },
  { action: "completed all", who: "A.Prof. S. Kaya", time: "12m ago", initials: "SK", color: "#ec4899" },
  { action: "submitted scores", who: "Dr. N. Demir", time: "18m ago", initials: "ND", color: "#14b8a6" },
];

export const SCORING_STATE = {
  project: "EE-03: EcoTrack Sensors",
  scores: [
    { key: "technical", val: 25, max: 30 },
    { key: "design", val: 22, max: 30 },
    { key: "delivery", val: 27, max: 30 },
    { key: "teamwork", val: 8, max: 10 },
  ],
  scored: 8,
  total: 24,
};

export const OUTCOME_MAPPINGS = [
  { code: "PO 1.2", criteria: ["Technical", "Written"], type: "direct" },
  { code: "PO 3.1", criteria: ["Oral"], type: "direct" },
  { code: "PO 9.1", criteria: ["Teamwork"], type: "indirect" },
];

export const HEATMAP_DATA = [
  [85, 92, 78, 88],
  [79, 84, 90, 76],
  [91, 87, 82, 70],
];

export const REVIEW_ROWS = [
  { juror: "Prof. E. Aslan", initials: "EA", color: "#3b82f6", project: "EE-01", scores: [28, 26, 27, 9], status: "done" },
  { juror: "Dr. M. Yilmaz", initials: "MY", color: "#8b5cf6", project: "EE-02", scores: [24, 25, 22, 8], status: "done" },
];

// Slide metadata — matches mockup 04-carousel-mockup.html exactly (5 slides)
export const SLIDES = [
  {
    theme: "analytics",
    color: "#60a5fa",
    eyebrow: "Analytics",
    title: "Real-Time Evaluation Analytics",
    desc: "Track scores, rankings, and programme outcomes as jurors evaluate — live KPIs, bar charts, and attainment rates at a glance.",
    features: [
      { label: "Live KPI dashboard", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
      { label: "Outcome attainment tracking", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
      { label: "Project rankings & consensus", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    ],
  },
  {
    theme: "juryflow",
    color: "#4ade80",
    eyebrow: "Jury Flow",
    title: "Structured Jury Evaluation",
    desc: "Guided scoring experience — jurors authenticate, receive criteria-based score cards, and submit with automatic save on every interaction.",
    features: [
      { label: "Step-by-step flow", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
      { label: "Criteria-based scoring", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
      { label: "Auto-save on every change", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
    ],
  },
  {
    theme: "entrycontrol",
    color: "#a78bfa",
    eyebrow: "Entry Control",
    title: "QR Access & Session Control",
    desc: "Generate time-limited QR tokens for juror access. Monitor active sessions and revoke tokens instantly.",
    features: [
      { label: "QR-based juror entry", color: "#a78bfa", bg: "rgba(139,92,246,0.12)" },
      { label: "24h time-limited tokens", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
      { label: "Live session monitoring", color: "#f472b6", bg: "rgba(236,72,153,0.12)" },
    ],
  },
  {
    theme: "criteria",
    color: "#fbbf24",
    eyebrow: "Criteria",
    title: "Evaluation Criteria & Outcome Mapping",
    desc: "Define scoring rubrics with weighted criteria and map them to programme outcomes for accreditation reporting.",
    features: [
      { label: "Rubric band configuration", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
      { label: "Direct / Indirect mapping", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
      { label: "ABET / MÜDEK alignment", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
    ],
  },
  {
    theme: "management",
    color: "#f472b6",
    eyebrow: "Management",
    title: "Jurors, Projects & Evaluation Periods",
    desc: "Full roster management — add jurors, organize project groups, and control evaluation period lifecycle.",
    features: [
      { label: "Juror roster & status", color: "#f472b6", bg: "rgba(236,72,153,0.12)" },
      { label: "Project group management", color: "#60a5fa", bg: "rgba(59,130,246,0.12)" },
      { label: "Period lifecycle control", color: "#4ade80", bg: "rgba(34,197,94,0.12)" },
    ],
  },
];
