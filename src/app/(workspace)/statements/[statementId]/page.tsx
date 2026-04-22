import Link from "next/link";
import { notFound } from "next/navigation";
import { assignCategoryAction } from "@/app/actions";
import { getStatementDetailData } from "@/lib/expenses";
import { formatCurrency, formatMonthLabel, formatTransactionCurrency, getReadableTextColor } from "@/lib/format";
import {
  EmptyState,
  MessageBanner,
  PageHeader,
  SectionCard,
  StatementStatusBadge,
  SummaryCard,
  TransactionKindBadge,
  buttonLinkClassName,
  chipClassName,
  workspaceHeaderActionsClassName,
  workspaceInlineActionsClassName,
  workspacePageStackClassName,
  workspaceSectionCopyClassName,
  workspaceStatTextClassName,
} from "@/app/(workspace)/_components/workspace-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatementPageProps = {
  params: Promise<{
    statementId: string;
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

export default async function StatementPage({ params, searchParams }: StatementPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const data = getStatementDetailData(resolvedParams.statementId);

  if (!data.statement) {
    notFound();
  }

  const statement = data.statement;
  const returnTo = `/statements/${statement.id}`;
  const transactions = data.timeline.flatMap((day) =>
    day.items.map((item) => ({
      ...item,
      postedAt: day.date,
    })),
  );

  return (
    <div className={workspacePageStackClassName}>
      <PageHeader
        eyebrow="Statement"
        title={`${statement.bankName}${statement.accountLabel ? ` / ${statement.accountLabel}` : ""}`}
        description={`Imported from ${statement.originalFileName}. Derived cycle label ${formatMonthLabel(statement.cycleMonth)}.`}
        actions={
          <div className={workspaceHeaderActionsClassName}>
            <Link href="/statements" className={buttonLinkClassName({ variant: "outline" })}>
              Back to statements
            </Link>
            <Link href="/upload" className={buttonLinkClassName()}>
              Upload statement
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          eyebrow="Status"
          value={<StatementStatusBadge status={statement.status} />}
          description={
            statement.firstPostedAt && statement.lastPostedAt
              ? `Rows posted from ${statement.firstPostedAt} to ${statement.lastPostedAt}.`
              : "No parsed transactions are attached to this statement yet."
          }
        />
        <SummaryCard
          eyebrow="Spend"
          value={formatCurrency(statement.spendCents)}
          description={`Net movement ${formatCurrency(statement.netCents)} after ${formatCurrency(statement.refundCents)} in refunds, ${formatCurrency(statement.depositCents)} in deposits, and ${formatCurrency(statement.transferCents)} in transfers.`}
        />
        <SummaryCard
          eyebrow="Excluded activity"
          value={formatCurrency(statement.paymentCents + statement.depositCents + statement.transferCents)}
          description={`${formatCurrency(statement.depositCents)} deposits / ${formatCurrency(statement.paymentCents)} card payments / ${formatCurrency(statement.transferCents)} transfers.`}
        />
        <SummaryCard
          eyebrow="Needs review"
          value={statement.pendingCount}
          description={`${statement.transactionCount} imported transaction${statement.transactionCount === 1 ? "" : "s"} in this statement.`}
        />
      </section>

      <SectionCard
        eyebrow="Transactions"
        title="Imported transaction ledger"
        description="These are the parsed rows attached to this statement file."
      >
        {transactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{formatDay(item.postedAt)}</TableCell>
                  <TableCell className="min-w-[18rem] whitespace-normal">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{item.merchantName}</span>
                      <span className={workspaceSectionCopyClassName}>{item.rawDescription}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/months/${item.month}`} className={chipClassName()}>
                        {formatMonthLabel(item.month)}
                      </Link>
                      {item.transactionKind !== "expense" ? (
                        <TransactionKindBadge kind={item.transactionKind} />
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[18rem]">
                    {item.categoryId ? (
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: item.categoryColor ?? "#e7dfd3",
                          color: item.categoryColor
                            ? getReadableTextColor(item.categoryColor)
                            : "#435148",
                        }}
                      >
                        {item.categoryName}
                      </Badge>
                    ) : item.transactionKind === "payment" || item.transactionKind === "deposit" || item.transactionKind === "transfer" ? (
                      <Badge variant="secondary">Not applicable</Badge>
                    ) : (
                      <form action={assignCategoryAction}>
                        <input type="hidden" name="transactionId" value={item.id} />
                        <input type="hidden" name="returnTo" value={returnTo} />
                        <FieldGroup className="grid gap-2">
                          <Field>
                            <FieldLabel htmlFor={`statement-transaction-category-${item.id}`} className="sr-only">
                              Pick category
                            </FieldLabel>
                            <NativeSelect
                              id={`statement-transaction-category-${item.id}`}
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
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={workspaceStatTextClassName}>
                      {formatTransactionCurrency(item.amountCents, item.transactionKind)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No transactions imported"
            description="This statement was stored, but it does not have parsed transaction rows attached yet."
            actionHref="/upload"
            actionLabel="Upload another statement"
          />
        )}
      </SectionCard>
    </div>
  );
}
