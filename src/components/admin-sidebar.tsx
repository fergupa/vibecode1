"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/surveys", label: "Surveys" },
  { href: "/admin/analysis", label: "Analysis" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-gray-50 p-4">
      <h1 className="mb-8 text-lg font-bold">Activity Assessment</h1>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign Out
      </Button>
    </aside>
  );
}
