import { Button } from "@/components/ui/button";

interface CategoryTabsProps {
  selectedCategory: string;
  onCategoryChange: (hospital: string) => void;
  submissionCount: number;
  pendingCount?: number;
}

const hospitals = [
  { id: "전체", label: "전체" },
  { id: "안양병원", label: "안암" },
  { id: "구로병원", label: "구로" },
  { id: "안산병원", label: "안산" },
  { id: "기타", label: "기타" },
];

export function CategoryTabs({ selectedCategory, onCategoryChange, submissionCount, pendingCount }: CategoryTabsProps) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
      {hospitals.map((hospital) => {
        const isSelected = selectedCategory === hospital.id;
        const showCount = hospital.id === "전체" || hospital.id === selectedCategory;
        
        return (
          <Button
            key={hospital.id}
            variant={isSelected ? "default" : "secondary"}
            className="whitespace-nowrap rounded-full px-6 py-2"
            onClick={() => onCategoryChange(hospital.id)}
            data-testid={`button-category-${hospital.id}`}
          >
            {hospital.label}
            {showCount && hospital.id === selectedCategory && (
              <span className="ml-1 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                {submissionCount}
              </span>
            )}
            {hospital.id === "전체" && selectedCategory === "전체" && (
              <span className="ml-1 bg-primary-foreground text-primary rounded-full px-2 py-0.5 text-xs">
                {pendingCount !== undefined ? pendingCount : submissionCount}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
