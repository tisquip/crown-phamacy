import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import AdminLayout from "../../components/layout/AdminLayout";
import { CdnImageUpload } from "@/components/CdnImageUpload";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/Carousel")({
  component: RouteComponent,
});

interface SlideDraft {
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  image?: Id<"_storage"> | null;
  cdnImageUrl?: string | null;
  cdnImageKey?: string | null;
  active: boolean;
  order: number;
}

const emptyDraft = (order: number): SlideDraft => ({
  title: "New Slide",
  subtitle: "Subtitle",
  buttonText: "Learn more",
  buttonLink: "/products",
  image: null,
  cdnImageUrl: null,
  cdnImageKey: null,
  active: true,
  order,
});

function RouteComponent() {
  const slides = useQuery(api.adminFns.heroSlides.list) ?? [];
  const createSlide = useMutation(api.adminFns.heroSlides.create);
  const updateSlide = useMutation(api.adminFns.heroSlides.update);
  const removeSlide = useMutation(api.adminFns.heroSlides.remove);

  const [editing, setEditing] = useState<Id<"heroSlide"> | "new" | null>(null);
  const [draft, setDraft] = useState<SlideDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (id: Id<"heroSlide">) => {
    const slide = slides.find((s) => s._id === id);
    if (!slide) return;
    setDraft({
      title: slide.title,
      subtitle: slide.subtitle,
      buttonText: slide.buttonText,
      buttonLink: slide.buttonLink,
      image: slide.image ?? null,
      cdnImageUrl: slide.cdnImageUrl ?? null,
      cdnImageKey: slide.cdnImageKey ?? null,
      active: slide.active,
      order: slide.order,
    });
    setEditing(id);
  };

  const startNew = () => {
    const maxOrder =
      slides.length > 0 ? Math.max(...slides.map((s) => s.order)) : 0;
    setDraft(emptyDraft(maxOrder + 1));
    setEditing("new");
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft(null);
  };

  const patchDraft = (updates: Partial<SlideDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      if (editing === "new") {
        await createSlide({
          title: draft.title,
          subtitle: draft.subtitle,
          buttonText: draft.buttonText,
          buttonLink: draft.buttonLink,
          image: draft.image ?? undefined,
          cdnImageUrl: draft.cdnImageUrl ?? undefined,
          cdnImageKey: draft.cdnImageKey ?? undefined,
          active: draft.active,
          order: draft.order,
        });
        toast({ title: "Slide created" });
      } else if (editing) {
        await updateSlide({
          id: editing,
          title: draft.title,
          subtitle: draft.subtitle,
          buttonText: draft.buttonText,
          buttonLink: draft.buttonLink,
          image: draft.image ?? undefined,
          cdnImageUrl: draft.cdnImageUrl ?? undefined,
          cdnImageKey: draft.cdnImageKey ?? undefined,
          active: draft.active,
          order: draft.order,
        });
        toast({ title: "Slide saved" });
      }
      setEditing(null);
      setDraft(null);
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to save slide",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: Id<"heroSlide">) => {
    try {
      await removeSlide({ id });
      if (editing === id) cancelEdit();
      toast({ title: "Slide removed" });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to remove slide",
        variant: "destructive",
      });
    }
  };

  const isLoading = slides === undefined;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Carousel Management
        </h1>
        <button
          onClick={startNew}
          disabled={editing === "new"}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Add Slide
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading slides…
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <div
              key={slide._id}
              className="bg-card border border-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <span className="text-sm font-bold text-foreground">
                    Slide {index + 1}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      slide.active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {slide.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      editing === slide._id
                        ? cancelEdit()
                        : startEdit(slide._id)
                    }
                    className="text-xs text-primary hover:underline"
                  >
                    {editing === slide._id ? "Collapse" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleRemove(slide._id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{slide.title}</p>

              {editing === slide._id && draft && (
                <SlideForm
                  draft={draft}
                  onChange={patchDraft}
                  onSave={handleSave}
                  onCancel={cancelEdit}
                  saving={saving}
                />
              )}
            </div>
          ))}

          {editing === "new" && draft && (
            <div className="bg-card border border-primary border-dashed rounded-lg p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm font-bold text-foreground">
                  New Slide
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                  Active
                </span>
              </div>
              <SlideForm
                draft={draft}
                onChange={patchDraft}
                onSave={handleSave}
                onCancel={cancelEdit}
                saving={saving}
              />
            </div>
          )}

          {slides.length === 0 && editing !== "new" && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No slides yet. Click <strong>Add Slide</strong> to create your
              first one.
            </p>
          )}
        </div>
      )}
    </AdminLayout>
  );
}

// ── Slide edit form ──────────────────────────────────────────────────────────

interface SlideFormProps {
  draft: SlideDraft;
  onChange: (updates: Partial<SlideDraft>) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function SlideForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: SlideFormProps) {
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Title
        </label>
        <input
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Subtitle
        </label>
        <input
          value={draft.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Button Text
          </label>
          <input
            value={draft.buttonText}
            onChange={(e) => onChange({ buttonText: e.target.value })}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">
            Button Link
          </label>
          <input
            value={draft.buttonLink}
            onChange={(e) => onChange({ buttonLink: e.target.value })}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-1">
          Display Order
        </label>
        <input
          type="number"
          value={draft.order}
          onChange={(e) => onChange({ order: Number(e.target.value) })}
          className="w-24 border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-foreground mb-2">
          Slide Image
        </label>
        <CdnImageUpload
          currentImageUrl={draft.cdnImageUrl}
          cdnImageKey={draft.cdnImageKey}
          keyPrefix="carousel"
          onUploadComplete={({ cdnUrl, key }) =>
            onChange({ cdnImageUrl: cdnUrl, cdnImageKey: key })
          }
          onClear={() => onChange({ cdnImageUrl: null, cdnImageKey: null })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => onChange({ active: e.target.checked })}
          className="accent-primary"
        />
        <span className="text-foreground">Active</span>
      </label>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save Changes
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded text-sm font-semibold border border-border text-foreground hover:bg-muted disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
