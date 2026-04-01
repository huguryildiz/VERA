// src/admin/pages/PageShell.jsx
// Shared page layout wrapper for all admin pages.
// Provides consistent title, description, actions area, and content spacing.

export default function PageShell({ title, description, actions, children, className }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
