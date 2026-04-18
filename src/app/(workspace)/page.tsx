import Link from "next/link";
import { loadDemoDataAction } from "@/app/actions";
import { getOverviewData } from "@/lib/expenses";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import {
  EmptyState,
  MessageBanner,
  PageHeader,
  SectionCard,
  StatementStatusBadge,
} from "./_components/workspace-ui";

type HomePageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const overview = getOverviewData();
  const latestMonth = overview.monthCards[0];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Overview"
        title="One home for month pages, open review work, and every imported statement."
        description="The homepage is now a launchpad instead of a dumping ground. Start from the month you want to understand, the merchants that still need decisions, or the next statement you want to ingest."
        actions={
          <div className="header-actions">
            <Link href="/upload" className="primary-button">
              Upload statement
            </Link>
            <Link href="/review" className="secondary-button">
              Open review
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="summary-band">
        <article className="summary-item">
          <p className="eyebrow">Latest active month</p>
          <p className="summary-value">
            {latestMonth ? formatMonthLabel(latestMonth.month) : "No data yet"}
          </p>
          <p className="summary-copy">
            {latestMonth
              ? `${formatCurrency(latestMonth.spendCents)} in spend across ${latestMonth.statementCount} statement${latestMonth.statementCount === 1 ? "" : "s"}${latestMonth.paymentCents > 0 ? `, with ${formatCurrency(latestMonth.paymentCents)} in payments kept out of spend` : ""}`
              : "Import a CSV or spreadsheet statement to create your first month page."}
          </p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Pending review</p>
          <p className="summary-value">{overview.pendingTransactionCount}</p>
          <p className="summary-copy">
            {overview.pendingMerchantCount} merchant group
            {overview.pendingMerchantCount === 1 ? "" : "s"} still need a category decision.
          </p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Imported statements</p>
          <p className="summary-value">{overview.stats.importedStatementCount}</p>
          <p className="summary-copy">
            {overview.stats.parsedMonthCount} parsed month{overview.stats.parsedMonthCount === 1 ? "" : "s"} are ready to browse.
          </p>
        </article>
      </section>

      <section className="content-grid">
        <div className="space-y-6">
          <SectionCard
            eyebrow="Month Atlas"
            title="Jump straight into a calendar month"
            description="Each month page merges actual posted transactions across every bank and card, even when a single statement spills across multiple months."
          >
            {overview.monthCards.length > 0 ? (
              <div className="stack-list">
                {overview.monthCards.map((month) => (
                  <Link key={month.month} href={`/months/${month.month}`} className="month-row">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="month-row-title">{formatMonthLabel(month.month)}</h3>
                        {month.topCategoryName ? (
                          <span className="chip">{month.topCategoryName}</span>
                        ) : null}
                      </div>
                      <p className="section-copy">
                        {month.statementCount} statement{month.statementCount === 1 ? "" : "s"} across {month.accountCount} account
                        {month.accountCount === 1 ? "" : "s"} / {month.transactionCount} transaction
                        {month.transactionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="month-row-metrics">
                      <div>
                        <p className="eyebrow">Spend</p>
                        <p className="month-row-amount">{formatCurrency(month.spendCents)}</p>
                      </div>
                      <div>
                        <p className="eyebrow">Needs review</p>
                        <p className="month-row-amount">{month.pendingCount}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No month pages yet"
                description="The app will build month pages automatically from each transaction's posted date, so cross-month statements just work."
                actionHref="/upload"
                actionLabel="Upload first statement"
              />
            )}
          </SectionCard>

          {!overview.hasData ? (
            <SectionCard
              eyebrow="Starter Data"
              title="Want to test the new flows before using your real statements?"
              description="Load demo data to see month pages, review queues, and statement history in a safe sandbox."
            >
              <form action={loadDemoDataAction}>
                <button type="submit" className="secondary-button">
                  Load demo workspace
                </button>
              </form>
            </SectionCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Review Queue"
            title="Merchant memory waiting to be taught"
            description="The grouped queue focuses on reusable decisions first, so one category choice can clear several transactions at once."
            action={
              <Link href="/review" className="sidebar-link">
                Open review
              </Link>
            }
          >
            {overview.reviewQueue.length > 0 ? (
              <div className="stack-list">
                {overview.reviewQueue.map((group) => (
                  <Link key={group.normalizedMerchant} href="/review" className="queue-row">
                    <div className="space-y-1">
                      <p className="font-semibold text-stone-900">{group.displayName}</p>
                      <p className="section-copy">
                        {group.transactionCount} transaction{group.transactionCount === 1 ? "" : "s"} across {group.months.map(formatMonthLabel).join(", ")}
                      </p>
                    </div>
                    <p className="queue-row-amount">{formatCurrency(group.spendCents)}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nothing waiting in review"
                description="Once the app sees a merchant it cannot categorize yet, it will appear here and on the review page."
              />
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Recent Imports"
            title="Latest statement activity"
            description="Statements stay visible as imports with an auto-derived cycle label, while their transactions are distributed into the right month pages."
            action={
              <Link href="/statements" className="sidebar-link">
                View all
              </Link>
            }
          >
            {overview.recentStatements.length > 0 ? (
              <div className="stack-list">
                {overview.recentStatements.map((statement) => (
                  <div key={statement.id} className="import-row">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-stone-900">
                          {statement.bankName}
                          {statement.accountLabel ? ` / ${statement.accountLabel}` : ""}
                        </p>
                        <StatementStatusBadge status={statement.status} />
                      </div>
                      <p className="section-copy">
                        {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
                      </p>
                    </div>
                    <p className="queue-row-amount">{formatCurrency(statement.spendCents)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No imports yet"
                description="Upload a statement and it will appear here together with the months it contributes to."
                actionHref="/upload"
                actionLabel="Go to upload"
              />
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
