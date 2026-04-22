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
  SummaryCard,
  buttonLinkClassName,
  chipClassName,
  textLinkClassName,
  workspaceBalancedGridClassName,
  workspaceHeaderActionsClassName,
  workspacePageStackClassName,
  workspaceSectionCopyClassName,
  workspaceStackListClassName,
  workspaceSurfaceRowClassName,
  workspaceTwoSummaryGridClassName,
  workspaceFormGridClassName,
  workspaceFormFooterClassName,
} from "@/app/(workspace)/_components/workspace-ui";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

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
    <div className={workspacePageStackClassName}>
      <PageHeader
        eyebrow="Upload"
        title="Bring in statements without losing how they span banks or months."
        description="Statements remain visible as imported files with an auto-derived cycle label, while the month pages are generated from the posted dates inside the statement rows."
        actions={
          <div className={workspaceHeaderActionsClassName}>
            <Link href="/statements" className={buttonLinkClassName({ variant: "outline" })}>
              View all statements
            </Link>
            <Link href="/" className={buttonLinkClassName({ variant: "outline" })}>
              Back to overview
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className={workspaceBalancedGridClassName}>
        <SectionCard
          eyebrow="Import Form"
          title="Add a new bank statement"
          description="Pick the statement type first, then upload the file. The app will derive the bank/card identity from that type and use the matching parser."
        >
          <form action={uploadStatementAction}>
            <FieldGroup className={workspaceFormGridClassName}>
              <Field>
                <FieldLabel htmlFor="statementType">Statement type</FieldLabel>
                <NativeSelect id="statementType" name="statementType" defaultValue="auto" className="w-full">
                  {STATEMENT_PARSER_TYPES.map((statementType) => (
                    <NativeSelectOption key={statementType} value={statementType}>
                      {STATEMENT_PARSER_DETAILS[statementType].label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>{STATEMENT_PARSER_DETAILS.auto.hint}</FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="statement">Statement file</FieldLabel>
                <Input
                  id="statement"
                  type="file"
                  name="statement"
                  accept=".csv,.xls,.xlsx,.pdf,text/csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  required
                />
              </Field>

              <div className={workspaceFormFooterClassName}>
                <Button type="submit">Import statement</Button>
                <p className={workspaceSectionCopyClassName}>
                  Start with Auto-detect. If you know the exact export type, choose it directly and the app will fill in the bank/card identity from that type.
                </p>
              </div>
            </FieldGroup>
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
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-semibold text-foreground">
                  {data.focusStatement.bankName}
                  {data.focusStatement.accountLabel ? ` / ${data.focusStatement.accountLabel}` : ""}
                </p>
                <StatementStatusBadge status={data.focusStatement.status} />
              </div>
              <p className={workspaceSectionCopyClassName}>
                Derived cycle label {formatMonthLabel(data.focusStatement.cycleMonth)} / {data.focusStatement.originalFileName}
              </p>
              <p className={workspaceSectionCopyClassName}>{formatDateRange(data.focusStatement.firstPostedAt, data.focusStatement.lastPostedAt)}</p>
              <div className="flex flex-wrap gap-3">
                {data.focusStatement.monthsTouched.map((month) => (
                  <Link key={month} href={`/months/${month}`} className={chipClassName()}>
                    {formatMonthLabel(month)}
                  </Link>
                ))}
              </div>
              <div className={workspaceTwoSummaryGridClassName}>
                <SummaryCard
                  eyebrow="Transactions"
                  value={data.focusStatement.transactionCount}
                  description="Rows parsed from this uploaded statement."
                />
                <SummaryCard
                  eyebrow="Needs review"
                  value={data.focusStatement.pendingCount}
                  description="Transactions from this statement still waiting on merchant memory."
                />
              </div>
              {data.focusStatement.paymentCents > 0 ? (
                <p className={workspaceSectionCopyClassName}>
                  {formatCurrency(data.focusStatement.paymentCents)} in card payments was recognized automatically and kept out of spend.
                </p>
              ) : null}
              {data.focusStatement.depositCents > 0 ? (
                <p className={workspaceSectionCopyClassName}>
                  {formatCurrency(data.focusStatement.depositCents)} in deposits was recognized automatically and kept out of spend and review.
                </p>
              ) : null}
              {data.focusStatement.transferCents > 0 ? (
                <p className={workspaceSectionCopyClassName}>
                  {formatCurrency(data.focusStatement.transferCents)} in transfers was recognized automatically and kept out of spend and review.
                </p>
              ) : null}
              <div className={workspaceHeaderActionsClassName}>
                {data.focusStatement.monthsTouched[0] ? (
                  <Link href={`/months/${data.focusStatement.monthsTouched[0]}`} className={buttonLinkClassName()}>
                    Open touched month
                  </Link>
                ) : null}
                <Link href="/review" className={buttonLinkClassName({ variant: "outline" })}>
                  Open review queue
                </Link>
                <DeleteStatementForm returnTo="/upload" statementId={data.focusStatement.id} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className={workspaceStackListClassName}>
                <div className={workspaceSurfaceRowClassName}>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-foreground">Statement imports stay traceable</p>
                    <p className={workspaceSectionCopyClassName}>
                      You can always see which file created which transactions and which months the file touched.
                    </p>
                  </div>
                </div>
                <div className={workspaceSurfaceRowClassName}>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-foreground">Month pages stay truthful</p>
                    <p className={workspaceSectionCopyClassName}>
                      UOB-style statements that span two months automatically contribute to both month pages.
                    </p>
                  </div>
                </div>
                <div className={workspaceSurfaceRowClassName}>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold text-foreground">Review stays its own workflow</p>
                    <p className={workspaceSectionCopyClassName}>
                      Unknown merchants go to review instead of competing with the analysis screens for attention.
                    </p>
                  </div>
                </div>
              </div>

              {data.stats.statementCount === 0 ? (
                <form action={loadDemoDataAction}>
                  <Button type="submit" variant="outline">
                    Load demo workspace
                  </Button>
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
          <Link href="/statements" className={textLinkClassName()}>
            Open statement history
          </Link>
        }
      >
        {data.recentStatements.length > 0 ? (
          <div className={workspaceStackListClassName}>
            {data.recentStatements.map((statement) => (
              <div key={statement.id} className={workspaceSurfaceRowClassName}>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold text-foreground">
                      {statement.bankName}
                      {statement.accountLabel ? ` / ${statement.accountLabel}` : ""}
                    </p>
                    <StatementStatusBadge status={statement.status} />
                  </div>
                  <p className={workspaceSectionCopyClassName}>
                    Derived cycle label {formatMonthLabel(statement.cycleMonth)} / {statement.originalFileName}
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
