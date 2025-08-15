import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';
import { PROJECT_TYPES } from '@/lib/gameData';
import { useState } from 'react';

export function ActiveProjects() {
  const { projects, artists, createProject } = useGameStore();
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateProject = async () => {
    if (creatingProject || artists.length === 0) return;

    setCreatingProject(true);
    try {
      // Create a sample single project for the first artist
      const firstArtist = artists[0];
      if (firstArtist) {
        await createProject({
          title: `"New Track" Single`,
          type: 'Single',
          artistId: firstArtist.id,
          budget: 8000,
          budgetUsed: 0,
          quality: 0,
          dueMonth: 3 // Due in 3 months
        });
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreatingProject(false);
    }
  };

  const getProjectProgress = (project: any) => {
    const stages = ['planning', 'production', 'marketing', 'released'];
    const currentStageIndex = stages.indexOf(project.stage || 'planning');
    return ((currentStageIndex + 1) / stages.length) * 100;
  };

  const getStatusBadgeClass = (stage: string) => {
    switch (stage) {
      case 'planning': return 'bg-slate-400 text-white';
      case 'production': return 'bg-warning text-white';
      case 'marketing': return 'bg-primary text-white';
      case 'released': return 'bg-success text-white';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getArtistName = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.name || 'Unknown Artist';
  };

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <i className="fas fa-tasks text-primary mr-2"></i>
          Active Projects
        </h3>

        <div className="space-y-4">
          {projects.map(project => (
            <div key={project.id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">{project.title}</h4>
                <Badge className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadgeClass(project.stage || 'planning')}`}>
                  {project.stage?.replace('_', ' ') || 'Planning'}
                </Badge>
              </div>
              
              <div className="text-xs text-slate-600 mb-3">{getArtistName(project.artistId || '')}</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-mono">{Math.round(getProjectProgress(project))}%</span>
                </div>
                <Progress value={getProjectProgress(project)} className="w-full h-2" />
                
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-500">Budget Used</span>
                  <span className="font-mono">
                    ${(project.budgetUsed || 0).toLocaleString()} / ${(project.budget || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Add Project Button */}
          <Button
            variant="outline"
            className="w-full border-2 border-dashed border-slate-300 p-4 text-center hover:border-primary hover:bg-primary/5 group"
            onClick={handleCreateProject}
            disabled={creatingProject || artists.length === 0}
          >
            <div className="text-center">
              <i className="fas fa-plus text-slate-400 group-hover:text-primary text-xl mb-2 transition-colors"></i>
              <p className="text-sm text-slate-500 group-hover:text-primary transition-colors">
                {creatingProject ? 'Creating...' : 'Start New Project'}
              </p>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
