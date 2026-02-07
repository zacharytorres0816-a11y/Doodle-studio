import { Project } from '@/types/database';
import { Plus, Pencil, Check, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface ProjectCardProps {
  project: Project;
  onUploadClick: (projectId: string) => void;
  onEditClick: (projectId: string) => void;
  onMarkComplete: (projectId: string) => void;
  onDelete: (projectId: string) => void;
}

const statusColors: Record<string, string> = {
  awaiting_photo: 'border-l-4 border-l-destructive',
  in_progress: 'border-l-4 border-l-yellow-500',
  completed: 'border-l-4 border-l-green-500',
};

const statusLabels: Record<string, string> = {
  awaiting_photo: 'Awaiting Photo',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export function ProjectCard({ project, onUploadClick, onEditClick, onMarkComplete, onDelete }: ProjectCardProps) {
  const isPending = project.status === 'awaiting_photo';

  return (
    <div className={`panel overflow-hidden ${statusColors[project.status] || ''}`}>
      {/* Image / Placeholder area */}
      <div className="aspect-[2/3] bg-secondary flex items-center justify-center overflow-hidden">
        {isPending ? (
          <button
            onClick={() => onUploadClick(project.id)}
            className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-panel-hover transition-colors"
          >
            <Plus className="w-10 h-10 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Add Picture</span>
          </button>
        ) : project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt={project.customer_name || project.name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => onEditClick(project.id)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-panel-hover transition-colors"
            onClick={() => onEditClick(project.id)}
          >
            <Pencil className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-sm font-medium text-foreground truncate">
          {project.customer_name || project.name}
        </p>
        {project.grade && project.section && (
          <p className="text-xs text-muted-foreground">
            {project.grade} - {project.section}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Pkg {project.package_type || '—'}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {format(new Date(project.created_at), 'h:mm a')}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            project.status === 'awaiting_photo' ? 'bg-destructive/20 text-destructive' :
            project.status === 'in_progress' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {statusLabels[project.status] || project.status}
          </span>
        </div>

        {/* Actions for active/completed */}
        {!isPending && (
          <div className="flex items-center gap-1 pt-2">
            <Button size="sm" variant="ghost" className="h-7 text-xs flex-1" onClick={() => onEditClick(project.id)}>
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
            {project.status !== 'completed' && (
              <Button size="sm" variant="ghost" className="h-7 text-xs flex-1 text-green-400" onClick={() => onMarkComplete(project.id)}>
                <Check className="w-3 h-3 mr-1" /> Done
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => onDelete(project.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
