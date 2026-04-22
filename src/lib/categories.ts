export type CategorySeed = {
  color: string;
  id: string;
  name: string;
  sortOrder: number;
};

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  { id: "groceries", name: "Groceries", color: "#607744", sortOrder: 1 },
  { id: "dining", name: "Dining", color: "#b05c42", sortOrder: 2 },
  { id: "transport", name: "Transport", color: "#305f72", sortOrder: 3 },
  { id: "shopping", name: "Shopping", color: "#8f6e4d", sortOrder: 4 },
  { id: "bills", name: "Bills", color: "#6d6875", sortOrder: 5 },
  { id: "health", name: "Health", color: "#4f6f52", sortOrder: 6 },
  { id: "travel", name: "Travel", color: "#3d5a80", sortOrder: 7 },
  { id: "entertainment", name: "Entertainment", color: "#8f5b86", sortOrder: 8 },
  { id: "subscriptions", name: "Subscriptions", color: "#c6853c", sortOrder: 9 },
  { id: "education", name: "Education", color: "#5e6472", sortOrder: 10 },
  { id: "gifts", name: "Gifts", color: "#b56576", sortOrder: 11 },
  { id: "income", name: "Income", color: "#2d6a4f", sortOrder: 12 },
  { id: "other", name: "Other", color: "#7a6c5d", sortOrder: 13 },
];

export const CATEGORY_COLOR_CHOICES = DEFAULT_CATEGORIES.map((category) => category.color);

export function getRandomCategoryColor() {
  const index = Math.floor(Math.random() * CATEGORY_COLOR_CHOICES.length);

  return CATEGORY_COLOR_CHOICES[index] ?? "#607744";
}
