import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronRight, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FileSubmission } from "@shared/schema";

interface FileListProps {
  submissions: FileSubmission[];
}

const hospitalNames: Record<string, string> = {
  "안양병원": "안양병원",
  "구로병원": "구로병원",
  "안산병원": "안산병원",
  "기타": "기타",
};

const statusConfig = {
  pending: {
    label: "대기 중",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800",
  },
  completed: {
    label: "완료",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800",
  },
  failed: {
    label: "실패",
    icon: AlertCircle,
    className: "bg-red-100 text-red-800",
  },
};

export function FileList({ submissions }: FileListProps) {
  return (
    <div className="space-y-4">
      {submissions.map((submission) => {
        const statusInfo = statusConfig[submission.status as keyof typeof statusConfig];
        const StatusIcon = statusInfo.icon;
        
        return (
          <Card
            key={submission.id}
            className="hover:shadow-md transition-shadow"
            data-testid={`card-submission-${submission.id}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-card-foreground mb-1" data-testid={`text-content-${submission.id}`}>
                    {submission.content}
                  </h4>
                  
                  {submission.fileName && (
                    <p className="text-sm text-muted-foreground mb-2" data-testid={`text-filename-${submission.id}`}>
                      📎 {submission.fileName}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span data-testid={`text-hospital-${submission.id}`}>
                      {hospitalNames[submission.hospital] || submission.hospital}
                    </span>
                    <span data-testid={`text-date-${submission.id}`}>
                      {format(new Date(submission.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                    </span>
                    {submission.fileSize && (
                      <span data-testid={`text-filesize-${submission.id}`}>
                        {submission.fileSize}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Badge
                    className={statusInfo.className}
                    data-testid={`badge-status-${submission.id}`}
                  >
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {statusInfo.label}
                  </Badge>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    data-testid={`button-view-${submission.id}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
