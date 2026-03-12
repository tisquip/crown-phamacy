import { useRef, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CdnImageUploadProps {
  /** Currently saved CDN URL – shown as a preview. Pass null/undefined when none. */
  currentImageUrl?: string | null;
  /** The S3 key of the current CDN image – used to delete from CDN on clear. */
  cdnImageKey?: string | null;
  /** Called with the CDN URL and S3 key after a successful upload. */
  onUploadComplete: (result: { cdnUrl: string; key: string }) => void;
  /** Called when the user requests to clear the current image. */
  onClear?: () => void;
  /** When true, hides the image preview and only shows the upload button. */
  hidePreview?: boolean;
  /**
   * A prefix for the S3 key, e.g. "products", "carousel", "banners".
   * The final key will be `<prefix>/<timestamp>-<filename>`.
   */
  keyPrefix: string;
  /** Extra Tailwind classes for the root container. */
  className?: string;
}

/**
 * Image upload component that uploads to the self-hosted CDN via the
 * `cdn.uploadFile` Convex action (S3 → SeaweedFS).
 */
export function CdnImageUpload({
  currentImageUrl,
  cdnImageKey,
  onUploadComplete,
  onClear,
  hidePreview = false,
  keyPrefix,
  className,
}: CdnImageUploadProps) {
  const uploadFile = useAction(api.cdn.uploadFile);
  const deleteFile = useAction(api.cdn.deleteFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClear() {
    if (cdnImageKey) {
      setDeleting(true);
      try {
        await deleteFile({ key: cdnImageKey });
      } catch {
        // Best-effort deletion – still clear the image from UI
      } finally {
        setDeleting(false);
      }
    }
    onClear?.();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // Read file as base64
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          "",
        ),
      );

      // Build a unique key: prefix/timestamp-sanitizedFilename
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const key = `${keyPrefix}/${Date.now()}-${sanitizedName}`;

      const result = await uploadFile({
        key,
        base64Data,
        contentType: file.type,
      });

      onUploadComplete({ cdnUrl: result.cdnUrl, key: result.key });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview */}
      {!hidePreview && (
        <div className="relative w-24 h-24">
          <img
            src={currentImageUrl || "/noimage.jpg"}
            alt="Preview"
            className="w-24 h-24 rounded-md object-cover border border-border"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== window.location.origin + "/noimage.jpg") {
                img.src = "/noimage.jpg";
              }
            }}
          />
          {currentImageUrl && onClear && (
            <button
              type="button"
              onClick={handleClear}
              disabled={deleting}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow hover:bg-destructive/90 transition-colors disabled:opacity-50"
              title="Remove image"
            >
              {deleting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <UploadCloud className="w-4 h-4 mr-2" />
          )}
          {uploading
            ? "Uploading…"
            : currentImageUrl
              ? "Replace Image"
              : "Upload Image"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Upload image file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
