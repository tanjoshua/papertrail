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
  SummaryCard,
  buttonLinkClassName,
  chipClassName,
  textLinkClassName,
  workspaceCardGridClassName,
  workspaceHeaderActionsClassName,
  workspacePageStackClassName,
  workspaceSectionCopyClassName,
  workspaceStackListTightClassName,
  workspaceStatTextClassName,
  workspaceTabsGridClassName,
  workspaceTabActiveClassName,
  workspaceTabClassName,
  workspaceTabCountClassName,
  workspaceTabMetaClassName,
  workspaceCategoryBlockClassName,
  workspaceSectionTitleClassName,
  workspaceSummaryGridClassName,
  workspaceFormTwoColumnClassName,
} from "@/app/(workspace)/_components/workspace-ui";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className={workspacePageStackClassName}>
      <PageHeader
        eyebrow="Review"
        title="Teach the app merchant memory instead of fixing the same thing over and over."
        description="The review page groups uncategorized merchants so the highest-value action is obvious: save a reusable rule when the merchant pattern is stable, then revisit one-off oddities from the month page only when needed."
        actions={
          <div className={workspaceHeaderActionsClassName}>
            <Link href="/categories" className={buttonLinkClassName({ variant: "outline" })}>
              Manage categories
            </Link>
            <Link href="/upload" className={buttonLinkClassName({ variant: "outline" })}>
              Upload more
            </Link>
            {data.selectedMonth ? (
              <Link href={`/months/${data.selectedMonth}`} className={buttonLinkClassName()}>
                Open month page
              </Link>
            ) : null}
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          eyebrow="Scope"
          value={data.selectedMonth ? formatMonthLabel(data.selectedMonth) : "All months"}
          description="Filter the queue to a single month when you want to clear a specific reconciliation window."
        />
        <SummaryCard
          eyebrow="Merchant groups"
          value={data.summary.pendingMerchantCount}
          description="Grouping by normalized merchant keeps repeated unknowns from scattering across the UI."
        />
        <SummaryCard
          eyebrow="Pending rows"
          value={data.summary.pendingTransactionCount}
          description="These are the individual transactions that still need a category decision."
        />
        <SummaryCard
          eyebrow="Unclassified spend"
          value={formatCurrency(data.summary.totalSpendCents)}
          description="Payments are already excluded, so this reflects real spend still waiting on a category."
        />
      </section>

      <SectionCard
        eyebrow="Filters"
        title="Focus the review queue"
        description="Choose all months or zoom into one month page's unresolved merchants."
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href={getReviewHref({ memoryCategory: data.selectedRuleCategoryId, month: null })}
            scroll={false}
            className={chipClassName({ active: !data.selectedMonth })}
          >
            All months
          </Link>
          {data.availableMonths.map((month) => (
            <Link
              key={month}
              href={getReviewHref({ memoryCategory: data.selectedRuleCategoryId, month })}
              scroll={false}
              className={chipClassName({ active: data.selectedMonth === month })}
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
          <div className="flex flex-col gap-4">
            {data.reviewQueue.map((group) => (
              <Card key={group.normalizedMerchant} size="sm">
                <CardHeader>
                  <CardTitle>{group.displayName}</CardTitle>
                  <CardDescription className={workspaceSectionCopyClassName}>
                      {group.transactionCount} transaction{group.transactionCount === 1 ? "" : "s"} across {group.months.map(formatMonthLabel).join(", ")}
                  </CardDescription>
                  <CardAction className="text-lg font-semibold text-foreground">
                    {formatCurrency(group.spendCents)}
                  </CardAction>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  <form action={assignCategoryAction}>
                    <input type="hidden" name="transactionId" value={group.representativeTransactionId} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="scope" value="future" />
                    <FieldGroup className={workspaceFormTwoColumnClassName}>
                      <Field>
                        <FieldLabel htmlFor={`review-category-${group.normalizedMerchant}`} className="sr-only">
                          Save a reusable category
                        </FieldLabel>
                        <NativeSelect
                          id={`review-category-${group.normalizedMerchant}`}
                          name="categoryId"
                          defaultValue=""
                          className="w-full"
                          required
                        >
                          <NativeSelectOption value="" disabled>
                            Save a reusable category
                          </NativeSelectOption>
                          {data.categories.map((category) => (
                            <NativeSelectOption key={category.id} value={category.id}>
                              {category.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </Field>
                      <Button type="submit">Save merchant rule</Button>
                    </FieldGroup>
                  </form>

                  <div className={workspaceStackListTightClassName}>
                    {group.transactions.slice(0, 4).map((transaction) => (
                      <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/20 p-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-medium text-foreground">{transaction.rawDescription}</p>
                            {transaction.transactionKind !== "expense" ? (
                              <TransactionKindBadge kind={transaction.transactionKind} />
                            ) : null}
                          </div>
                          <p className={workspaceSectionCopyClassName}>
                            {formatDay(transaction.postedAt)} / {transaction.bankName}
                            {transaction.accountLabel ? ` / ${transaction.accountLabel}` : ""} / {formatMonthLabel(transaction.month)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={workspaceStatTextClassName}>{formatCurrency(transaction.amountCents)}</p>
                          <Link href={`/months/${transaction.month}`} className={textLinkClassName()}>
                            Open month
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
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
              className={textLinkClassName()}
            >
              Show all categories
            </Link>
          ) : null
        }
      >
        {data.ruleGroups.length > 0 ? (
          <div className={workspaceCardGridClassName}>
            <div className={workspaceTabsGridClassName} aria-label="Merchant memory categories">
              <Link
                href={getReviewHref({ memoryCategory: null, month: data.selectedMonth })}
                scroll={false}
                className={!data.selectedRuleCategoryId ? `${workspaceTabClassName} ${workspaceTabActiveClassName}` : workspaceTabClassName}
                aria-current={!data.selectedRuleCategoryId ? "page" : undefined}
              >
                <div className="grid gap-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">All categories</span>
                  <span className={workspaceTabMetaClassName}>
                    {data.memorySummary.activeCategoryCount} active categor{data.memorySummary.activeCategoryCount === 1 ? "y" : "ies"}
                  </span>
                </div>
                <span className={workspaceTabCountClassName}>{data.memorySummary.totalRuleCount}</span>
              </Link>

              {data.ruleGroups.map((group) => (
                <Link
                  key={group.categoryId}
                  href={getReviewHref({ memoryCategory: group.categoryId, month: data.selectedMonth })}
                  scroll={false}
                  className={data.selectedRuleCategoryId === group.categoryId ? `${workspaceTabClassName} ${workspaceTabActiveClassName}` : workspaceTabClassName}
                  aria-current={data.selectedRuleCategoryId === group.categoryId ? "page" : undefined}
                >
                  <div className="grid gap-1">
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className="size-2.5 rounded-full border" style={{ backgroundColor: group.color }} />
                      {group.categoryName}
                    </span>
                    <span className={workspaceTabMetaClassName}>
                      seen {group.usageCount} time{group.usageCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <span className={workspaceTabCountClassName}>{group.ruleCount}</span>
                </Link>
              ))}
            </div>

            <div className={workspaceSummaryGridClassName}>
              <SummaryCard
                eyebrow="Scope"
                value={selectedRuleGroup ? selectedRuleGroup.categoryName : "All categories"}
                description={
                  selectedRuleGroup
                    ? "A focused audit view for one category's reusable merchant memory."
                    : "Browse the entire library first, then narrow down only when a category needs attention."
                }
              />

              <SummaryCard
                eyebrow="Saved rules"
                value={visibleRuleCount}
                description={`Merchant memor${visibleRuleCount === 1 ? "y entry" : "y entries"} available in this view.`}
              />

              <SummaryCard
                eyebrow="Historical matches"
                value={visibleUsageCount}
                description="Past transactions that already map to these reusable decisions."
              />
            </div>

            <div className={workspaceCardGridClassName}>
              {visibleRuleGroups.map((group) => (
                <section key={group.categoryId} className={workspaceCategoryBlockClassName}>
                  {!selectedRuleGroup ? (
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="size-2.5 rounded-full border" style={{ backgroundColor: group.color }} />
                        <h3 className={workspaceSectionTitleClassName}>{group.categoryName}</h3>
                        <Badge variant="outline">
                          {group.ruleCount} merchant{group.ruleCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <p className={workspaceSectionCopyClassName}>
                        Seen {group.usageCount} time{group.usageCount === 1 ? "" : "s"} across imported history.
                      </p>
                    </div>
                  ) : null}

                  <div className={workspaceCardGridClassName}>
                    {group.rules.map((rule) => (
                      <Card key={rule.id} size="sm">
                        <CardContent className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:items-center">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="font-semibold text-foreground">{rule.displayName}</p>
                              {selectedRuleGroup ? (
                                <Badge variant="outline">
                                  seen {rule.usageCount} time{rule.usageCount === 1 ? "" : "s"}
                                </Badge>
                              ) : null}
                            </div>
                            <p className={workspaceSectionCopyClassName}>
                              Matches <code>{rule.normalizedMerchant}</code> / seen {rule.usageCount} time
                              {rule.usageCount === 1 ? "" : "s"}
                            </p>
                          </div>

                          <form action={updateRuleAction}>
                            <input type="hidden" name="ruleId" value={rule.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <FieldGroup className={workspaceFormTwoColumnClassName}>
                              <Field>
                                <FieldLabel htmlFor={`rule-category-${rule.id}`} className="sr-only">
                                  Category
                                </FieldLabel>
                                <NativeSelect
                                  id={`rule-category-${rule.id}`}
                                  name="categoryId"
                                  defaultValue={rule.categoryId}
                                  className="w-full"
                                >
                                  {data.categories.map((category) => (
                                    <NativeSelectOption key={category.id} value={category.id}>
                                      {category.name}
                                    </NativeSelectOption>
                                  ))}
                                </NativeSelect>
                              </Field>
                              <Button type="submit" variant="outline">
                                Update rule
                              </Button>
                            </FieldGroup>
                          </form>
                        </CardContent>
                      </Card>
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
