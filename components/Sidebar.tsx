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
  Settings,
  TrendingUp,
  MessageSquare,
  Activity,
} from "lucide-react";

const navSections = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/chat", label: "Chat", icon: MessageSquare },
      { href: "/tasks", label: "Tasks", icon: CheckSquare },
      { href: "/agents", label: "Agents", icon: Users },
    ],
  },
  {
    label: "Work",
    items: [
      { href: "/projects", label: "Projects", icon: Folder },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/intel", label: "Intel", icon: Zap },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/docs", label: "Docs", icon: FileText },
      { href: "/memory", label: "Memory", icon: Brain },
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/costs", label: "Costs", icon: TrendingUp },
    ],
  },
];

const mobileNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/intel", label: "Intel", icon: Zap },
  { href: "/agents", label: "Agents", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col py-6 px-2 shrink-0"
        style={{
          width: "13rem",
          backgroundColor: "#0d0d14",
          borderRight: "1px solid #1a1a2e",
          minHeight: "100vh",
        }}
      >
        <div className="mb-6 px-2 text-center">
          <span className="text-sm font-bold tracking-widest uppercase text-zinc-400">Mission</span>
          <br />
          <span className="text-xs tracking-widest uppercase text-zinc-600">Control</span>
        </div>

        <nav className="flex flex-col gap-4 w-full flex-1">
          {navSections.map((section, i) => (
            <div key={i}>
              {section.label && (
                <p className="px-4 mb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings pinned to bottom */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-2 ${
            pathname === "/settings"
              ? "bg-white/10 text-white"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          <Settings size={16} />
          <span>Settings</span>
        </Link>
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
