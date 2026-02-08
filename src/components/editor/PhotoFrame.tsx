import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Tool } from './Toolbar';
import logoNoBackground from '@/assets/logo-no-background.png';
import { resolveMediaUrl } from '@/lib/mediaUrl';

interface Point {
  x: number;
  y: number;
}

interface CanvasElement {
  id: string;
  type: 'path' | 'eraser' | 'rectangle' | 'circle' | 'triangle' | 'star' | 'heart' | 'text';
  points?: Point[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  color: string;
  size: number;
  opacity: number;
}

export interface ImageTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface SerializedCanvasData {
  elements: CanvasElement[];
  imageTransform: ImageTransform;
}

interface PhotoFrameProps {
  image: string | null;
  frameColor: string;
  activeTool: Tool;
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  onFrameClick?: () => void;
  isFrameSelected?: boolean;
  zoom?: number;
  onZoomChange?: (nextZoom: number) => void;
  initialElements?: unknown;
  initialImageTransform?: ImageTransform;
}

export interface PhotoFrameRef {
  getCanvasData: () => SerializedCanvasData;
  clearCanvas: () => void;
  exportStripBlob: () => Promise<Blob | null>;
  resetImageTransform: () => void;
}

interface SlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CoverPlacement {
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  clampedTransform: ImageTransform;
}

const FRAME_WIDTH = 200;
const FRAME_HEIGHT = 600;
const FRAME_PADDING = 20;
const SLOT_GAP = 16; // matches gap-4 visual spacing

const EXPORT_WIDTH = 600;
const EXPORT_HEIGHT = 1755;
const MIN_POINT_DISTANCE = 1.2;
const WHEEL_PAN_FACTOR = 0.35;
const SLOT_BORDER_COLOR = '#000000';
const SLOT_BORDER_WIDTH = 1;
const LOGO_WIDTH_RATIO = 0.2;
const LOGO_MAX_WIDTH_RATIO = 0.35;
const LOGO_MIN_SIZE = 14;
const LOGO_MARGIN_RATIO = 0.035;

const DEFAULT_IMAGE_TRANSFORM: ImageTransform = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
};

const getSlotRects = (frameWidth: number, frameHeight: number, padding: number, gap: number): SlotRect[] => {
  const photoHeight = (frameHeight - padding * 4) / 3;
  const photoWidth = frameWidth - padding * 2;
  return [0, 1, 2].map((i) => ({
    x: padding,
    y: padding + i * (photoHeight + gap),
    width: photoWidth,
    height: photoHeight,
  }));
};

const SLOT_RECTS = getSlotRects(FRAME_WIDTH, FRAME_HEIGHT, FRAME_PADDING, SLOT_GAP);
const PRIMARY_SLOT_RECT = SLOT_RECTS[0];

const distanceBetween = (a: Point, b: Point) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const NGROK_HOST_RE = /ngrok(-free)?\.dev$/i;

const isSameTransform = (a: ImageTransform, b: ImageTransform) =>
  a.offsetX === b.offsetX && a.offsetY === b.offsetY && a.scale === b.scale;

const loadImageElement = (src: string, useCors: boolean) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (useCors) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

const normalizeImageTransform = (input: unknown): ImageTransform => {
  if (!input || typeof input !== 'object') return DEFAULT_IMAGE_TRANSFORM;
  const raw = input as Partial<ImageTransform>;
  return {
    offsetX: typeof raw.offsetX === 'number' ? raw.offsetX : 0,
    offsetY: typeof raw.offsetY === 'number' ? raw.offsetY : 0,
    // Keep scale >= 1 so cover mode never reveals frame gaps.
    scale: typeof raw.scale === 'number' && raw.scale >= 1 ? raw.scale : 1,
  };
};

const drawSmoothPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  if (points.length === 0) return;

  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, Math.max(ctx.lineWidth / 2, 1), 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle as string;
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length - 1; i++) {
    const cx = points[i].x;
    const cy = points[i].y;
    const nx = (points[i].x + points[i + 1].x) / 2;
    const ny = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(cx, cy, nx, ny);
  }

  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
};

const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
) => {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.stroke();
};

const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.beginPath();
  ctx.moveTo(x, y + size / 4);
  ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
  ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size * 0.75, x, y + size);
  ctx.bezierCurveTo(x, y + size * 0.75, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
  ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);
  ctx.stroke();
};

const drawElementsToContext = (ctx: CanvasRenderingContext2D, drawnElements: CanvasElement[]) => {
  drawnElements.forEach((el) => {
    if (el.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = el.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawSmoothPath(ctx, el.points || []);
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    ctx.globalAlpha = el.opacity / 100;
    ctx.strokeStyle = el.color;
    ctx.fillStyle = el.color;
    ctx.lineWidth = el.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (el.type === 'path' && el.points && el.points.length > 0) {
      drawSmoothPath(ctx, el.points);
    } else if (el.type === 'rectangle' && el.x !== undefined && el.y !== undefined) {
      ctx.strokeRect(el.x, el.y, el.width || 0, el.height || 0);
    } else if (el.type === 'circle' && el.x !== undefined && el.y !== undefined && el.radius) {
      ctx.beginPath();
      ctx.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
      ctx.stroke();
    } else if (el.type === 'triangle' && el.x !== undefined && el.y !== undefined) {
      const w = el.width || 0;
      const h = el.height || 0;
      ctx.beginPath();
      ctx.moveTo(el.x + w / 2, el.y);
      ctx.lineTo(el.x + w, el.y + h);
      ctx.lineTo(el.x, el.y + h);
      ctx.closePath();
      ctx.stroke();
    } else if (el.type === 'star' && el.x !== undefined && el.y !== undefined && el.radius) {
      drawStar(ctx, el.x, el.y, 5, el.radius, el.radius / 2);
    } else if (el.type === 'heart' && el.x !== undefined && el.y !== undefined && el.radius) {
      drawHeart(ctx, el.x, el.y, el.radius);
    } else if (el.type === 'text' && el.text && el.x !== undefined && el.y !== undefined) {
      ctx.font = `${el.size * 2}px sans-serif`;
      ctx.fillText(el.text, el.x, el.y);
    }
  });

  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
};

const getCoverPlacement = (
  image: HTMLImageElement,
  rect: SlotRect,
  transform: ImageTransform,
): CoverPlacement => {
  const safeScale = Math.max(transform.scale, 1);
  const imgRatio = image.width / image.height;
  const boxRatio = rect.width / rect.height;

  let baseWidth = rect.width;
  let baseHeight = rect.height;

  if (imgRatio > boxRatio) {
    baseHeight = rect.height;
    baseWidth = rect.height * imgRatio;
  } else {
    baseWidth = rect.width;
    baseHeight = rect.width / imgRatio;
  }

  const scaledWidth = baseWidth * safeScale;
  const scaledHeight = baseHeight * safeScale;

  const maxOffsetX = Math.max((scaledWidth - rect.width) / 2, 0);
  const maxOffsetY = Math.max((scaledHeight - rect.height) / 2, 0);

  const clampedTransform: ImageTransform = {
    offsetX: clamp(transform.offsetX, -maxOffsetX, maxOffsetX),
    offsetY: clamp(transform.offsetY, -maxOffsetY, maxOffsetY),
    scale: safeScale,
  };

  const centerX = rect.x + rect.width / 2 + clampedTransform.offsetX;
  const centerY = rect.y + rect.height / 2 + clampedTransform.offsetY;

  return {
    drawX: centerX - scaledWidth / 2,
    drawY: centerY - scaledHeight / 2,
    drawWidth: scaledWidth,
    drawHeight: scaledHeight,
    clampedTransform,
  };
};

const clampImageTransform = (image: HTMLImageElement, rect: SlotRect, transform: ImageTransform): ImageTransform => {
  return getCoverPlacement(image, rect, transform).clampedTransform;
};

const drawCoverImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: SlotRect,
  transform: ImageTransform,
) => {
  const placement = getCoverPlacement(image, rect, transform);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  ctx.drawImage(image, placement.drawX, placement.drawY, placement.drawWidth, placement.drawHeight);
  ctx.restore();
};

const drawSlotBorder = (ctx: CanvasRenderingContext2D, rect: SlotRect) => {
  ctx.save();
  ctx.strokeStyle = SLOT_BORDER_COLOR;
  ctx.lineWidth = SLOT_BORDER_WIDTH;
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
  ctx.restore();
};

const drawSlotLogo = (ctx: CanvasRenderingContext2D, logoImage: HTMLImageElement | null, rect: SlotRect) => {
  if (!logoImage) return;

  const logoAspect = logoImage.width / logoImage.height || 1;
  const maxWidth = rect.width * LOGO_MAX_WIDTH_RATIO;
  const targetWidth = clamp(rect.width * LOGO_WIDTH_RATIO, LOGO_MIN_SIZE, maxWidth);
  let logoWidth = targetWidth;
  let logoHeight = logoWidth / logoAspect;

  const maxHeight = rect.height * LOGO_MAX_WIDTH_RATIO;
  if (logoHeight > maxHeight) {
    logoHeight = maxHeight;
    logoWidth = logoHeight * logoAspect;
  }

  const margin = Math.max(2, rect.width * LOGO_MARGIN_RATIO);
  const x = rect.x + rect.width - logoWidth - margin;
  const y = rect.y + rect.height - logoHeight - margin;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(logoImage, x, y, logoWidth, logoHeight);
  ctx.restore();
};

export const PhotoFrame = forwardRef<PhotoFrameRef, PhotoFrameProps>(({
  image,
  frameColor,
  activeTool,
  brushColor,
  brushSize,
  brushOpacity,
  onFrameClick,
  isFrameSelected,
  zoom = 1,
  onZoomChange,
  initialElements,
  initialImageTransform,
}, ref) => {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [imageTransform, setImageTransform] = useState<ImageTransform>(DEFAULT_IMAGE_TRANSFORM);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isMovingImage, setIsMovingImage] = useState(false);
  const [shapeStart, setShapeStart] = useState<Point | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [logoReady, setLogoReady] = useState(false);

  const currentPathRef = useRef<Point[]>([]);
  const movePointerRef = useRef<Point | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pointerPositionsRef = useRef<Map<number, Point>>(new Map());
  const pinchDistanceRef = useRef<number | null>(null);

  const getScaledCanvasContext = useCallback((canvas: HTMLCanvasElement | null, width: number, height: number) => {
    if (!canvas) return null;
    // Slightly upscale low-DPI displays for cleaner preview without heavy perf cost.
    const dpr = Math.min(2, Math.max(window.devicePixelRatio || 1, 1.5));
    const targetWidth = Math.floor(width * dpr);
    const targetHeight = Math.floor(height * dpr);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return ctx;
  }, []);

  const applyClampedTransform = useCallback((updater: (prev: ImageTransform) => ImageTransform) => {
    setImageTransform((prev) => {
      const next = updater(prev);
      if (!loadedImageRef.current) return next;
      return clampImageTransform(loadedImageRef.current, PRIMARY_SLOT_RECT, next);
    });
  }, []);

  const renderBase = useCallback(() => {
    const ctx = getScaledCanvasContext(baseCanvasRef.current, FRAME_WIDTH, FRAME_HEIGHT);
    if (!ctx) return;

    ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.fillStyle = frameColor;
    ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

    SLOT_RECTS.forEach((slot) => {
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);

      if (loadedImageRef.current) {
        drawCoverImage(ctx, loadedImageRef.current, slot, imageTransform);
        drawSlotLogo(ctx, logoImageRef.current, slot);
      } else {
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Insert photo here', slot.x + slot.width / 2, slot.y + slot.height / 2);
      }

      drawSlotBorder(ctx, slot);
    });
  }, [frameColor, getScaledCanvasContext, imageTransform, logoReady]);

  const renderOverlay = useCallback((previewPath?: Point[]) => {
    const ctx = getScaledCanvasContext(overlayCanvasRef.current, FRAME_WIDTH, FRAME_HEIGHT);
    if (!ctx) return;

    ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    drawElementsToContext(ctx, elements);

    if (previewPath && previewPath.length > 0) {
      if (activeTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalAlpha = brushOpacity / 100;
        ctx.strokeStyle = brushColor;
      }

      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      drawSmoothPath(ctx, previewPath);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
  }, [activeTool, brushColor, brushOpacity, brushSize, elements, getScaledCanvasContext]);

  useImperativeHandle(ref, () => ({
    getCanvasData: () => ({ elements, imageTransform }),
    clearCanvas: () => setElements([]),
    resetImageTransform: () => setImageTransform(DEFAULT_IMAGE_TRANSFORM),
    exportStripBlob: async () => {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = EXPORT_WIDTH;
      exportCanvas.height = EXPORT_HEIGHT;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      ctx.fillStyle = frameColor;
      ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);

      const scaleX = EXPORT_WIDTH / FRAME_WIDTH;
      const scaleY = EXPORT_HEIGHT / FRAME_HEIGHT;
      const exportTransform: ImageTransform = {
        offsetX: imageTransform.offsetX * scaleX,
        offsetY: imageTransform.offsetY * scaleY,
        scale: imageTransform.scale,
      };

      const exportSlots = SLOT_RECTS.map((slot) => ({
        x: slot.x * scaleX,
        y: slot.y * scaleY,
        width: slot.width * scaleX,
        height: slot.height * scaleY,
      }));

      exportSlots.forEach((slot) => {
        ctx.fillStyle = '#E5E7EB';
        ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
        if (loadedImageRef.current) {
          drawCoverImage(ctx, loadedImageRef.current, slot, exportTransform);
          drawSlotLogo(ctx, logoImageRef.current, slot);
        } else {
          ctx.fillStyle = '#6B7280';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Insert photo here', slot.x + slot.width / 2, slot.y + slot.height / 2);
        }

        drawSlotBorder(ctx, slot);
      });

      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = EXPORT_WIDTH;
      overlayCanvas.height = EXPORT_HEIGHT;
      const overlayCtx = overlayCanvas.getContext('2d');
      if (overlayCtx) {
        overlayCtx.imageSmoothingEnabled = true;
        overlayCtx.imageSmoothingQuality = 'high';
        overlayCtx.save();
        overlayCtx.scale(scaleX, scaleY);
        drawElementsToContext(overlayCtx, elements);
        overlayCtx.restore();
        ctx.drawImage(overlayCanvas, 0, 0);
      }

      return await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    },
  }), [elements, frameColor, imageTransform]);

  // Backward compatible hydration for old array-based canvas_data
  useEffect(() => {
    if (initialized) return;

    let hydratedElements: CanvasElement[] = [];
    let hydratedTransform = initialImageTransform
      ? normalizeImageTransform(initialImageTransform)
      : DEFAULT_IMAGE_TRANSFORM;

    if (Array.isArray(initialElements)) {
      hydratedElements = initialElements as CanvasElement[];
    } else if (initialElements && typeof initialElements === 'object') {
      const parsed = initialElements as Partial<SerializedCanvasData>;
      if (Array.isArray(parsed.elements)) {
        hydratedElements = parsed.elements;
      }
      if (!initialImageTransform && parsed.imageTransform) {
        hydratedTransform = normalizeImageTransform(parsed.imageTransform);
      }
    }

    setElements(hydratedElements);
    setImageTransform(hydratedTransform);
    setInitialized(true);
  }, [initialElements, initialImageTransform, initialized]);

  useEffect(() => {
    renderOverlay();
  }, [renderOverlay]);

  useEffect(() => {
    renderBase();
  }, [renderBase]);

  useEffect(() => {
    let cancelled = false;
    const logoImg = new Image();
    logoImg.onload = () => {
      if (cancelled) return;
      logoImageRef.current = logoImg;
      setLogoReady(true);
    };
    logoImg.onerror = () => {
      if (cancelled) return;
      logoImageRef.current = null;
      setLogoReady(false);
    };
    logoImg.src = logoNoBackground;

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!image) {
      loadedImageRef.current = null;
      renderBase();
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      const resolvedUrl = resolveMediaUrl(image) || image;
      let srcForCanvas = resolvedUrl;
      let loadedFromBlob = false;

      try {
        if (/^https?:\/\//i.test(resolvedUrl)) {
          try {
            const headers: Record<string, string> = {};
            const host = new URL(resolvedUrl).hostname;
            if (NGROK_HOST_RE.test(host)) {
              headers['ngrok-skip-browser-warning'] = 'true';
            }

            const response = await fetch(resolvedUrl, {
              headers,
              mode: 'cors',
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.startsWith('image/')) {
              throw new Error(`Unexpected content-type: ${contentType || 'unknown'}`);
            }

            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            srcForCanvas = objectUrl;
            loadedFromBlob = true;
          } catch (fetchError) {
            // Fallback to direct URL load. This still works if CORS is correctly configured.
            console.warn('Photo blob fetch failed, falling back to direct URL load:', fetchError);
          }
        }

        let loadedImage: HTMLImageElement;
        try {
          loadedImage = await loadImageElement(srcForCanvas, !loadedFromBlob);
        } catch {
          loadedImage = await loadImageElement(resolvedUrl, true);
        }

        if (cancelled) return;
        loadedImageRef.current = loadedImage;
        setImageTransform((prev) => {
          const next = clampImageTransform(loadedImage, PRIMARY_SLOT_RECT, prev);
          return isSameTransform(prev, next) ? prev : next;
        });
        renderBase();
      } catch (error) {
        if (cancelled) return;
        loadedImageRef.current = null;
        renderBase();
        console.error('Photo load failed in editor:', resolvedUrl, error);
      }
    };

    load();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [image, renderBase]);

  const getCanvasCoordsFromClient = (clientX: number, clientY: number) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom,
    };
  };

  const getPinchDistance = (points: Point[]) => {
    if (points.length < 2) return null;
    return distanceBetween(points[0], points[1]);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.pointerType === 'touch') {
      pointerPositionsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerPositionsRef.current.size === 2) {
        const points = Array.from(pointerPositionsRef.current.values());
        pinchDistanceRef.current = getPinchDistance(points);
        e.preventDefault();
        return;
      }
    }

    if (activePointerIdRef.current !== null) return;
    activePointerIdRef.current = e.pointerId;
    overlayCanvasRef.current?.setPointerCapture(e.pointerId);
    if (e.pointerType === 'touch') e.preventDefault();

    const { x, y } = getCanvasCoordsFromClient(e.clientX, e.clientY);
    const startPoint = { x, y };

    if (activeTool === 'move' && loadedImageRef.current) {
      setIsMovingImage(true);
      movePointerRef.current = startPoint;
      return;
    }

    if (activeTool === 'draw') {
      setIsDrawing(true);
      currentPathRef.current = [startPoint];
      renderOverlay(currentPathRef.current);
      return;
    }

    if (activeTool === 'eraser') {
      setIsDrawing(true);
      currentPathRef.current = [startPoint];
      renderOverlay(currentPathRef.current);
      return;
    }

    if (['rectangle', 'circle', 'triangle', 'star', 'heart'].includes(activeTool)) {
      setShapeStart({ x, y });
      setIsDrawing(true);
      return;
    }

    if (activeTool === 'text') {
      const text = prompt('Enter text:');
      if (!text) return;
      setElements((prev) => [...prev, {
        id: Date.now().toString(),
        type: 'text',
        text,
        x,
        y,
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity,
      }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerPositionsRef.current.has(e.pointerId)) {
      pointerPositionsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointerPositionsRef.current.size === 2 && onZoomChange) {
        const points = Array.from(pointerPositionsRef.current.values());
        const nextDistance = getPinchDistance(points);
        const lastDistance = pinchDistanceRef.current;
        if (lastDistance && nextDistance) {
          const scaleFactor = nextDistance / lastDistance;
          if (Number.isFinite(scaleFactor) && scaleFactor > 0) {
            const nextZoom = Math.min(4, Math.max(0.25, zoom * scaleFactor));
            onZoomChange(nextZoom);
          }
          pinchDistanceRef.current = nextDistance;
        }
        e.preventDefault();
        return;
      }
    }

    if (activePointerIdRef.current !== e.pointerId) return;
    if (e.pointerType === 'touch') e.preventDefault();

    const { x, y } = getCanvasCoordsFromClient(e.clientX, e.clientY);

    if (activeTool === 'move' && isMovingImage && movePointerRef.current) {
      const dx = x - movePointerRef.current.x;
      const dy = y - movePointerRef.current.y;
      movePointerRef.current = { x, y };

      applyClampedTransform((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'draw' || activeTool === 'eraser') {
      const nextPoint = { x, y };
      const lastPoint = currentPathRef.current[currentPathRef.current.length - 1];
      if (lastPoint && distanceBetween(lastPoint, nextPoint) < MIN_POINT_DISTANCE) {
        return;
      }

      currentPathRef.current = [...currentPathRef.current, nextPoint];
      renderOverlay(currentPathRef.current);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointerPositionsRef.current.has(e.pointerId)) {
      pointerPositionsRef.current.delete(e.pointerId);
      if (pointerPositionsRef.current.size < 2) {
        pinchDistanceRef.current = null;
      }
    }

    if (activePointerIdRef.current !== e.pointerId) return;
    activePointerIdRef.current = null;
    overlayCanvasRef.current?.releasePointerCapture(e.pointerId);

    if (activeTool === 'move' && isMovingImage) {
      setIsMovingImage(false);
      movePointerRef.current = null;
      return;
    }

    if (!isDrawing) return;

    const { x, y } = getCanvasCoordsFromClient(e.clientX, e.clientY);

    if ((activeTool === 'draw' || activeTool === 'eraser') && currentPathRef.current.length > 0) {
      const nextPoint = { x, y };
      const lastPoint = currentPathRef.current[currentPathRef.current.length - 1];
      const finalPoints = (lastPoint && distanceBetween(lastPoint, nextPoint) < MIN_POINT_DISTANCE)
        ? currentPathRef.current
        : [...currentPathRef.current, nextPoint];

      setElements((prev) => [...prev, {
        id: Date.now().toString(),
        type: activeTool === 'eraser' ? 'eraser' : 'path',
        points: finalPoints,
        color: activeTool === 'eraser' ? '#000000' : brushColor,
        size: brushSize,
        opacity: activeTool === 'eraser' ? 100 : brushOpacity,
      }]);
    } else if (shapeStart) {
      const width = x - shapeStart.x;
      const height = y - shapeStart.y;
      const radius = Math.sqrt(width * width + height * height);

      setElements((prev) => [...prev, {
        id: Date.now().toString(),
        type: activeTool as CanvasElement['type'],
        x: shapeStart.x,
        y: shapeStart.y,
        width: Math.abs(width),
        height: Math.abs(height),
        radius,
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity,
      }]);
    }

    setIsDrawing(false);
    currentPathRef.current = [];
    setShapeStart(null);
  };

  const handleFrameWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (activeTool !== 'move' || !loadedImageRef.current) return;
    if (e.ctrlKey || e.metaKey) return;

    e.preventDefault();

    if (e.shiftKey) {
      const horizontalDelta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      applyClampedTransform((prev) => ({
        ...prev,
        offsetX: prev.offsetX - horizontalDelta * WHEEL_PAN_FACTOR,
      }));
      return;
    }

    applyClampedTransform((prev) => ({
      ...prev,
      offsetY: prev.offsetY - e.deltaY * WHEEL_PAN_FACTOR,
    }));
  };

  const cursor = (() => {
    if (activeTool === 'move') return isMovingImage ? 'grabbing' : 'grab';
    if (activeTool === 'eraser') {
      const size = Math.max(brushSize, 4);
      const half = size / 2;
      return `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><circle cx='${half}' cy='${half}' r='${half - 1}' fill='none' stroke='white' stroke-width='1'/></svg>") ${half} ${half}, crosshair`;
    }
    if (activeTool === 'select') return 'default';
    return 'crosshair';
  })();

  return (
    <div
      className={`relative transition-all ${isFrameSelected ? 'ring-2 ring-accent' : ''}`}
      style={{
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
        backgroundColor: frameColor,
      }}
      onWheel={handleFrameWheel}
      onClick={(e) => {
        if (e.target === e.currentTarget && onFrameClick) onFrameClick();
      }}
    >
      <canvas
        ref={baseCanvasRef}
        className="absolute inset-0"
        style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT }}
      />
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0"
        style={{
          width: FRAME_WIDTH,
          height: FRAME_HEIGHT,
          cursor,
          pointerEvents: activeTool === 'select' ? 'none' : 'auto',
          touchAction: 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
});

PhotoFrame.displayName = 'PhotoFrame';
