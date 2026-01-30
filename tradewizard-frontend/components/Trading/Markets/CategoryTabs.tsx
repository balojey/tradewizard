"use client";

import { type CategoryId, type Category } from "@/constants/categories";
import { cn } from "@/utils/classNames";
import { motion } from "framer-motion";

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
    <div className="mb-6 relative">
      <div className="overflow-x-auto scrollbar-custom pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-2 min-w-max">
          {categories.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={cn(
                  "relative px-4 py-2 text-sm font-medium transition-colors duration-200 outline-none rounded-full whitespace-nowrap z-10",
                  isActive ? "text-white" : "text-gray-400 hover:text-gray-200"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategoryTab"
                    className="absolute inset-0 bg-indigo-600 rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    style={{ zIndex: -1 }}
                  />
                )}
                <span className="relative z-10">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Decorative gradient fade on the right for overflow indication on mobile */}
      <div className="absolute top-0 right-0 bottom-2 w-8 bg-gradient-to-l from-[#0A0A0B] to-transparent pointer-events-none sm:hidden" />
    </div>
  );
}
