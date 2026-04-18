export const TRANSACTION_KINDS = ["expense", "refund", "payment"] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

const PAYMENT_PATTERNS = [
  /PAYMT\s+THRU\s+E[-\s]?BANK/i,
  /\bPAYMENT\s+RECEIVED\b/i,
  /\bPAYMENT\s+-\s+THANK\s+YOU\b/i,
  /\bGIRO\s+PAYMENT\b/i,
  /\bCREDIT\s+CARD\s+PAYMENT\b/i,
  /\bCARD\s+PAYMENT\b/i,
  /\bAXS\s+PAYMENT\b/i,
  /\bFAST\s+PAYMENT\b/i,
  /\bBANK\s+TRANSFER\b/i,
  /\bINTERNET\s+BANKING\b/i,
];

export function isPaymentLikeDescription(rawDescription: string) {
  return PAYMENT_PATTERNS.some((pattern) => pattern.test(rawDescription));
}

export function inferTransactionKind(rawDescription: string, amountCents: number): TransactionKind {
  if (isPaymentLikeDescription(rawDescription)) {
    return "payment";
  }

  if (amountCents < 0) {
    return "refund";
  }

  return "expense";
}

export function normalizeTransactionAmount(kind: TransactionKind, amountCents: number) {
  if (kind === "payment") {
    return -Math.abs(amountCents);
  }

  return amountCents;
}

export function isCategorizableTransactionKind(kind: TransactionKind) {
  return kind !== "payment";
}

export function getTransactionKindLabel(kind: TransactionKind) {
  switch (kind) {
    case "payment":
      return "Card payment";
    case "refund":
      return "Refund";
    default:
      return "Spend";
  }
}

export function getTransactionKindDescription(kind: TransactionKind) {
  switch (kind) {
    case "payment":
      return "Excluded from spending totals and category review.";
    case "refund":
      return "Offsets earlier spend but still keeps the original category context.";
    default:
      return "Counts toward spend and category coverage.";
  }
}
