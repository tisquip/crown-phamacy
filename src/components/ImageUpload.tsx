import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { StorageImage } from "@/components/StorageImage";

interface ImageUploadProps {
  /** Currently saved storage ID – shown as a preview. Pass null/undefined when none. */
  currentStorageId?: Id<"_storage"> | null;
  /** Called with the new storage ID after a successful upload. */
  onUploadComplete: (storageId: Id<"_storage">) => void;
  /** Called when the user requests to clear the current image. */
  onClear?: () => void;
  /** When true, hides the image preview and only shows the upload button. */
  hidePreview?: boolean;
  /** Extra Tailwind classes for the root container. */
  className?: string;
}

/**
 * Reusable image upload component.
 *
 * Lets the user pick an image file, uploads it to Convex storage using a
 * signed upload URL, then calls `onUploadComplete` with the resulting
 * storage ID. Displays a preview of the current image while idle.
 */
export function ImageUpload({
  currentStorageId,
  onUploadComplete,
  onClear,
  hidePreview = false,
  className,
}: ImageUploadProps) {
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset state
    setError(null);
    setUploading(true);

    try {
      const uploadUrl = await generateUploadUrl();

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };

      onUploadComplete(storageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Allow re-selecting the same file next time
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Preview */}
      {!hidePreview && (
        <div className="relative w-24 h-24">
          <StorageImage
            storageId={currentStorageId}
            className="w-24 h-24 rounded-md object-cover border border-border"
          />
          {currentStorageId && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive text-destructive-foreground p-0.5 shadow hover:bg-destructive/90 transition-colors"
              title="Remove image"
            >
              <X className="w-3 h-3" />
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
            : currentStorageId
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
