// src/components/auth/RegisterForm.jsx
// ============================================================
// Phase C.4: Admin self-registration + tenant application form.
// After sign-up, submits a tenant admin application.
// ============================================================

import { useEffect, useState } from "react";
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from "../../shared/Icons";
import { listTenantsPublic, submitAdminApplication } from "../../shared/api";
import TenantSearchDropdown from "./TenantSearchDropdown";

export default function RegisterForm({ onRegister, onSwitchToLogin, error: externalError }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [tenantId, setTenantId] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Load tenants for dropdown
  useEffect(() => {
    let active = true;
    // Tenants are loaded via public RPC that requires authentication.
    // During registration, user may not be authenticated yet.
    // We'll try to load and fallback gracefully.
    listTenantsPublic()
      .then((data) => {
        if (active) setTenants(data || []);
      })
      .catch(() => {
        // Not authenticated yet — tenants will be loaded after sign-up
      })
      .finally(() => {
        if (active) setTenantsLoading(false);
      });
    return () => { active = false; };
  }, []);

  const isStrongPassword = (v) => {
    const s = String(v || "");
    return s.length >= 10 && /[a-z]/.test(s) && /[A-Z]/.test(s) && /\d/.test(s) && /[^A-Za-z0-9]/.test(s);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Email is required."); return; }
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!isStrongPassword(password)) {
      setError("Password must be at least 10 characters with uppercase, lowercase, digit, and symbol.");
      return;
    }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!tenantId) { setError("Please select a department to apply to."); return; }

    setLoading(true);
    try {
      await onRegister(email.trim(), password, {
        name: fullName.trim(),
        university: university.trim(),
        department: department.trim(),
        tenantId,
      });
    } catch (err) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const displayError = externalError || error;

  return (
    <form onSubmit={handleSubmit} className="admin-auth-form admin-auth-form-register">
      <h2 className="admin-auth-title">Apply for Admin Access</h2>

      {displayError && (
        <div className="admin-auth-error">
          <AlertCircleIcon size={16} />
          <span>{displayError}</span>
        </div>
      )}

      <label className="admin-auth-label">
        Full Name
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Dr. Jane Doe"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        Institutional Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane.doe@university.edu"
          autoComplete="email"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        University
        <input
          type="text"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          placeholder="e.g. TED University"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        Department
        <input
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Electrical Engineering"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <label className="admin-auth-label">
        Apply to Department
        <TenantSearchDropdown
          tenants={tenants}
          value={tenantId}
          onChange={setTenantId}
          disabled={loading || tenantsLoading}
        />
      </label>

      <label className="admin-auth-label">
        Password
        <div className="admin-auth-pass-wrap">
          <input
            type={showPass ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 10 chars, upper, lower, digit, symbol"
            autoComplete="new-password"
            disabled={loading}
            className="admin-auth-input"
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="admin-auth-toggle-pass"
            tabIndex={-1}
          >
            {showPass ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
      </label>

      <label className="admin-auth-label">
        Confirm Password
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter password"
          autoComplete="new-password"
          disabled={loading}
          className="admin-auth-input"
        />
      </label>

      <button type="submit" disabled={loading} className="admin-auth-submit">
        {loading ? "Registering…" : "Register & Apply"}
      </button>

      <p className="admin-auth-switch">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin} className="admin-auth-link">
          Sign in
        </button>
      </p>
    </form>
  );
}
