import Link from "next/link";
import { loadDemoDataAction } from "@/app/actions";
import { uploadStatementAction } from "@/app/upload-actions";
import { getUploadPageData } from "@/lib/expenses";
import { formatCurrency, formatMonthLabel } from "@/lib/format";
import { STATEMENT_PARSER_DETAILS, STATEMENT_PARSER_TYPES } from "@/lib/importers";
import { DeleteStatementForm } from "@/app/(workspace)/_components/delete-statement-form";
import {
  EmptyState,
  MessageBanner,
  PageHeader,
  SectionCard,
  StatementStatusBadge,
} from "@/app/(workspace)/_components/workspace-ui";

type UploadPageProps = {
  searchParams?: Promise<{
    message?: string;
    statement?: string;
  }>;
};

function formatDateRange(firstPostedAt: string | null, lastPostedAt: string | null) {
  if (!firstPostedAt || !lastPostedAt) {
    return "No transactions were parsed from this file yet.";
  }

  const formatter = new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
  });

  return `${formatter.format(new Date(`${firstPostedAt}T00:00:00`))} to ${formatter.format(new Date(`${lastPostedAt}T00:00:00`))}`;
}

export default async function UploadPage({ searchParams }: UploadPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const selectedStatement = typeof resolvedSearchParams.statement === "string" ? resolvedSearchParams.statement : undefined;
  const data = getUploadPageData(selectedStatement);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Upload"
        title="Bring in statements without losing how they span banks or months."
        description="Statements remain visible as imported files with an auto-derived cycle label, while the month pages are generated from the posted dates inside the statement rows."
        actions={
          <div className="header-actions">
            <Link href="/statements" className="secondary-button">
              View all statements
            </Link>
            <Link href="/" className="primary-button">
              Back to overview
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="content-grid content-grid-balanced">
        <SectionCard
          eyebrow="Import Form"
          title="Add a new bank statement"
          description="Pick the statement type first, then upload the file. The app will derive the bank/card identity from that type and use the matching parser."
        >
          <form action={uploadStatementAction} className="form-grid">
            <label className="space-y-2">
              <span className="field-label">Statement type</span>
              <select name="statementType" className="field" defaultValue="auto">
                {STATEMENT_PARSER_TYPES.map((statementType) => (
                  <option key={statementType} value={statementType}>
                    {STATEMENT_PARSER_DETAILS[statementType].label}
                  </option>
                ))}
              </select>
              <p className="section-copy">
                {STATEMENT_PARSER_DETAILS.auto.hint}
              </p>
            </label>

            <label className="space-y-2">
              <span className="field-label">Statement file</span>
              <input
                type="file"
                name="statement"
                accept=".csv,.xls,.xlsx,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="field file-field"
                required
              />
            </label>

            <div className="form-footer">
              <button type="submit" className="primary-button">
                Import statement
              </button>
              <p className="section-copy">
                Start with Auto-detect. If you know the exact export type, choose it directly and the app will fill in the bank/card identity from that type.
              </p>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          eyebrow="Latest Result"
          title={data.focusStatement ? "Most recent imported statement" : "Why the flow is structured this way"}
          description={
            data.focusStatement
              ? "This result card shows how the uploaded file is stored as a statement and which months it actually touched."
              : "The upload page keeps the import step separate from review and analysis, so the app stays calm even as the data grows."
          }
        >
          {data.focusStatement ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-stone-900">
                  {data.focusStatement.bankName}
                  {data.focusStatement.accountLabel ? ` / ${data.focusStatement.accountLabel}` : ""}
                </p>
                <StatementStatusBadge status={data.focusStatement.status} />
              </div>
              <p className="section-copy">
                Derived cycle label {formatMonthLabel(data.focusStatement.cycleMonth)} / {data.focusStatement.originalFileName}
              </p>
              <p className="section-copy">{formatDateRange(data.focusStatement.firstPostedAt, data.focusStatement.lastPostedAt)}</p>
              <div className="chip-row">
                {data.focusStatement.monthsTouched.map((month) => (
                  <Link key={month} href={`/months/${month}`} className="chip">
                    {formatMonthLabel(month)}
                  </Link>
                ))}
              </div>
              <div className="summary-band summary-band-tight">
                <article className="summary-item">
                  <p className="eyebrow">Transactions</p>
                  <p className="summary-value">{data.focusStatement.transactionCount}</p>
                </article>
                <article className="summary-item">
                  <p className="eyebrow">Needs review</p>
                  <p className="summary-value">{data.focusStatement.pendingCount}</p>
                </article>
              </div>
              {data.focusStatement.paymentCents > 0 ? (
                <p className="section-copy">
                  {formatCurrency(data.focusStatement.paymentCents)} in card payments was recognized automatically and kept out of spend.
                </p>
              ) : null}
              <div className="header-actions">
                {data.focusStatement.monthsTouched[0] ? (
                  <Link href={`/months/${data.focusStatement.monthsTouched[0]}`} className="primary-button">
                    Open touched month
                  </Link>
                ) : null}
                <Link href="/review" className="secondary-button">
                  Open review queue
                </Link>
                <DeleteStatementForm returnTo="/upload" statementId={data.focusStatement.id} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="stack-list">
                <div className="import-row">
                  <div className="space-y-1">
                    <p className="font-semibold text-stone-900">Statement imports stay traceable</p>
                    <p className="section-copy">
                      You can always see which file created which transactions and which months the file touched.
                    </p>
                  </div>
                </div>
                <div className="import-row">
                  <div className="space-y-1">
                    <p className="font-semibold text-stone-900">Month pages stay truthful</p>
                    <p className="section-copy">
                      UOB-style statements that span two months automatically contribute to both month pages.
                    </p>
                  </div>
                </div>
                <div className="import-row">
                  <div className="space-y-1">
                    <p className="font-semibold text-stone-900">Review stays its own workflow</p>
                    <p className="section-copy">
                      Unknown merchants go to review instead of competing with the analysis screens for attention.
                    </p>
                  </div>
                </div>
              </div>

              {data.stats.statementCount === 0 ? (
                <form action={loadDemoDataAction}>
                  <button type="submit" className="secondary-button">
                    Load demo workspace
                  </button>
                </form>
              ) : null}
            </div>
          )}
        </SectionCard>
      </section>

      <SectionCard
        eyebrow="Recent Imports"
        title="Statement history from the upload surface"
        description="You do not have to leave upload just to verify what was already added."
        action={
          <Link href="/statements" className="sidebar-link">
            Open statement history
          </Link>
        }
      >
        {data.recentStatements.length > 0 ? (
          <div className="stack-list">
            {data.recentStatements.map((statement) => (
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
                    Derived cycle label {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
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
                  <DeleteStatementForm returnTo="/upload" statementId={statement.id} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No statements yet"
            description="Import a statement here and it will immediately show up with the months it contributes to."
          />
        )}
      </SectionCard>
    </div>
  );
}
