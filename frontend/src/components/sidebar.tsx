"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Phone,
  Users,
  BarChart3,
  BrainCircuit,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calls", label: "Call Explorer", icon: Phone },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/predictions", label: "Predictions", icon: BrainCircuit },
  { href: "/coaching", label: "Coaching", icon: MessageSquare },
  { href: "/qa", label: "QA & Compliance", icon: ShieldCheck },
  { href: "/training", label: "Training", icon: GraduationCap },
  { href: "/insights", label: "Insights", icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <Phone className="h-6 w-6 text-slate-900" />
        <span className="text-xl font-bold text-slate-900">TrackTalk</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="text-xs text-slate-400">TrackTalk v0.1.0</p>
      </div>
    </aside>
  );
}
