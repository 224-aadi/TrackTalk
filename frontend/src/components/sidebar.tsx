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
  AudioWaveform,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Core",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calls", label: "Call Explorer", icon: Phone },
      { href: "/agents", label: "Agents", icon: Users },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/analysis", label: "Analysis", icon: BarChart3 },
      { href: "/predictions", label: "Predictions", icon: BrainCircuit },
      { href: "/insights", label: "Insights", icon: TrendingUp },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/coaching", label: "Coaching", icon: MessageSquare },
      { href: "/qa", label: "QA & Compliance", icon: ShieldCheck },
      { href: "/training", label: "Training", icon: GraduationCap },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[252px] flex-col bg-n-950">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
          <AudioWaveform className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-white">
          TrackTalk
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-n-500">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                        isActive
                          ? "bg-white/10 text-white"
                          : "text-n-400 hover:bg-white/5 hover:text-n-200"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 h-5 w-[3px] rounded-r-full bg-brand-500" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] transition-colors",
                          isActive
                            ? "text-brand-400"
                            : "text-n-500 group-hover:text-n-300"
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/5 px-6 py-4">
        <p className="text-[11px] text-n-600">TrackTalk v0.1.0</p>
      </div>
    </aside>
  );
}
