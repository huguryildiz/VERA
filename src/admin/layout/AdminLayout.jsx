// src/admin/layout/AdminLayout.jsx — Phase 2
// Wires useAuth + useAdminData. Renders OverviewPage when adminTab === "overview".
// Period dropdown in AdminHeader is now fully live.
import { useRef, useMemo, useState } from "react";
import { useAuth } from "../../shared/auth";
import { useAdminTabs } from "../hooks/useAdminTabs";
import { useAdminData } from "../hooks/useAdminData";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import OverviewPage from "../OverviewPage";
import RankingsPage from "../RankingsPage";
import AnalyticsPage from "../AnalyticsPage";
import HeatmapPage from "../HeatmapPage";
import ReviewsPage from "../ReviewsPage";
import JurorsPage from "../pages/JurorsPage";
import ProjectsPage from "../pages/ProjectsPage";
import PeriodsPage from "../pages/PeriodsPage";

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export default function AdminLayout() {
  const settingsDirtyRef = useRef(false);
  const { adminTab, setAdminTab, scoresView, switchScoresView } = useAdminTabs({
    settingsDirtyRef,
    isDemoMode,
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);

  const { activeOrganization } = useAuth();

  const {
    rawScores,
    summaryData,
    allJurors,
    sortedPeriods,
    loading,
    loadError,
    lastRefresh,
    trendData,
    trendLoading,
    trendError,
    trendPeriodIds,
    setTrendPeriodIds,
    fetchData,
  } = useAdminData({
    organizationId: activeOrganization?.id,
    selectedPeriodId,
    onSelectedPeriodChange: setSelectedPeriodId,
    scoresView,
  });

  const selectedPeriod = sortedPeriods.find((p) => p.id === selectedPeriodId) || null;

  // Groups derived from project summaries (used by HeatmapPage)
  const groups = useMemo(
    () =>
      (summaryData || [])
        .map((p) => ({ id: p.id, group_no: p.group_no, title: p.title ?? "", members: p.members ?? "" }))
        .sort((a, b) => (a.group_no ?? 0) - (b.group_no ?? 0)),
    [summaryData]
  );

  // Jurors with key field matching lookup (used by HeatmapPage)
  const matrixJurors = useMemo(() => {
    const seen = new Map();
    (allJurors || []).forEach((j) => {
      if (j.jurorId && !seen.has(j.jurorId)) {
        seen.set(j.jurorId, {
          key: j.jurorId,
          jurorId: j.jurorId,
          name: (j.juryName || "").trim(),
          dept: (j.affiliation || "").trim(),
          finalSubmitted: !!(j.finalSubmittedAt || j.final_submitted_at),
        });
      }
    });
    (rawScores || []).forEach((r) => {
      if (r.jurorId && !seen.has(r.jurorId)) {
        seen.set(r.jurorId, {
          key: r.jurorId,
          jurorId: r.jurorId,
          name: (r.juryName || "").trim(),
          dept: (r.affiliation || "").trim(),
          finalSubmitted: false,
        });
      }
    });
    const scoreKeys = new Set((rawScores || []).map((r) => r.jurorId).filter(Boolean));
    return [...seen.values()]
      .filter((j) => scoreKeys.has(j.jurorId))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allJurors, rawScores]);

  function handleNavigate(tab) {
    setAdminTab(tab);
  }

  return (
    <div className="admin-shell">
      {/* Mobile overlay */}
      <div
        className={`mobile-overlay${mobileOpen ? " show" : ""}`}
        onClick={() => setMobileOpen(false)}
      />

      <AdminSidebar
        adminTab={adminTab}
        scoresView={scoresView}
        setAdminTab={setAdminTab}
        switchScoresView={switchScoresView}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="admin-main">
        <AdminHeader
          adminTab={adminTab}
          scoresView={scoresView}
          onMobileMenuOpen={() => setMobileOpen(true)}
          sortedPeriods={sortedPeriods}
          selectedPeriodId={selectedPeriodId}
          onPeriodChange={setSelectedPeriodId}
          onRefresh={fetchData}
          refreshing={loading}
        />

        <div className="admin-content">
          {adminTab === "overview" && (
            <OverviewPage
              rawScores={rawScores}
              summaryData={summaryData}
              allJurors={allJurors}
              selectedPeriod={selectedPeriod}
              loading={loading}
              onNavigate={handleNavigate}
              isDemoMode={isDemoMode}
            />
          )}
          {adminTab === "scores" && scoresView === "rankings" && (
            <RankingsPage
              summaryData={summaryData}
              rawScores={rawScores}
              allJurors={allJurors}
              selectedPeriod={selectedPeriod}
              loading={loading}
            />
          )}
          {adminTab === "scores" && scoresView === "analytics" && (
            <AnalyticsPage
              dashboardStats={summaryData}
              submittedData={rawScores}
              loading={loading}
              error={loadError}
              periodName={selectedPeriod?.name || selectedPeriod?.semester_name || ""}
              lastRefresh={lastRefresh}
              semesterOptions={sortedPeriods}
              trendSemesterIds={trendPeriodIds}
              onTrendSelectionChange={setTrendPeriodIds}
              trendData={trendData}
              trendLoading={trendLoading}
              trendError={trendError}
            />
          )}
          {adminTab === "scores" && scoresView === "grid" && (
            <HeatmapPage
              data={rawScores}
              jurors={matrixJurors}
              groups={groups}
              periodName={selectedPeriod?.name || selectedPeriod?.semester_name || selectedPeriod?.period_name || ""}
            />
          )}
          {adminTab === "scores" && scoresView === "details" && (
            <ReviewsPage
              data={rawScores}
              jurors={allJurors}
              assignedJurors={matrixJurors}
              groups={groups}
              periodName={selectedPeriod?.name || selectedPeriod?.semester_name || selectedPeriod?.period_name || ""}
              summaryData={summaryData}
              loading={loading}
            />
          )}
          {adminTab === "jurors" && (
            <JurorsPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onCurrentSemesterChange={(periodId) => {
                setSelectedPeriodId(periodId);
                fetchData();
              }}
            />
          )}
          {adminTab === "projects" && (
            <ProjectsPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onCurrentSemesterChange={(periodId) => {
                setSelectedPeriodId(periodId);
                fetchData();
              }}
            />
          )}
          {adminTab === "periods" && (
            <PeriodsPage
              organizationId={activeOrganization?.id}
              selectedPeriodId={selectedPeriodId}
              isDemoMode={isDemoMode}
              onCurrentSemesterChange={(periodId) => {
                setSelectedPeriodId(periodId);
                fetchData();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
