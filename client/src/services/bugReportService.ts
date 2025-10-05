import { apiRequest } from "@/lib/queryClient";
import {
  BugReportResponseSchema,
  BugReportListResponseSchema,
  BugReportStatusUpdateRequestSchema,
  BugReportStatusUpdateResponseSchema,
  bugEndpoints,
  type BugReportRequest,
  type BugReportResponse,
  type BugReportListResponse,
  type BugReportStatusUpdateRequest,
  type BugReportStatusUpdateResponse,
  type BugReportStatus
} from "@shared/api/contracts";

export async function submitBugReport(payload: BugReportRequest): Promise<BugReportResponse> {
  const response = await apiRequest("POST", bugEndpoints.list, payload);
  const data = await response.json();
  return BugReportResponseSchema.parse(data);
}

export async function fetchBugReports(): Promise<BugReportListResponse> {
  const response = await apiRequest("GET", bugEndpoints.list);
  const data = await response.json();
  return BugReportListResponseSchema.parse(data);
}

export async function updateBugReportStatus(reportId: string, status: BugReportStatus): Promise<BugReportStatusUpdateResponse> {
  const payload: BugReportStatusUpdateRequest = { status };
  const url = bugEndpoints.updateStatus.replace(':id', reportId);
  const response = await apiRequest("PATCH", url, payload);
  const data = await response.json();
  return BugReportStatusUpdateResponseSchema.parse(data);
}
