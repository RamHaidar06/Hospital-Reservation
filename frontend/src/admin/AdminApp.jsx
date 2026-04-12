import { useEffect } from "react";
import AdminLayout from "./layout/AdminLayout";
import AdminLoginPage from "./pages/AdminLoginPage";
import DashboardPage from "./pages/DashboardPage";
import DoctorsPage from "./pages/DoctorsPage";
import PatientsPage from "./pages/PatientsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import SettingsPage from "./pages/SettingsPage";
import { isAdminSession } from "./utils/auth";
import "./admin.css";

function getCurrentAdminPath() {
  const pathname = window.location.pathname || "/admin";
  if (pathname === "/admin") return "/admin";
  if (pathname.startsWith("/admin/")) return pathname;
  return "/admin";
}

export default function AdminApp() {
  const path = getCurrentAdminPath();

  useEffect(() => {
    document.body.classList.add("admin-mode");
    return () => document.body.classList.remove("admin-mode");
  }, []);

  if (path === "/admin") {
    if (isAdminSession()) {
      window.location.replace("/admin/dashboard");
      return null;
    }
    return <AdminLoginPage />;
  }

  if (!isAdminSession()) {
    window.location.replace("/admin");
    return null;
  }

  let content = <DashboardPage />;
  if (path === "/admin/doctors") content = <DoctorsPage />;
  if (path === "/admin/patients") content = <PatientsPage />;
  if (path === "/admin/appointments") content = <AppointmentsPage />;
  if (path === "/admin/settings") content = <SettingsPage />;

  return <AdminLayout currentPath={path}>{content}</AdminLayout>;
}
