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
  SummaryCard,
  buttonLinkClassName,
  chipClassName,
  textLinkClassName,
  workspaceContentGridClassName,
  workspaceHeaderActionsClassName,
  workspacePageStackClassName,
  workspaceSectionCopyClassName,
  workspaceStackListClassName,
  workspaceSurfaceBlockClassName,
  workspaceSurfaceRowClassName,
  workspaceMeterTrackClassName,
  workspaceMeterFillClassName,
  workspaceTimelineDayClassName,
  workspaceInlineActionsClassName,
  workspaceFormTwoColumnClassName,
  workspaceStatTextClassName,
} from "@/app/(workspace)/_components/workspace-ui";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
    <div className={workspacePageStackClassName}>
      <PageHeader
        eyebrow="Month Page"
        title={formatMonthLabel(data.month)}
        description="This page combines every posted transaction that landed in the selected calendar month, no matter which statement or bank the rows came from."
        actions={
          <div className={workspaceHeaderActionsClassName}>
            <Link href={`/review?month=${data.month}`} className={buttonLinkClassName({ variant: "outline" })}>
              Review this month
            </Link>
            <Link href="/upload" className={buttonLinkClassName()}>
              Add another statement
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          eyebrow="Spend"
          value={formatCurrency(data.summary.spendCents)}
          description={`Net movement ${formatCurrency(data.summary.netCents)} after ${formatCurrency(data.summary.refundCents)} in refunds and ${formatCurrency(data.summary.depositCents)} in deposits.`}
        />
        <SummaryCard
          eyebrow="Coverage"
          value={`${coverage}%`}
          description={
            data.summary.reviewableTransactionCount > 0
              ? `${data.summary.categorizedCount} of ${data.summary.reviewableTransactionCount} reviewable transactions already have a category.`
              : "This month only contains activity that does not need merchant categorization."
          }
        />
        <SummaryCard
          eyebrow="Excluded inflows"
          value={formatCurrency(data.summary.paymentCents + data.summary.depositCents)}
          description={
            data.summary.paymentCents + data.summary.depositCents > 0
              ? `${formatCurrency(data.summary.depositCents)} deposits / ${formatCurrency(data.summary.paymentCents)} card payments.`
              : "No excluded inflow rows were detected in this month."
          }
        />
        <SummaryCard
          eyebrow="Needs review"
          value={data.summary.pendingCount}
          description={
            data.summary.topCategoryName
              ? `Top category: ${data.summary.topCategoryName}.`
              : "Categories appear after you start classifying merchants."
          }
        />
      </section>

      <section className={workspaceContentGridClassName}>
        <div className="flex flex-col gap-6">
          <SectionCard
            eyebrow="Breakdown"
            title={`How ${formatMonthLabel(data.month)} was spent`}
            description="Category bars are calculated from positive spend, so refunds do not flatten your real spending picture."
          >
            {data.categoryBreakdown.length > 0 ? (
              <div className="flex flex-col gap-4">
                {data.categoryBreakdown.map((category) => (
                  <div key={category.name} className={workspaceSurfaceBlockClassName}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                        <div>
                          <p className="font-semibold text-foreground">{category.name}</p>
                          <p className={workspaceSectionCopyClassName}>
                            {category.transactionCount} transaction{category.transactionCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(category.totalCents)}</p>
                        <p className={workspaceSectionCopyClassName}>{Math.round(category.share * 100)}% of categorized outflow</p>
                      </div>
                    </div>
                    <div className={workspaceMeterTrackClassName}>
                      <div
                        className={workspaceMeterFillClassName}
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
              <div className={workspaceStackListClassName}>
                {data.accounts.map((account) => (
                  <div
                    key={`${account.bankName}-${account.accountLabel ?? "default"}`}
                    className={workspaceSurfaceRowClassName}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {account.bankName}
                        {account.accountLabel ? ` / ${account.accountLabel}` : ""}
                      </p>
                      <p className={workspaceSectionCopyClassName}>
                        {account.statementCount} statement{account.statementCount === 1 ? "" : "s"} / {account.transactionCount} transaction
                        {account.transactionCount === 1 ? "" : "s"} / {account.pendingCount} pending
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(account.monthSpendCents)}</p>
                      <p className={workspaceSectionCopyClassName}>
                        {account.monthPaymentCents > 0
                          ? `Payments ${formatCurrency(account.monthPaymentCents)} / Deposits ${formatCurrency(account.monthDepositCents)} / Net ${formatCurrency(account.monthNetCents)}`
                          : account.monthDepositCents > 0
                            ? `Deposits ${formatCurrency(account.monthDepositCents)} / Net ${formatCurrency(account.monthNetCents)}`
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
              <div className="flex flex-col gap-6">
                {data.timeline.map((day) => (
                  <div key={day.date} className="flex flex-col gap-3">
                    <div className={workspaceTimelineDayClassName}>
                      <p className="font-semibold text-foreground">{formatDay(day.date)}</p>
                      <p className={workspaceSectionCopyClassName}>{formatCurrency(day.totalCents)}</p>
                    </div>

                    <div className={workspaceStackListClassName}>
                      {day.items.map((item) => (
                        <article key={item.id} className="flex flex-wrap items-start justify-between gap-4 rounded-[24px] border bg-card p-4 shadow-sm">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <p className="font-semibold text-foreground">{item.merchantName}</p>
                              <span className={chipClassName()}>
                                {item.bankName}
                                {item.accountLabel ? ` / ${item.accountLabel}` : ""}
                              </span>
                              {item.transactionKind !== "expense" ? (
                                <TransactionKindBadge kind={item.transactionKind} />
                              ) : null}
                            </div>
                            <p className={workspaceSectionCopyClassName}>{item.rawDescription}</p>
                          </div>

                          <div className="flex w-full flex-wrap items-center justify-between gap-4 lg:w-auto">
                            <p className={workspaceStatTextClassName}>{formatCurrency(item.amountCents)}</p>

                            {item.categoryId ? (
                              <span
                                className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                                style={{
                                  backgroundColor: item.categoryColor ?? "#e7dfd3",
                                  color: item.categoryColor
                                    ? getReadableTextColor(item.categoryColor)
                                    : "#435148",
                                }}
                              >
                                {item.categoryName}
                              </span>
                            ) : item.transactionKind === "payment" || item.transactionKind === "deposit" ? (
                              <div className="flex flex-col gap-1 text-right">
                                <TransactionKindBadge kind={item.transactionKind} />
                                <p className={workspaceSectionCopyClassName}>Excluded from spend and category review.</p>
                              </div>
                            ) : (
                              <form action={assignCategoryAction}>
                                <input type="hidden" name="transactionId" value={item.id} />
                                <input type="hidden" name="returnTo" value={returnTo} />
                                <FieldGroup className="grid gap-3">
                                  <Field>
                                    <FieldLabel htmlFor={`transaction-category-${item.id}`} className="sr-only">
                                      Pick category
                                    </FieldLabel>
                                    <NativeSelect
                                      id={`transaction-category-${item.id}`}
                                      name="categoryId"
                                      defaultValue=""
                                      className="w-full"
                                      required
                                    >
                                      <NativeSelectOption value="" disabled>
                                        Pick category
                                      </NativeSelectOption>
                                      {data.categories.map((category) => (
                                        <NativeSelectOption key={category.id} value={category.id}>
                                          {category.name}
                                        </NativeSelectOption>
                                      ))}
                                    </NativeSelect>
                                  </Field>
                                  <div className={workspaceInlineActionsClassName}>
                                    <Button type="submit" name="scope" value="once" variant="outline" size="sm">
                                      Only this
                                    </Button>
                                    <Button type="submit" name="scope" value="future" size="sm">
                                      Save rule
                                    </Button>
                                  </div>
                                </FieldGroup>
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

        <div className="flex flex-col gap-6">
          <SectionCard
            eyebrow="Statements"
            title="Which statement files fed this month"
            description="A single statement can contribute to multiple month pages, and you can hop from here into any month it touched."
          >
            {data.statementContributions.length > 0 ? (
              <div className={workspaceStackListClassName}>
                {data.statementContributions.map((statement) => (
                  <div key={statement.id} className={workspaceSurfaceRowClassName}>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-semibold text-foreground">
                          {statement.bankName}
                          {statement.accountLabel ? ` / ${statement.accountLabel}` : ""}
                        </p>
                        <StatementStatusBadge status={statement.status} />
                      </div>
                      <p className={workspaceSectionCopyClassName}>
                        Cycle label {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {statement.monthsTouched.map((month) => (
                          <Link key={month} href={`/months/${month}`} className={chipClassName()}>
                            {formatMonthLabel(month)}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(statement.monthSpendCents)}</p>
                      <p className={workspaceSectionCopyClassName}>
                        {statement.monthTransactionCount} row{statement.monthTransactionCount === 1 ? "" : "s"} in this month
                        {statement.monthPaymentCents > 0 ? ` / Payments ${formatCurrency(statement.monthPaymentCents)}` : ""}
                        {statement.monthDepositCents > 0 ? ` / Deposits ${formatCurrency(statement.monthDepositCents)}` : ""}
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
              <Link href={`/review?month=${data.month}`} className={textLinkClassName()}>
                Open grouped review
              </Link>
            }
          >
            {data.reviewQueue.length > 0 ? (
              <div className="flex flex-col gap-4">
                {data.reviewQueue.map((group) => (
                  <article key={group.normalizedMerchant} className={workspaceSurfaceBlockClassName}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-foreground">{group.displayName}</p>
                        <p className={workspaceSectionCopyClassName}>
                          {group.transactionCount} transaction{group.transactionCount === 1 ? "" : "s"} / {group.banks.join(", ")}
                        </p>
                      </div>
                      <p className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                        {formatCurrency(group.spendCents)}
                      </p>
                    </div>

                    <form action={assignCategoryAction}>
                      <input type="hidden" name="transactionId" value={group.representativeTransactionId} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input type="hidden" name="scope" value="future" />
                      <FieldGroup className={workspaceFormTwoColumnClassName}>
                        <Field>
                          <FieldLabel htmlFor={`month-review-category-${group.normalizedMerchant}`} className="sr-only">
                            Save a reusable category
                          </FieldLabel>
                          <NativeSelect
                            id={`month-review-category-${group.normalizedMerchant}`}
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
