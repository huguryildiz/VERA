// src/admin/pages/EntryControlPage.jsx
// Standalone page for jury entry token / QR management.
// Wraps the existing JuryEntryControlPanel in a PageShell layout.

import PageShell from "./PageShell";
import JuryEntryControlPanel from "../settings/JuryEntryControlPanel";

export default function EntryControlPage({
  tenantId,
  semesterId,
  semesterName,
  isDemoMode = false,
}) {
  return (
    <PageShell
      title="Entry Control"
      description="Manage jury entry tokens and QR access codes"
    >
      <JuryEntryControlPanel
        semesterId={semesterId}
        semesterName={semesterName}
        tenantId={tenantId}
        isDemoMode={isDemoMode}
        isOpen={true}
        onToggle={() => {}}
        isMobile={false}
      />
    </PageShell>
  );
}
