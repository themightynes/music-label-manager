import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  BugReportRequestSchema,
  BugReportRecordSchema,
  BugReportRecord,
  BugReportStatusUpdateRequestSchema,
  createErrorResponse
} from '@shared/api/contracts';
import { requireClerkUser, requireAdmin } from '../auth';
import {
  checkAndArchive,
  readActiveBugReports,
  searchAllReports,
  listArchiveFiles,
  readArchive,
  getBugReportStats
} from '../utils/bugReportArchival';

const router = Router();

router.post('/api/bug-reports', requireClerkUser, async (req, res) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json(createErrorResponse('UNAUTHENTICATED', 'Authentication required to submit bug reports'));
      }

      const payload = BugReportRequestSchema.parse(req.body);
      const bugReportsPath = path.join(process.cwd(), 'data', 'bugReports.json');

      let existingReports: any[] = [];
      try {
        const raw = await fs.readFile(bugReportsPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          existingReports = parsed;
        }
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        if (nodeError.code !== 'ENOENT') {
          throw error;
        }
      }

      const clerkUserId = (req as any).clerkUserId as string | undefined;
      const record = {
        id: crypto.randomUUID(),
        submittedAt: new Date().toISOString(),
        summary: payload.summary,
        severity: payload.severity,
        area: payload.area,
        frequency: payload.frequency,
        status: 'new',
        whatHappened: payload.whatHappened,
        stepsToReproduce: payload.stepsToReproduce ?? null,
        expectedResult: payload.expectedResult ?? null,
        additionalContext: payload.additionalContext ?? null,
        reporter: {
          userId,
          clerkUserId: clerkUserId ?? null,
          contactEmail: payload.contactEmail ?? null
        },
        metadata: {
          ...(payload.metadata ?? {}),
          ip: req.ip
        }
      };

      existingReports.unshift(record);

      const serialized = JSON.stringify(existingReports, null, 2);
      await fs.writeFile(bugReportsPath, serialized, 'utf8');

      res.status(201).json({ success: true, reportId: record.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid bug report submission',
          error.errors
        ));
      }

      console.error('Failed to persist bug report:', error);
      res.status(500).json(createErrorResponse('BUG_REPORT_ERROR', 'Failed to submit bug report'));
    }
  });

router.get('/api/bug-reports', requireClerkUser, requireAdmin, async (req, res) => {
    console.log('GET /api/bug-reports endpoint called');
    try {
      const { includeArchived, status, search } = req.query;

      // Check and run auto-archival if needed
      const archivalResult = await checkAndArchive();
      if (archivalResult.triggered) {
        console.log('Auto-archival triggered:', archivalResult.result);
      }

      let reports: BugReportRecord[] = [];

      if (includeArchived === 'true' || search) {
        // Search across all reports (active + archived)
        reports = await searchAllReports(
          search as string | undefined,
          status as 'new' | 'in_review' | 'completed' | undefined
        );
      } else {
        // Return only active reports
        const activeReports = await readActiveBugReports();

        // Apply status filter if provided
        if (status) {
          reports = activeReports.filter(r => r.status === status);
        } else {
          reports = activeReports;
        }

        // Validate reports with schema
        const validatedReports: BugReportRecord[] = [];
        for (const item of reports) {
          const result = BugReportRecordSchema.safeParse(item);
          if (result.success) {
            validatedReports.push(result.data);
          } else {
            console.error('Invalid bug report record, skipping:', result.error);
          }
        }
        reports = validatedReports;
      }

      res.status(200).json({
        success: true,
        reports,
        count: reports.length,
        archivalInfo: archivalResult.triggered ? archivalResult.result : undefined
      });
    } catch (error) {
      console.error('Failed to fetch bug reports:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_FETCH_ERROR', 'Failed to fetch bug reports'));
    }
  });

router.patch('/api/bug-reports/:id/status', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const id = req.params.id;
      const payload = BugReportStatusUpdateRequestSchema.parse(req.body);

      // Read all active reports
      const activeReports = await readActiveBugReports();
      const reportIndex = activeReports.findIndex(report => report.id === id);

      if (reportIndex === -1) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Bug report not found in active reports'));
      }

      // Update status
      activeReports[reportIndex].status = payload.status;

      // If marking as completed, add resolution timestamp
      if (payload.status === 'completed' && !activeReports[reportIndex].resolution) {
        activeReports[reportIndex].resolution = {
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'Admin',
          fixDescription: 'Status updated to completed',
          filesModified: []
        };
      }

      // Save back to active file
      const bugReportsPath = path.join(process.cwd(), 'data', 'bugReports.json');
      const serialized = JSON.stringify(activeReports, null, 2);
      await fs.writeFile(bugReportsPath, serialized, 'utf8');

      res.status(200).json({ success: true, reportId: id, status: payload.status });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json(createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid status update request',
          error.errors
        ));
      }

      console.error('Failed to update bug report status:', error);
      res.status(500).json(createErrorResponse('BUG_REPORT_STATUS_UPDATE_ERROR', 'Failed to update bug report status'));
    }
  });

  // Get bug report statistics (active + archived)
router.get('/api/bug-reports/stats', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const stats = await getBugReportStats();
      res.status(200).json({ success: true, stats });
    } catch (error) {
      console.error('Failed to get bug report stats:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_STATS_ERROR', 'Failed to get bug report statistics'));
    }
  });

  // List available archive files
router.get('/api/bug-reports/archives', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const archives = await listArchiveFiles();
      res.status(200).json({ success: true, archives });
    } catch (error) {
      console.error('Failed to list bug report archives:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_ARCHIVES_ERROR', 'Failed to list archives'));
    }
  });

  // Get specific archive file contents
router.get('/api/bug-reports/archives/:fileName', requireClerkUser, requireAdmin, async (req, res) => {
    try {
      const { fileName } = req.params;

      // Validate fileName to prevent directory traversal
      if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        return res.status(400).json(createErrorResponse('INVALID_FILENAME', 'Invalid archive file name'));
      }

      const reports = await readArchive(fileName);
      res.status(200).json({ success: true, reports, count: reports.length, fileName });
    } catch (error) {
      console.error('Failed to read bug report archive:', error);
      res.status(500).json(createErrorResponse('BUG_REPORTS_ARCHIVE_READ_ERROR', 'Failed to read archive file'));
    }
  });

export default router;
