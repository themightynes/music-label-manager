import React from 'react';
import { GameProject } from '@shared/types/gameTypes';

interface ProjectListProps {
  projects: GameProject[];
  onProjectSelect?: (project: GameProject) => void;
}

export function ProjectList({ projects, onProjectSelect }: ProjectListProps) {
  if (!projects || projects.length === 0) {
    return (
      <div className="p-4 bg-gray-800 rounded-lg text-center text-gray-400">
        No active projects
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {projects.map(project => (
        <div
          key={project.id}
          onClick={() => onProjectSelect?.(project)}
          className="p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-yellow-500 transition-colors cursor-pointer"
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-white">{project.title}</h3>
              <p className="text-sm text-gray-400">{project.type} • {project.stage}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Quality</div>
              <div className="font-semibold text-yellow-500">{project.quality}%</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}