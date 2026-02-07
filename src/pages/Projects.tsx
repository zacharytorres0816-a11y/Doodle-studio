import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Project } from '@/types/database';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { ProjectFilters } from '@/components/projects/ProjectFilters';
import { toast } from 'sonner';

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [packageFilter, setPackageFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data as unknown as Project[]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (packageFilter !== 'all' && String(p.package_type) !== packageFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = p.customer_name?.toLowerCase().includes(q);
        const matchId = p.order_id?.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }
      return true;
    });
  }, [projects, statusFilter, packageFilter, searchQuery]);

  const handleMarkComplete = async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ status: 'completed', completed_at: new Date().toISOString() } as any)
      .eq('id', projectId);

    if (!error) {
      const project = projects.find((p) => p.id === projectId);
      if (project?.order_id) {
        await supabase
          .from('orders')
          .update({ order_status: 'completed', photo_status: 'completed', project_completed_date: new Date().toISOString() } as any)
          .eq('id', project.order_id);
      }
      toast.success('Project marked as completed');
      fetchProjects();
    }
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    if (!error) {
      toast.success('Project deleted');
      fetchProjects();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Projects Gallery</h1>
          <p className="text-muted-foreground text-sm">Manage photo editing projects</p>
        </div>

        <div className="mb-6">
          <ProjectFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            packageFilter={packageFilter}
            onPackageChange={setPackageFilter}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p>No projects found. Orders created in the Cashier tab will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onUploadClick={(id) => navigate(`/projects/upload/${id}`)}
                onEditClick={(id) => navigate(`/editor/${id}`)}
                onMarkComplete={handleMarkComplete}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
