import { randomUUID } from "node:crypto";
import { db } from "./db";
import { getCurrentMonthKey } from "./format";
import { slugify } from "./merchant";
import { isCategorizableTransactionKind, type TransactionKind } from "./transaction-kinds";

export type CategoryOption = {
  color: string;
  id: string;
  name: string;
};

export type StatementSummary = {
  accountLabel: string | null;
  bankName: string;
  cycleMonth: string;
  firstPostedAt: string | null;
  id: string;
  importedAt: string;
  lastPostedAt: string | null;
  monthsTouched: string[];
  netCents: number;
  notes: string | null;
  originalFileName: string;
  paymentCents: number;
  pendingCount: number;
  refundCents: number;
  reviewableTransactionCount: number;
  spendCents: number;
  status: string;
  transactionCount: number;
};

export type MonthCard = {
  accountCount: number;
  categorizedCount: number;
  month: string;
  netCents: number;
  paymentCents: number;
  pendingCount: number;
  refundCents: number;
  reviewableTransactionCount: number;
  spendCents: number;
  statementCount: number;
  topCategoryName: string | null;
  transactionCount: number;
};

export type ReviewGroup = {
  banks: string[];
  displayName: string;
  latestPostedAt: string;
  normalizedMerchant: string;
  representativeTransactionId: string;
  spendCents: number;
  totalCents: number;
  transactionCount: number;
  transactions: Array<{
    accountLabel: string | null;
    amountCents: number;
    bankName: string;
    id: string;
    merchantName: string;
    month: string;
    postedAt: string;
    rawDescription: string;
    statementId: string;
    transactionKind: TransactionKind;
  }>;
  months: string[];
};

export type MerchantRule = {
  categoryId: string;
  categoryName: string;
  color: string;
  displayName: string;
  id: string;
  normalizedMerchant: string;
  usageCount: number;
};

export type RuleCategoryGroup = {
  categoryId: string;
  categoryName: string;
  color: string;
  ruleCount: number;
  rules: MerchantRule[];
  usageCount: number;
};

export type OverviewData = {
  availableMonths: string[];
  hasData: boolean;
  monthCards: MonthCard[];
  pendingMerchantCount: number;
  pendingTransactionCount: number;
  recentStatements: StatementSummary[];
  reviewQueue: ReviewGroup[];
  stats: {
    importedStatementCount: number;
    parsedMonthCount: number;
    statementCount: number;
    storedStatementCount: number;
    transactionCount: number;
  };
};

export type MonthDetailData = {
  accounts: Array<{
    accountLabel: string | null;
    bankName: string;
    categorizedCount: number;
    monthNetCents: number;
    monthPaymentCents: number;
    monthRefundCents: number;
    monthSpendCents: number;
    pendingCount: number;
    reviewableTransactionCount: number;
    statementCount: number;
    transactionCount: number;
  }>;
  availableMonths: string[];
  categories: CategoryOption[];
  categoryBreakdown: Array<{
    color: string;
    name: string;
    share: number;
    totalCents: number;
    transactionCount: number;
  }>;
  hasTransactions: boolean;
  month: string;
  reviewQueue: ReviewGroup[];
  statementContributions: Array<
    StatementSummary & {
      monthNetCents: number;
      monthPaymentCents: number;
      monthRefundCents: number;
      monthSpendCents: number;
      monthTransactionCount: number;
    }
  >;
  summary: {
    accountCount: number;
    categorizedCount: number;
    netCents: number;
    paymentCents: number;
    pendingCount: number;
    refundCents: number;
    reviewableTransactionCount: number;
    spendCents: number;
    statementCount: number;
    topCategoryName: string | null;
    transactionCount: number;
  };
  timeline: Array<{
    date: string;
    items: Array<{
      accountLabel: string | null;
      amountCents: number;
      bankName: string;
      categoryColor: string | null;
      categoryId: string | null;
      categoryName: string | null;
      categorySource: string;
      id: string;
      merchantName: string;
      normalizedMerchant: string;
      rawDescription: string;
      statementId: string;
      transactionKind: TransactionKind;
    }>;
    totalCents: number;
  }>;
};

export type ReviewPageData = {
  availableMonths: string[];
  categories: CategoryOption[];
  memorySummary: {
    activeCategoryCount: number;
    totalRuleCount: number;
    totalUsageCount: number;
  };
  reviewQueue: ReviewGroup[];
  selectedMonth: string | null;
  selectedRuleCategoryId: string | null;
  ruleGroups: RuleCategoryGroup[];
  summary: {
    pendingMerchantCount: number;
    pendingTransactionCount: number;
    selectedMonthLabel: string;
    totalSpendCents: number;
  };
};

export type UploadPageData = {
  focusStatement: StatementSummary | null;
  recentStatements: StatementSummary[];
  stats: OverviewData["stats"];
};

export type CategoryManagementData = {
  categories: Array<
    CategoryOption & {
      categorizedTransactionCount: number;
      ruleCount: number;
      sortOrder: number;
    }
  >;
  summary: {
    categorizedTransactionCount: number;
    categoryCount: number;
    ruleCount: number;
  };
};

export type StatementsPageData = {
  statements: StatementSummary[];
  summary: {
    importedStatementCount: number;
    pendingReviewCount: number;
    statementCount: number;
    storedStatementCount: number;
  };
};

type PendingTransactionRow = {
  accountLabel: string | null;
  amountCents: number;
  bankName: string;
  id: string;
  merchantName: string;
  normalizedMerchant: string;
  postedAt: string;
  rawDescription: string;
  statementId: string;
  transactionKind: TransactionKind;
};

type MonthTransactionRow = PendingTransactionRow & {
  categoryColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySource: string;
};

function isMonthKey(value: string | undefined) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function getMonthBounds(month: string) {
  if (!isMonthKey(month)) {
    throw new Error("Invalid month key.");
  }

  const [year, numericMonth] = month.split("-").map(Number);
  const start = `${year}-${`${numericMonth}`.padStart(2, "0")}-01`;
  const nextMonth = numericMonth === 12 ? 1 : numericMonth + 1;
  const nextYear = numericMonth === 12 ? year + 1 : year;
  const endExclusive = `${nextYear}-${`${nextMonth}`.padStart(2, "0")}-01`;

  return { endExclusive, start };
}

function sortMonthsDescending(months: Iterable<string>) {
  return Array.from(new Set(months)).sort((left, right) => right.localeCompare(left));
}

export function getCategoryOptions() {
  return db
    .prepare(
      `
        SELECT id, name, color
        FROM categories
        ORDER BY sort_order ASC, name ASC
      `,
    )
    .all() as CategoryOption[];
}

function assertCategoryExists(categoryId: string) {
  const category = db
    .prepare(
      `
        SELECT id
        FROM categories
        WHERE id = ?
      `,
    )
    .get(categoryId) as { id: string } | undefined;

  if (!category) {
    throw new Error("Category not found.");
  }
}

function validateCategoryName(name: string) {
  if (!name) {
    throw new Error("Give the category a name.");
  }

  if (name.length > 60) {
    throw new Error("Keep category names under 60 characters.");
  }
}

function validateCategoryColor(color: string) {
  if (!/^#[0-9a-f]{6}$/i.test(color)) {
    throw new Error("Choose a valid 6-digit hex color.");
  }
}

function getNextCategorySortOrder() {
  const row = db
    .prepare(
      `
        SELECT COALESCE(MAX(sort_order), 0) + 1 AS nextSortOrder
        FROM categories
      `,
    )
    .get() as { nextSortOrder: number };

  return row.nextSortOrder;
}

function createUniqueCategoryId(name: string) {
  const baseId = slugify(name);

  if (!baseId) {
    throw new Error("Use at least one letter or number in the category name.");
  }

  let suffix = 0;
  let candidateId = baseId;

  while (
    db
      .prepare(
        `
          SELECT 1
          FROM categories
          WHERE id = ?
        `,
      )
      .get(candidateId)
  ) {
    suffix += 1;
    candidateId = `${baseId}-${suffix}`;
  }

  return candidateId;
}

export function getCategoryManagementData(): CategoryManagementData {
  const categories = db
    .prepare(
      `
        SELECT
          c.id,
          c.name,
          c.color,
          c.sort_order AS sortOrder,
          (
            SELECT COUNT(*)
            FROM merchant_rules mr
            WHERE mr.category_id = c.id
          ) AS ruleCount,
          (
            SELECT COUNT(*)
            FROM transactions t
            WHERE t.category_id = c.id
              AND t.transaction_kind IN ('expense', 'refund')
          ) AS categorizedTransactionCount
        FROM categories c
        ORDER BY c.sort_order ASC, c.name ASC
      `,
    )
    .all() as CategoryManagementData["categories"];

  return {
    categories,
    summary: {
      categorizedTransactionCount: categories.reduce(
        (total, category) => total + category.categorizedTransactionCount,
        0,
      ),
      categoryCount: categories.length,
      ruleCount: categories.reduce((total, category) => total + category.ruleCount, 0),
    },
  };
}

export function getAvailableMonths() {
  const months = db
    .prepare(
      `
        SELECT DISTINCT substr(posted_at, 1, 7) AS month
        FROM transactions
        ORDER BY month DESC
      `,
    )
    .all() as Array<{ month: string }>;

  return months.map((entry) => entry.month);
}

function getStatementSummaries(limit?: number) {
  const summaryQuery = `
    SELECT
      s.id,
      s.bank_name AS bankName,
      s.account_label AS accountLabel,
      s.statement_month AS cycleMonth,
      s.original_file_name AS originalFileName,
      s.import_status AS status,
      s.imported_at AS importedAt,
      s.notes,
      COUNT(t.id) AS transactionCount,
      COALESCE(SUM(CASE WHEN t.transaction_kind = 'expense' AND t.amount_cents > 0 THEN t.amount_cents ELSE 0 END), 0) AS spendCents,
      COALESCE(SUM(CASE WHEN t.transaction_kind = 'refund' THEN ABS(t.amount_cents) ELSE 0 END), 0) AS refundCents,
      COALESCE(SUM(CASE WHEN t.transaction_kind = 'payment' THEN ABS(t.amount_cents) ELSE 0 END), 0) AS paymentCents,
      COALESCE(SUM(t.amount_cents), 0) AS netCents,
      COALESCE(SUM(CASE WHEN t.transaction_kind IN ('expense', 'refund') THEN 1 ELSE 0 END), 0) AS reviewableTransactionCount,
      COALESCE(SUM(CASE WHEN t.transaction_kind IN ('expense', 'refund') AND t.category_id IS NULL THEN 1 ELSE 0 END), 0) AS pendingCount,
      MIN(t.posted_at) AS firstPostedAt,
      MAX(t.posted_at) AS lastPostedAt
    FROM statements s
    LEFT JOIN transactions t ON t.statement_id = s.id
    GROUP BY s.id
    ORDER BY s.imported_at DESC
  `;

  const rows = (limit
    ? db.prepare(`${summaryQuery} LIMIT ?`).all(limit)
    : db.prepare(summaryQuery).all()) as Array<Omit<StatementSummary, "monthsTouched">>;

  const monthsTouchedRows = db
    .prepare(
      `
        SELECT statement_id AS statementId, substr(posted_at, 1, 7) AS month
        FROM transactions
        GROUP BY statement_id, month
        ORDER BY month DESC
      `,
    )
    .all() as Array<{ month: string; statementId: string }>;

  const monthsTouchedByStatement = new Map<string, string[]>();

  for (const row of monthsTouchedRows) {
    const months = monthsTouchedByStatement.get(row.statementId) ?? [];
    months.push(row.month);
    monthsTouchedByStatement.set(row.statementId, months);
  }

  return rows.map((row) => ({
    ...row,
    monthsTouched: monthsTouchedByStatement.get(row.id) ?? [],
  }));
}

function getStatementSummary(statementId: string) {
  return getStatementSummaries().find((statement) => statement.id === statementId) ?? null;
}

function getOverviewStats(): OverviewData["stats"] {
  const row = db
    .prepare(
      `
        SELECT
          COUNT(*) AS statementCount,
          SUM(CASE WHEN import_status = 'stored' THEN 1 ELSE 0 END) AS storedStatementCount,
          SUM(CASE WHEN import_status = 'imported' THEN 1 ELSE 0 END) AS importedStatementCount,
          (SELECT COUNT(*) FROM transactions) AS transactionCount,
          (SELECT COUNT(DISTINCT substr(posted_at, 1, 7)) FROM transactions) AS parsedMonthCount
        FROM statements
      `,
    )
    .get() as OverviewData["stats"];

  return {
    importedStatementCount: row.importedStatementCount ?? 0,
    parsedMonthCount: row.parsedMonthCount ?? 0,
    statementCount: row.statementCount ?? 0,
    storedStatementCount: row.storedStatementCount ?? 0,
    transactionCount: row.transactionCount ?? 0,
  };
}

function getTopCategoriesByMonth() {
  const rows = db
    .prepare(
      `
        SELECT
          substr(t.posted_at, 1, 7) AS month,
          c.name AS categoryName,
          SUM(t.amount_cents) AS totalCents
        FROM transactions t
        INNER JOIN categories c ON c.id = t.category_id
        WHERE t.transaction_kind = 'expense'
          AND t.amount_cents > 0
        GROUP BY month, c.id, c.name
        ORDER BY month DESC, totalCents DESC, c.name ASC
      `,
    )
    .all() as Array<{ categoryName: string; month: string; totalCents: number }>;

  const topCategoryByMonth = new Map<string, string>();

  for (const row of rows) {
    if (!topCategoryByMonth.has(row.month)) {
      topCategoryByMonth.set(row.month, row.categoryName);
    }
  }

  return topCategoryByMonth;
}

function getPendingTransactions(month?: string) {
  let query = `
    SELECT
      t.id,
      t.posted_at AS postedAt,
      t.amount_cents AS amountCents,
      t.merchant_name AS merchantName,
      t.normalized_merchant AS normalizedMerchant,
      t.raw_description AS rawDescription,
      t.transaction_kind AS transactionKind,
      s.id AS statementId,
      s.bank_name AS bankName,
      s.account_label AS accountLabel
    FROM transactions t
    INNER JOIN statements s ON s.id = t.statement_id
    WHERE t.category_id IS NULL
      AND t.transaction_kind IN ('expense', 'refund')
  `;

  const parameters: string[] = [];

  if (month) {
    const { endExclusive, start } = getMonthBounds(month);
    query += " AND t.posted_at >= ? AND t.posted_at < ?";
    parameters.push(start, endExclusive);
  }

  query += " ORDER BY t.posted_at DESC, ABS(t.amount_cents) DESC, t.created_at DESC";

  return db.prepare(query).all(...parameters) as PendingTransactionRow[];
}

function buildReviewGroups(rows: PendingTransactionRow[]) {
  const reviewGroups = new Map<string, ReviewGroup>();

  for (const row of rows) {
    const month = row.postedAt.slice(0, 7);
    const bankLabel = row.accountLabel ? `${row.bankName} / ${row.accountLabel}` : row.bankName;
    const existing = reviewGroups.get(row.normalizedMerchant);

    if (!existing) {
      reviewGroups.set(row.normalizedMerchant, {
        banks: [bankLabel],
        displayName: row.merchantName,
        latestPostedAt: row.postedAt,
        normalizedMerchant: row.normalizedMerchant,
        representativeTransactionId: row.id,
        spendCents: Math.max(row.amountCents, 0),
        totalCents: row.amountCents,
        transactionCount: 1,
        transactions: [
          {
            accountLabel: row.accountLabel,
            amountCents: row.amountCents,
            bankName: row.bankName,
            id: row.id,
            merchantName: row.merchantName,
            month,
            postedAt: row.postedAt,
            rawDescription: row.rawDescription,
            statementId: row.statementId,
            transactionKind: row.transactionKind,
          },
        ],
        months: [month],
      });
      continue;
    }

    existing.transactionCount += 1;
    existing.totalCents += row.amountCents;
    existing.spendCents += Math.max(row.amountCents, 0);
    existing.latestPostedAt = existing.latestPostedAt > row.postedAt ? existing.latestPostedAt : row.postedAt;

    if (!existing.months.includes(month)) {
      existing.months.push(month);
      existing.months.sort((left, right) => right.localeCompare(left));
    }

    if (!existing.banks.includes(bankLabel)) {
      existing.banks.push(bankLabel);
      existing.banks.sort((left, right) => left.localeCompare(right));
    }

    existing.transactions.push({
      accountLabel: row.accountLabel,
      amountCents: row.amountCents,
      bankName: row.bankName,
      id: row.id,
      merchantName: row.merchantName,
      month,
      postedAt: row.postedAt,
      rawDescription: row.rawDescription,
      statementId: row.statementId,
      transactionKind: row.transactionKind,
    });
  }

  return Array.from(reviewGroups.values())
    .map((group) => ({
      ...group,
      months: sortMonthsDescending(group.months),
      transactions: group.transactions.sort((left, right) =>
        right.postedAt === left.postedAt
          ? Math.abs(right.amountCents) - Math.abs(left.amountCents)
          : right.postedAt.localeCompare(left.postedAt),
      ),
    }))
    .sort((left, right) => {
      if (right.transactionCount !== left.transactionCount) {
        return right.transactionCount - left.transactionCount;
      }

      if (right.spendCents !== left.spendCents) {
        return right.spendCents - left.spendCents;
      }

      return right.latestPostedAt.localeCompare(left.latestPostedAt);
    });
}

function getRules() {
  return db
    .prepare(
      `
        SELECT
          mr.id,
          mr.normalized_merchant AS normalizedMerchant,
          mr.display_name AS displayName,
          mr.category_id AS categoryId,
          c.name AS categoryName,
          c.color AS color,
          COUNT(t.id) AS usageCount
        FROM merchant_rules mr
        INNER JOIN categories c ON c.id = mr.category_id
        LEFT JOIN transactions t
          ON t.normalized_merchant = mr.normalized_merchant
         AND t.transaction_kind IN ('expense', 'refund')
        GROUP BY mr.id, mr.normalized_merchant, mr.display_name, mr.category_id, c.name, c.color
        ORDER BY usageCount DESC, mr.display_name ASC
      `,
    )
    .all() as MerchantRule[];
}

function buildRuleGroups(rules: MerchantRule[], categories: CategoryOption[]) {
  const groupsByCategory = new Map<string, RuleCategoryGroup>();

  for (const category of categories) {
    groupsByCategory.set(category.id, {
      categoryId: category.id,
      categoryName: category.name,
      color: category.color,
      ruleCount: 0,
      rules: [],
      usageCount: 0,
    });
  }

  for (const rule of rules) {
    const existing = groupsByCategory.get(rule.categoryId) ?? {
      categoryId: rule.categoryId,
      categoryName: rule.categoryName,
      color: rule.color,
      ruleCount: 0,
      rules: [],
      usageCount: 0,
    };

    existing.ruleCount += 1;
    existing.usageCount += rule.usageCount;
    existing.rules.push(rule);
    groupsByCategory.set(rule.categoryId, existing);
  }

  return Array.from(groupsByCategory.values()).filter((group) => group.ruleCount > 0);
}

export function getOverviewData(): OverviewData {
  const availableMonths = getAvailableMonths();
  const topCategories = getTopCategoriesByMonth();
  const monthRows = db
    .prepare(
      `
        SELECT
          substr(t.posted_at, 1, 7) AS month,
          COUNT(*) AS transactionCount,
          COALESCE(SUM(CASE WHEN t.transaction_kind = 'expense' AND t.amount_cents > 0 THEN t.amount_cents ELSE 0 END), 0) AS spendCents,
          COALESCE(SUM(CASE WHEN t.transaction_kind = 'refund' THEN ABS(t.amount_cents) ELSE 0 END), 0) AS refundCents,
          COALESCE(SUM(CASE WHEN t.transaction_kind = 'payment' THEN ABS(t.amount_cents) ELSE 0 END), 0) AS paymentCents,
          COALESCE(SUM(t.amount_cents), 0) AS netCents,
          COALESCE(SUM(CASE WHEN t.transaction_kind IN ('expense', 'refund') AND t.category_id IS NULL THEN 1 ELSE 0 END), 0) AS pendingCount,
          COALESCE(SUM(CASE WHEN t.transaction_kind IN ('expense', 'refund') AND t.category_id IS NOT NULL THEN 1 ELSE 0 END), 0) AS categorizedCount,
          COALESCE(SUM(CASE WHEN t.transaction_kind IN ('expense', 'refund') THEN 1 ELSE 0 END), 0) AS reviewableTransactionCount,
          COUNT(DISTINCT t.statement_id) AS statementCount,
          COUNT(DISTINCT s.bank_name || '|' || COALESCE(s.account_label, '')) AS accountCount
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id
        GROUP BY month
        ORDER BY month DESC
      `,
    )
    .all() as Array<Omit<MonthCard, "topCategoryName"> & { month: string }>;

  const reviewQueue = buildReviewGroups(getPendingTransactions());

  return {
    availableMonths,
    hasData: monthRows.length > 0,
    monthCards: monthRows.map((row) => ({
      ...row,
      topCategoryName: topCategories.get(row.month) ?? null,
    })),
    pendingMerchantCount: reviewQueue.length,
    pendingTransactionCount: reviewQueue.reduce((total, group) => total + group.transactionCount, 0),
    recentStatements: getStatementSummaries(5),
    reviewQueue: reviewQueue.slice(0, 5),
    stats: getOverviewStats(),
  };
}

function getMonthTransactions(month: string) {
  const { endExclusive, start } = getMonthBounds(month);

  return db
    .prepare(
      `
        SELECT
          t.id,
          t.posted_at AS postedAt,
          t.amount_cents AS amountCents,
          t.merchant_name AS merchantName,
          t.normalized_merchant AS normalizedMerchant,
          t.raw_description AS rawDescription,
          t.transaction_kind AS transactionKind,
          t.category_id AS categoryId,
          t.category_source AS categorySource,
          c.name AS categoryName,
          c.color AS categoryColor,
          s.id AS statementId,
          s.bank_name AS bankName,
          s.account_label AS accountLabel
        FROM transactions t
        INNER JOIN statements s ON s.id = t.statement_id
        LEFT JOIN categories c ON c.id = t.category_id
        WHERE t.posted_at >= ? AND t.posted_at < ?
        ORDER BY t.posted_at DESC, ABS(t.amount_cents) DESC, t.created_at DESC
      `,
    )
    .all(start, endExclusive) as MonthTransactionRow[];
}

export function getMonthDetailData(requestedMonth?: string): MonthDetailData {
  const availableMonths = getAvailableMonths();
  const month = isMonthKey(requestedMonth) ? requestedMonth! : availableMonths[0] ?? getCurrentMonthKey();
  const categories = getCategoryOptions();
  const transactions = getMonthTransactions(month);
  const statementMap = new Map(getStatementSummaries().map((statement) => [statement.id, statement]));

  const summary = {
    accountCount: 0,
    categorizedCount: 0,
    netCents: 0,
    paymentCents: 0,
    pendingCount: 0,
    refundCents: 0,
    reviewableTransactionCount: 0,
    spendCents: 0,
    statementCount: 0,
    topCategoryName: null as string | null,
    transactionCount: transactions.length,
  };

  const categoryBreakdownMap = new Map<
    string,
    { color: string; name: string; totalCents: number; transactionCount: number }
  >();
  const accountMap = new Map<
    string,
    MonthDetailData["accounts"][number] & { statementIds: Set<string> }
  >();
  const statementContributionMap = new Map<
    string,
    {
      monthNetCents: number;
      monthPaymentCents: number;
      monthRefundCents: number;
      monthSpendCents: number;
      monthTransactionCount: number;
    }
  >();
  const dailyTimelineMap = new Map<string, MonthDetailData["timeline"][number]>();

  for (const transaction of transactions) {
    summary.netCents += transaction.amountCents;

    if (transaction.transactionKind === "expense" && transaction.amountCents > 0) {
      summary.spendCents += transaction.amountCents;
    }

    if (transaction.transactionKind === "refund" && transaction.amountCents < 0) {
      summary.refundCents += Math.abs(transaction.amountCents);
    }

    if (transaction.transactionKind === "payment" && transaction.amountCents < 0) {
      summary.paymentCents += Math.abs(transaction.amountCents);
    }

    if (isCategorizableTransactionKind(transaction.transactionKind)) {
      summary.reviewableTransactionCount += 1;

      if (transaction.categoryId) {
        summary.categorizedCount += 1;
      } else {
        summary.pendingCount += 1;
      }
    }

    if (
      transaction.transactionKind === "expense" &&
      transaction.categoryId &&
      transaction.amountCents > 0 &&
      transaction.categoryColor &&
      transaction.categoryName
    ) {
      const category = categoryBreakdownMap.get(transaction.categoryId) ?? {
        color: transaction.categoryColor,
        name: transaction.categoryName,
        totalCents: 0,
        transactionCount: 0,
      };

      category.totalCents += transaction.amountCents;
      category.transactionCount += 1;
      categoryBreakdownMap.set(transaction.categoryId, category);
    }

    const accountKey = `${transaction.bankName}::${transaction.accountLabel ?? ""}`;
    const account = accountMap.get(accountKey) ?? {
      accountLabel: transaction.accountLabel,
      bankName: transaction.bankName,
      categorizedCount: 0,
      monthNetCents: 0,
      monthPaymentCents: 0,
      monthRefundCents: 0,
      monthSpendCents: 0,
      pendingCount: 0,
      reviewableTransactionCount: 0,
      statementCount: 0,
      statementIds: new Set<string>(),
      transactionCount: 0,
    };

    account.monthNetCents += transaction.amountCents;
    account.transactionCount += 1;
    account.statementIds.add(transaction.statementId);

    if (transaction.transactionKind === "expense" && transaction.amountCents > 0) {
      account.monthSpendCents += transaction.amountCents;
    }

    if (transaction.transactionKind === "refund" && transaction.amountCents < 0) {
      account.monthRefundCents += Math.abs(transaction.amountCents);
    }

    if (transaction.transactionKind === "payment" && transaction.amountCents < 0) {
      account.monthPaymentCents += Math.abs(transaction.amountCents);
    }

    if (isCategorizableTransactionKind(transaction.transactionKind)) {
      account.reviewableTransactionCount += 1;

      if (transaction.categoryId) {
        account.categorizedCount += 1;
      } else {
        account.pendingCount += 1;
      }
    }

    accountMap.set(accountKey, account);

    const statementContribution = statementContributionMap.get(transaction.statementId) ?? {
      monthNetCents: 0,
      monthPaymentCents: 0,
      monthRefundCents: 0,
      monthSpendCents: 0,
      monthTransactionCount: 0,
    };

    statementContribution.monthNetCents += transaction.amountCents;

    if (transaction.transactionKind === "expense" && transaction.amountCents > 0) {
      statementContribution.monthSpendCents += transaction.amountCents;
    }

    if (transaction.transactionKind === "refund" && transaction.amountCents < 0) {
      statementContribution.monthRefundCents += Math.abs(transaction.amountCents);
    }

    if (transaction.transactionKind === "payment" && transaction.amountCents < 0) {
      statementContribution.monthPaymentCents += Math.abs(transaction.amountCents);
    }

    statementContribution.monthTransactionCount += 1;
    statementContributionMap.set(transaction.statementId, statementContribution);

    const day = dailyTimelineMap.get(transaction.postedAt) ?? {
      date: transaction.postedAt,
      items: [],
      totalCents: 0,
    };

    day.totalCents += transaction.amountCents;
    day.items.push({
      accountLabel: transaction.accountLabel,
      amountCents: transaction.amountCents,
      bankName: transaction.bankName,
      categoryColor: transaction.categoryColor,
      categoryId: transaction.categoryId,
      categoryName: transaction.categoryName,
      categorySource: transaction.categorySource,
      id: transaction.id,
      merchantName: transaction.merchantName,
      normalizedMerchant: transaction.normalizedMerchant,
      rawDescription: transaction.rawDescription,
      statementId: transaction.statementId,
      transactionKind: transaction.transactionKind,
    });
    dailyTimelineMap.set(transaction.postedAt, day);
  }

  const categoryBreakdown = Array.from(categoryBreakdownMap.values()).sort((left, right) =>
    right.totalCents === left.totalCents
      ? left.name.localeCompare(right.name)
      : right.totalCents - left.totalCents,
  );
  const categorizedBase = categoryBreakdown.reduce((total, category) => total + category.totalCents, 0);

  summary.topCategoryName = categoryBreakdown[0]?.name ?? null;
  summary.statementCount = statementContributionMap.size;
  summary.accountCount = accountMap.size;

  return {
    accounts: Array.from(accountMap.values())
      .map(({ statementIds, ...account }) => ({
        ...account,
        statementCount: statementIds.size,
      }))
      .sort((left, right) =>
        right.monthSpendCents === left.monthSpendCents
          ? left.bankName.localeCompare(right.bankName)
          : right.monthSpendCents - left.monthSpendCents,
      ),
    availableMonths,
    categories,
    categoryBreakdown: categoryBreakdown.map((category) => ({
      ...category,
      share: categorizedBase > 0 ? category.totalCents / categorizedBase : 0,
    })),
    hasTransactions: transactions.length > 0,
    month,
    reviewQueue: buildReviewGroups(
      transactions
        .filter(
          (transaction) =>
            isCategorizableTransactionKind(transaction.transactionKind) && !transaction.categoryId,
        )
        .map((transaction) => ({
          accountLabel: transaction.accountLabel,
          amountCents: transaction.amountCents,
          bankName: transaction.bankName,
          id: transaction.id,
          merchantName: transaction.merchantName,
          normalizedMerchant: transaction.normalizedMerchant,
          postedAt: transaction.postedAt,
          rawDescription: transaction.rawDescription,
          statementId: transaction.statementId,
          transactionKind: transaction.transactionKind,
        })),
    ),
    statementContributions: Array.from(statementContributionMap.entries())
      .map(([statementId, contribution]) => {
        const statement = statementMap.get(statementId);

        if (!statement) {
          return null;
        }

        return {
          ...statement,
          ...contribution,
        };
      })
      .filter((statement): statement is NonNullable<typeof statement> => statement !== null)
      .sort((left, right) =>
        right.monthSpendCents === left.monthSpendCents
          ? right.importedAt.localeCompare(left.importedAt)
          : right.monthSpendCents - left.monthSpendCents,
      ),
    summary,
    timeline: Array.from(dailyTimelineMap.values()).sort((left, right) => right.date.localeCompare(left.date)),
  };
}

export function getReviewPageData(selectedMonth?: string, selectedRuleCategoryId?: string): ReviewPageData {
  const availableMonths = getAvailableMonths();
  const categories = getCategoryOptions();
  const resolvedMonth =
    isMonthKey(selectedMonth) && availableMonths.includes(selectedMonth!)
      ? selectedMonth!
      : selectedMonth === "all"
        ? null
        : null;
  const reviewQueue = buildReviewGroups(getPendingTransactions(resolvedMonth ?? undefined));
  const ruleGroups = buildRuleGroups(getRules(), categories);
  const resolvedRuleCategoryId =
    selectedRuleCategoryId && ruleGroups.some((group) => group.categoryId === selectedRuleCategoryId)
      ? selectedRuleCategoryId
      : null;

  return {
    availableMonths,
    categories,
    memorySummary: {
      activeCategoryCount: ruleGroups.length,
      totalRuleCount: ruleGroups.reduce((total, group) => total + group.ruleCount, 0),
      totalUsageCount: ruleGroups.reduce((total, group) => total + group.usageCount, 0),
    },
    reviewQueue,
    selectedMonth: resolvedMonth,
    selectedRuleCategoryId: resolvedRuleCategoryId,
    ruleGroups,
    summary: {
      pendingMerchantCount: reviewQueue.length,
      pendingTransactionCount: reviewQueue.reduce((total, group) => total + group.transactionCount, 0),
      selectedMonthLabel: resolvedMonth ?? "All months",
      totalSpendCents: reviewQueue.reduce((total, group) => total + group.spendCents, 0),
    },
  };
}

export function getUploadPageData(statementId?: string): UploadPageData {
  const recentStatements = getStatementSummaries(8);
  return {
    focusStatement: statementId ? getStatementSummary(statementId) : null,
    recentStatements,
    stats: getOverviewStats(),
  };
}

export function getStatementsPageData(): StatementsPageData {
  const statements = getStatementSummaries();

  return {
    statements,
    summary: {
      importedStatementCount: statements.filter((statement) => statement.status === "imported").length,
      pendingReviewCount: statements.reduce((total, statement) => total + statement.pendingCount, 0),
      statementCount: statements.length,
      storedStatementCount: statements.filter((statement) => statement.status === "stored").length,
    },
  };
}

export function createCategory(input: { color: string; name: string }) {
  const name = input.name.trim();
  const color = input.color.trim();

  validateCategoryName(name);
  validateCategoryColor(color);

  const id = createUniqueCategoryId(name);
  const sortOrder = getNextCategorySortOrder();

  try {
    db.prepare(
      `
        INSERT INTO categories (id, name, color, sort_order)
        VALUES (?, ?, ?, ?)
      `,
    ).run(id, name, color, sortOrder);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: categories.name")) {
      throw new Error("A category with that name already exists.");
    }

    throw error;
  }
}

export function updateCategory(input: { color: string; id: string; name: string }) {
  const id = input.id.trim();
  const name = input.name.trim();
  const color = input.color.trim();

  if (!id) {
    throw new Error("Category not found.");
  }

  validateCategoryName(name);
  validateCategoryColor(color);
  assertCategoryExists(id);

  try {
    db.prepare(
      `
        UPDATE categories
        SET name = ?, color = ?
        WHERE id = ?
      `,
    ).run(name, color, id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed: categories.name")) {
      throw new Error("A category with that name already exists.");
    }

    throw error;
  }
}

export function deleteCategory(categoryId: string) {
  const id = categoryId.trim();

  if (!id) {
    throw new Error("Category not found.");
  }

  assertCategoryExists(id);

  db.transaction(() => {
    db.prepare(
      `
        DELETE FROM merchant_rules
        WHERE category_id = ?
      `,
    ).run(id);

    db.prepare(
      `
        UPDATE transactions
        SET category_id = NULL,
            category_source = 'pending'
        WHERE category_id = ?
          AND transaction_kind IN ('expense', 'refund')
      `,
    ).run(id);

    db.prepare(
      `
        DELETE FROM categories
        WHERE id = ?
      `,
    ).run(id);
  })();
}

export function assignTransactionCategory(input: {
  categoryId: string;
  scope: "once" | "future";
  transactionId: string;
}) {
  assertCategoryExists(input.categoryId);

  const transactionRecord = db
    .prepare(
      `
        SELECT
          merchant_name AS merchantName,
          normalized_merchant AS normalizedMerchant,
          transaction_kind AS transactionKind
        FROM transactions
        WHERE id = ?
      `,
    )
    .get(input.transactionId) as
    | { merchantName: string; normalizedMerchant: string; transactionKind: TransactionKind }
    | undefined;

  if (!transactionRecord) {
    throw new Error("Transaction not found.");
  }

  if (!isCategorizableTransactionKind(transactionRecord.transactionKind)) {
    throw new Error("Card payments are classified automatically and do not need a category.");
  }

  const now = new Date().toISOString();

  if (input.scope === "once") {
    db.prepare(
      `
        UPDATE transactions
        SET category_id = ?, category_source = 'manual_once'
        WHERE id = ?
          AND transaction_kind IN ('expense', 'refund')
      `,
    ).run(input.categoryId, input.transactionId);

    return;
  }

  db.transaction(() => {
    db.prepare(
      `
        INSERT INTO merchant_rules (
          id,
          normalized_merchant,
          display_name,
          category_id,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(normalized_merchant) DO UPDATE SET
          display_name = excluded.display_name,
          category_id = excluded.category_id,
          updated_at = excluded.updated_at
      `,
    ).run(
      randomUUID(),
      transactionRecord.normalizedMerchant,
      transactionRecord.merchantName,
      input.categoryId,
      now,
      now,
    );

    db.prepare(
      `
        UPDATE transactions
        SET category_id = ?, category_source = 'manual_rule'
        WHERE normalized_merchant = ?
          AND transaction_kind IN ('expense', 'refund')
          AND category_source != 'manual_once'
      `,
    ).run(input.categoryId, transactionRecord.normalizedMerchant);
  })();
}

export function updateRuleCategory(ruleId: string, categoryId: string) {
  assertCategoryExists(categoryId);

  const rule = db
    .prepare(
      `
        SELECT normalized_merchant AS normalizedMerchant
        FROM merchant_rules
        WHERE id = ?
      `,
    )
    .get(ruleId) as { normalizedMerchant: string } | undefined;

  if (!rule) {
    throw new Error("Rule not found.");
  }

  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(
      `
        UPDATE merchant_rules
        SET category_id = ?, updated_at = ?
        WHERE id = ?
      `,
    ).run(categoryId, now, ruleId);

    db.prepare(
      `
        UPDATE transactions
        SET category_id = ?, category_source = 'manual_rule'
        WHERE normalized_merchant = ?
          AND transaction_kind IN ('expense', 'refund')
          AND category_source != 'manual_once'
      `,
    ).run(categoryId, rule.normalizedMerchant);
  })();
}

export function loadDemoWorkspace() {
  const existingCount = db
    .prepare("SELECT COUNT(*) AS count FROM statements")
    .get() as { count: number };

  if (existingCount.count > 0) {
    return false;
  }

  const now = new Date();
  const currentMonth = getCurrentMonthKey(now);
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonth = getCurrentMonthKey(previousMonthDate);
  const insertedAt = now.toISOString();

  const statementInsert = db.prepare(
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

  const transactionInsert = db.prepare(
    `
      INSERT INTO transactions (
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

  const ruleInsert = db.prepare(
    `
      INSERT INTO merchant_rules (
        id,
        normalized_merchant,
        display_name,
        category_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
  );

  const currentStatementId = randomUUID();
  const secondStatementId = randomUUID();
  const previousStatementId = randomUUID();

  db.transaction(() => {
    statementInsert.run(
      currentStatementId,
      "Northstar Bank",
      "Rewards Visa",
      currentMonth,
      "demo-northstar.csv",
      "demo-northstar.csv",
      "text/csv",
      "demo",
      "imported",
      insertedAt,
      "Imported 8 transactions. 1 card payment row will stay out of spend and review. 2 merchants still need categorization.",
    );

    statementInsert.run(
      secondStatementId,
      "Lighthouse Bank",
      "Travel Mastercard",
      currentMonth,
      "demo-lighthouse.csv",
      "demo-lighthouse.csv",
      "text/csv",
      "demo",
      "imported",
      insertedAt,
      "Imported 5 transactions. 1 need review.",
    );

    statementInsert.run(
      previousStatementId,
      "Northstar Bank",
      "Rewards Visa",
      previousMonth,
      "demo-previous.csv",
      "demo-previous.csv",
      "text/csv",
      "demo",
      "imported",
      insertedAt,
      "Imported 4 transactions. All merchants recognized.",
    );

    ruleInsert.run(randomUUID(), "FAIRPRICE", "Fairprice", "groceries", insertedAt, insertedAt);
    ruleInsert.run(randomUUID(), "SPOTIFY", "Spotify", "subscriptions", insertedAt, insertedAt);
    ruleInsert.run(randomUUID(), "GRAB", "Grab", "transport", insertedAt, insertedAt);

    const demoTransactions = [
      [currentStatementId, `${currentMonth}-03`, 1240, "GRAB *RIDE 20393", "Grab", "GRAB", "transport", "rule", "expense"],
      [currentStatementId, `${currentMonth}-05`, 1885, "SPOTIFY PTE LTD", "Spotify", "SPOTIFY", "subscriptions", "rule", "expense"],
      [currentStatementId, `${currentMonth}-06`, 7845, "NTUC FAIRPRICE 313", "Fairprice", "FAIRPRICE", "groceries", "rule", "expense"],
      [currentStatementId, `${currentMonth}-08`, 4520, "LUMA CAFE TANGLIN", "Luma Cafe Tanglin", "LUMA CAFE TANGLIN", null, "pending", "expense"],
      [currentStatementId, `${currentMonth}-12`, 14990, "SCOOT AIRFARE", "Scoot Airfare", "SCOOT AIRFARE", "travel", "manual_rule", "expense"],
      [currentStatementId, `${currentMonth}-13`, 2690, "SHAKE SHACK JEWEL", "Shake Shack Jewel", "SHAKE SHACK JEWEL", "dining", "manual_once", "expense"],
      [currentStatementId, `${currentMonth}-14`, -2300, "AMZN REFUND", "Amzn Refund", "AMZN REFUND", "shopping", "manual_rule", "refund"],
      [currentStatementId, `${currentMonth}-18`, -6240, "PAYMENT RECEIVED - THANK YOU", "Payment Received - Thank You", "PAYMENT RECEIVED THANK YOU", null, "not_applicable", "payment"],
      [secondStatementId, `${currentMonth}-04`, 6100, "WATSONS SG", "Watsons Sg", "WATSONS", "health", "manual_rule", "expense"],
      [secondStatementId, `${currentMonth}-09`, 3290, "MYSTERY MARKET 88", "Mystery Market 88", "MYSTERY MARKET", null, "pending", "expense"],
      [secondStatementId, `${currentMonth}-10`, 2180, "GRAB *FOOD 8992", "Grab", "GRAB", "transport", "rule", "expense"],
      [secondStatementId, `${currentMonth}-11`, 9000, "IQIYI SUBSCRIPTION", "Iqiyi Subscription", "IQIYI SUBSCRIPTION", "entertainment", "manual_rule", "expense"],
      [secondStatementId, `${currentMonth}-15`, 5600, "BOOKSHOP LEARNING HUB", "Bookshop Learning Hub", "BOOKSHOP LEARNING HUB", "education", "manual_rule", "expense"],
      [previousStatementId, `${previousMonth}-02`, 6500, "NTUC FAIRPRICE 812", "Fairprice", "FAIRPRICE", "groceries", "rule", "expense"],
      [previousStatementId, `${previousMonth}-07`, 1885, "SPOTIFY PTE LTD", "Spotify", "SPOTIFY", "subscriptions", "rule", "expense"],
      [previousStatementId, `${previousMonth}-11`, 3100, "GRAB *RIDE 1201", "Grab", "GRAB", "transport", "rule", "expense"],
      [previousStatementId, `${previousMonth}-19`, 4800, "GOLDEN VILLAGE", "Golden Village", "GOLDEN VILLAGE", "entertainment", "manual_rule", "expense"],
    ] as const;

    for (const demoTransaction of demoTransactions) {
      transactionInsert.run(
        randomUUID(),
        demoTransaction[0],
        demoTransaction[1],
        demoTransaction[2],
        "SGD",
        demoTransaction[3],
        demoTransaction[4],
        demoTransaction[5],
        demoTransaction[6],
        demoTransaction[7],
        null,
        JSON.stringify({ source: "demo" }),
        insertedAt,
        demoTransaction[8],
      );
    }
  })();

  return true;
}
