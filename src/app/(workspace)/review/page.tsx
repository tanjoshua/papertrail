import Link from "next/link";
import { assignCategoryAction, updateRuleAction } from "@/app/actions";
import { getReviewPageData } from "@/lib/expenses";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import {
  EmptyState,
  MessageBanner,
  PageHeader,
  SectionCard,
  TransactionKindBadge,
} from "@/app/(workspace)/_components/workspace-ui";

type ReviewPageProps = {
  searchParams?: Promise<{
    message?: string;
    memoryCategory?: string;
    month?: string;
  }>;
};

function getReviewHref({
  memoryCategory,
  month,
}: {
  memoryCategory: string | null;
  month: string | null;
}) {
  const params = new URLSearchParams();

  if (month) {
    params.set("month", month);
  }

  if (memoryCategory) {
    params.set("memoryCategory", memoryCategory);
  }

  const query = params.toString();
  return query ? `/review?${query}` : "/review";
}

function getReturnTo(month: string | null, memoryCategory: string | null) {
  return getReviewHref({ memoryCategory, month });
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const requestedMonth = typeof resolvedSearchParams.month === "string" ? resolvedSearchParams.month : undefined;
  const requestedMemoryCategory =
    typeof resolvedSearchParams.memoryCategory === "string" ? resolvedSearchParams.memoryCategory : undefined;
  const data = getReviewPageData(requestedMonth, requestedMemoryCategory);
  const returnTo = getReturnTo(data.selectedMonth, data.selectedRuleCategoryId);
  const visibleRuleGroups = data.selectedRuleCategoryId
    ? data.ruleGroups.filter((group) => group.categoryId === data.selectedRuleCategoryId)
    : data.ruleGroups;
  const selectedRuleGroup = data.selectedRuleCategoryId
    ? data.ruleGroups.find((group) => group.categoryId === data.selectedRuleCategoryId) ?? null
    : null;
  const visibleRuleCount = visibleRuleGroups.reduce((total, group) => total + group.ruleCount, 0);
  const visibleUsageCount = visibleRuleGroups.reduce((total, group) => total + group.usageCount, 0);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Review"
        title="Teach the app merchant memory instead of fixing the same thing over and over."
        description="The review page groups uncategorized merchants so the highest-value action is obvious: save a reusable rule when the merchant pattern is stable, then revisit one-off oddities from the month page only when needed."
        actions={
          <div className="header-actions">
            <Link href="/categories" className="secondary-button">
              Manage categories
            </Link>
            <Link href="/upload" className="secondary-button">
              Upload more
            </Link>
            {data.selectedMonth ? (
              <Link href={`/months/${data.selectedMonth}`} className="primary-button">
                Open month page
              </Link>
            ) : null}
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="summary-band">
        <article className="summary-item">
          <p className="eyebrow">Scope</p>
          <p className="summary-value">
            {data.selectedMonth ? formatMonthLabel(data.selectedMonth) : "All months"}
          </p>
          <p className="summary-copy">Filter the queue to a single month when you want to clear a specific reconciliation window.</p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Merchant groups</p>
          <p className="summary-value">{data.summary.pendingMerchantCount}</p>
          <p className="summary-copy">
            Grouping by normalized merchant keeps repeated unknowns from scattering across the UI.
          </p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Pending rows</p>
          <p className="summary-value">{data.summary.pendingTransactionCount}</p>
          <p className="summary-copy">
            These are the individual transactions that still need a category decision.
          </p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Unclassified spend</p>
          <p className="summary-value">{formatCurrency(data.summary.totalSpendCents)}</p>
          <p className="summary-copy">
            Payments are already excluded, so this reflects real spend still waiting on a category.
          </p>
        </article>
      </section>

      <SectionCard
        eyebrow="Filters"
        title="Focus the review queue"
        description="Choose all months or zoom into one month page's unresolved merchants."
      >
        <div className="chip-row">
          <Link
            href={getReviewHref({ memoryCategory: data.selectedRuleCategoryId, month: null })}
            scroll={false}
            className={!data.selectedMonth ? "chip chip-active" : "chip"}
          >
            All months
          </Link>
          {data.availableMonths.map((month) => (
            <Link
              key={month}
              href={getReviewHref({ memoryCategory: data.selectedRuleCategoryId, month })}
              scroll={false}
              className={data.selectedMonth === month ? "chip chip-active" : "chip"}
            >
              {formatMonthLabel(month)}
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Queue"
        title="Grouped merchants waiting for a reusable rule"
        description="Use the reusable action here first. If a merchant is truly one-off, jump to the month page from one of its transactions."
      >
        {data.reviewQueue.length > 0 ? (
          <div className="space-y-4">
            {data.reviewQueue.map((group) => (
              <article key={group.normalizedMerchant} className="review-group-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-stone-900">{group.displayName}</p>
                    <p className="section-copy">
                      {group.transactionCount} transaction{group.transactionCount === 1 ? "" : "s"} across {group.months.map(formatMonthLabel).join(", ")}
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

                <div className="stack-list stack-list-tight">
                  {group.transactions.slice(0, 4).map((transaction) => (
                    <div key={transaction.id} className="queue-transaction-row">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-medium text-stone-900">{transaction.rawDescription}</p>
                          {transaction.transactionKind !== "expense" ? (
                            <TransactionKindBadge kind={transaction.transactionKind} />
                          ) : null}
                        </div>
                        <p className="section-copy">
                          {formatDay(transaction.postedAt)} / {transaction.bankName}
                          {transaction.accountLabel ? ` / ${transaction.accountLabel}` : ""} / {formatMonthLabel(transaction.month)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="queue-row-amount">{formatCurrency(transaction.amountCents)}</p>
                        <Link href={`/months/${transaction.month}`} className="sidebar-link">
                          Open month
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="The queue is clear"
            description="Every merchant currently has a category. The next unknown import will land here automatically."
          />
        )}
      </SectionCard>

      <SectionCard
        eyebrow="Memory"
        title="Merchant memory library"
        description="Rules are easier to manage as a browsable library than a long sidebar list. Scan every category at once, or drill into one spending bucket when you want to audit it."
        action={
          data.selectedRuleCategoryId ? (
            <Link
              href={getReviewHref({ memoryCategory: null, month: data.selectedMonth })}
              scroll={false}
              className="sidebar-link"
            >
              Show all categories
            </Link>
          ) : null
        }
      >
        {data.ruleGroups.length > 0 ? (
          <div className="memory-library">
            <div className="memory-tab-strip" aria-label="Merchant memory categories">
              <Link
                href={getReviewHref({ memoryCategory: null, month: data.selectedMonth })}
                scroll={false}
                className={!data.selectedRuleCategoryId ? "memory-tab memory-tab-active" : "memory-tab"}
                aria-current={!data.selectedRuleCategoryId ? "page" : undefined}
              >
                <div className="memory-tab-copy">
                  <span className="memory-tab-label">All categories</span>
                  <span className="memory-tab-meta">
                    {data.memorySummary.activeCategoryCount} active categor{data.memorySummary.activeCategoryCount === 1 ? "y" : "ies"}
                  </span>
                </div>
                <span className="memory-tab-count">{data.memorySummary.totalRuleCount}</span>
              </Link>

              {data.ruleGroups.map((group) => (
                <Link
                  key={group.categoryId}
                  href={getReviewHref({ memoryCategory: group.categoryId, month: data.selectedMonth })}
                  scroll={false}
                  className={data.selectedRuleCategoryId === group.categoryId ? "memory-tab memory-tab-active" : "memory-tab"}
                  aria-current={data.selectedRuleCategoryId === group.categoryId ? "page" : undefined}
                >
                  <div className="memory-tab-copy">
                    <span className="memory-tab-label">
                      <span className="memory-color-dot" style={{ backgroundColor: group.color }} />
                      {group.categoryName}
                    </span>
                    <span className="memory-tab-meta">
                      seen {group.usageCount} time{group.usageCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className="memory-tab-count">{group.ruleCount}</span>
                </Link>
              ))}
            </div>

            <div className="memory-summary-grid">
              <article className="memory-summary-item">
                <p className="eyebrow">Scope</p>
                <p className="memory-summary-value">{selectedRuleGroup ? selectedRuleGroup.categoryName : "All categories"}</p>
                <p className="section-copy">
                  {selectedRuleGroup
                    ? "A focused audit view for one category's reusable merchant memory."
                    : "Browse the entire library first, then narrow down only when a category needs attention."}
                </p>
              </article>

              <article className="memory-summary-item">
                <p className="eyebrow">Saved rules</p>
                <p className="memory-summary-value">{visibleRuleCount}</p>
                <p className="section-copy">
                  Merchant memor{visibleRuleCount === 1 ? "y entry" : "y entries"} available in this view.
                </p>
              </article>

              <article className="memory-summary-item">
                <p className="eyebrow">Historical matches</p>
                <p className="memory-summary-value">{visibleUsageCount}</p>
                <p className="section-copy">
                  Past transactions that already map to these reusable decisions.
                </p>
              </article>
            </div>

            <div className="memory-category-stack">
              {visibleRuleGroups.map((group) => (
                <section key={group.categoryId} className="memory-category-block">
                  {!selectedRuleGroup ? (
                    <div className="memory-category-heading">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="memory-color-dot" style={{ backgroundColor: group.color }} />
                        <h3 className="memory-category-title">{group.categoryName}</h3>
                        <span className="chip">
                          {group.ruleCount} merchant{group.ruleCount === 1 ? "" : "s"}
                        </span>
                      </div>
                      <p className="section-copy">
                        Seen {group.usageCount} time{group.usageCount === 1 ? "" : "s"} across imported history.
                      </p>
                    </div>
                  ) : null}

                  <div className="memory-rule-list">
                    {group.rules.map((rule) => (
                      <article key={rule.id} className="memory-rule-row">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-stone-900">{rule.displayName}</p>
                            {selectedRuleGroup ? (
                              <span className="chip">
                                seen {rule.usageCount} time{rule.usageCount === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </div>
                          <p className="section-copy">
                            Matches <code>{rule.normalizedMerchant}</code> / seen {rule.usageCount} time
                            {rule.usageCount === 1 ? "" : "s"}
                          </p>
                        </div>

                        <form action={updateRuleAction} className="memory-rule-form">
                          <input type="hidden" name="ruleId" value={rule.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <select name="categoryId" defaultValue={rule.categoryId} className="field">
                            {data.categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="secondary-button">
                            Update rule
                          </button>
                        </form>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No merchant memory yet"
            description="When you save your first reusable categorization from the queue, it will appear here grouped under its category."
          />
        )}
      </SectionCard>
    </div>
  );
}
