import Link from "next/link";
import { InfoIcon, InboxIcon } from "lucide-react";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { getTransactionKindLabel, type TransactionKind } from "@/lib/transaction-kinds";

export const workspacePageStackClassName = "flex flex-col gap-6";
export const workspaceContentGridClassName = "grid gap-6 xl:grid-cols-[1.15fr_0.85fr]";
export const workspaceBalancedGridClassName = "grid gap-6 xl:grid-cols-2";
export const workspaceStackListClassName = "grid gap-3";
export const workspaceStackListTightClassName = "grid gap-2";
export const workspaceHeaderActionsClassName = "flex flex-wrap gap-3";
export const workspaceChipRowClassName = "flex flex-wrap gap-3";
export const workspaceInlineActionsClassName = "flex flex-wrap gap-3";
export const workspaceSummaryGridClassName = "grid gap-4 md:grid-cols-2 xl:grid-cols-4";
export const workspaceThreeSummaryGridClassName = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";
export const workspaceTwoSummaryGridClassName = "grid gap-4 md:grid-cols-2";
export const workspaceSurfaceRowClassName =
  "flex flex-wrap items-center justify-between gap-4 rounded-[24px] border bg-card p-4 shadow-sm";
export const workspaceSurfaceRowInteractiveClassName =
  "flex flex-wrap items-center justify-between gap-4 rounded-[24px] border bg-card p-4 shadow-sm transition-colors hover:bg-accent/40";
export const workspaceSurfaceBlockClassName = "rounded-[24px] border bg-card p-4 shadow-sm";
export const workspaceFormGridClassName = "grid gap-4 lg:grid-cols-2";
export const workspaceFormFooterClassName =
  "flex flex-col gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:justify-between";
export const workspaceMetricGroupClassName = "flex flex-wrap items-center gap-4";
export const workspaceTimelineDayClassName = "flex flex-wrap items-center justify-between gap-4 border-b pb-2";
export const workspaceSectionCopyClassName = "text-sm leading-6 text-muted-foreground";
export const workspaceEyebrowClassName =
  "text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground";
export const workspaceTitleClassName =
  "font-[family-name:var(--font-display)] text-4xl leading-tight text-foreground sm:text-5xl";
export const workspaceSectionTitleClassName = "text-2xl font-semibold text-foreground";
export const workspaceSummaryValueClassName = "text-2xl font-semibold tracking-[-0.02em] text-foreground";
export const workspaceLargeLabelClassName = "text-xl font-semibold text-foreground";
export const workspaceTabsGridClassName = "flex flex-wrap gap-3";
export const workspaceTabClassName =
  "flex min-w-[12rem] flex-1 items-center justify-between gap-3 rounded-[24px] border bg-card px-4 py-3 shadow-sm transition-colors hover:bg-accent/40 sm:flex-none";
export const workspaceTabActiveClassName = "border-primary/20 bg-accent text-accent-foreground";
export const workspaceTabMetaClassName = "text-xs text-muted-foreground";
export const workspaceTabCountClassName =
  "inline-flex min-w-[2.25rem] items-center justify-center rounded-full border bg-muted px-3 py-1 text-sm font-semibold text-foreground";
export const workspaceCategoryBlockClassName = "grid gap-4 border-t pt-5 first:border-t-0 first:pt-0";
export const workspaceMeterTrackClassName = "mt-4 h-3 overflow-hidden rounded-full bg-muted";
export const workspaceMeterFillClassName = "h-full rounded-full";
export const workspaceCardGridClassName = "grid gap-4";
export const workspaceFormTwoColumnClassName = "grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center";
export const workspaceCategoryCreateClassName =
  "grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(13rem,18rem)_auto] lg:items-end";
export const workspaceCategoryEditClassName =
  "grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end";
export const workspaceDeleteRowClassName = "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between";
export const workspaceStatTextClassName = "text-sm font-semibold text-foreground";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function buttonLinkClassName({
  className,
  size = "default",
  variant = "default",
}: {
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
} = {}) {
  return cn(buttonVariants({ variant, size }), className);
}

export function chipClassName({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
} = {}) {
  return cn(
    badgeVariants({ variant: active ? "secondary" : "outline" }),
    "h-auto rounded-full px-3 py-1 text-xs font-semibold transition-colors",
    active && "border-primary/15 bg-accent text-accent-foreground",
    className
  );
}

export function textLinkClassName(className?: string) {
  return cn("text-sm font-medium text-primary transition-colors hover:text-foreground", className);
}

export function MessageBanner({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <Alert>
      <InfoIcon />
      <AlertTitle>Workspace update</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

type PageHeaderProps = {
  actions?: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHeader({ actions, description, eyebrow, title }: PageHeaderProps) {
  return (
    <Card className="overflow-hidden rounded-[30px] border-border/70">
      <CardContent className="flex flex-col gap-5 px-6 py-7 lg:flex-row lg:items-end lg:justify-between lg:px-8">
        <div className="flex flex-col gap-4">
          <p className={workspaceEyebrowClassName}>{eyebrow}</p>
          <div className="flex max-w-3xl flex-col gap-3">
            <h1 className={workspaceTitleClassName}>{title}</h1>
            <p className={workspaceSectionCopyClassName}>{description}</p>
          </div>
        </div>
        {actions ? <div className={workspaceHeaderActionsClassName}>{actions}</div> : null}
      </CardContent>
    </Card>
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
    <Card className="rounded-[30px] border-border/70">
      <CardHeader className="mb-1 gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
        {eyebrow ? <p className={workspaceEyebrowClassName}>{eyebrow}</p> : null}
        <div className="mb-0 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle className={workspaceSectionTitleClassName}>{title}</CardTitle>
            {description ? <CardDescription className={workspaceSectionCopyClassName}>{description}</CardDescription> : null}
          </div>
          {action ? <CardAction className="static">{action}</CardAction> : null}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 sm:px-6 sm:pb-6">{children}</CardContent>
    </Card>
  );
}

type SummaryCardProps = {
  eyebrow: string;
  value: React.ReactNode;
  description: React.ReactNode;
};

export function SummaryCard({ description, eyebrow, value }: SummaryCardProps) {
  return (
    <Card className="rounded-[24px] border-border/70">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <p className={workspaceEyebrowClassName}>{eyebrow}</p>
        <p className={workspaceSummaryValueClassName}>{value}</p>
        <p className={workspaceSectionCopyClassName}>{description}</p>
      </CardContent>
    </Card>
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
    <Empty className="rounded-[24px] border-border/80 bg-muted/30">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle className="text-base text-foreground">{title}</EmptyTitle>
        <EmptyDescription className={workspaceSectionCopyClassName}>{description}</EmptyDescription>
      </EmptyHeader>
      {actionHref && actionLabel ? (
        <EmptyContent>
          <Link href={actionHref} className={buttonLinkClassName({ variant: "outline" })}>
            {actionLabel}
          </Link>
        </EmptyContent>
      ) : null}
    </Empty>
  );
}

export function StatementStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={status === "imported" ? "secondary" : "outline"}>
      {status}
    </Badge>
  );
}

export function TransactionKindBadge({ kind }: { kind: TransactionKind }) {
  const variant = kind === "expense" ? "outline" : "secondary";

  return (
    <Badge variant={variant}>
      {getTransactionKindLabel(kind)}
    </Badge>
  );
}
