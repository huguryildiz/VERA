import { ChevronDownIcon, DownloadIcon, HistoryIcon, SearchIcon } from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";

const AUDIT_MIN_DATETIME = "2020-01-01T00:00";
const AUDIT_MAX_DATETIME = "2035-12-31T23:59";

export default function AuditLogCard({
  isMobile,
  isOpen,
  onToggle,
  auditCardRef,
  auditScrollRef,
  auditSentinelRef,
  auditFilters,
  auditSearch,
  auditRangeError,
  auditError,
  auditExporting,
  auditLoading,
  auditHasMore,
  visibleAuditLogs,
  showAuditSkeleton,
  isAuditStaleRefresh,
  hasAuditFilters,
  hasAuditToggle,
  showAllAuditLogs,
  localTimeZone,
  AUDIT_COMPACT_COUNT,
  supportsInfiniteScroll,
  onSetAuditFilters,
  onSetAuditSearch,
  onAuditExport,
  onToggleShowAll,
  onAuditLoadMore,
  formatAuditTimestamp,
}) {
  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm flex flex-col min-h-0${isMobile ? " h-auto" : ""}`}
      ref={auditCardRef}
    >
      <div className="flex items-center justify-between gap-3 p-4">
        <button
          type="button"
          className="flex flex-1 items-center justify-between gap-3 bg-transparent border-none p-0 cursor-pointer text-left"
          onClick={onToggle}
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2.5 font-semibold text-base text-foreground">
            <span className="size-5 text-muted-foreground" aria-hidden="true"><HistoryIcon /></span>
            <span className="section-label">Audit Log</span>
          </div>
          <ChevronDownIcon className={`size-4 text-muted-foreground transition-transform duration-200${isOpen ? " rotate-180" : ""}`} />
        </button>
      </div>

      {(!isMobile || isOpen) && (
        <div className="flex flex-col gap-3 flex-1 min-h-0 px-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="text-sm text-muted-foreground">Audit trail of administrative actions and security events.</div>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5 min-w-[160px] flex-[1_1_180px]">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="auditStartDate">From</label>
                <input
                  id="auditStartDate"
                  type="datetime-local"
                  step="60"
                  placeholder="YYYY-MM-DDThh:mm"
                  className={`h-9 rounded-md border border-input bg-background px-3 text-sm${auditFilters.startDate ? "" : " text-muted-foreground"}${auditRangeError ? " border-destructive bg-destructive/5" : ""}`}
                  value={auditFilters.startDate}
                  min={AUDIT_MIN_DATETIME}
                  max={AUDIT_MAX_DATETIME}
                  onChange={(e) => onSetAuditFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-[160px] flex-[1_1_180px]">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="auditEndDate">To</label>
                <input
                  id="auditEndDate"
                  type="datetime-local"
                  step="60"
                  placeholder="YYYY-MM-DDThh:mm"
                  className={`h-9 rounded-md border border-input bg-background px-3 text-sm${auditFilters.endDate ? "" : " text-muted-foreground"}${auditRangeError ? " border-destructive bg-destructive/5" : ""}`}
                  value={auditFilters.endDate}
                  min={AUDIT_MIN_DATETIME}
                  max={AUDIT_MAX_DATETIME}
                  onChange={(e) => onSetAuditFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-[160px] flex-[1_1_180px]">
                <label className="text-sm font-medium text-muted-foreground" htmlFor="auditSearch">Search</label>
                <div className="relative w-full max-w-[360px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" aria-hidden="true"><SearchIcon /></span>
                  <input
                    id="auditSearch"
                    type="text"
                    className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground"
                    placeholder="Search message, action, entity, or metadata"
                    value={auditSearch}
                    onChange={(e) => onSetAuditSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full flex justify-start items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border border-input bg-background px-3.5 py-2 text-sm font-medium text-muted-foreground shadow-sm hover:text-foreground hover:bg-accent disabled:opacity-60"
                  onClick={onAuditExport}
                  disabled={auditExporting}
                >
                  <DownloadIcon /> Export
                </button>
                <span className="text-xs text-muted-foreground">
                  Times shown in your local timezone ({localTimeZone}).
                </span>
              </div>
            </div>
            {auditRangeError && <AlertCard variant="error">{auditRangeError}</AlertCard>}
            {auditError && !auditRangeError && (
              <AlertCard variant="error">{auditError}</AlertCard>
            )}
            {auditExporting && <div className="text-xs text-muted-foreground">Preparing export…</div>}
          </div>

          <div
            className={`flex-1 min-h-[148px] overflow-y-auto pr-1 transition-[max-height] duration-300 ease-in-out${showAllAuditLogs ? " max-h-[520px]" : " max-h-[260px]"}`}
            ref={auditScrollRef}
            role="region"
            aria-label="Audit log list"
            aria-busy={auditLoading}
            style={{ scrollbarWidth: "thin" }}
          >
            {showAuditSkeleton && (
              <div className="flex flex-col gap-2.5" aria-hidden="true">
                {Array.from({ length: AUDIT_COMPACT_COUNT }, (_, i) => (
                  <div key={i} className="h-7 rounded bg-muted animate-pulse" />
                ))}
              </div>
            )}

            {!auditLoading && visibleAuditLogs.length === 0 && (
              <div className="text-center py-3 text-xs text-muted-foreground">
                {hasAuditFilters ? "No results for the current filters." : "No audit entries yet."}
              </div>
            )}

            {visibleAuditLogs.length > 0 && (
              <div className={`flex flex-col gap-2.5${isAuditStaleRefresh ? " opacity-45 pointer-events-none transition-opacity duration-150" : ""}`}>
                {visibleAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-baseline gap-2 text-xs text-foreground border-b border-dashed border-border pb-2 last:border-b-0 last:pb-0">
                    <span className="font-mono text-muted-foreground whitespace-nowrap">{formatAuditTimestamp(log.created_at)}</span>
                    <span className="text-border" aria-hidden="true">—</span>
                    <span className="text-foreground leading-relaxed">{log.message}</span>
                  </div>
                ))}
              </div>
            )}

            {auditHasMore && (
              <div ref={auditSentinelRef} className="w-full h-px" aria-hidden="true" />
            )}

            {auditLoading && auditHasMore && (
              <div className="flex justify-center">
                <span className="text-xs text-muted-foreground">Loading older events…</span>
              </div>
            )}
          </div>
          {hasAuditToggle && (
            <button
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${isMobile ? "rounded-full border border-input bg-primary text-primary-foreground px-3 py-1.5 shadow-sm" : "bg-transparent border-none text-primary p-0 hover:underline"}`}
              type="button"
              onClick={onToggleShowAll}
            >
              {showAllAuditLogs
                ? "Show fewer audit logs"
                : "Show all audit logs"}
            </button>
          )}
          {!supportsInfiniteScroll && !auditLoading && auditHasMore && (
            <div className="flex justify-center">
              <button
                className="inline-flex items-center gap-1.5 bg-transparent border-none text-sm font-medium text-primary p-0 hover:underline disabled:opacity-60"
                type="button"
                onClick={onAuditLoadMore}
                disabled={auditLoading || !auditHasMore}
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
