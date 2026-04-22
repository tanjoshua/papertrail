export const TRANSACTION_KINDS = ["expense", "refund", "payment", "deposit", "transfer"] as const;

export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

const PAYMENT_PATTERNS = [
  /\bFAST\s*INCOMING\s*PAYMENT\b/i,
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

const TRANSFER_PATTERNS = [
  /\bBILL\s+PAYMENT\b.*\bUOB\s+CARDS?\b/i,
  /\bMBK[-\s]*UOB\s+CARDS?\b/i,
];

export function isPaymentLikeDescription(rawDescription: string) {
  return PAYMENT_PATTERNS.some((pattern) => pattern.test(rawDescription));
}

export function isTransferLikeDescription(rawDescription: string) {
  return TRANSFER_PATTERNS.some((pattern) => pattern.test(rawDescription));
}

export function inferTransactionKind(rawDescription: string, amountCents: number): TransactionKind {
  if (isTransferLikeDescription(rawDescription)) {
    return "transfer";
  }

  if (isPaymentLikeDescription(rawDescription)) {
    return "payment";
  }

  if (amountCents < 0) {
    return "refund";
  }

  return "expense";
}

export function normalizeTransactionAmount(kind: TransactionKind, amountCents: number) {
  if (kind === "payment" || kind === "deposit" || kind === "transfer") {
    return -Math.abs(amountCents);
  }

  return amountCents;
}

export function isCategorizableTransactionKind(kind: TransactionKind) {
  return kind !== "payment" && kind !== "deposit" && kind !== "transfer";
}

export function getTransactionKindLabel(kind: TransactionKind) {
  switch (kind) {
    case "payment":
      return "Card payment";
    case "deposit":
      return "Deposit";
    case "transfer":
      return "Transfer";
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
    case "deposit":
      return "Incoming account movement, excluded from spend and category review.";
    case "transfer":
      return "Internal movement, excluded from spend and category review.";
    case "refund":
      return "Offsets earlier spend but still keeps the original category context.";
    default:
      return "Counts toward spend and category coverage.";
  }
}
