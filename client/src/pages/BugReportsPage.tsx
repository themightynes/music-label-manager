import { useState, useEffect, useMemo } from 'react';
import GameLayout from '@/layouts/GameLayout';
import { fetchBugReports, updateBugReportStatus } from '@/services/bugReportService';
import { BugReportRecord, bugSeverityEnum, bugAreaEnum, bugStatusEnum, type BugReportStatus } from '@shared/api/contracts';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function BugReportsPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<BugReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());

  const severityOptions = bugSeverityEnum.options;
  const areaOptions = bugAreaEnum.options;
  const statusOptions = bugStatusEnum.options;

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        const data = await fetchBugReports();
        setReports(data.reports);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bug reports');
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const filteredAndSortedReports = useMemo(() => {
    let filtered = [...reports];

    if (severityFilter !== 'all') {
      filtered = filtered.filter((r) => r.severity === severityFilter);
    }

    if (areaFilter !== 'all') {
      filtered = filtered.filter((r) => r.area === areaFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.submittedAt).getTime();
      const dateB = new Date(b.submittedAt).getTime();
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [reports, severityFilter, areaFilter, statusFilter, sortDirection]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const toggleRow = (reportId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reportId)) {
        newSet.delete(reportId);
      } else {
        newSet.add(reportId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_review':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleStatusChange = async (reportId: string, newStatus: BugReportStatus) => {
    const previousStatus = reports.find(r => r.id === reportId)?.status;

    try {
      setUpdatingStatus((prev) => new Set(prev).add(reportId));

      // Optimistic update
      setReports((prev) =>
        prev.map((report) =>
          report.id === reportId ? { ...report, status: newStatus } : report
        )
      );

      await updateBugReportStatus(reportId, newStatus);

      toast({
        title: "Status updated",
        description: `Bug report status changed to ${getStatusLabel(newStatus)}`,
      });
    } catch (error) {
      console.error('Failed to update bug report status:', error);

      // Rollback on error
      if (previousStatus) {
        setReports((prev) =>
          prev.map((report) =>
            report.id === reportId ? { ...report, status: previousStatus } : report
          )
        );
      }

      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "An error occurred while updating the bug report status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus((prev) => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const toggleSort = () => {
    setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  return (
    <GameLayout>
      <div className="p-6 text-white">
        <div className="mb-6">
          <h1 className="text-3xl font-heading font-bold mb-2">Bug Reports</h1>
          <p className="text-white/70 mb-2">Review submitted bug reports from players</p>
          <p className="text-white/60 text-sm">
            {filteredAndSortedReports.length === reports.length
              ? `${reports.length} reports`
              : `${filteredAndSortedReports.length} of ${reports.length} reports (filtered)`}
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[180px] bg-[#1f1720] border-[#4e324c] text-white">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent className="bg-[#1f1720] border-[#4e324c] text-white">
              <SelectItem value="all">All Severities</SelectItem>
              {severityOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[180px] bg-[#1f1720] border-[#4e324c] text-white">
              <SelectValue placeholder="All Areas" />
            </SelectTrigger>
            <SelectContent className="bg-[#1f1720] border-[#4e324c] text-white">
              <SelectItem value="all">All Areas</SelectItem>
              {areaOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-[#1f1720] border-[#4e324c] text-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[#1f1720] border-[#4e324c] text-white">
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {getStatusLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={toggleSort}
            variant="outline"
            className="bg-[#1f1720] border-[#4e324c] text-white hover:bg-[#3c252d]/30"
          >
            Sort by Date
            {sortDirection === 'desc' ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronUp className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>

        {loading && (
          <div className="text-center py-8 text-white/60">Loading bug reports...</div>
        )}

        {error && (
          <div className="text-center py-8 text-red-400">Error: {error}</div>
        )}

        {!loading && !error && filteredAndSortedReports.length === 0 && (
          <div className="text-center py-8 text-white/60">No bug reports found</div>
        )}

        {!loading && !error && filteredAndSortedReports.length > 0 && (
          <div className="bg-[#1f1720] border border-[#4e324c] rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-[#4e324c] hover:bg-transparent">
                  <TableHead className="text-white/80">Date</TableHead>
                  <TableHead className="text-white/80">Summary</TableHead>
                  <TableHead className="text-white/80">Severity</TableHead>
                  <TableHead className="text-white/80">Area</TableHead>
                  <TableHead className="text-white/80">Frequency</TableHead>
                  <TableHead className="text-white/80">Status</TableHead>
                  <TableHead className="text-white/80">Reporter</TableHead>
                  <TableHead className="text-white/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedReports.map((report) => {
                  const isExpanded = expandedRows.has(report.id);
                  return (
                    <>
                      <TableRow key={report.id} className="border-[#4e324c] hover:bg-[#3c252d]/30">
                        <TableCell className="text-white/80">
                          {formatDate(report.submittedAt)}
                        </TableCell>
                        <TableCell className="text-white">
                          {report.summary.length > 60
                            ? `${report.summary.substring(0, 60)}...`
                            : report.summary}
                        </TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(report.severity)}>
                            {report.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/80 capitalize">
                          {report.area}
                        </TableCell>
                        <TableCell className="text-white/80 capitalize">
                          {report.frequency}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={report.status}
                            onValueChange={(value) => handleStatusChange(report.id, value as BugReportStatus)}
                            disabled={updatingStatus.has(report.id)}
                          >
                            <SelectTrigger className="w-[140px] h-8 bg-[#1f1720] border-[#4e324c] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1f1720] border-[#4e324c] text-white">
                              {statusOptions.map((option) => (
                                <SelectItem key={option} value={option}>
                                  <span className={getStatusColor(option) + ' px-2 py-1 rounded text-xs'}>
                                    {getStatusLabel(option)}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-white/80">
                          {report.reporter.contactEmail || 'Anonymous'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#A75A5B] hover:bg-[#3c252d]/30"
                            onClick={() => toggleRow(report.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${report.id}-details`} className="border-[#4e324c] bg-[#23121c]">
                          <TableCell colSpan={8} className="p-6">
                            <div className="grid gap-4">
                              <div>
                                <h4 className="text-white font-semibold mb-2">
                                  Status
                                </h4>
                                <Badge className={getStatusColor(report.status)}>
                                  {getStatusLabel(report.status)}
                                </Badge>
                              </div>
                              <div>
                                <h4 className="text-white font-semibold mb-2">
                                  What Happened
                                </h4>
                                <p className="text-white/70">{report.whatHappened}</p>
                              </div>
                              <div>
                                <h4 className="text-white font-semibold mb-2">
                                  Steps to Reproduce
                                </h4>
                                <p className="text-white/70">
                                  {report.stepsToReproduce || 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-white font-semibold mb-2">
                                  Expected Result
                                </h4>
                                <p className="text-white/70">
                                  {report.expectedResult || 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <h4 className="text-white font-semibold mb-2">
                                  Additional Context
                                </h4>
                                <p className="text-white/70">
                                  {report.additionalContext || 'Not provided'}
                                </p>
                              </div>
                              {(report.metadata.gameId ||
                                report.metadata.currentWeek ||
                                report.metadata.userAgent ||
                                report.metadata.platform ||
                                report.metadata.screen) && (
                                <div>
                                  <h4 className="text-white font-semibold mb-2">
                                    Metadata
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    {report.metadata.gameId && (
                                      <div>
                                        <span className="text-white/60">Game ID: </span>
                                        <span className="text-white/80">
                                          {report.metadata.gameId}
                                        </span>
                                      </div>
                                    )}
                                    {report.metadata.currentWeek && (
                                      <div>
                                        <span className="text-white/60">Week: </span>
                                        <span className="text-white/80">
                                          {report.metadata.currentWeek}
                                        </span>
                                      </div>
                                    )}
                                    {report.metadata.platform && (
                                      <div>
                                        <span className="text-white/60">Platform: </span>
                                        <span className="text-white/80">
                                          {report.metadata.platform}
                                        </span>
                                      </div>
                                    )}
                                    {report.metadata.screen && (
                                      <div>
                                        <span className="text-white/60">Screen: </span>
                                        <span className="text-white/80">
                                          {report.metadata.screen.width} x{' '}
                                          {report.metadata.screen.height}
                                        </span>
                                      </div>
                                    )}
                                    {report.metadata.userAgent && (
                                      <div className="col-span-2">
                                        <span className="text-white/60">User Agent: </span>
                                        <span className="text-white/80">
                                          {report.metadata.userAgent}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
