import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Camera, LogOut, FolderOpen, ShoppingCart } from 'lucide-react';

export default function MainLayout() {
  const { logout, username } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isProjectsTab = location.pathname.startsWith('/projects') || location.pathname.startsWith('/editor');
  const isCashierTab = location.pathname.startsWith('/cashier');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-toolbar border-b border-border flex-shrink-0">
        <div className="container mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent" />
              <span className="font-semibold text-foreground">Doodle Studio</span>
            </div>

            {/* Main Tabs */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => navigate('/projects')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isProjectsTab
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-panel-hover'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Projects
              </button>
              <button
                onClick={() => navigate('/cashier')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isCashierTab
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-panel-hover'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                Cashier
              </button>
            </nav>
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

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
