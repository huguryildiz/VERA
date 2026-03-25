// src/admin/settings/ManageOrganizationsPanel.jsx
// ============================================================
// Organization/tenant identity management panel.
// Super-admin only — conditionally rendered from SettingsPage.
// ============================================================

import { useState } from "react";
import {
  ChevronDownIcon,
  CirclePlusIcon,
  CodeIcon,
  LandmarkIcon,
  PencilIcon,
  SearchIcon,
  UniversityIcon,
} from "../../shared/Icons";
import AlertCard from "../../shared/AlertCard";
import Tooltip from "../../shared/Tooltip";
import ConfirmDialog from "../../shared/ConfirmDialog";
import LastActivity from "../LastActivity";

// ── Status badge colors ───────────────────────────────────────

const STATUS_STYLES = {
  active:   "manage-pill--active",
  disabled: "manage-pill--disabled",
  archived: "manage-pill--archived",
};

const STATUS_LABELS = {
  active:   "Active",
  disabled: "Disabled",
  archived: "Archived",
};

// ── Helpers ───────────────────────────────────────────────────

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (v) => String(v).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Main component ────────────────────────────────────────────

export default function ManageOrganizationsPanel({
  isMobile,
  isOpen,
  onToggle,
  // From useManageOrganizations
  orgList,
  filteredOrgs,
  error,
  search,
  setSearch,
  showCreate,
  createForm,
  setCreateForm,
  createError,
  openCreate,
  closeCreate,
  handleCreateOrg,
  showEdit,
  editForm,
  setEditForm,
  editError,
  openEdit,
  closeEdit,
  handleUpdateOrg,
  isDirty,
}) {
  const [showAll, setShowAll] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

  const handleToggle = () => {
    if (isOpen && isDirty) {
      setLeaveDialogOpen(true);
      return;
    }
    onToggle();
  };

  const handleLeaveConfirm = () => {
    setLeaveDialogOpen(false);
    closeCreate();
    closeEdit();
    onToggle();
  };

  // ── Create form validation ──────────────────────────────────
  const createCanSubmit =
    createForm.code.trim() !== "" &&
    createForm.shortLabel.trim() !== "" &&
    createForm.university.trim() !== "" &&
    createForm.department.trim() !== "";

  // ── Edit form validation ────────────────────────────────────
  const editCanSubmit =
    editForm.shortLabel.trim() !== "" &&
    editForm.university.trim() !== "" &&
    editForm.department.trim() !== "";

  // ── Visible items (paginated — show 3 by default) ───────────
  const normalizedSearch = search.trim().toLowerCase();
  const visibleOrgs = normalizedSearch
    ? filteredOrgs
    : showAll
      ? orgList
      : orgList.slice(0, 3);

  return (
    <div className={`manage-card${isMobile ? " is-collapsible" : ""}`}>
      <button
        type="button"
        className="manage-card-header"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <div className="manage-card-title">
          <span className="manage-card-icon" aria-hidden="true">
            <UniversityIcon />
          </span>
          <span className="section-label">Organization Management</span>
        </div>
        <ChevronDownIcon className={`settings-chevron${isOpen ? " open" : ""}`} />
      </button>

      {isOpen && (
        <div className="manage-card-body">
          <div className="manage-card-desc">
            Manage organizations and lifecycle.
          </div>

          {error && <AlertCard variant="error">{error}</AlertCard>}

          {/* ── Organization list ── */}
          <div className="manage-list">
            <div className="manage-list-header">All Organizations</div>
            <div className="manage-list-controls">
              <div className="manage-search">
                <span className="manage-search-icon" aria-hidden="true"><SearchIcon /></span>
                <input
                  className="manage-input manage-search-input"
                  type="text"
                  placeholder="Search organizations"
                  aria-label="Search organizations"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="manage-btn primary" type="button" onClick={openCreate}>
                <span aria-hidden="true"><CirclePlusIcon className="manage-btn-icon" /></span>
                Organization
              </button>
            </div>

            {visibleOrgs.map((org) => (
              <div key={org.id} className="manage-item manage-item--org">
                <div>
                  <div className="manage-item-title-row">
                    <div className="manage-item-title">{org.shortLabel}</div>
                    <span className={`manage-pill ${STATUS_STYLES[org.status] || ""}`}>
                      {STATUS_LABELS[org.status] || org.status}
                    </span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <span className="manage-meta-icon" aria-hidden="true"><CodeIcon /></span>
                    <span>{org.code}</span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <span className="manage-meta-icon" aria-hidden="true"><UniversityIcon /></span>
                    <span>{org.university || "—"}</span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <span className="manage-meta-icon" aria-hidden="true"><LandmarkIcon /></span>
                    <span>{org.department || "—"}</span>
                  </div>
                  <div className="manage-item-sub manage-meta-line">
                    <LastActivity value={org.updated_at || null} />
                  </div>
                </div>
                <div className="manage-item-actions">
                  <Tooltip text="Edit organization">
                    <button
                      className="manage-icon-btn"
                      type="button"
                      aria-label={`Edit ${org.shortLabel}`}
                      onClick={() => openEdit(org)}
                    >
                      <PencilIcon />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}

            {normalizedSearch && filteredOrgs.length === 0 && (
              <div className="manage-empty manage-empty-search">No organizations match your search.</div>
            )}

            {!normalizedSearch && orgList.length === 0 && (
              <div className="manage-empty">
                No organizations found.{" "}
                <button className="manage-btn manage-btn--inline-link" type="button" onClick={openCreate}>
                  Create one
                </button>
              </div>
            )}
          </div>

          {!normalizedSearch && orgList.length > 3 && (
            <button
              className="manage-btn ghost"
              type="button"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Show fewer organizations" : `Show all organizations (${orgList.length})`}
            </button>
          )}

          {/* ── Create Organization modal ── */}
          {showCreate && (
            <div className="manage-modal" role="dialog" aria-modal="true">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true"><CirclePlusIcon /></span>
                  <div className="edit-dialog__title">Create Organization</div>
                </div>

                <div className="manage-modal-body">
                  <label className="manage-label">Code</label>
                  <input
                    className={`manage-input${createError && createError.toLowerCase().includes("code") ? " is-danger" : ""}`}
                    value={createForm.code}
                    onChange={(e) => {
                      setCreateForm((f) => ({ ...f, code: e.target.value.toLowerCase().replace(/\s/g, "-") }));
                    }}
                    placeholder="tedu-ee"
                  />
                  <p className="manage-hint">Immutable identifier. Lowercase slug format (e.g. tedu-ee).</p>

                  <label className="manage-label">Short Label</label>
                  <input
                    className="manage-input"
                    value={createForm.shortLabel}
                    onChange={(e) => setCreateForm((f) => ({ ...f, shortLabel: e.target.value }))}
                    placeholder="TEDU EE"
                  />

                  <label className="manage-label">University</label>
                  <input
                    className="manage-input"
                    value={createForm.university}
                    onChange={(e) => setCreateForm((f) => ({ ...f, university: e.target.value }))}
                    placeholder="TED University"
                  />

                  <label className="manage-label">Department</label>
                  <input
                    className="manage-input"
                    value={createForm.department}
                    onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
                    placeholder="Electrical & Electronics Engineering"
                  />

                  {createError && <div className="manage-field-error">{createError}</div>}
                </div>

                <div className="manage-modal-actions">
                  <button className="manage-btn" type="button" onClick={closeCreate}>Cancel</button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!createCanSubmit}
                    onClick={handleCreateOrg}
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Edit Organization modal ── */}
          {showEdit && (
            <div className="manage-modal" role="dialog" aria-modal="true">
              <div className="manage-modal-card">
                <div className="edit-dialog__header">
                  <span className="edit-dialog__icon" aria-hidden="true"><PencilIcon /></span>
                  <div className="edit-dialog__title">Edit Organization</div>
                </div>

                <div className="manage-modal-body">
                  {/* Code — disabled input (immutable) */}
                  <label className="manage-label">Code</label>
                  <input
                    className="manage-input"
                    value={editForm.code}
                    disabled
                  />

                  {/* Editable fields */}
                  <label className="manage-label">Short Label</label>
                  <input
                    className="manage-input"
                    value={editForm.shortLabel}
                    onChange={(e) => setEditForm((f) => ({ ...f, shortLabel: e.target.value }))}
                  />

                  <label className="manage-label">University</label>
                  <input
                    className="manage-input"
                    value={editForm.university}
                    onChange={(e) => setEditForm((f) => ({ ...f, university: e.target.value }))}
                  />

                  <label className="manage-label">Department</label>
                  <input
                    className="manage-input"
                    value={editForm.department}
                    onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
                  />

                  <label className="manage-label">Status</label>
                  <select
                    className="manage-select"
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                    <option value="archived">Archived</option>
                  </select>

                  {editError && <div className="manage-field-error">{editError}</div>}
                </div>

                <div className="manage-modal-actions">
                  <button className="manage-btn" type="button" onClick={closeEdit}>Cancel</button>
                  <button
                    className="manage-btn primary"
                    type="button"
                    disabled={!editCanSubmit}
                    onClick={handleUpdateOrg}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Unsaved-changes leave dialog */}
          <ConfirmDialog
            open={leaveDialogOpen}
            onOpenChange={setLeaveDialogOpen}
            title="Unsaved changes"
            body="You have unsaved organization changes. Leave anyway?"
            confirmLabel="Leave anyway"
            cancelLabel="Keep editing"
            tone="caution"
            onConfirm={handleLeaveConfirm}
          />
        </div>
      )}
    </div>
  );
}
