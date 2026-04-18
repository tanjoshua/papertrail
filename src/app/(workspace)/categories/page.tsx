import Link from "next/link";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/actions";
import {
  EmptyState,
  MessageBanner,
  PageHeader,
  SectionCard,
} from "@/app/(workspace)/_components/workspace-ui";
import { getCategoryManagementData } from "@/lib/expenses";

type CategoriesPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const data = getCategoryManagementData();

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Categories"
        title="Shape the category system without losing review discipline."
        description="Add new buckets, rename old ones, and retire categories cleanly. Deleting a category clears its merchant memory and sends matching transactions back to review so nothing stays misclassified."
        actions={
          <div className="header-actions">
            <Link href="/review" className="secondary-button">
              Open review
            </Link>
            <Link href="/" className="primary-button">
              Back to overview
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="summary-band">
        <article className="summary-item">
          <p className="eyebrow">Categories</p>
          <p className="summary-value">{data.summary.categoryCount}</p>
          <p className="summary-copy">Every spending bucket currently available across review and month pages.</p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Saved rules</p>
          <p className="summary-value">{data.summary.ruleCount}</p>
          <p className="summary-copy">Reusable merchant memory entries attached to the category library.</p>
        </article>

        <article className="summary-item">
          <p className="eyebrow">Categorized rows</p>
          <p className="summary-value">{data.summary.categorizedTransactionCount}</p>
          <p className="summary-copy">Reviewable transactions currently assigned to one of these categories.</p>
        </article>
      </section>

      <SectionCard
        eyebrow="Add"
        title="Create a new category"
        description="New categories appear immediately anywhere you can classify spend."
      >
        <form action={createCategoryAction} className="category-create-form">
          <label className="category-field-stack">
            <span className="field-label">Name</span>
            <input type="text" name="name" className="field" placeholder="Pet care" maxLength={60} required />
          </label>
          <label className="category-field-stack">
            <span className="field-label">Color</span>
            <input type="color" name="color" defaultValue="#607744" className="color-field" required />
          </label>
          <div className="category-create-actions">
            <button type="submit" className="primary-button">
              Add category
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="Library"
        title="Edit or retire existing categories"
        description="Updating a category keeps its history intact. Deleting one removes its merchant rules and returns affected spend to review."
      >
        {data.categories.length > 0 ? (
          <div className="category-library">
            {data.categories.map((category) => (
              <article key={category.id} className="category-row">
                <div className="category-row-header">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="category-swatch" style={{ backgroundColor: category.color }} />
                      <p className="font-semibold text-stone-900">{category.name}</p>
                      <span className="chip">ID: {category.id}</span>
                    </div>
                    <div className="category-stats">
                      <span className="chip">
                        {category.ruleCount} rule{category.ruleCount === 1 ? "" : "s"}
                      </span>
                      <span className="chip">
                        {category.categorizedTransactionCount} row
                        {category.categorizedTransactionCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <p className="section-copy">Order {category.sortOrder}</p>
                </div>

                <form action={updateCategoryAction} className="category-edit-form">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <label className="category-field-stack">
                    <span className="field-label">Name</span>
                    <input type="text" name="name" defaultValue={category.name} className="field" maxLength={60} required />
                  </label>
                  <label className="category-field-stack">
                    <span className="field-label">Color</span>
                    <input type="color" name="color" defaultValue={category.color} className="color-field" required />
                  </label>
                  <button type="submit" className="secondary-button">
                    Save changes
                  </button>
                </form>

                <form action={deleteCategoryAction} className="category-delete-form">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <p className="section-copy">
                    Delete this category if you want every merchant and transaction tied to it to return to review.
                  </p>
                  <button type="submit" className="danger-button compact-button">
                    Delete category
                  </button>
                </form>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No categories yet"
            description="Create your first category so review decisions have somewhere to land."
          />
        )}
      </SectionCard>
    </div>
  );
}
