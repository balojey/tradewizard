"use client";

import { type CategoryId, type Category } from "@/constants/categories";
import { cn } from "@/utils/classNames";

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: CategoryId;
  onCategoryChange: (categoryId: CategoryId) => void;
}

export default function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border",
              isActive
                ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10 hover:text-white"
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

