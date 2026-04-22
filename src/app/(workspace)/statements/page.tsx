import Link from "next/link";
import { DeleteStatementForm } from "@/app/(workspace)/_components/delete-statement-form";
import { getStatementsPageData } from "@/lib/expenses";
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
  workspaceEyebrowClassName,
  workspaceHeaderActionsClassName,
  workspaceMetricGroupClassName,
  workspacePageStackClassName,
  workspaceSectionCopyClassName,
  workspaceStatTextClassName,
} from "@/app/(workspace)/_components/workspace-ui";

type StatementsPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function StatementsPage({ searchParams }: StatementsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const data = getStatementsPageData();

  return (
    <div className={workspacePageStackClassName}>
      <PageHeader
        eyebrow="Statements"
        title="Statement history stays separate from month analysis."
        description="This page is for import provenance: which bank file came in, which cycle label was derived, how many rows were parsed, and which month pages the statement ended up feeding."
        actions={
          <div className={workspaceHeaderActionsClassName}>
            <Link href="/upload" className={buttonLinkClassName({ variant: "outline" })}>
              Upload statement
            </Link>
            <Link href="/" className={buttonLinkClassName({ variant: "outline" })}>
              Back to overview
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          eyebrow="Total statements"
          value={data.summary.statementCount}
          description="Every imported or stored file stays visible here as its own record."
        />
        <SummaryCard
          eyebrow="Parsed statements"
          value={data.summary.importedStatementCount}
          description="These statements produced transactions that now power the month pages."
        />
        <SummaryCard
          eyebrow="Stored for parser work"
          value={data.summary.storedStatementCount}
          description="Unsupported layouts can still be saved without blocking the rest of the app."
        />
        <SummaryCard
          eyebrow="Pending review rows"
          value={data.summary.pendingReviewCount}
          description="This count rolls up uncategorized rows across every statement in the workspace."
        />
      </section>

      <SectionCard
        eyebrow="History"
        title="All statement imports"
        description="Derived cycle labels help you recognize the statement as a file import, while the linked month chips show where its transactions actually landed."
      >
        {data.statements.length > 0 ? (
          <div className="flex flex-col gap-4">
            {data.statements.map((statement) => (
              <article
                key={statement.id}
                className="flex flex-wrap items-start justify-between gap-6 rounded-[24px] border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-foreground">
                      {statement.bankName}
                      {statement.accountLabel ? ` / ${statement.accountLabel}` : ""}
                    </p>
                    <StatementStatusBadge status={statement.status} />
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className={workspaceSectionCopyClassName}>
                      Derived cycle label {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
                    </p>
                    <p className={workspaceSectionCopyClassName}>
                      {statement.firstPostedAt && statement.lastPostedAt
                        ? `Rows posted from ${statement.firstPostedAt} to ${statement.lastPostedAt}`
                        : "No parsed transactions in this statement yet."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {statement.monthsTouched.length > 0 ? (
                      statement.monthsTouched.map((month) => (
                        <Link key={month} href={`/months/${month}`} className={chipClassName()}>
                          {formatMonthLabel(month)}
                        </Link>
                      ))
                    ) : (
                      <span className={chipClassName()}>Stored only</span>
                    )}
                  </div>

                    {statement.notes ? <p className={workspaceSectionCopyClassName}>{statement.notes}</p> : null}

                  <div className="flex flex-wrap gap-3">
                    <Link href={`/statements/${statement.id}`} className={buttonLinkClassName({ size: "sm" })}>
                      View transactions
                    </Link>
                    <DeleteStatementForm returnTo="/statements" statementId={statement.id} />
                  </div>
                </div>

                <div className={workspaceMetricGroupClassName}>
                  <div>
                    <p className={workspaceEyebrowClassName}>Spend</p>
                    <p className={workspaceStatTextClassName}>{formatCurrency(statement.spendCents)}</p>
                  </div>
                  <div>
                    <p className={workspaceEyebrowClassName}>Transactions</p>
                    <p className={workspaceStatTextClassName}>{statement.transactionCount}</p>
                  </div>
                  <div>
                    <p className={workspaceEyebrowClassName}>Needs review</p>
                    <p className={workspaceStatTextClassName}>{statement.pendingCount}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No statements imported yet"
            description="Use the upload page to add your first statement. Once it is parsed, this history page will show the file and every month it touched."
            actionHref="/upload"
            actionLabel="Go to upload"
          />
        )}
      </SectionCard>
    </div>
  );
}
