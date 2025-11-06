"use client";

import { ReactNode, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Clock,
  Briefcase,
  Timer,
  Star,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Building2,
  Bell,
  Settings,
} from "lucide-react";
import { removeAuthToken, getUser } from "@/lib/auth";
import { notificationsAPI } from "@/lib/api";
import { cn } from "@/lib/utils";
import Button from "./ui/Button";

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/organizational-units", label: "Organigramme", icon: Building2 },
  { href: "/employees", label: "Employés", icon: Users },
  { href: "/schedules", label: "Horaires", icon: Calendar },
  { href: "/time-entries", label: "Pointages", icon: Clock },
  { href: "/validation", label: "Validation", icon: RefreshCw },
  { href: "/absences", label: "Absences", icon: Briefcase },
  { href: "/overtimes", label: "Heures Supp", icon: Timer },
  { href: "/special-hours", label: "Heures Spéciales", icon: Star },
  { href: "/work-cycles", label: "Cycles de Travail", icon: RefreshCw },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  // const user = getUser();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Charger le compteur de notifications non lues
  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const response = await notificationsAPI.getUnreadCount();
        setUnreadCount(response.data.count || 0);
      } catch (error) {
        console.error("Erreur chargement compteur notifications:", error);
      }
    };

    if (user) {
      loadUnreadCount();
      // Recharger toutes les 30 secondes
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleLogout = () => {
    removeAuthToken();
    router.push("/login");
  };

  // Cacher la sidebar sur les pages d'authentification
  if (pathname === "/login" || pathname === "/register") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-linear-to-br from-gray-50 via-blue-50/30 to-gray-50">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white shadow-xl transition-all duration-300 flex flex-col z-50 border-r border-gray-200",
          "fixed lg:static inset-y-0 left-0",
          sidebarOpen ? "w-64" : "w-20",
          mobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10  rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-gray-400 font-bold text-lg">G</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">GTA</h1>
                <p className="text-xs text-gray-500">Gestion du temps</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors hidden lg:block"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 px-4 py-2 rounded-md transition-all group",
                  isActive
                    ? "bg-cyan-600 text-white font-semibold shadow-sm shadow-blue-500/50"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 shrink-0",
                    isActive
                      ? "text-white"
                      : "group-hover:scale-110 transition-transform"
                  )}
                />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section - Simplifié sans bouton déconnexion */}
        {/* <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 px-4 py-3 rounded-xl bg-gray-50">
            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center shrink-0 shadow-md">
              <span className="text-white font-semibold text-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.email || 'Utilisateur'}</p>
                <p className="text-xs text-gray-500">Administrateur</p>
              </div>
            )}
          </div>
        </div> */}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header with Logout Button */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm sticky top-0 z-40">
          <div className="px-4 lg:px-8 py-4 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            {/* Title / Breadcrumb */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-gray-800">
                {menuItems.find((item) => item.href === pathname)?.label ||
                  "Kelio"}
              </h2>
            </div>

            {/* Mobile Title */}
            {/* <div className="lg:hidden flex items-center space-x-2">
              <div className="w-8 h-8 bg-linear-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-gray-900">Kelio</span>
            </div> */}

            {/* Right Section - Actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <Link href="/notifications">
                <button className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>
              </Link>

              {/* Settings */}
              <button className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>

              {/* User Info & Logout */}
              <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
                <div className="hidden sm:block text-right">
                  {user ? (
                    <>
                      <p className="text-sm font-medium text-gray-900">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500">Administrateur</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">
                        Utilisateur
                      </p>
                      <p className="text-xs text-gray-500">Chargement...</p>
                    </>
                  )}
                </div>

                <Button
                  onClick={handleLogout}
                  variant="outline"
                  size="sm"
                  className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100 hover:border-red-300"
                >
                  <LogOut className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
