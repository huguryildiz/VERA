// src/AdminPanel.jsx — Phase 14
// Thin delegation to AdminLayout (canonical admin shell + router).
import AdminLayout from "./admin/layout/AdminLayout";
export default function AdminPanel(props) {
  return <AdminLayout {...props} />;
}
