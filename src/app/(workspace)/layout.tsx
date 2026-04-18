import Link from "next/link";
import { getOverviewData } from "@/lib/expenses";
import { formatMonthLabel } from "@/lib/format";
import { NavLink } from "./_components/nav-link";

export const dynamic = "force-dynamic";

export default function WorkspaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const overview = getOverviewData();
  const recentMonths = overview.availableMonths.slice(0, 6);

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <div className="brand-block">
          <Link href="/" className="brand-mark">
            Ledger Garden
          </Link>
          <p className="brand-copy">
            A month-led workspace for importing statements, clearing merchant review, and tracing spend across banks.
          </p>
        </div>

        <nav className="workspace-nav" aria-label="Primary">
          <NavLink href="/">Overview</NavLink>
          <NavLink href="/upload">Upload</NavLink>
          <NavLink href="/review">Review</NavLink>
          <NavLink href="/categories">Categories</NavLink>
          <NavLink href="/statements">Statements</NavLink>
        </nav>

        <div className="sidebar-section">
          <div className="sidebar-heading">
            <p className="eyebrow">Open Loops</p>
            <span className="sidebar-stat">{overview.pendingTransactionCount}</span>
          </div>
          <p className="sidebar-copy">
            Pending transactions stay in review until you save a reusable merchant memory or fix a one-off.
          </p>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-heading">
            <p className="eyebrow">Recent Months</p>
            <Link href="/" className="sidebar-link">
              See all
            </Link>
          </div>
          <div className="month-link-stack">
            {recentMonths.length > 0 ? (
              recentMonths.map((month) => (
                <Link key={month} href={`/months/${month}`} className="month-jump">
                  <span>{formatMonthLabel(month)}</span>
                  <span className="month-jump-arrow">Open</span>
                </Link>
              ))
            ) : (
              <p className="sidebar-copy">Month pages appear after your first parsed statement lands.</p>
            )}
          </div>
        </div>
      </aside>

      <div className="workspace-main">
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
