"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type NavLinkProps = {
  children: React.ReactNode;
  href: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ children, href }: NavLinkProps) {
  const pathname = usePathname();
  const active = isActivePath(pathname, href);

  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: active ? "secondary" : "ghost", size: "lg" }),
        "w-full justify-start rounded-2xl px-4 py-3 text-sm"
      )}
      aria-current={active ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
