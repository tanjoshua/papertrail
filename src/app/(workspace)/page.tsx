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
  SummaryCard,
  buttonLinkClassName,
  chipClassName,
  textLinkClassName,
  workspaceContentGridClassName,
  workspaceHeaderActionsClassName,
  workspaceLargeLabelClassName,
  workspaceMetricGroupClassName,
  workspacePageStackClassName,
  workspaceSectionCopyClassName,
  workspaceStackListClassName,
  workspaceSurfaceRowInteractiveClassName,
  workspaceThreeSummaryGridClassName,
  workspaceEyebrowClassName,
  workspaceSummaryValueClassName,
  workspaceStatTextClassName,
} from "./_components/workspace-ui";
import { Button } from "@/components/ui/button";

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
    <div className={workspacePageStackClassName}>
      <PageHeader
        eyebrow="Overview"
        title="One home for month pages, open review work, and every imported statement."
        description="The homepage is now a launchpad instead of a dumping ground. Start from the month you want to understand, the merchants that still need decisions, or the next statement you want to ingest."
        actions={
          <div className={workspaceHeaderActionsClassName}>
            <Link href="/upload" className={buttonLinkClassName()}>
              Upload statement
            </Link>
            <Link href="/review" className={buttonLinkClassName({ variant: "outline" })}>
              Open review
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className={workspaceThreeSummaryGridClassName}>
        <SummaryCard
          eyebrow="Latest active month"
          value={latestMonth ? formatMonthLabel(latestMonth.month) : "No data yet"}
          description={
            latestMonth
              ? `${formatCurrency(latestMonth.spendCents)} in spend across ${latestMonth.statementCount} statement${latestMonth.statementCount === 1 ? "" : "s"}${latestMonth.paymentCents + latestMonth.depositCents + latestMonth.transferCents > 0 ? `, with ${formatCurrency(latestMonth.paymentCents + latestMonth.depositCents + latestMonth.transferCents)} in excluded activity` : ""}`
              : "Import a CSV or spreadsheet statement to create your first month page."
          }
        />
        <SummaryCard
          eyebrow="Pending review"
          value={overview.pendingTransactionCount}
          description={`${overview.pendingMerchantCount} merchant group${overview.pendingMerchantCount === 1 ? "" : "s"} still need a category decision.`}
        />
        <SummaryCard
          eyebrow="Imported statements"
          value={overview.stats.importedStatementCount}
          description={`${overview.stats.parsedMonthCount} parsed month${overview.stats.parsedMonthCount === 1 ? "" : "s"} are ready to browse.`}
        />
      </section>

      <section className={workspaceContentGridClassName}>
        <div className="flex flex-col gap-6">
          <SectionCard
            eyebrow="Month Atlas"
            title="Jump straight into a calendar month"
            description="Each month page merges actual posted transactions across every bank and card, even when a single statement spills across multiple months."
          >
            {overview.monthCards.length > 0 ? (
              <div className={workspaceStackListClassName}>
                {overview.monthCards.map((month) => (
                  <Link key={month.month} href={`/months/${month.month}`} className={workspaceSurfaceRowInteractiveClassName}>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className={workspaceLargeLabelClassName}>{formatMonthLabel(month.month)}</h3>
                        {month.topCategoryName ? (
                          <span className={chipClassName()}>{month.topCategoryName}</span>
                        ) : null}
                      </div>
                      <p className={workspaceSectionCopyClassName}>
                        {month.statementCount} statement{month.statementCount === 1 ? "" : "s"} across {month.accountCount} account
                        {month.accountCount === 1 ? "" : "s"} / {month.transactionCount} transaction
                        {month.transactionCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className={workspaceMetricGroupClassName}>
                      <div>
                        <p className={workspaceEyebrowClassName}>Spend</p>
                        <p className={workspaceSummaryValueClassName}>{formatCurrency(month.spendCents)}</p>
                      </div>
                      <div>
                        <p className={workspaceEyebrowClassName}>Needs review</p>
                        <p className={workspaceSummaryValueClassName}>{month.pendingCount}</p>
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
                <Button type="submit" variant="outline">
                  Load demo workspace
                </Button>
              </form>
            </SectionCard>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <SectionCard
            eyebrow="Review Queue"
            title="Merchant memory waiting to be taught"
            description="The grouped queue focuses on reusable decisions first, so one category choice can clear several transactions at once."
            action={
              <Link href="/review" className={textLinkClassName()}>
                Open review
              </Link>
            }
          >
            {overview.reviewQueue.length > 0 ? (
              <div className={workspaceStackListClassName}>
                {overview.reviewQueue.map((group) => (
                  <Link key={group.normalizedMerchant} href="/review" className={workspaceSurfaceRowInteractiveClassName}>
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-foreground">{group.displayName}</p>
                      <p className={workspaceSectionCopyClassName}>
                        {group.transactionCount} transaction{group.transactionCount === 1 ? "" : "s"} across {group.months.map(formatMonthLabel).join(", ")}
                      </p>
                    </div>
                    <p className={workspaceStatTextClassName}>{formatCurrency(group.spendCents)}</p>
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
              <Link href="/statements" className={textLinkClassName()}>
                View all
              </Link>
            }
          >
            {overview.recentStatements.length > 0 ? (
              <div className={workspaceStackListClassName}>
                {overview.recentStatements.map((statement) => (
                  <div key={statement.id} className={workspaceSurfaceRowInteractiveClassName}>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-foreground">
                          {statement.bankName}
                          {statement.accountLabel ? ` / ${statement.accountLabel}` : ""}
                        </p>
                        <StatementStatusBadge status={statement.status} />
                      </div>
                      <p className={workspaceSectionCopyClassName}>
                        {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
                      </p>
                    </div>
                    <p className={workspaceStatTextClassName}>{formatCurrency(statement.spendCents)}</p>
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
