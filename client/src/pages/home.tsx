import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileSubmissionModal } from "@/components/file-submission-modal";
import { FileList } from "@/components/file-list";
import { CategoryTabs } from "@/components/category-tabs";
import type { FileSubmission } from "@shared/schema";

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: submissions, isLoading } = useQuery<FileSubmission[]>({
    queryKey: ["/api/submissions", selectedCategory !== "전체" ? selectedCategory : undefined].filter(Boolean),
    queryFn: ({ queryKey }) => {
      const url = queryKey.length > 1 
        ? `/api/submissions?category=${encodeURIComponent(queryKey[1] as string)}`
        : "/api/submissions";
      return fetch(url).then(res => res.json());
    }
  });

  const submissionCount = submissions?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <a className="mr-6 flex items-center space-x-2" href="/">
              <span className="hidden font-bold sm:inline-block text-xl">선남 확인</span>
            </a>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <span className="text-xl font-bold md:hidden">선남 확인</span>
            </div>
            <nav className="flex items-center">
              <div className="flex items-center space-x-2 text-sm">
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <span className="text-sm">온라인</span>
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Category Navigation */}
        <div className="container py-6">
          <CategoryTabs 
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            submissionCount={submissionCount}
          />
        </div>

        {/* Content Area */}
        <div className="container pb-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-muted-foreground">로딩 중...</div>
            </div>
          ) : submissions && submissions.length > 0 ? (
            <FileList submissions={submissions} />
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-24 h-24 mb-6 text-muted-foreground">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
                  <path d="M4 7v10c0 2.21 1.79 4 4 4h8c2.21 0 4-1.79 4-4V7"/>
                  <path d="M5 7V5a2 2 0 0 1 2-2h2"/>
                  <path d="M15 3h2a2 2 0 0 1 2 2v2"/>
                  <path d="M9 12l2 2l4-4"/>
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-2">미완료 선남내용이 없습니다.</h3>
              <p className="text-muted-foreground mb-8">선남내용을 등록해보세요.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsModalOpen(true)}
          data-testid="button-add-submission"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      {/* Modal */}
      <FileSubmissionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
