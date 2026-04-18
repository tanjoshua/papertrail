import Link from "next/link";
import { assignCategoryAction } from "@/app/actions";
import { getMonthDetailData } from "@/lib/expenses";
import { formatCurrency, formatMonthLabel, getReadableTextColor, percentage } from "@/lib/format";
import {
  EmptyState,
  MessageBanner,
  PageHeader,
  SectionCard,
  StatementStatusBadge,
  TransactionKindBadge,
} from "@/app/(workspace)/_components/workspace-ui";

type MonthPageProps = {
  params: Promise<{
    month: string;
  }>;
  searchParams?: Promise<{
    message?: string;
  }>;
};

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function MonthPage({ params, searchParams }: MonthPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const data = getMonthDetailData(resolvedParams.month);
  const returnTo = `/months/${data.month}`;
  const coverage =
    data.summary.reviewableTransactionCount > 0
      ? percentage(data.summary.categorizedCount, data.summary.reviewableTransactionCount)
      : 100;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Month Page"
        title={formatMonthLabel(data.month)}
        description="This page combines every posted transaction that landed in the selected calendar month, no matter which statement or bank the rows came from."
        actions={
          <div className="header-actions">
            <Link href={`/review?month=${data.month}`} className="secondary-button">
              Review this month
            </Link>
            <Link href="/upload" className="primary-button">
              Add another statement
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="summary-band">
        <article className="summary-item">
          <p className="eyebrow">Spend</p>
          <p className="summary-value">{formatCurrency(data.summary.spendCents)}</p>
          <p className="summary-copy">
            Net movement {formatCurrency(data.summary.netCents)} after {formatCurrency(data.summary.refundCents)} in refunds.
          </p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Coverage</p>
          <p className="summary-value">{coverage}%</p>
          <p className="summary-copy">
            {data.summary.reviewableTransactionCount > 0
              ? `${data.summary.categorizedCount} of ${data.summary.reviewableTransactionCount} reviewable transactions already have a category.`
              : "This month only contains activity that does not need merchant categorization."}
          </p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Card payments</p>
          <p className="summary-value">{formatCurrency(data.summary.paymentCents)}</p>
          <p className="summary-copy">
            {data.summary.paymentCents > 0
              ? "Recognized automatically and excluded from spend and review."
              : "No payment rows were detected in this month."}
          </p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Needs review</p>
          <p className="summary-value">{data.summary.pendingCount}</p>
          <p className="summary-copy">
            {data.summary.topCategoryName ? `Top category: ${data.summary.topCategoryName}.` : "Categories appear after you start classifying merchants."}
          </p>
        </article>
      </section>

      <section className="content-grid">
        <div className="space-y-6">
          <SectionCard
            eyebrow="Breakdown"
            title={`How ${formatMonthLabel(data.month)} was spent`}
            description="Category bars are calculated from positive spend, so refunds do not flatten your real spending picture."
          >
            {data.categoryBreakdown.length > 0 ? (
              <div className="space-y-4">
                {data.categoryBreakdown.map((category) => (
                  <div key={category.name} className="breakdown-row">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <div>
                          <p className="font-semibold text-stone-900">{category.name}</p>
                          <p className="section-copy">
                            {category.transactionCount} transaction{category.transactionCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-stone-900">{formatCurrency(category.totalCents)}</p>
                        <p className="section-copy">{Math.round(category.share * 100)}% of categorized outflow</p>
                      </div>
                    </div>
                    <div className="meter-track">
                      <div
                        className="meter-fill"
                        style={{
                          backgroundColor: category.color,
                          width: `${Math.max(6, Math.round(category.share * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No categorized spend yet"
                description="As soon as you classify transactions, the month breakdown will start to show where your money went."
              />
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Sources"
            title="Which accounts contributed to this month"
            description="This is where multiple banks and cards for the same month stay legible instead of blending together."
          >
            {data.accounts.length > 0 ? (
              <div className="stack-list">
                {data.accounts.map((account) => (
                  <div
                    key={`${account.bankName}-${account.accountLabel ?? "default"}`}
                    className="account-row"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-stone-900">
                        {account.bankName}
                        {account.accountLabel ? ` / ${account.accountLabel}` : ""}
                      </p>
                      <p className="section-copy">
                        {account.statementCount} statement{account.statementCount === 1 ? "" : "s"} / {account.transactionCount} transaction
                        {account.transactionCount === 1 ? "" : "s"} / {account.pendingCount} pending
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900">{formatCurrency(account.monthSpendCents)}</p>
                      <p className="section-copy">
                        {account.monthPaymentCents > 0
                          ? `Payments ${formatCurrency(account.monthPaymentCents)} / Net ${formatCurrency(account.monthNetCents)}`
                          : `Net ${formatCurrency(account.monthNetCents)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No account activity"
                description="This month does not have any imported transactions yet."
              />
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Timeline"
            title="Transaction ledger"
            description="Uncategorized rows can be fixed in place here, while grouped reusable review happens on the review page."
          >
            {data.timeline.length > 0 ? (
              <div className="space-y-6">
                {data.timeline.map((day) => (
                  <div key={day.date} className="space-y-3">
                    <div className="timeline-day">
                      <p className="font-semibold text-stone-900">{formatDay(day.date)}</p>
                      <p className="section-copy">{formatCurrency(day.totalCents)}</p>
                    </div>

                    <div className="stack-list">
                      {day.items.map((item) => (
                        <article key={item.id} className="transaction-row">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="font-semibold text-stone-900">{item.merchantName}</p>
                              <span className="chip">
                                {item.bankName}
                                {item.accountLabel ? ` / ${item.accountLabel}` : ""}
                              </span>
                              {item.transactionKind !== "expense" ? (
                                <TransactionKindBadge kind={item.transactionKind} />
                              ) : null}
                            </div>
                            <p className="section-copy">{item.rawDescription}</p>
                          </div>

                          <div className="transaction-side">
                            <p className="transaction-amount">{formatCurrency(item.amountCents)}</p>

                            {item.categoryId ? (
                              <span
                                className="category-pill"
                                style={{
                                  backgroundColor: item.categoryColor ?? "#e7dfd3",
                                  color: item.categoryColor
                                    ? getReadableTextColor(item.categoryColor)
                                    : "#435148",
                                }}
                              >
                                {item.categoryName}
                              </span>
                            ) : item.transactionKind === "payment" ? (
                              <div className="space-y-1 text-right">
                                <TransactionKindBadge kind={item.transactionKind} />
                                <p className="section-copy">Excluded from spend and category review.</p>
                              </div>
                            ) : (
                              <form action={assignCategoryAction} className="inline-review-form">
                                <input type="hidden" name="transactionId" value={item.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <select name="categoryId" defaultValue="" className="field field-compact" required>
                                  <option value="" disabled>
                                    Pick category
                                  </option>
                                  {data.categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                                <div className="inline-review-actions">
                                  <button type="submit" name="scope" value="once" className="secondary-button compact-button">
                                    Only this
                                  </button>
                                  <button type="submit" name="scope" value="future" className="primary-button compact-button">
                                    Save rule
                                  </button>
                                </div>
                              </form>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No transactions in this month"
                description="Once a parsed statement contains rows posted in this month, they will appear here automatically."
                actionHref="/upload"
                actionLabel="Upload statement"
              />
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            eyebrow="Statements"
            title="Which statement files fed this month"
            description="A single statement can contribute to multiple month pages, and you can hop from here into any month it touched."
          >
            {data.statementContributions.length > 0 ? (
              <div className="stack-list">
                {data.statementContributions.map((statement) => (
                  <div key={statement.id} className="statement-row">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-stone-900">
                          {statement.bankName}
                          {statement.accountLabel ? ` / ${statement.accountLabel}` : ""}
                        </p>
                        <StatementStatusBadge status={statement.status} />
                      </div>
                      <p className="section-copy">
                        Cycle label {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
                      </p>
                      <div className="chip-row">
                        {statement.monthsTouched.map((month) => (
                          <Link key={month} href={`/months/${month}`} className="chip">
                            {formatMonthLabel(month)}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-stone-900">{formatCurrency(statement.monthSpendCents)}</p>
                      <p className="section-copy">
                        {statement.monthTransactionCount} row{statement.monthTransactionCount === 1 ? "" : "s"} in this month
                        {statement.monthPaymentCents > 0 ? ` / Payments ${formatCurrency(statement.monthPaymentCents)}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No statements mapped yet"
                description="Statement contributions will show up here once a parsed upload has rows inside this month."
              />
            )}
          </SectionCard>

          <SectionCard
            eyebrow="Review"
            title="Merchants still waiting in this month"
            description="Use the grouped action below when you want to teach the app a merchant once and apply it everywhere the same normalized merchant appears."
            action={
              <Link href={`/review?month=${data.month}`} className="sidebar-link">
                Open grouped review
              </Link>
            }
          >
            {data.reviewQueue.length > 0 ? (
              <div className="space-y-4">
                {data.reviewQueue.map((group) => (
                  <article key={group.normalizedMerchant} className="review-group-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-stone-900">{group.displayName}</p>
                        <p className="section-copy">
                          {group.transactionCount} transaction{group.transactionCount === 1 ? "" : "s"} / {group.banks.join(", ")}
                        </p>
                      </div>
                      <p className="transaction-amount">{formatCurrency(group.spendCents)}</p>
                    </div>

                    <form action={assignCategoryAction} className="review-rule-form">
                      <input type="hidden" name="transactionId" value={group.representativeTransactionId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="scope" value="future" />
                      <select name="categoryId" defaultValue="" className="field" required>
                        <option value="" disabled>
                          Save a reusable category
                        </option>
                        {data.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="primary-button">
                        Save merchant rule
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nothing waiting in this month"
                description="When a new merchant appears in this month, it will show up here for a reusable rule decision."
              />
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
