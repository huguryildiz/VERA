// src/shared/ui/ToastContainer.jsx
// Custom toast renderer — matches VERA prototype design exactly.

import { useState, useEffect } from "react";
import {
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
} from "lucide-react";
import { toastStore } from "../lib/toastStore";
import "../../styles/toast.css";

function SpinnerIcon() {
  return (
    <LoaderCircle
      size={15}
      strokeWidth={2}
      style={{ animation: "spin 0.8s linear infinite" }}
    />
  );
}

const ICONS = {
  success: <CircleCheck size={18} strokeWidth={2} />,
  error: <CircleX size={18} strokeWidth={2} />,
  warning: <TriangleAlert size={18} strokeWidth={2} />,
  info: <Info size={18} strokeWidth={2} />,
};

function Toast({ toast: t, onDismiss }) {
  const type = t.type === "loading" ? "loading" : t.type;
  return (
    <div className={`toast t-${type}${t.exiting ? " toast-out" : ""}`}>
      <div className="toast-icon">
        {type === "loading" ? <SpinnerIcon /> : ICONS[type] || ICONS.info}
      </div>
      <div className="toast-body">
        <div className="toast-title">{t.message}</div>
      </div>
      <button className="toast-close" type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss">
        <X size={12} strokeWidth={2} />
      </button>
      {type !== "loading" && (
        <div className="toast-progress">
          <div className="toast-progress-bar" />
        </div>
      )}
    </div>
  );
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState(() => toastStore.getAll());

  useEffect(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={toastStore.dismiss} />
      ))}
    </div>
  );
}
