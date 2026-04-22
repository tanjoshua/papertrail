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
  SummaryCard,
  buttonLinkClassName,
  chipClassName,
  workspaceCardGridClassName,
  workspaceCategoryCreateClassName,
  workspaceCategoryEditClassName,
  workspaceDeleteRowClassName,
  workspaceHeaderActionsClassName,
  workspacePageStackClassName,
  workspaceSectionCopyClassName,
} from "@/app/(workspace)/_components/workspace-ui";
import { getRandomCategoryColor } from "@/lib/categories";
import { getCategoryManagementData } from "@/lib/expenses";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type CategoriesPageProps = {
  searchParams?: Promise<{
    message?: string;
  }>;
};

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const message = typeof resolvedSearchParams.message === "string" ? resolvedSearchParams.message : undefined;
  const data = getCategoryManagementData();
  const newCategoryColor = getRandomCategoryColor();

  return (
    <div className={workspacePageStackClassName}>
      <PageHeader
        eyebrow="Categories"
        title="Shape the category system without losing review discipline."
        description="Add new buckets, rename old ones, and retire categories cleanly. Deleting a category clears its merchant memory and sends matching transactions back to review so nothing stays misclassified."
        actions={
          <div className={workspaceHeaderActionsClassName}>
            <Link href="/review" className={buttonLinkClassName({ variant: "outline" })}>
              Open review
            </Link>
            <Link href="/" className={buttonLinkClassName({ variant: "outline" })}>
              Back to overview
            </Link>
          </div>
        }
      />

      <MessageBanner message={message} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          eyebrow="Categories"
          value={data.summary.categoryCount}
          description="Every spending bucket currently available across review and month pages."
        />
        <SummaryCard
          eyebrow="Saved rules"
          value={data.summary.ruleCount}
          description="Reusable merchant memory entries attached to the category library."
        />
        <SummaryCard
          eyebrow="Categorized rows"
          value={data.summary.categorizedTransactionCount}
          description="Reviewable transactions currently assigned to one of these categories."
        />
      </section>

      <SectionCard
        eyebrow="Add"
        title="Create a new category"
        description="New categories appear immediately anywhere you can classify spend."
      >
        <form action={createCategoryAction}>
          <FieldGroup className={workspaceCategoryCreateClassName}>
            <Field className="grid gap-2">
              <FieldLabel htmlFor="new-category-name">Name</FieldLabel>
              <Input
                id="new-category-name"
                type="text"
                name="name"
                placeholder="Pet care"
                maxLength={60}
                required
              />
            </Field>
            <Field className="grid gap-2">
              <FieldLabel htmlFor="new-category-color">Color</FieldLabel>
              <Input
                key={newCategoryColor}
                id="new-category-color"
                type="color"
                name="color"
                defaultValue={newCategoryColor}
                className="h-12 w-20 p-1"
                required
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit">Add category</Button>
            </div>
          </FieldGroup>
        </form>
      </SectionCard>

      <SectionCard
        eyebrow="Library"
        title="Edit or retire existing categories"
        description="Updating a category keeps its history intact. Deleting one removes its merchant rules and returns affected spend to review."
      >
        {data.categories.length > 0 ? (
          <div className={workspaceCardGridClassName}>
            {data.categories.map((category) => (
              <article key={category.id} className="grid gap-4 rounded-[24px] border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="size-4 rounded-full border" style={{ backgroundColor: category.color }} />
                      <p className="font-semibold text-foreground">{category.name}</p>
                      <span className={chipClassName()}>ID: {category.id}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={chipClassName()}>
                        {category.ruleCount} rule{category.ruleCount === 1 ? "" : "s"}
                      </span>
                      <span className={chipClassName()}>
                        {category.categorizedTransactionCount} row
                        {category.categorizedTransactionCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <p className={workspaceSectionCopyClassName}>Order {category.sortOrder}</p>
                </div>

                <form
                  key={`${category.id}:${category.name}:${category.color}`}
                  action={updateCategoryAction}
                >
                  <input type="hidden" name="categoryId" value={category.id} />
                  <FieldGroup className={workspaceCategoryEditClassName}>
                    <Field className="grid gap-2">
                      <FieldLabel htmlFor={`name-${category.id}`}>Name</FieldLabel>
                      <Input
                        id={`name-${category.id}`}
                        type="text"
                        name="name"
                        defaultValue={category.name}
                        maxLength={60}
                        required
                      />
                    </Field>
                    <Field className="grid gap-2">
                      <FieldLabel htmlFor={`color-${category.id}`}>Color</FieldLabel>
                      <Input
                        id={`color-${category.id}`}
                        type="color"
                        name="color"
                        defaultValue={category.color}
                        className="h-12 w-20 p-1"
                        required
                      />
                    </Field>
                    <Button type="submit" variant="outline">
                      Save changes
                    </Button>
                  </FieldGroup>
                </form>

                <form action={deleteCategoryAction} className={workspaceDeleteRowClassName}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <p className={workspaceSectionCopyClassName}>
                    Delete this category if you want every merchant and transaction tied to it to return to review.
                  </p>
                  <Button type="submit" variant="destructive" size="sm">
                    Delete category
                  </Button>
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
