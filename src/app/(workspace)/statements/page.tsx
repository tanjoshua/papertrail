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
    <div className="page-stack">
      <PageHeader
        eyebrow="Statements"
        title="Statement history stays separate from month analysis."
        description="This page is for import provenance: which bank file came in, which cycle label was derived, how many rows were parsed, and which month pages the statement ended up feeding."
        actions={
          <div className="header-actions">
            <Link href="/upload" className="primary-button">
              Upload statement
            </Link>
            <Link href="/" className="secondary-button">
              Back to overview
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="summary-band">
        <article className="summary-item">
          <p className="eyebrow">Total statements</p>
          <p className="summary-value">{data.summary.statementCount}</p>
          <p className="summary-copy">Every imported or stored file stays visible here as its own record.</p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Parsed statements</p>
          <p className="summary-value">{data.summary.importedStatementCount}</p>
          <p className="summary-copy">These statements produced transactions that now power the month pages.</p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Stored for parser work</p>
          <p className="summary-value">{data.summary.storedStatementCount}</p>
          <p className="summary-copy">Unsupported layouts can still be saved without blocking the rest of the app.</p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Pending review rows</p>
          <p className="summary-value">{data.summary.pendingReviewCount}</p>
          <p className="summary-copy">This count rolls up uncategorized rows across every statement in the workspace.</p>
        </article>
      </section>

      <SectionCard
        eyebrow="History"
        title="All statement imports"
        description="Derived cycle labels help you recognize the statement as a file import, while the linked month chips show where its transactions actually landed."
      >
        {data.statements.length > 0 ? (
          <div className="space-y-4">
            {data.statements.map((statement) => (
              <article key={statement.id} className="statement-row statement-row-detailed">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-stone-900">
                      {statement.bankName}
                      {statement.accountLabel ? ` / ${statement.accountLabel}` : ""}
                    </p>
                    <StatementStatusBadge status={statement.status} />
                  </div>

                  <div className="space-y-1">
                    <p className="section-copy">
                      Derived cycle label {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
                    </p>
                    <p className="section-copy">
                      {statement.firstPostedAt && statement.lastPostedAt
                        ? `Rows posted from ${statement.firstPostedAt} to ${statement.lastPostedAt}`
                        : "No parsed transactions in this statement yet."}
                    </p>
                  </div>

                  <div className="chip-row">
                    {statement.monthsTouched.length > 0 ? (
                      statement.monthsTouched.map((month) => (
                        <Link key={month} href={`/months/${month}`} className="chip">
                          {formatMonthLabel(month)}
                        </Link>
                      ))
                    ) : (
                      <span className="chip">Stored only</span>
                    )}
                  </div>

                  {statement.notes ? <p className="section-copy">{statement.notes}</p> : null}

                  <DeleteStatementForm returnTo="/statements" statementId={statement.id} />
                </div>

                <div className="statement-stats">
                  <div>
                    <p className="eyebrow">Spend</p>
                    <p className="font-semibold text-stone-900">{formatCurrency(statement.spendCents)}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Transactions</p>
                    <p className="font-semibold text-stone-900">{statement.transactionCount}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Needs review</p>
                    <p className="font-semibold text-stone-900">{statement.pendingCount}</p>
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
