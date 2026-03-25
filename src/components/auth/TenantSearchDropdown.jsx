// src/components/auth/TenantSearchDropdown.jsx
// ============================================================
// Phase C.4: Searchable dropdown for tenant selection during
// admin application. Users can only apply to existing tenants.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

export default function TenantSearchDropdown({ tenants, value, onChange, disabled }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const selected = tenants.find((t) => t.id === value);

  const filtered = tenants.filter((t) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.university.toLowerCase().includes(q) ||
      t.department.toLowerCase().includes(q) ||
      t.code.toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback((tenant) => {
    onChange(tenant.id);
    setQuery("");
    setOpen(false);
  }, [onChange]);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={wrapRef} className="tenant-dropdown-wrap">
      <button
        type="button"
        className="tenant-dropdown-trigger admin-auth-input"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        {selected ? (
          <span className="tenant-dropdown-selected">
            {selected.name}
            {selected.university && <span className="tenant-dropdown-uni"> — {selected.university}</span>}
          </span>
        ) : (
          <span className="tenant-dropdown-placeholder">Select a department…</span>
        )}
      </button>

      {open && (
        <div className="tenant-dropdown-popover">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, university…"
            className="tenant-dropdown-search"
            autoFocus
          />
          <ul className="tenant-dropdown-list">
            {filtered.length === 0 && (
              <li className="tenant-dropdown-empty">No matching departments found.</li>
            )}
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`tenant-dropdown-item ${t.id === value ? "active" : ""}`}
                  onClick={() => handleSelect(t)}
                >
                  <span className="tenant-dropdown-item-name">{t.name}</span>
                  {t.university && (
                    <span className="tenant-dropdown-item-uni">{t.university}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
