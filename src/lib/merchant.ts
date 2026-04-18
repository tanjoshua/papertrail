const MERCHANT_NOISE = [
  "AMOUNT",
  "CARD",
  "CREDIT",
  "CR",
  "DEBIT",
  "DR",
  "ONLINE",
  "PAYMENT",
  "POS",
  "PURCHASE",
  "REF",
  "REFNO",
  "SINGAPORE",
  "SG",
  "SGP",
  "VISA",
  "MASTERCARD",
];

export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeMerchant(value: string) {
  const withoutDiacritics = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const sanitized = withoutDiacritics
    .toUpperCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\b\d{3,}\b/g, " ");

  const keptTokens = sanitized
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !MERCHANT_NOISE.includes(token));

  return collapseWhitespace(keptTokens.join(" "));
}

export function prettifyMerchant(value: string) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function slugify(value: string) {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
