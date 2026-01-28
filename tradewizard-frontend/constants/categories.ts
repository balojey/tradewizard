export type CategoryId = string;

export interface Category {
  id: CategoryId;
  label: string;
  tagId: number | null;
}

export const CATEGORIES: Category[] = [
  {
    id: "trending",
    label: "Trending",
    tagId: 2, // Politics tag ID
  },
];

export const DEFAULT_CATEGORY: CategoryId = "trending";

export function getCategoryById(id: CategoryId): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

