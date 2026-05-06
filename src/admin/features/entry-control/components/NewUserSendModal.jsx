import { X } from "lucide-react";
import Modal from "@/shared/ui/Modal";
import AsyncButtonContent from "@/shared/ui/AsyncButtonContent";
import InlineError from "@/shared/ui/InlineError";

export default function NewUserSendModal({
  open,
  onClose,
  sending,
  recipients,
  inputValue,
  onInputChange,
  onKeyDown,
  onPaste,
  onInputBlur,
  onRemoveRecipient,
  error,
  onSubmit,
  inputRef,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
    >
      <div className="fs-modal-header">
        <div className="fs-modal-header-row">
          <div style={{ flex: 1 }}>
            <div className="fs-title">Send Access Link</div>
            <div className="fs-subtitle">Send the active QR access link to one or more email addresses.</div>
          </div>
          <button
            className="fs-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="fs-modal-body">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            padding: "8px 10px",
            minHeight: 42,
            border: error ? "1px solid var(--danger)" : "1px solid var(--border)",
            boxShadow: error ? "var(--field-error-ring)" : "none",
            background: error ? "var(--field-error-bg)" : "var(--field-bg)",
            borderRadius: "var(--radius)",
            alignItems: "center",
            cursor: "text",
            transition: "border-color .15s, box-shadow .15s",
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {recipients.map((email) => (
            <span
              key={email}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: 999,
                background: "var(--accent-soft)",
                border: "1px solid rgba(59,130,246,0.15)",
                fontSize: 11,
                fontWeight: 500,
                color: "var(--accent)",
              }}
            >
              {email}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveRecipient(email);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  padding: "0 2px",
                  opacity: 0.75,
                }}
              >
                &#215;
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={onInputBlur}
            placeholder={recipients.length === 0 ? "new.user@university.edu" : ""}
            disabled={sending}
            autoFocus
            style={{
              flex: 1,
              minWidth: 160,
              border: "none",
              outline: "none",
              background: "transparent",
              fontFamily: "var(--font)",
              fontSize: 13,
              color: "var(--text-primary)",
              padding: "2px 0",
            }}
          />
        </div>
        <div className="text-xs text-muted" style={{ marginTop: 6 }}>
          Press Enter to add multiple recipients
        </div>
        <InlineError>{error}</InlineError>
      </div>
      <div className="fs-modal-footer">
        <button
          className="fs-btn fs-btn-secondary"
          onClick={onClose}
          disabled={sending}
        >
          Cancel
        </button>
        <button
          className="fs-btn fs-btn-primary"
          onClick={onSubmit}
          disabled={sending || (recipients.length === 0 && !inputValue.trim())}
        >
          <AsyncButtonContent loading={sending} loadingText="Sending...">Send</AsyncButtonContent>
        </button>
      </div>
    </Modal>
  );
}
