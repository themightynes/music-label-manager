/**
 * Bug Report Archival System
 *
 * Manages automatic archival of completed bug reports to prevent
 * the main bugReports.json file from growing too large.
 *
 * Strategy:
 * - Keep active reports (new, in_review) in bugReports.json
 * - Archive completed reports to monthly archive files
 * - Trigger archival when active file exceeds threshold
 */

import fs from 'fs/promises';
import path from 'path';
import type { BugReportRecord as SharedBugReportRecord } from '@shared/api/contracts';

export type BugReportRecord = SharedBugReportRecord & {
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    fixDescription: string;
    filesModified: string[];
  };
};

const DATA_DIR = path.join(process.cwd(), 'data');
const ACTIVE_FILE = path.join(DATA_DIR, 'bugReports.json');
const ARCHIVE_DIR = path.join(DATA_DIR, 'bug-reports-archive');

// Configuration
const MAX_ACTIVE_REPORTS = 50; // Archive when file exceeds this
const ARCHIVE_THRESHOLD_COMPLETED = 10; // Only archive if we have at least this many completed

/**
 * Ensures archive directory exists
 */
async function ensureArchiveDir(): Promise<void> {
  try {
    await fs.access(ARCHIVE_DIR);
  } catch {
    await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  }
}

/**
 * Reads all bug reports from active file
 */
export async function readActiveBugReports(): Promise<BugReportRecord[]> {
  try {
    const raw = await fs.readFile(ACTIVE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Writes bug reports to active file
 */
async function writeActiveBugReports(reports: BugReportRecord[]): Promise<void> {
  const serialized = JSON.stringify(reports, null, 2);
  await fs.writeFile(ACTIVE_FILE, serialized, 'utf8');
}

/**
 * Gets archive file path for a given date
 */
function getArchiveFilePath(date: Date): string {
  const yearMonth = date.toISOString().slice(0, 7); // YYYY-MM
  return path.join(ARCHIVE_DIR, `bugReports-${yearMonth}.json`);
}

/**
 * Reads reports from an archive file
 */
async function readArchiveFile(filePath: string): Promise<BugReportRecord[]> {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Writes reports to an archive file
 */
async function writeArchiveFile(filePath: string, reports: BugReportRecord[]): Promise<void> {
  await ensureArchiveDir();
  const serialized = JSON.stringify(reports, null, 2);
  await fs.writeFile(filePath, serialized, 'utf8');
}

/**
 * Archives completed bug reports to monthly files
 *
 * @returns Object with counts of archived and remaining reports
 */
export async function archiveCompletedReports(): Promise<{
  archived: number;
  remaining: number;
  archivedToFiles: string[];
}> {
  const allReports = await readActiveBugReports();

  // Separate active and completed reports
  const activeReports = allReports.filter(r => r.status !== 'completed');
  const completedReports = allReports.filter(r => r.status === 'completed');

  if (completedReports.length === 0) {
    return { archived: 0, remaining: allReports.length, archivedToFiles: [] };
  }

  // Group completed reports by month (based on submittedAt or resolution date)
  const reportsByMonth = new Map<string, BugReportRecord[]>();

  for (const report of completedReports) {
    // Use resolution date if available, otherwise use submitted date
    const dateStr = report.resolution?.resolvedAt || report.submittedAt;
    const date = new Date(dateStr);
    const archivePath = getArchiveFilePath(date);

    if (!reportsByMonth.has(archivePath)) {
      reportsByMonth.set(archivePath, []);
    }
    reportsByMonth.get(archivePath)!.push(report);
  }

  // Write to archive files (merge with existing archives)
  const archivedFiles: string[] = [];
  for (const [archivePath, newReports] of Array.from(reportsByMonth.entries())) {
    const existingReports = await readArchiveFile(archivePath);

    // Merge and deduplicate by ID
    const allArchived = [...existingReports, ...newReports];
    const uniqueById = new Map<string, BugReportRecord>();
    for (const report of allArchived) {
      uniqueById.set(report.id, report);
    }

    await writeArchiveFile(archivePath, Array.from(uniqueById.values()));
    archivedFiles.push(path.basename(archivePath));
  }

  // Update active file with only non-completed reports
  await writeActiveBugReports(activeReports);

  return {
    archived: completedReports.length,
    remaining: activeReports.length,
    archivedToFiles: archivedFiles
  };
}

/**
 * Checks if archival should be triggered and runs it if needed
 *
 * @returns Result of archival if triggered, null if not needed
 */
export async function checkAndArchive(): Promise<{
  triggered: boolean;
  result?: {
    archived: number;
    remaining: number;
    archivedToFiles: string[];
  };
}> {
  const allReports = await readActiveBugReports();
  const completedCount = allReports.filter(r => r.status === 'completed').length;

  // Archive if:
  // 1. Total reports exceed threshold AND
  // 2. We have enough completed reports to make archival worthwhile
  const shouldArchive =
    allReports.length > MAX_ACTIVE_REPORTS &&
    completedCount >= ARCHIVE_THRESHOLD_COMPLETED;

  if (shouldArchive) {
    const result = await archiveCompletedReports();
    return { triggered: true, result };
  }

  return { triggered: false };
}

/**
 * Lists all available archive files
 */
export async function listArchiveFiles(): Promise<string[]> {
  try {
    await ensureArchiveDir();
    const files = await fs.readdir(ARCHIVE_DIR);
    return files
      .filter(f => f.startsWith('bugReports-') && f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    return [];
  }
}

/**
 * Reads all reports from a specific archive file
 */
export async function readArchive(fileName: string): Promise<BugReportRecord[]> {
  const filePath = path.join(ARCHIVE_DIR, fileName);
  return readArchiveFile(filePath);
}

/**
 * Searches across all archives and active file
 *
 * @param query Search term
 * @param status Optional status filter
 */
export async function searchAllReports(
  query?: string,
  status?: 'new' | 'in_review' | 'completed'
): Promise<BugReportRecord[]> {
  // Get active reports
  const activeReports = await readActiveBugReports();

  // Get archived reports
  const archiveFiles = await listArchiveFiles();
  const archivedReports: BugReportRecord[] = [];

  for (const file of archiveFiles) {
    const reports = await readArchive(file);
    archivedReports.push(...reports);
  }

  // Combine and deduplicate
  const allReports = [...activeReports, ...archivedReports];
  const uniqueById = new Map<string, BugReportRecord>();
  for (const report of allReports) {
    uniqueById.set(report.id, report);
  }

  let results = Array.from(uniqueById.values());

  // Apply filters
  if (status) {
    results = results.filter(r => r.status === status);
  }

  if (query) {
    const lowerQuery = query.toLowerCase();
    results = results.filter(r =>
      r.summary.toLowerCase().includes(lowerQuery) ||
      r.whatHappened.toLowerCase().includes(lowerQuery) ||
      r.area.toLowerCase().includes(lowerQuery)
    );
  }

  // Sort by submitted date (newest first)
  results.sort((a, b) =>
    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return results;
}

/**
 * Gets statistics about bug reports
 */
export async function getBugReportStats(): Promise<{
  active: {
    total: number;
    new: number;
    inReview: number;
    completed: number;
  };
  archived: {
    totalFiles: number;
    totalReports: number;
  };
}> {
  const activeReports = await readActiveBugReports();
  const archiveFiles = await listArchiveFiles();

  let archivedCount = 0;
  for (const file of archiveFiles) {
    const reports = await readArchive(file);
    archivedCount += reports.length;
  }

  return {
    active: {
      total: activeReports.length,
      new: activeReports.filter(r => r.status === 'new').length,
      inReview: activeReports.filter(r => r.status === 'in_review').length,
      completed: activeReports.filter(r => r.status === 'completed').length,
    },
    archived: {
      totalFiles: archiveFiles.length,
      totalReports: archivedCount,
    }
  };
}
