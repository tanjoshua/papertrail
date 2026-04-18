import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { extname, join } from "node:path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import { db, getUploadsDirectory } from "./db";
import { getCurrentMonthKey } from "./format";
import { collapseWhitespace, normalizeMerchant, prettifyMerchant, slugify } from "./merchant";
import {
  inferTransactionKind,
  isCategorizableTransactionKind,
  normalizeTransactionAmount,
  type TransactionKind,
} from "./transaction-kinds";

type TabularRecord = Record<string, string>;
type ImportedParsedTransaction = ParsedTransaction & { currency: string };

export type StatementImportInput = {
  file: File;
  statementType?: StatementParserType;
  statementMonth?: string;
};

export type StatementImportResult = {
  message: string;
  statementId: string;
  status: "imported" | "stored";
  transactionCount: number;
  uncategorizedCount: number;
};

type ParsedTransaction = {
  amountCents: number;
  merchantName: string;
  normalizedMerchant: string;
  postedAt: string;
  rawDescription: string;
  rawRowJson: string;
  transactionKind: TransactionKind;
};

export const STATEMENT_PARSER_TYPES = [
  "auto",
  "generic-tabular",
  "uob-card-xls",
] as const;

export type StatementParserType = (typeof STATEMENT_PARSER_TYPES)[number];

export const STATEMENT_PARSER_DETAILS: Record<
  StatementParserType,
  {
    accountLabel: string | null;
    bankName: string;
    hint: string;
    label: string;
  }
> = {
  auto: {
    accountLabel: null,
    bankName: "Imported Statement",
    hint: "Recommended. Try the best known parser from the file name and file shape.",
    label: "Auto-detect",
  },
  "generic-tabular": {
    accountLabel: null,
    bankName: "Imported Statement",
    hint: "Use for standard Date / Description / Amount style exports.",
    label: "Generic CSV or spreadsheet",
  },
  "uob-card-xls": {
    accountLabel: "Preferred Platinum Visa",
    bankName: "UOB",
    hint: "Use the UOB Posting Date / Description / Transaction Amount(Local) layout.",
    label: "UOB Preferred Platinum Visa (.xls)",
  },
};

export function isStatementParserType(value: string): value is StatementParserType {
  return (STATEMENT_PARSER_TYPES as readonly string[]).includes(value);
}

const DATE_HEADERS = [
  "date",
  "posted date",
  "posting date",
  "transaction date",
  "trans date",
  "txn date",
  "value date",
];
const DESCRIPTION_HEADERS = [
  "description",
  "details",
  "merchant",
  "merchant name",
  "narrative",
  "payee",
  "transaction details",
  "transaction description",
  "transaction details/description",
  "details of transaction",
];
const AMOUNT_HEADERS = [
  "amount",
  "billing amount",
  "local amount",
  "sgd amount",
  "transaction amount",
  "amt",
  "amount (sgd)",
  "amt (sgd)",
  "billed amount",
  "txn amount",
];
const DEBIT_HEADERS = [
  "charge",
  "debit",
  "debits",
  "debit amount",
  "outflow",
  "spent",
];
const CREDIT_HEADERS = ["credit", "credits", "credit amount", "refund", "refunds"];
const CURRENCY_HEADERS = ["currency", "ccy"];
const CSV_EXTENSIONS = new Set([".csv"]);
const CSV_MIME_TYPES = new Set(["text/csv", "application/csv"]);
const SPREADSHEET_EXTENSIONS = new Set([".xls", ".xlsx"]);
const SPREADSHEET_MIME_TYPES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const MONTH_LOOKUP = new Map([
  ["jan", 1],
  ["feb", 2],
  ["mar", 3],
  ["apr", 4],
  ["may", 5],
  ["jun", 6],
  ["jul", 7],
  ["aug", 8],
  ["sep", 9],
  ["oct", 10],
  ["nov", 11],
  ["dec", 12],
]);

function normalizeHeader(header: string) {
  return collapseWhitespace(header.toLowerCase().replace(/[_-]+/g, " "));
}

function findColumn(headers: string[], candidates: string[]) {
  const headerMap = new Map(headers.map((header) => [normalizeHeader(header), header]));

  for (const candidate of candidates) {
    const found = headerMap.get(candidate);

    if (found) {
      return found;
    }
  }

  return undefined;
}

function parseLooseAmount(value: string) {
  const trimmed = collapseWhitespace(value);

  if (!trimmed) {
    return 0;
  }

  const negative = trimmed.includes("(") || /\bCR\b/i.test(trimmed) || trimmed.startsWith("-");
  const sanitized = trimmed
    .replace(/[()]/g, "")
    .replace(/\b(?:SGD|S\$|USD|EUR|GBP)\b/gi, "")
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");

  if (!sanitized) {
    return 0;
  }

  const numeric = Number.parseFloat(sanitized);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  const signed = negative ? -numeric : numeric;
  return Math.round(signed * 100);
}

function parsePostedAt(value: string) {
  const trimmed = collapseWhitespace(value);

  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const monthNameMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);

  if (monthNameMatch) {
    const day = Number.parseInt(monthNameMatch[1], 10);
    const month = MONTH_LOOKUP.get(monthNameMatch[2].slice(0, 3).toLowerCase());
    const year = Number.parseInt(monthNameMatch[3], 10);

    if (month && day >= 1 && day <= 31) {
      return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
    }
  }

  const numericDate = Number.parseFloat(trimmed);

  if (
    Number.isFinite(numericDate) &&
    /^\d{5}(?:\.\d+)?$/.test(trimmed) &&
    numericDate >= 25000 &&
    numericDate <= 70000
  ) {
    const epoch = Date.UTC(1899, 11, 30);
    const timestamp = epoch + Math.round(numericDate) * 24 * 60 * 60 * 1000;
    return new Date(timestamp).toISOString().slice(0, 10);
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);

  if (!slashMatch) {
    return null;
  }

  const first = Number.parseInt(slashMatch[1], 10);
  const second = Number.parseInt(slashMatch[2], 10);
  let year = Number.parseInt(slashMatch[3], 10);

  if (year < 100) {
    year += 2000;
  }

  let day = first;
  let month = second;

  if (first <= 12 && second > 12) {
    month = first;
    day = second;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return `${year}-${`${month}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`;
}

function deriveMerchantFromDescription(rawDescription: string) {
  return collapseWhitespace(rawDescription)
    .replace(/\bRef No:\s*.*$/i, "")
    .replace(/\s+(?:SINGAPORE|SGP|Singapore)\s+SG$/i, "")
    .replace(/\s+SG$/i, "");
}

function parseGenericRecords(records: TabularRecord[], sourceLabel: string) {
  if (records.length === 0) {
    throw new Error(`No transaction rows were found in the ${sourceLabel}.`);
  }

  const headers = Object.keys(records[0]);
  const dateHeader = findColumn(headers, DATE_HEADERS);
  const descriptionHeader = findColumn(headers, DESCRIPTION_HEADERS);
  const merchantHeader = findColumn(headers, ["merchant", "merchant name", "payee"]);
  const amountHeader = findColumn(headers, AMOUNT_HEADERS);
  const debitHeader = findColumn(headers, DEBIT_HEADERS);
  const creditHeader = findColumn(headers, CREDIT_HEADERS);
  const currencyHeader = findColumn(headers, CURRENCY_HEADERS);

  if (!dateHeader || !descriptionHeader || (!amountHeader && !debitHeader && !creditHeader)) {
    throw new Error(
      `The ${sourceLabel} needs date, description, and amount-style columns. Try headers like Date, Description, and Amount.`,
    );
  }

  const parsedTransactions: ImportedParsedTransaction[] = [];

  for (const record of records) {
    const postedAt = parsePostedAt(record[dateHeader] ?? "");
    const rawDescription = collapseWhitespace(record[descriptionHeader] ?? "");

    if (!postedAt || !rawDescription) {
      continue;
    }

    let amountCents = 0;

    if (amountHeader) {
      amountCents = parseLooseAmount(record[amountHeader] ?? "");
    } else {
      const debitAmount = parseLooseAmount(record[debitHeader ?? ""] ?? "");
      const creditAmount = parseLooseAmount(record[creditHeader ?? ""] ?? "");
      amountCents = debitAmount !== 0 ? Math.abs(debitAmount) : -Math.abs(creditAmount);
    }

    if (amountCents === 0) {
      continue;
    }

    const merchantSource = collapseWhitespace(record[merchantHeader ?? ""] ?? "") || deriveMerchantFromDescription(rawDescription);
    const normalizedMerchant = normalizeMerchant(merchantSource || rawDescription);
    const merchantName = prettifyMerchant(merchantSource || rawDescription);

    if (!normalizedMerchant) {
      continue;
    }

    const transactionKind = inferTransactionKind(rawDescription, amountCents);
    const normalizedAmountCents = normalizeTransactionAmount(transactionKind, amountCents);

    parsedTransactions.push({
      amountCents: normalizedAmountCents,
      currency: collapseWhitespace(record[currencyHeader ?? ""] ?? "SGD") || "SGD",
      merchantName,
      normalizedMerchant,
      postedAt,
      rawDescription,
      rawRowJson: JSON.stringify(record),
      transactionKind,
    });
  }

  if (parsedTransactions.length === 0) {
    throw new Error(
      `The ${sourceLabel} uploaded successfully, but I could not recognize any valid transaction rows.`,
    );
  }

  return parsedTransactions;
}

function deriveStatementMonth(parsedTransactions: ImportedParsedTransaction[]) {
  const latestPostedAt = parsedTransactions.reduce(
    (latest, transaction) => (transaction.postedAt > latest ? transaction.postedAt : latest),
    "",
  );

  return latestPostedAt ? latestPostedAt.slice(0, 7) : null;
}

function parseGenericCsv(csvContents: string) {
  const records = parse(csvContents, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as TabularRecord[];

  return parseGenericRecords(records, "CSV");
}

function parseUobSpreadsheet(buffer: Buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<Array<string | Date | number>>(sheet, {
      blankrows: false,
      defval: "",
      header: 1,
      raw: false,
    }) as Array<Array<string | Date | number>>;

    const normalizedRows = rows.map((row) =>
      row.map((value) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : collapseWhitespace(String(value ?? "")),
      ),
    );

    for (let index = 0; index < Math.min(normalizedRows.length, 30); index += 1) {
      const headerRow = normalizedRows[index] ?? [];
      const normalizedHeaders = headerRow.map((cell) => normalizeHeader(cell));
      const hasPostingDate = normalizedHeaders.includes("posting date");
      const hasDescription = normalizedHeaders.includes("description");
      const hasAmount = normalizedHeaders.includes("transaction amount(local)");

      if (!hasPostingDate || !hasDescription || !hasAmount) {
        continue;
      }

      const headers = headerRow.map((header) => collapseWhitespace(header));
      const records = normalizedRows
        .slice(index + 1)
        .map((row) => {
          const record: TabularRecord = {};

          headers.forEach((header, cellIndex) => {
            if (!header) {
              return;
            }

            record[header] = row[cellIndex] ?? "";
          });

          return record;
        })
        .filter((record) => Object.values(record).some(Boolean))
        .filter(
          (record) =>
            collapseWhitespace(record["Posting Date"] ?? "") &&
            collapseWhitespace(record["Description"] ?? "") &&
            collapseWhitespace(record["Description"] ?? "").toLowerCase() !== "previous balance" &&
            parseLooseAmount(record["Transaction Amount(Local)"] ?? "") !== 0,
        );

      if (records.length === 0) {
        continue;
      }

      return parseGenericRecords(
        records.map((record) => ({
          Date: record["Posting Date"] ?? "",
          Description: record["Description"] ?? "",
          Amount: record["Transaction Amount(Local)"] ?? "",
          Currency: record["Currency"] ?? "SGD",
        })),
        `UOB spreadsheet tab "${sheetName}"`,
      );
    }
  }

  throw new Error(
    "The spreadsheet was saved, but I could not find the expected UOB Posting Date, Description, and Transaction Amount(Local) columns.",
  );
}

function normalizeSpreadsheetRow(row: Record<string, unknown>) {
  const normalizedRow: TabularRecord = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = collapseWhitespace(String(key));

    if (!normalizedKey || normalizedKey.startsWith("__EMPTY")) {
      continue;
    }

    normalizedRow[normalizedKey] =
      value instanceof Date ? value.toISOString().slice(0, 10) : collapseWhitespace(String(value ?? ""));
  }

  return normalizedRow;
}

function findHeaderRowIndex(rows: string[][]) {
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const normalizedCells = rows[index]?.map((cell) => normalizeHeader(cell)).filter(Boolean) ?? [];

    const hasDate = normalizedCells.some((cell) => DATE_HEADERS.includes(cell));
    const hasDescription = normalizedCells.some((cell) => DESCRIPTION_HEADERS.includes(cell));
    const hasAmount = normalizedCells.some(
      (cell) =>
        AMOUNT_HEADERS.includes(cell) || DEBIT_HEADERS.includes(cell) || CREDIT_HEADERS.includes(cell),
    );

    if (hasDate && hasDescription && hasAmount) {
      return index;
    }
  }

  return null;
}

function parseSpreadsheet(buffer: Buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
  });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      continue;
    }

    const previewRows = XLSX.utils.sheet_to_json<Array<string | Date | number>>(sheet, {
      blankrows: false,
      defval: "",
      header: 1,
      raw: false,
    }) as Array<Array<string | Date | number>>;

    const normalizedPreview = previewRows.map((row) =>
      row.map((value) =>
        value instanceof Date ? value.toISOString().slice(0, 10) : collapseWhitespace(String(value ?? "")),
      ),
    );

    const headerRowIndex = findHeaderRowIndex(normalizedPreview);

    if (headerRowIndex === null) {
      continue;
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      blankrows: false,
      defval: "",
      range: headerRowIndex,
      raw: false,
    });

    const normalizedRows = rows
      .map((row) => normalizeSpreadsheetRow(row))
      .filter((row) => Object.keys(row).length > 0);

    if (normalizedRows.length === 0) {
      continue;
    }

    try {
      return parseGenericRecords(normalizedRows, `spreadsheet tab "${sheetName}"`);
    } catch {
      continue;
    }
  }

  throw new Error(
    "The spreadsheet was saved, but I could not confidently find a tab with recognizable Date, Description, and Amount columns yet.",
  );
}

function detectStatementParser(input: StatementImportInput, extension: string) {
  const requestedType = input.statementType ?? "auto";

  if (requestedType !== "auto") {
    return requestedType;
  }

  const fileName = input.file.name.toLowerCase();

  if (
    SPREADSHEET_EXTENSIONS.has(extension) &&
    fileName.startsWith("cc_txn_history")
  ) {
    return "uob-card-xls";
  }

  return "generic-tabular";
}

function resolveStatementIdentity(statementParser: StatementParserType) {
  return STATEMENT_PARSER_DETAILS[statementParser];
}

function detectImportMode(extension: string, mimeType: string) {
  if (CSV_EXTENSIONS.has(extension) || CSV_MIME_TYPES.has(mimeType)) {
    return "csv";
  }

  if (SPREADSHEET_EXTENSIONS.has(extension) || SPREADSHEET_MIME_TYPES.has(mimeType)) {
    return "spreadsheet";
  }

  return "store";
}

function storeStatementOnly(
  input: StatementImportInput,
  identity: ReturnType<typeof resolveStatementIdentity>,
  statementId: string,
  fileName: string,
  importedAt: string,
  statementMonth: string,
  notes: string,
) {
  db.prepare(
    `
      INSERT INTO statements (
        id,
        bank_name,
        account_label,
        statement_month,
        file_name,
        original_file_name,
        mime_type,
        parser_key,
        import_status,
        imported_at,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    statementId,
    identity.bankName,
    identity.accountLabel,
    statementMonth,
    fileName,
    input.file.name,
    input.file.type || null,
    "awaiting-bank-parser",
    "stored",
    importedAt,
    notes,
  );
}

async function persistUpload(bankName: string, file: File) {
  const uploadsDirectory = getUploadsDirectory();
  const extension = extname(file.name) || ".bin";
  const safeBank = slugify(bankName) || "statement";
  const fileName = `${safeBank}-${randomUUID()}${extension.toLowerCase()}`;
  const destination = join(uploadsDirectory, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(destination, bytes);
  return { destination, fileName };
}

function findRule(normalizedMerchant: string) {
  return db
    .prepare(
      `
        SELECT category_id AS categoryId
        FROM merchant_rules
        WHERE normalized_merchant = ?
      `,
    )
    .get(normalizedMerchant) as { categoryId: string } | undefined;
}

function formatPlural(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function buildImportSummary(input: {
  paymentCount: number;
  transactionCount: number;
  uncategorizedCount: number;
}) {
  const parts = [`Imported ${formatPlural(input.transactionCount, "transaction")}.`];

  if (input.paymentCount > 0) {
    parts.push(
      `${formatPlural(input.paymentCount, "card payment row")} will stay out of spend and review.`,
    );
  }

  if (input.uncategorizedCount > 0) {
    parts.push(
      input.uncategorizedCount === 1
        ? "1 merchant still needs categorization."
        : `${input.uncategorizedCount} merchants still need categorization.`,
    );
  } else {
    parts.push("All reviewable merchants were recognized automatically.");
  }

  return parts.join(" ");
}

export async function importStatement(input: StatementImportInput): Promise<StatementImportResult> {
  const extension = extname(input.file.name).toLowerCase();
  const mimeType = input.file.type.toLowerCase();
  const importMode = detectImportMode(extension, mimeType);
  const statementParser = detectStatementParser(input, extension);
  const identity = resolveStatementIdentity(statementParser);
  const { destination, fileName } = await persistUpload(identity.bankName, input.file);
  const statementId = randomUUID();
  const importedAt = new Date().toISOString();
  const fallbackStatementMonth = input.statementMonth ?? getCurrentMonthKey();

  if (importMode === "store") {
    storeStatementOnly(
      input,
      identity,
      statementId,
      fileName,
      importedAt,
      fallbackStatementMonth,
      "File stored locally. Once you share sample statements from this bank, we can add a tailored parser for it.",
    );

    return {
      message: `Stored ${input.file.name} for parser work later.`,
      statementId,
      status: "stored",
      transactionCount: 0,
      uncategorizedCount: 0,
    };
  }

  let parsedTransactions: ImportedParsedTransaction[];
  let parserKey = "generic-csv-v1";

  try {
    if (importMode === "spreadsheet") {
      const contents = await fs.readFile(destination);
      if (statementParser === "uob-card-xls") {
        parsedTransactions = parseUobSpreadsheet(contents);
        parserKey = "uob-sheet-v1";
      } else {
        parsedTransactions = parseSpreadsheet(contents);
        parserKey = "generic-sheet-v1";
      }
    } else {
      const contents = await fs.readFile(destination, "utf8");
      parsedTransactions = parseGenericCsv(contents);
    }
  } catch (error) {
    if (importMode === "spreadsheet") {
      const reason =
        error instanceof Error
          ? error.message
          : "The spreadsheet was saved, but could not be imported automatically.";

      storeStatementOnly(input, identity, statementId, fileName, importedAt, fallbackStatementMonth, reason);

      return {
        message: `Stored ${input.file.name} locally, but I could not import transactions from it automatically yet.`,
        statementId,
        status: "stored",
        transactionCount: 0,
        uncategorizedCount: 0,
      };
    }

    throw error;
  }

  const insertStatement = db.prepare(
    `
      INSERT INTO statements (
        id,
        bank_name,
        account_label,
        statement_month,
        file_name,
        original_file_name,
        mime_type,
        parser_key,
        import_status,
        imported_at,
        notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );

  const insertTransaction = db.prepare(
    `
      INSERT OR IGNORE INTO transactions (
        id,
        statement_id,
        posted_at,
        amount_cents,
        currency,
        raw_description,
        merchant_name,
        normalized_merchant,
        category_id,
        category_source,
        note,
        raw_row_json,
        created_at,
        transaction_kind
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );

  let uncategorizedCount = 0;
  let paymentCount = 0;
  const statementMonth = deriveStatementMonth(parsedTransactions) ?? fallbackStatementMonth;

  const transaction = db.transaction(() => {
    insertStatement.run(
      statementId,
      identity.bankName,
      identity.accountLabel,
      statementMonth,
      fileName,
      input.file.name,
      input.file.type || (importMode === "spreadsheet" ? "application/vnd.ms-excel" : "text/csv"),
      parserKey,
      "imported",
      importedAt,
      null,
    );

    for (const parsedTransaction of parsedTransactions) {
      const categoryRule = isCategorizableTransactionKind(parsedTransaction.transactionKind)
        ? findRule(parsedTransaction.normalizedMerchant)
        : undefined;
      const categoryId = categoryRule?.categoryId ?? null;
      const categorySource = isCategorizableTransactionKind(parsedTransaction.transactionKind)
        ? categoryRule
          ? "rule"
          : "pending"
        : "not_applicable";

      if (!categoryId && isCategorizableTransactionKind(parsedTransaction.transactionKind)) {
        uncategorizedCount += 1;
      }

      if (parsedTransaction.transactionKind === "payment") {
        paymentCount += 1;
      }

      insertTransaction.run(
        randomUUID(),
        statementId,
        parsedTransaction.postedAt,
        parsedTransaction.amountCents,
        parsedTransaction.currency,
        parsedTransaction.rawDescription,
        parsedTransaction.merchantName,
        parsedTransaction.normalizedMerchant,
        categoryId,
        categorySource,
        null,
        parsedTransaction.rawRowJson,
        importedAt,
        parsedTransaction.transactionKind,
      );
    }

    db.prepare("UPDATE statements SET notes = ? WHERE id = ?").run(
      buildImportSummary({
        paymentCount,
        transactionCount: parsedTransactions.length,
        uncategorizedCount,
      }),
      statementId,
    );
  });

  transaction();

  return {
    message: buildImportSummary({
      paymentCount,
      transactionCount: parsedTransactions.length,
      uncategorizedCount,
    }),
    statementId,
    status: "imported",
    transactionCount: parsedTransactions.length,
    uncategorizedCount,
  };
}
