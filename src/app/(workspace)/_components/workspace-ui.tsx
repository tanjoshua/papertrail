import Link from "next/link";
import { getTransactionKindLabel, type TransactionKind } from "@/lib/transaction-kinds";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function MessageBanner({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <div className="message-banner">{message}</div>;
}

type PageHeaderProps = {
  actions?: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="space-y-4">
        <p className="eyebrow">{eyebrow}</p>
        <div className="max-w-3xl space-y-3">
          <h1 className="page-title">{title}</h1>
          <p className="page-copy">{description}</p>
        </div>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

type SectionCardProps = {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
};

export function SectionCard({ action, children, description, eyebrow, title }: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-heading">
        <div className="space-y-2">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-copy">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

type EmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  title: string;
};

export function EmptyState({ actionHref, actionLabel, description, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-stone-900">{title}</h3>
        <p className="section-copy">{description}</p>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="secondary-button">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function StatementStatusBadge({ status }: { status: string }) {
  return (
    <span className={status === "imported" ? "status-badge status-imported" : "status-badge status-stored"}>
      {status}
    </span>
  );
}

export function TransactionKindBadge({ kind }: { kind: TransactionKind }) {
  const className =
    kind === "payment"
      ? "kind-badge kind-payment"
      : kind === "refund"
        ? "kind-badge kind-refund"
        : "kind-badge kind-expense";

  return <span className={className}>{getTransactionKindLabel(kind)}</span>;
}
