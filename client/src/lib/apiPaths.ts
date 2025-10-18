import type { EmailCategory } from "@shared/types/emailTypes";

const RAW_API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const HAS_CUSTOM_BASE = RAW_API_BASE.length > 0;
const NORMALIZED_BASE = HAS_CUSTOM_BASE ? RAW_API_BASE.replace(/\/+$/, "") : "";
const FALLBACK_BASE =
  typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "http://localhost";
const BASE_FOR_URL = HAS_CUSTOM_BASE ? NORMALIZED_BASE : FALLBACK_BASE;

type QueryParams = Record<
  string,
  | string
  | number
  | boolean
  | Array<string | number | boolean>
  | null
  | undefined
>;

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(normalizePath(path), `${BASE_FOR_URL}/`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((entry) => url.searchParams.append(key, String(entry)));
        return;
      }

      if (typeof value === "boolean") {
        url.searchParams.set(key, value ? "true" : "false");
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  if (HAS_CUSTOM_BASE) {
    return url.toString();
  }

  return `${url.pathname}${url.search}`;
}

export interface EmailListQueryParams {
  isRead?: boolean;
  category?: EmailCategory;
  week?: number;
  limit?: number;
  offset?: number;
}

export const apiPaths = {
  me: () => buildUrl("/api/me"),
  emails: {
    list: (gameId: string, params?: EmailListQueryParams) => {
      const query: QueryParams = {};
      if (params) {
        if (typeof params.limit === "number") {
          query.limit = params.limit;
        }
        if (typeof params.offset === "number") {
          query.offset = params.offset;
        }
        if (typeof params.week === "number") {
          query.week = params.week;
        }
        if (typeof params.isRead === "boolean") {
          query.isRead = params.isRead;
        }
        if (params.category) {
          query.category = params.category;
        }
      }
      return buildUrl(`/api/game/${gameId}/emails`, query);
    },
    unreadCount: (gameId: string) =>
      buildUrl(`/api/game/${gameId}/emails/unread-count`),
    markRead: (gameId: string, emailId: string) =>
      buildUrl(`/api/game/${gameId}/emails/${emailId}/read`),
    remove: (gameId: string, emailId: string) =>
      buildUrl(`/api/game/${gameId}/emails/${emailId}`),
  },
  analytics: {
    artistRoi: (gameId: string, artistId: string) =>
      buildUrl(`/api/analytics/artist/${artistId}/roi`, { gameId }),
    projectRoi: (gameId: string, projectId: string) =>
      buildUrl(`/api/analytics/project/${projectId}/roi`, { gameId }),
    releaseRoi: (gameId: string, releaseId: string) =>
      buildUrl(`/api/analytics/release/${releaseId}/roi`, { gameId }),
    portfolioRoi: (gameId: string) =>
      buildUrl(`/api/analytics/portfolio/roi`, { gameId }),
  },
};

export type ApiPaths = typeof apiPaths;
