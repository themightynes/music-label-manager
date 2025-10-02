import { apiRequest } from "@/lib/queryClient";
import { BugReportResponseSchema, type BugReportRequest, type BugReportResponse } from "@shared/api/contracts";

export async function submitBugReport(payload: BugReportRequest): Promise<BugReportResponse> {
  const response = await apiRequest("POST", "/api/bug-reports", payload);
  const data = await response.json();
  return BugReportResponseSchema.parse(data);
}
