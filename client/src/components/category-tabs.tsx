import { Button } from "@/components/ui/button";

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  submissionCount: number;
}

const categories = [
  { id: "전체", label: "전체" },
  { id: "안양", label: "안양" },
  { id: "구로", label: "구로" },
  { id: "안산", label: "안산" },
  { id: "기타", label: "기타" },
];

export function CategoryTabs({ selectedCategory, onCategoryChange, submissionCount }: CategoryTabsProps) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        const showCount = category.id === "전체" || category.id === selectedCategory;
        
        return (
          <Button
            key={category.id}
            variant={isSelected ? "default" : "secondary"}
            className="whitespace-nowrap rounded-full px-6 py-2"
            onClick={() => onCategoryChange(category.id)}
            data-testid={`button-category-${category.id}`}
          >
            {category.label}
            {showCount && category.id === selectedCategory && (
              <span className="ml-1 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                {submissionCount}
              </span>
            )}
            {category.id === "전체" && selectedCategory === "전체" && (
              <span className="ml-1 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                {submissionCount}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
