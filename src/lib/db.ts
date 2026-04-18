import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { DEFAULT_CATEGORIES } from "./categories";
import { inferTransactionKind, normalizeTransactionAmount, TRANSACTION_KINDS } from "./transaction-kinds";

const uploadsDirectory = join(/* turbopackIgnore: true */ process.cwd(), "data", "uploads");
const databasePath = join(/* turbopackIgnore: true */ process.cwd(), "data", "tracker.db");

const schema = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS statements (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_label TEXT,
    statement_month TEXT NOT NULL,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    mime_type TEXT,
    parser_key TEXT,
    import_status TEXT NOT NULL,
    imported_at TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS merchant_rules (
    id TEXT PRIMARY KEY,
    normalized_merchant TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    statement_id TEXT NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
    posted_at TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'SGD',
    raw_description TEXT NOT NULL,
    merchant_name TEXT NOT NULL,
    normalized_merchant TEXT NOT NULL,
    category_id TEXT REFERENCES categories(id),
    category_source TEXT NOT NULL,
    note TEXT,
    raw_row_json TEXT,
    created_at TEXT NOT NULL,
    transaction_kind TEXT NOT NULL DEFAULT 'expense'
  );

  CREATE INDEX IF NOT EXISTS idx_statements_month
    ON statements (statement_month DESC);

  CREATE INDEX IF NOT EXISTS idx_transactions_statement
    ON transactions (statement_id);

  CREATE INDEX IF NOT EXISTS idx_transactions_posted_at
    ON transactions (posted_at DESC);

  CREATE INDEX IF NOT EXISTS idx_transactions_normalized_merchant
    ON transactions (normalized_merchant);

  CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_statement_fingerprint
    ON transactions (statement_id, posted_at, amount_cents, raw_description);
`;

type BetterSqliteDatabase = Database.Database;

declare global {
  var __ledgerGardenDb: BetterSqliteDatabase | undefined;
}

function ensureDirectories() {
  mkdirSync(uploadsDirectory, { recursive: true });
}

function seedCategories(connection: BetterSqliteDatabase) {
  const insert = connection.prepare(`
    INSERT INTO categories (id, name, color, sort_order)
    VALUES (@id, @name, @color, @sortOrder)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      color = excluded.color,
      sort_order = excluded.sort_order
  `);

  for (const category of DEFAULT_CATEGORIES) {
    insert.run(category);
  }
}

function ensureTransactionKindColumn(connection: BetterSqliteDatabase) {
  const columns = connection
    .prepare("PRAGMA table_info(transactions)")
    .all() as Array<{ name: string }>;
  const hasTransactionKindColumn = columns.some((column) => column.name === "transaction_kind");

  if (!hasTransactionKindColumn) {
    try {
      connection.exec(
        "ALTER TABLE transactions ADD COLUMN transaction_kind TEXT NOT NULL DEFAULT 'expense'",
      );
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("duplicate column name: transaction_kind")) {
        throw error;
      }
    }
  }

  const rows = connection
    .prepare(
      `
        SELECT
          id,
          raw_description AS rawDescription,
          amount_cents AS amountCents,
          transaction_kind AS transactionKind,
          category_id AS categoryId,
          category_source AS categorySource
        FROM transactions
      `,
    )
    .all() as Array<{
    amountCents: number;
    categoryId: string | null;
    categorySource: string;
    id: string;
    rawDescription: string;
    transactionKind: string | null;
  }>;

  connection.exec(`
    CREATE INDEX IF NOT EXISTS idx_transactions_kind
      ON transactions (transaction_kind);
  `);

  const updateTransaction = connection.prepare(
    `
      UPDATE transactions
      SET
        amount_cents = ?,
        transaction_kind = ?,
        category_id = ?,
        category_source = ?
      WHERE id = ?
    `,
  );

  connection.transaction((rowsToNormalize: typeof rows) => {
    for (const row of rowsToNormalize) {
      const nextKind = inferTransactionKind(row.rawDescription, row.amountCents);
      const nextAmountCents = normalizeTransactionAmount(nextKind, row.amountCents);
      const nextCategoryId = nextKind === "payment" ? null : row.categoryId;
      const nextCategorySource = nextKind === "payment" ? "not_applicable" : row.categorySource;
      const needsKindNormalization =
        row.transactionKind === null || !TRANSACTION_KINDS.includes(row.transactionKind as (typeof TRANSACTION_KINDS)[number]);
      const needsAmountNormalization = nextAmountCents !== row.amountCents;
      const needsPaymentCleanup =
        nextKind === "payment" && (row.categoryId !== null || row.categorySource !== "not_applicable");
      const needsKindUpdate = needsKindNormalization || row.transactionKind !== nextKind;

      if (!needsKindUpdate && !needsAmountNormalization && !needsPaymentCleanup) {
        continue;
      }

      updateTransaction.run(nextAmountCents, nextKind, nextCategoryId, nextCategorySource, row.id);
    }
  })(rows);
}

function createDatabase() {
  ensureDirectories();

  const connection = new Database(databasePath);
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  connection.exec(schema);
  ensureTransactionKindColumn(connection);
  seedCategories(connection);
  return connection;
}

export const db = global.__ledgerGardenDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  global.__ledgerGardenDb = db;
}

export function getUploadsDirectory() {
  ensureDirectories();
  return uploadsDirectory;
}
