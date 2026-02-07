import { Project } from '@/types/database';
import { Button } from '@/components/ui/button';

interface ProjectCardProps {
  project: Project;
  onUploadClick: (id: string) => void;
  onEditClick: (id: string) => void;
  onMarkComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({
  project,
  onUploadClick,
  onEditClick,
  onMarkComplete,
  onDelete,
}: ProjectCardProps) {
  const isAwaitingPhoto = project.status === 'awaiting_photo';
  const isCompleted = project.status === 'completed';

  return (
    <div className="p-3 border rounded-lg bg-card space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground truncate">
          {project.customer_name || project.name || 'Unnamed Project'}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {project.grade || '—'} - {project.section || '—'} • Pkg {project.package_type || '—'}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Status: <span className="uppercase">{project.status}</span>
        </p>
      </div>

      <div className="flex gap-2">
        {isAwaitingPhoto ? (
          <Button size="sm" className="flex-1" onClick={() => onUploadClick(project.id)}>
            Upload
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onEditClick(project.id)}>
            Edit
          </Button>
        )}

        {!isCompleted && (
          <Button size="sm" variant="outline" className="flex-1" onClick={() => onMarkComplete(project.id)}>
            Complete
          </Button>
        )}
      </div>

      <Button
        size="sm"
        variant="destructive"
        className="w-full"
        onClick={() => onDelete(project.id)}
      >
        Delete
      </Button>
    </div>
  );
}
