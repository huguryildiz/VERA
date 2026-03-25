// src/admin/hooks/useManageOrganizations.js
// ============================================================
// Organization/tenant CRUD state management.
// Super-admin only — hook no-ops when `enabled` is false.
//
// Follows useManageSemesters.js pattern but is self-contained
// (no cross-domain dependencies on semester selection or
// useSettingsCrud orchestration).
// ============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { adminListTenants, adminCreateTenant, adminUpdateTenant } from "../../shared/api";

const EMPTY_CREATE = { code: "", shortLabel: "", university: "", department: "" };
const EMPTY_EDIT = { id: "", code: "", shortLabel: "", university: "", department: "", status: "active", created_at: "", updated_at: "" };
const VALID_STATUSES = ["active", "disabled", "archived"];
const CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * useManageOrganizations — tenant identity CRUD for super-admins.
 *
 * @param {object}   opts
 * @param {boolean}  opts.enabled        When false, hook issues no RPCs and returns inert state.
 * @param {Function} opts.setMessage     Toast setter.
 * @param {Function} opts.incLoading     Increment global loading counter.
 * @param {Function} opts.decLoading     Decrement global loading counter.
 * @param {Function} opts.onDirtyChange  (isDirty: boolean) → called when dirty state changes.
 */
export function useManageOrganizations({
  enabled,
  setMessage,
  incLoading,
  decLoading,
  onDirtyChange,
}) {
  const [orgList, setOrgList] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ── Create modal ──────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE);
  const [createError, setCreateError] = useState("");
  const createOrigRef = useRef(EMPTY_CREATE);

  // ── Edit modal ────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editError, setEditError] = useState("");
  const editOrigRef = useRef(EMPTY_EDIT);

  // ── Load ──────────────────────────────────────────────────
  const loadOrgs = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await adminListTenants();
      setOrgList(data);
    } catch (e) {
      setError(e?.message || "Could not load organizations.");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    loadOrgs();
  }, [enabled, loadOrgs]);

  // ── Dirty state tracking ──────────────────────────────────
  const createDirty = useMemo(() => {
    if (!showCreate) return false;
    const orig = createOrigRef.current;
    return (
      createForm.code !== orig.code ||
      createForm.shortLabel !== orig.shortLabel ||
      createForm.university !== orig.university ||
      createForm.department !== orig.department
    );
  }, [showCreate, createForm]);

  const editDirty = useMemo(() => {
    if (!showEdit) return false;
    const orig = editOrigRef.current;
    return (
      editForm.shortLabel !== orig.shortLabel ||
      editForm.university !== orig.university ||
      editForm.department !== orig.department ||
      editForm.status !== orig.status
    );
  }, [showEdit, editForm]);

  const isDirty = createDirty || editDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Warn before browser close if dirty
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // ── Search / filter ───────────────────────────────────────
  const filteredOrgs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orgList;
    return orgList.filter(
      (o) =>
        o.code.toLowerCase().includes(q) ||
        o.shortLabel.toLowerCase().includes(q) ||
        o.university.toLowerCase().includes(q) ||
        o.department.toLowerCase().includes(q)
    );
  }, [orgList, search]);

  // ── Modal openers / closers ───────────────────────────────
  const openCreate = useCallback(() => {
    const blank = { ...EMPTY_CREATE };
    setCreateForm(blank);
    createOrigRef.current = blank;
    setCreateError("");
    setShowCreate(true);
  }, []);

  const closeCreate = useCallback(() => {
    setShowCreate(false);
    setCreateForm(EMPTY_CREATE);
    setCreateError("");
  }, []);

  const openEdit = useCallback((org) => {
    const snapshot = {
      id: org.id,
      code: org.code,
      shortLabel: org.shortLabel,
      university: org.university,
      department: org.department,
      status: org.status,
      created_at: org.created_at,
      updated_at: org.updated_at,
    };
    setEditForm(snapshot);
    editOrigRef.current = { ...snapshot };
    setEditError("");
    setShowEdit(true);
  }, []);

  const closeEdit = useCallback(() => {
    setShowEdit(false);
    setEditForm(EMPTY_EDIT);
    setEditError("");
  }, []);

  // ── Validation helpers ────────────────────────────────────
  const validateCreate = useCallback(
    (form) => {
      const code = form.code.trim().toLowerCase();
      if (!code) return "Code is required.";
      if (!CODE_RE.test(code)) return "Code must be a lowercase slug (e.g. tedu-ee).";
      if (orgList.some((o) => o.code === code)) return `Code "${code}" already exists.`;
      if (!form.shortLabel.trim()) return "Short Label is required.";
      if (!form.university.trim()) return "University is required.";
      if (!form.department.trim()) return "Department is required.";
      return null;
    },
    [orgList]
  );

  const validateEdit = useCallback((form) => {
    if (!form.shortLabel.trim()) return "Short Label is required.";
    if (!form.university.trim()) return "University is required.";
    if (!form.department.trim()) return "Department is required.";
    if (!VALID_STATUSES.includes(form.status)) return "Invalid status.";
    return null;
  }, []);

  // ── Create handler ────────────────────────────────────────
  const handleCreateOrg = useCallback(async () => {
    if (!enabled) return;
    const validationError = validateCreate(createForm);
    if (validationError) {
      setCreateError(validationError);
      return;
    }
    setCreateError("");
    setError("");
    incLoading();
    try {
      await adminCreateTenant({
        code: createForm.code.trim().toLowerCase(),
        shortLabel: createForm.shortLabel.trim(),
        university: createForm.university.trim(),
        department: createForm.department.trim(),
      });
      closeCreate();
      await loadOrgs();
      setMessage?.("Organization created.");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        setCreateError("An organization with this code already exists.");
      } else {
        setCreateError(msg || "Could not create organization.");
      }
    } finally {
      decLoading();
    }
  }, [enabled, createForm, validateCreate, closeCreate, loadOrgs, setMessage, incLoading, decLoading]);

  // ── Update handler ────────────────────────────────────────
  const handleUpdateOrg = useCallback(async () => {
    if (!enabled) return;
    const validationError = validateEdit(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    setEditError("");
    setError("");
    incLoading();
    try {
      await adminUpdateTenant({
        tenantId: editForm.id,
        shortLabel: editForm.shortLabel.trim(),
        university: editForm.university.trim(),
        department: editForm.department.trim(),
        status: editForm.status,
      });
      closeEdit();
      await loadOrgs();
      setMessage?.("Organization updated.");
    } catch (e) {
      const msg = String(e?.message || "");
      if (msg.includes("tenant_not_found")) {
        setEditError("Organization not found. It may have been removed.");
      } else {
        setEditError(msg || "Could not update organization.");
      }
    } finally {
      decLoading();
    }
  }, [enabled, editForm, validateEdit, closeEdit, loadOrgs, setMessage, incLoading, decLoading]);

  return {
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
    loadOrgs,
  };
}
