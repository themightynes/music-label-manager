/**
 * Admin Database Health Monitoring Page
 * PRD-0006 Phase 3 - FR-9, FR-10, FR-11
 *
 * Provides admins with visibility into orphaned game statistics
 * and tools for manual cleanup operations
 */

import { useState, useEffect } from 'react';
import GameLayout from '@/layouts/GameLayout';
import { fetchDatabaseStats, cleanupOrphanedGames, type DatabaseStats, type CleanupResult } from '@/services/databaseHealthService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, Trash2, Database, HardDrive, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AdminDatabaseHealthPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);

  const loadStats = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await fetchDatabaseStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load database statistics');
      toast({
        title: 'Failed to load statistics',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    loadStats();
  };

  const handleCleanup = async () => {
    try {
      setIsCleaningUp(true);
      const result = await cleanupOrphanedGames();
      setCleanupResult(result);
      setShowCleanupDialog(false);

      toast({
        title: 'Cleanup Complete',
        description: result.message,
      });

      // Refresh stats after cleanup
      await loadStats();
    } catch (err) {
      toast({
        title: 'Cleanup Failed',
        description: err instanceof Error ? err.message : 'Failed to cleanup orphaned games',
        variant: 'destructive',
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const getHealthColor = (percentage: number) => {
    if (percentage === 0) return 'text-green-400';
    if (percentage < 5) return 'text-yellow-400';
    if (percentage < 20) return 'text-orange-400';
    return 'text-red-400';
  };

  const getHealthBadge = (percentage: number) => {
    if (percentage === 0) return { text: 'Excellent', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
    if (percentage < 5) return { text: 'Good', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
    if (percentage < 20) return { text: 'Fair', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    return { text: 'Poor', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
  };

  if (loading) {
    return (
      <GameLayout>
        <div className="p-6 text-white">
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="animate-spin h-8 w-8 text-brand-burgundy" />
            <span className="ml-3 text-white/70">Loading database statistics...</span>
          </div>
        </div>
      </GameLayout>
    );
  }

  if (error || !stats) {
    return (
      <GameLayout>
        <div className="p-6 text-white">
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-400">Failed to Load Statistics</h2>
            <p className="text-white/70 mb-4">{error || 'An unknown error occurred'}</p>
            <Button onClick={loadStats} variant="outline" className="bg-brand-dark-mid border-brand-purple">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </GameLayout>
    );
  }

  const healthBadge = getHealthBadge(stats.orphanedPercentage);

  return (
    <GameLayout>
      <div className="p-6 text-white">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold mb-2">Database Health Monitor</h1>
            <p className="text-white/70">Monitor orphaned games and database metrics</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="bg-brand-dark-mid border-brand-purple hover:bg-brand-dark-card/30"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Health Status Card */}
        <Card className="mb-6 bg-brand-dark-mid border-brand-purple">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center">
                <CheckCircle className="mr-2 h-5 w-5" />
                Database Health Status
              </CardTitle>
              <Badge className={healthBadge.color}>
                {healthBadge.text}
              </Badge>
            </div>
            <CardDescription className="text-white/60">
              Overall database health based on orphaned game percentage
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Games */}
          <Card className="bg-brand-dark-mid border-brand-purple">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center">
                <Database className="mr-2 h-4 w-4" />
                Total Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.totalGamesCount}</div>
              <p className="text-xs text-white/60 mt-1">Active game states</p>
            </CardContent>
          </Card>

          {/* Orphaned Games */}
          <Card className="bg-brand-dark-mid border-brand-purple">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Orphaned Games
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getHealthColor(stats.orphanedPercentage)}`}>
                {stats.orphanedGamesCount}
              </div>
              <p className="text-xs text-white/60 mt-1">Games without saves</p>
            </CardContent>
          </Card>

          {/* Orphaned Percentage */}
          <Card className="bg-brand-dark-mid border-brand-purple">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70">
                Orphaned %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${getHealthColor(stats.orphanedPercentage)}`}>
                {stats.orphanedPercentage.toFixed(2)}%
              </div>
              <p className="text-xs text-white/60 mt-1">
                {stats.orphanedPercentage < 5 ? 'Healthy range' : 'Needs attention'}
              </p>
            </CardContent>
          </Card>

          {/* Database Size */}
          <Card className="bg-brand-dark-mid border-brand-purple">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-white/70 flex items-center">
                <HardDrive className="mr-2 h-4 w-4" />
                Database Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.databaseSizeMB.toFixed(1)} MB
              </div>
              <p className="text-xs text-white/60 mt-1">Total storage used</p>
            </CardContent>
          </Card>
        </div>

        {/* Cleanup Tool */}
        <Card className="mb-6 bg-brand-dark-mid border-brand-purple">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Trash2 className="mr-2 h-5 w-5" />
              Cleanup Tool
            </CardTitle>
            <CardDescription className="text-white/60">
              Manually trigger cleanup of orphaned games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 mb-1">
                  {stats.orphanedGamesCount === 0
                    ? 'No orphaned games to clean up'
                    : `${stats.orphanedGamesCount} orphaned game${stats.orphanedGamesCount === 1 ? '' : 's'} ready for cleanup`}
                </p>
                <p className="text-sm text-white/60">
                  This action will permanently delete orphaned games and all related data
                </p>
              </div>
              <Button
                onClick={() => setShowCleanupDialog(true)}
                disabled={stats.orphanedGamesCount === 0 || isCleaningUp}
                variant="destructive"
                className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Run Cleanup
              </Button>
            </div>

            {cleanupResult && (
              <div className="mt-4 p-4 bg-brand-dark-card rounded-lg border border-brand-purple">
                <h4 className="text-white font-semibold mb-2">Last Cleanup Result</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-white/60">Before: </span>
                    <span className="text-white">{cleanupResult.beforeMetrics.orphanedGames} orphaned</span>
                  </div>
                  <div>
                    <span className="text-white/60">Deleted: </span>
                    <span className="text-green-400">{cleanupResult.afterMetrics.deletedCount} games</span>
                  </div>
                  <div>
                    <span className="text-white/60">Duration: </span>
                    <span className="text-white">{cleanupResult.durationMs}ms</span>
                  </div>
                  <div>
                    <span className="text-white/60">Status: </span>
                    <span className="text-green-400">Success</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Users by Orphaned Games */}
        {stats.topUsersOrphanedGames.length > 0 && (
          <Card className="bg-brand-dark-mid border-brand-purple">
            <CardHeader>
              <CardTitle className="text-white">Top Users by Orphaned Games</CardTitle>
              <CardDescription className="text-white/60">
                Users with the most unsaved games (hashed for privacy)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-brand-purple hover:bg-transparent">
                    <TableHead className="text-white/80">User ID (Hashed)</TableHead>
                    <TableHead className="text-white/80">Orphaned Games</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topUsersOrphanedGames.map((user, index) => (
                    <TableRow key={index} className="border-brand-purple hover:bg-brand-dark-card/30">
                      <TableCell className="text-white/80 font-mono text-sm">
                        {user.userId}
                      </TableCell>
                      <TableCell className="text-white">
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                          {user.orphanedCount}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Cleanup Confirmation Dialog */}
        <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
          <AlertDialogContent className="bg-brand-dark-mid border-brand-purple text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center text-red-400">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Confirm Cleanup
              </AlertDialogTitle>
              <AlertDialogDescription className="text-white/70">
                This will permanently delete {stats.orphanedGamesCount} orphaned game{stats.orphanedGamesCount === 1 ? '' : 's'} and all related data (artists, songs, releases, etc.).
                <br /><br />
                This action cannot be undone. Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-brand-dark-card border-brand-purple text-white hover:bg-brand-dark-card/70">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCleanup}
                disabled={isCleaningUp}
                className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"
              >
                {isCleaningUp ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Cleaning up...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete {stats.orphanedGamesCount} Games
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </GameLayout>
  );
}
