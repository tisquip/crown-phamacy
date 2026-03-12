import { Doc, Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Loader2, ShieldAlert } from "lucide-react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";

interface PrescriptionImageProps {
  /** ID of the prescription. */
  prescriptionId: Id<"uploadedPrescription"> | string;
  className?: string;
}

/**
 * Displays a prescription image that is protected behind authentication.
 *
 * Uses `getPrescriptionUrl` (a Convex query) to obtain a short-lived signed
 * storage URL. The query enforces ownership / admin access on the server, so
 * the component simply shows a "not authorised" placeholder when `null` is
 * returned. No manual fetch or auth token handling is required – the signed
 * URL works directly in `<img>` / `<iframe>` tags without CORS issues.
 */
export function PrescriptionImage({
  prescriptionId,
  className,
}: PrescriptionImageProps) {
  const convex = useConvex();
  const [url, setUrl] = useState<string | null | undefined>(undefined);
  const [prescription, setPrescription] = useState<
    Doc<"uploadedPrescription"> | null | undefined
  >(undefined);

  useEffect(() => {
    const id = prescriptionId as Id<"uploadedPrescription">;
    Promise.all([
      convex.query(api.userFns.prescriptions.getPrescriptionUrl, { id }),
      convex.query(api.userFns.prescriptions.getPrescriptionById, { id }),
    ]).then(([urlResult, prescriptionResult]) => {
      setUrl(urlResult);
      setPrescription(prescriptionResult);
    });
  }, [convex, prescriptionId]);

  // undefined → still loading
  if (url === undefined || prescription === undefined) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-md",
          className,
        )}
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // null → not authenticated or not authorised
  if (url === null) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 bg-muted rounded-md p-2 text-center",
          className,
        )}
      >
        <ShieldAlert className="w-5 h-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Not authorised</span>
      </div>
    );
  }

  const fileType = prescription?.fileType ?? null;
  const isPdf =
    fileType === "pdf" ||
    fileType === "application/pdf" ||
    fileType?.endsWith("/pdf") === true;

  if (isPdf) {
    return (
      <iframe
        src={url}
        title="Prescription"
        className={cn("w-full border-0 min-h-[500px]", className)}
      />
    );
  }

  return (
    <img
      src={url}
      alt="Prescription"
      className={cn("object-cover", className)}
    />
  );
}
