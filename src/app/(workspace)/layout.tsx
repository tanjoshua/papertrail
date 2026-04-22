import Link from "next/link";
import { getOverviewData } from "@/lib/expenses";
import { formatMonthLabel } from "@/lib/format";
import { NavLink } from "./_components/nav-link";
import {
  chipClassName,
  textLinkClassName,
  workspaceEyebrowClassName,
  workspaceSectionCopyClassName,
} from "./_components/workspace-ui";

export const dynamic = "force-dynamic";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const overview = getOverviewData();
  const recentMonths = overview.availableMonths.slice(0, 6);

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[296px_minmax(0,1fr)] lg:px-6 lg:py-6">
      <aside className="rounded-[30px] border bg-card px-5 py-6 shadow-sm lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
        <div className="flex flex-col gap-3 border-b pb-5">
          <Link href="/" className="font-[family-name:var(--font-display)] text-3xl leading-none text-foreground">
            Paper Trail
          </Link>
          <p className={workspaceSectionCopyClassName}>
            A month-led workspace for importing statements, clearing merchant review, and tracing spend across banks.
          </p>
        </div>

        <nav className="my-6 grid gap-2" aria-label="Primary">
          <NavLink href="/">Overview</NavLink>
          <NavLink href="/upload">Upload</NavLink>
          <NavLink href="/review">Review</NavLink>
          <NavLink href="/categories">Categories</NavLink>
          <NavLink href="/statements">Statements</NavLink>
        </nav>

        <div className="flex flex-col gap-3 border-t pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className={workspaceEyebrowClassName}>Open Loops</p>
            <span className={chipClassName({ active: true })}>{overview.pendingTransactionCount}</span>
          </div>
          <p className={workspaceSectionCopyClassName}>
            Pending transactions stay in review until you save a reusable merchant memory or fix a one-off.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className={workspaceEyebrowClassName}>Recent Months</p>
            <Link href="/" className={textLinkClassName()}>
              See all
            </Link>
          </div>
          <div className="grid gap-3">
            {recentMonths.length > 0 ? (
              recentMonths.map((month) => (
                <Link
                  key={month}
                  href={`/months/${month}`}
                  className="flex items-center justify-between gap-3 rounded-[24px] border bg-card px-4 py-4 shadow-sm transition-colors hover:bg-accent/40"
                >
                  <span>{formatMonthLabel(month)}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Open</span>
                </Link>
              ))
            ) : (
              <p className={workspaceSectionCopyClassName}>Month pages appear after your first parsed statement lands.</p>
            )}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <main className="flex min-h-full flex-col">{children}</main>
      </div>
    </div>
  );
}
