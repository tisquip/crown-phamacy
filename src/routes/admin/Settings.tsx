import { createFileRoute } from "@tanstack/react-router";
import AdminLayout from "@/components/layout/AdminLayout";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState, useEffect } from "react";
import { Loader2, Settings, Save } from "lucide-react";
import { formatPrice } from "@/lib/formatPrice";

export const Route = createFileRoute("/admin/Settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const settings = useQuery(api.adminFns.siteSettings.getDeliverySettings);
  const updateSettingsMutation = useMutation(
    api.adminFns.siteSettings.updateDeliverySettings,
  );

  const [deliveryPriceDollars, setDeliveryPriceDollars] = useState("");
  const [freeThresholdDollars, setFreeThresholdDollars] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setDeliveryPriceDollars(
        (settings.deliveryPriceInUSDCents / 100).toFixed(2),
      );
      setFreeThresholdDollars(
        (settings.freeDeliveryThresholdInUSDCents / 100).toFixed(2),
      );
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    try {
      await updateSettingsMutation({
        deliveryPriceInUSDCents: Math.round(
          parseFloat(deliveryPriceDollars) * 100,
        ),
        freeDeliveryThresholdInUSDCents: Math.round(
          parseFloat(freeThresholdDollars) * 100,
        ),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (settings === undefined) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Site Settings</h1>
      </div>

      <div className="max-w-lg">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Delivery Settings */}
          <div className="border border-border rounded-lg p-6 space-y-4">
            <h2 className="font-bold text-foreground text-lg">
              Delivery Settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Delivery Price (USD)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                The fee charged for delivery when the order is below the free
                delivery threshold.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={deliveryPriceDollars}
                  onChange={(e) => setDeliveryPriceDollars(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 pl-7 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {settings && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current: {formatPrice(settings.deliveryPriceInUSDCents)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Free Delivery Threshold (USD)
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Orders at or above this amount get free delivery.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={freeThresholdDollars}
                  onChange={(e) => setFreeThresholdDollars(e.target.value)}
                  className="w-full border border-border rounded px-3 py-2 pl-7 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {settings && (
                <p className="text-xs text-muted-foreground mt-1">
                  Current:{" "}
                  {formatPrice(settings.freeDeliveryThresholdInUSDCents)}
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Saving…" : "Save Settings"}
          </button>

          {saved && (
            <p className="text-sm text-green-600 font-medium">
              Settings saved successfully!
            </p>
          )}
        </form>
      </div>
    </AdminLayout>
  );
}
