import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Toolbar, Tool } from '@/components/editor/Toolbar';
import { ColorPalette } from '@/components/editor/ColorPalette';
import { BrushSettings } from '@/components/editor/BrushSettings';
import { PhotoFrame, PhotoFrameRef, ImageTransform } from '@/components/editor/PhotoFrame';
import { QUICK_COLORS } from '@/lib/colors';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Trash2, Camera, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { insertPhotoIntoTemplate } from '@/lib/templateInsertion';
import { uploadWithRetry } from '@/lib/storageUpload';
import { api } from '@/lib/api';
import { normalizeMediaPath, resolveMediaUrl } from '@/lib/mediaUrl';

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const { username } = useAuth();
  const navigate = useNavigate();
  const frameRef = useRef<PhotoFrameRef>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>('draw');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [frameColor, setFrameColor] = useState('#FFFFFF');
  const [isFrameSelected, setIsFrameSelected] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const DEFAULT_IMAGE_TRANSFORM: ImageTransform = { offsetX: 0, offsetY: 0, scale: 1 };

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    const data = await api.projects.get(projectId!);
    if (data) {
      const p = data as unknown as Project;
      if (!p.photo_url) {
        toast.info('Please upload a photo first');
        navigate(`/projects/upload/${projectId}`);
        return;
      }
      setProject(p);
      setImage(resolveMediaUrl(p.photo_url));
      if (p.frame_color) setFrameColor(p.frame_color);
    }
  };

  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(4, Math.max(0.25, prev + delta)));
  };

  const setZoomClamped = (nextZoom: number) => {
    setZoomLevel(Math.min(4, Math.max(0.25, nextZoom)));
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      handleZoom(e.deltaY > 0 ? -0.25 : 0.25);
    }
  };

  const handleSave = async () => {
    if (!projectId || !project) return;
    const canvasData = frameRef.current?.getCanvasData() || {
      elements: [],
      imageTransform: DEFAULT_IMAGE_TRANSFORM,
    };
    let editedStripUrl: string | null = project.thumbnail_url || project.photo_url || null;

    try {
      const editedStripBlob = await frameRef.current?.exportStripBlob();
      if (editedStripBlob) {
        const uploadRes = await uploadWithRetry(projectId, editedStripBlob, { kind: 'edited-strip' });
        editedStripUrl = normalizeMediaPath(uploadRes.storageKey) || uploadRes.publicUrl;
      }

      if (!editedStripUrl) {
        throw new Error('Unable to generate edited strip image.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export edited strip');
      return;
    }

    await api.projects.update(projectId, {
        canvas_data: JSON.parse(JSON.stringify(canvasData)),
        frame_color: frameColor,
        thumbnail_url: editedStripUrl,
        last_edited_at: new Date().toISOString(),
        status: 'completed',
        completed_at: new Date().toISOString(),
      } as any);

    if (project.order_id) {
      await api.orders.update(project.order_id, {
        order_status: 'completed',
        photo_status: 'completed',
        project_completed_date: new Date().toISOString(),
      } as any);
    }

    // Auto-insert into A4 template
    if (project.order_id && editedStripUrl && project.customer_name) {
      try {
        await insertPhotoIntoTemplate(
          project.order_id,
          projectId,
          editedStripUrl,
          project.customer_name,
          project.grade || '',
          project.section || '',
          project.package_type || 2
        );
        toast.success('Project saved & added to print template!');
      } catch (err: any) {
        toast.success('Project saved!');
        toast.error(err?.message || 'Template insertion failed. Check API and DB connectivity.');
        console.error('Template insertion error:', err);
      }
    } else {
      toast.success('Project saved!');
    }
  };

  const handleClear = () => {
    frameRef.current?.clearCanvas();
    toast.info('Canvas cleared');
  };

  const parsedCanvasData = project?.canvas_data && typeof project.canvas_data === 'object'
    ? project.canvas_data
    : null;
  const initialImageTransform = parsedCanvasData && !Array.isArray(parsedCanvasData)
    ? (parsedCanvasData.imageTransform as ImageTransform | undefined)
    : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-toolbar border-b border-border flex-shrink-0">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Projects
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent" />
              <span className="font-medium text-foreground">Doodle Studio</span>
            </div>
            {project && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="text-sm">
                  <span className="text-foreground font-medium">{project.customer_name}</span>
                  <span className="text-muted-foreground ml-2">{project.grade} - {project.section}</span>
                  <span className="text-muted-foreground ml-2">Pkg {project.package_type}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={handleClear} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </div>
      </header>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-14 bg-toolbar border-r border-border p-2 flex flex-col items-center">
          <Toolbar activeTool={activeTool} onToolChange={setActiveTool} />
        </div>

        {/* Left Panel */}
        <div className="w-64 bg-panel border-r border-border overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground mb-4">
              {activeTool === 'eraser' ? 'Eraser Settings' : 'Brush Settings'}
            </h3>
            <BrushSettings brushSize={brushSize} brushOpacity={brushOpacity} onBrushSizeChange={setBrushSize} onBrushOpacityChange={setBrushOpacity} />
          </div>

          {activeTool !== 'eraser' && (
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-medium text-foreground mb-4">Colors</h3>
              <ColorPalette selectedColor={brushColor} onColorSelect={setBrushColor} />
            </div>
          )}

          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-medium text-foreground mb-4">Frame Color</h3>
            <div className="flex flex-wrap gap-1">
              {QUICK_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFrameColor(color)}
                  className={`color-swatch ${frameColor === color ? 'ring-2 ring-accent ring-offset-1 ring-offset-background' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-1 block">Custom</label>
              <Input type="color" value={frameColor} onChange={(e) => setFrameColor(e.target.value)} className="w-full h-8 p-0 border-0 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          className="flex-1 bg-background flex items-start justify-center overflow-auto p-8 relative"
          onWheel={handleCanvasWheel}
        >
          <div style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center', transition: 'transform 0.15s ease' }}>
            <div className="relative">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`,
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              />
              <PhotoFrame
                key={project?.id ?? 'photo-frame'}
                ref={frameRef}
                image={image}
                frameColor={frameColor}
                activeTool={activeTool}
                brushColor={brushColor}
                brushSize={brushSize}
                brushOpacity={brushOpacity}
                onFrameClick={() => setIsFrameSelected(!isFrameSelected)}
                isFrameSelected={isFrameSelected}
                zoom={zoomLevel}
                onZoomChange={setZoomClamped}
                initialElements={project?.canvas_data || undefined}
                initialImageTransform={initialImageTransform}
              />
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                Click frame to change color
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-toolbar border border-border rounded-lg p-1">
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleZoom(-0.25)}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-foreground w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleZoom(0.25)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setZoomLevel(1)}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-56 bg-panel border-l border-border p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Project Info</h3>
          <div className="space-y-3 text-sm">
            {project && (
              <>
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="text-foreground ml-2">{project.customer_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Grade:</span>
                  <span className="text-foreground ml-2">{project.grade} - {project.section}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Package:</span>
                  <span className="text-foreground ml-2">Package {project.package_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="text-foreground ml-2 text-xs">{project.order_id?.slice(0, 8)}</span>
                </div>
              </>
            )}
            <div>
              <span className="text-muted-foreground">Frame:</span>
              <span className="inline-block w-4 h-4 rounded border border-border ml-2 align-middle" style={{ backgroundColor: frameColor }} />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Tips</h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>• Use Ctrl+scroll to zoom</li>
              <li>• Move tool: drag to reposition photo</li>
              <li>• Eraser works like a brush</li>
              <li>• Click frame to change its color</li>
              <li>• Save to update project status</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
