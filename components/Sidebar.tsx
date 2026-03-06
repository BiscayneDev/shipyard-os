"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  Folder,
  Zap,
  Brain,
  Calendar,
  FileText,
  Sparkles,
  Settings,
  TrendingUp,
  MessageSquare,
  Building2,
  Activity,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "CEO Chat", icon: MessageSquare },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/company", label: "Company", icon: Building2 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/intel", label: "Intel", icon: Zap },
  { href: "/costs", label: "Costs", icon: TrendingUp },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/skills", label: "Skills", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// Mobile bottom nav: Dashboard, Tasks, Activity, Intel, Costs
const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/intel", label: "Intel", icon: Zap },
  { href: "/costs", label: "Costs", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col items-center gap-1 py-6 px-2 shrink-0"
        style={{
          width: "13rem",
          backgroundColor: "#0d0d14",
          borderRight: "1px solid #1a1a2e",
          minHeight: "100vh",
        }}
      >
        <div className="mb-6 text-center">
          <span className="text-sm font-bold tracking-widest uppercase text-zinc-400">
            Mission
          </span>
          <br />
          <span className="text-xs tracking-widest uppercase text-zinc-600">
            Control
          </span>
        </div>

        <nav className="flex flex-col gap-1 w-full">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{
          backgroundColor: "#0d0d14",
          borderTop: "1px solid #1a1a2e",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {mobileNavItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: isActive ? "#ffffff" : "#71717a" }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
