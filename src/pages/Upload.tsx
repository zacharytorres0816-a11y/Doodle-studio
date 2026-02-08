import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Project } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload as UploadIcon, Image } from 'lucide-react';
import { uploadWithRetry } from '@/lib/storageUpload';
import { api } from '@/lib/api';

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const MAX_FILE_SIZE_MB = 10;

  useEffect(() => {
    if (projectId) fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    const data = await api.projects.get(projectId!);
    if (data) setProject(data as unknown as Project);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`Please choose an image under ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleContinue = async () => {
    if (!selectedFile || !projectId) return;
    setUploading(true);

    try {
      const uploadRes = await uploadWithRetry(projectId, selectedFile, { kind: 'original' });

      // Update project
      await api.projects.update(projectId, {
        photo_url: uploadRes.publicUrl,
        status: 'in_progress',
        photo_uploaded_at: new Date().toISOString(),
      } as any);

      // Update order
      if (project?.order_id) {
        await api.orders.update(project.order_id, {
          order_status: 'photo_uploaded',
          photo_status: 'uploaded',
          photo_uploaded_date: new Date().toISOString(),
        } as any);
      }

      navigate(`/editor/${projectId}`);
    } catch (err: any) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-toolbar border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/projects')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Upload Photo</span>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Customer info summary */}
          {project && (
            <div className="panel p-4 mb-6 flex items-center justify-between">
              <div>
                <p className="text-foreground font-medium">{project.customer_name}</p>
                <p className="text-xs text-muted-foreground">{project.grade} - {project.section} • Package {project.package_type}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Awaiting Photo</span>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Upload Your Photo</h1>
            <p className="text-muted-foreground mt-1">Choose an image to insert into your photo strip frame</p>
          </div>

          <div
            className={`panel p-8 border-2 border-dashed transition-colors cursor-pointer ${
              dragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground'
            } ${previewUrl ? 'border-solid' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {previewUrl ? (
              <div className="flex flex-col items-center gap-4">
                <img src={previewUrl} alt="Selected" className="max-h-80 rounded-lg object-contain" />
                <p className="text-sm text-muted-foreground">Click to change image</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <UploadIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-foreground font-medium">Drag and drop your image here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Image className="w-4 h-4" />
                  <span>PNG, JPG, JPEG, WEBP, HEIC, SVG (any image) up to 10MB</span>
                </div>
              </div>
            )}
          </div>

          {previewUrl && (
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="outline" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>
                Choose Different Image
              </Button>
              <Button onClick={handleContinue} disabled={uploading} className="bg-accent hover:bg-accent/90 text-accent-foreground px-8">
                {uploading ? 'Uploading...' : 'Continue to Editor'}
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
