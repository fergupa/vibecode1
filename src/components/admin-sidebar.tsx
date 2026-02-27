"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useProject } from "@/lib/project-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const mainNav = [
  { href: "/admin", label: "Home", exact: true },
  { href: "/admin/projects/active", label: "Active Projects", exact: false },
  { href: "/admin/projects/closed", label: "Closed Projects", exact: false },
];

const projectNav = [
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/surveys", label: "Surveys" },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { selectedProject } = useProject();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-gray-50 p-4">
      <h1 className="mb-8 text-lg font-bold">Activity Assessment</h1>
      <nav className="flex flex-1 flex-col gap-1">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive(pathname, item.href, item.exact)
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {item.label}
          </Link>
        ))}

        {selectedProject && (
          <>
            <Separator className="my-3" />
            <span className="mb-1 truncate px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {selectedProject.name}
            </span>
            {projectNav.map((item) => (
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
          </>
        )}
      </nav>
      <Button variant="outline" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign Out
      </Button>
    </aside>
  );
}
