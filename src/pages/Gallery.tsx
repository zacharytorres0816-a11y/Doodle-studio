import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus, LogOut, Image, Camera } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  preview_url: string | null;
}

export default function Gallery() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { logout, username } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTemplates(data);
    }
    setLoading(false);
  };

  const handleTemplateClick = (templateId: string) => {
    navigate(`/upload/${templateId}`);
  };

  const handleAddTemplate = async () => {
    const name = prompt('Enter template name:');
    if (name) {
      const { data, error } = await supabase
        .from('templates')
        .insert({ name })
        .select()
        .single();
      
      if (!error && data) {
        setTemplates([...templates, data]);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-toolbar border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-accent" />
            <span className="font-semibold text-foreground">Doodle Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {username}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Template Gallery</h1>
            <p className="text-muted-foreground mt-1">Choose a template to start editing</p>
          </div>
          <Button
            onClick={handleAddTemplate}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading templates...</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateClick(template.id)}
                className="group cursor-pointer"
              >
                <div className="panel p-4 transition-all duration-200 hover:border-accent/50 hover:bg-panel-hover">
                  {/* Template Preview - 2x6 aspect ratio */}
                  <div className="aspect-[2/6] bg-secondary rounded-md mb-3 flex items-center justify-center overflow-hidden">
                    {template.preview_url ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Image className="w-8 h-8" />
                        <span className="text-xs">Preview</span>
                      </div>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                    {template.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
