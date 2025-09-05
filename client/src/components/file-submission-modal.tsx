import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Upload, Camera, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { insertFileSubmissionSchema, type InsertFileSubmission } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface FileSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const hospitals = [
  { value: "seoul-national", label: "서울대학교병원" },
  { value: "samsung", label: "삼성서울병원" },
  { value: "asan", label: "서울아산병원" },
  { value: "severance", label: "연세세브란스병원" },
  { value: "catholic", label: "가톨릭대학교 서울성모병원" },
];

const categories = [
  { value: "안양", label: "안양" },
  { value: "구로", label: "구로" },
  { value: "안산", label: "안산" },
  { value: "기타", label: "기타" },
];

export function FileSubmissionModal({ isOpen, onClose }: FileSubmissionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertFileSubmission>({
    resolver: zodResolver(insertFileSubmissionSchema),
    defaultValues: {
      hospital: "",
      content: "",
      category: "안양",
      status: "pending",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertFileSubmission & { file?: File }) => {
      const formData = new FormData();
      
      // Append form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "file" && value !== undefined) {
          formData.append(key, value.toString());
        }
      });
      
      // Append file if selected
      if (data.file) {
        formData.append("file", data.file);
      }
      
      const response = await apiRequest("POST", "/api/submissions", formData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "성공",
        description: "선남 내용이 성공적으로 등록되었습니다.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      onClose();
      form.reset();
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "오류",
        description: "등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
      console.error("Submission error:", error);
    },
  });

  const onSubmit = (data: InsertFileSubmission) => {
    mutation.mutate({ ...data, file: selectedFile || undefined });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleCameraCapture = () => {
    // Create a file input element for camera capture
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Use back camera
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setSelectedFile(file);
      }
    };
    input.click();
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const handleClose = () => {
    onClose();
    form.reset();
    setSelectedFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>남품 등록</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Hospital Selection */}
            <FormField
              control={form.control}
              name="hospital"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>병원 선택</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-hospital">
                        <SelectValue placeholder="병원을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {hospitals.map((hospital) => (
                        <SelectItem key={hospital.value} value={hospital.value}>
                          {hospital.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Selection */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>카테고리</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>내용</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="오늘의 선남 내용을 입력하세요..."
                      className="resize-none"
                      data-testid="textarea-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">사진 첨부</label>
              
              {!selectedFile ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <div className="w-12 h-12 mx-auto mb-3 text-muted-foreground">
                    <Upload className="w-full h-full" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">파일을 드래그하여 업로드하거나</p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("file-input")?.click()}
                      data-testid="button-select-file"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      파일 선택
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="bg-green-600 text-white hover:bg-green-700"
                      onClick={handleCameraCapture}
                      data-testid="button-camera-capture"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      카메라로 촬영
                    </Button>
                  </div>
                  
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-3 p-3 bg-secondary rounded-md">
                  <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate" data-testid="text-file-name">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid="text-file-size">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="text-muted-foreground hover:text-destructive"
                    data-testid="button-remove-file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                data-testid="button-submit"
              >
                {mutation.isPending ? "등록 중..." : "등록"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
