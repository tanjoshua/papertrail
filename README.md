# Ledger Garden

Ledger Garden is a local-first expense tracker built with Next.js and SQLite. It is designed around a practical personal-finance workflow:

1. Upload credit-card statements from multiple banks.
2. Review merchants the app cannot recognize yet.
3. Categorize one transaction at a time or save a rule so the same merchant is recognized automatically next time.
4. View a month-by-month breakdown of spending across cards.

## What ships in this first version

- Next.js App Router interface focused on import, review, and monthly breakdowns
- SQLite database stored locally in `data/tracker.db`
- Statement uploads stored locally in `data/uploads`
- Generic CSV importer for immediate testing
- PDF statement storage now, with bank-specific parser hooks ready for the next step
- Merchant recognition rules that can be updated later from the UI
- One-off recategorization versus persistent recategorization
- Demo data loader so the workflow can be explored before real statements are added

## Why the app is shaped this way

The most important loop is not budgeting or forecasting yet. It is:

1. Get statement data into the app.
2. Clear the small queue of uncategorized merchants.
3. Reuse those decisions forever unless the user changes their mind.

That keeps the product honest and useful early, especially before we have real statement samples from your banks.

## Current import behavior

### CSV

CSV import works today and expects at least:

- a date column such as `Date`, `Posted Date`, or `Transaction Date`
- a description column such as `Description`, `Details`, or `Merchant`
- an amount-style column such as `Amount`

It also supports debit/credit style CSVs if separate columns are present.

### PDF

PDFs are stored locally today but are not parsed yet. This is intentional:

- statement layouts differ a lot between banks
- we will get better accuracy by building parsers from your real samples
- the app already has the right storage and review model, so the parser layer can be added cleanly next

## Data model

The app uses four core tables:

- `statements`: uploaded files with bank metadata and an auto-derived cycle label
- `transactions`: imported expense rows linked to a statement
- `categories`: reusable spending categories
- `merchant_rules`: merchant-to-category memory for future recognition

## Local development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Notes

- Uploaded files and the SQLite database are ignored by git through `.gitignore`.
- The UI analyzes spending by each transaction's posted calendar month, while statement records keep an auto-derived cycle label for provenance.
- The generic CSV importer assumes slash-formatted dates are day-first by default unless the values clearly indicate otherwise.

## Next step after you share statements

Once you upload real statements from your two banks, the next iteration should:

1. inspect the raw statement layouts
2. add a parser module for each bank
3. normalize merchant names more accurately per bank format
4. improve deduplication and edge cases such as refunds, installments, and foreign currency
