import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import Layout from "@/components/layout/Layout";
import {
  Upload,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  PenLine,
  Stamp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/Prescription")({
  component: RouteComponent,
});

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB
const INFO_COLLAPSED_KEY = "prescription_info_collapsed";

function RouteComponent() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Additional notes
  const [notes, setNotes] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Collapsible info panel — persisted in localStorage
  const [infoCollapsed, setInfoCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(INFO_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(INFO_COLLAPSED_KEY, String(infoCollapsed));
    } catch {
      // ignore storage errors
    }
  }, [infoCollapsed]);

  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);
  const submitPrescription = useMutation(
    api.userFns.prescriptions.submitPrescription,
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFileError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setFileError("Only JPG, JPEG, PNG, or PDF files are accepted.");
      setFile(null);
      return;
    }
    if (selected.size > MAX_SIZE_BYTES) {
      setFileError("File must be smaller than 8 MB.");
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Obtain a short-lived Convex storage upload URL
      const uploadUrl = await generateUploadUrl();

      // 2. POST the raw file directly to Convex storage
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("File upload failed.");
      const { storageId } = (await uploadRes.json()) as { storageId: string };

      // 3. Persist the prescription record
      await submitPrescription({
        storageId: storageId as never,
        notes: notes || undefined,
        fileName: file.name,
        fileType: file.type === "application/pdf" ? "pdf" : "image",
      });

      navigate({ to: "/account/Prescriptions" });
    } catch {
      setSubmitError(
        "Something went wrong uploading your prescription. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="bg-secondary py-2">
        <div className="container mx-auto px-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary">
            Home
          </Link>{" "}
          &gt; Upload Prescription
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Upload Your Prescription
        </h1>
        <p className="text-muted-foreground mb-6">
          Send us your valid prescription and our pharmacist will review it and
          provide you with a quote. We deliver across Zimbabwe!
        </p>

        {/* How it works — full width above both columns */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            {
              icon: Upload,
              title: "Upload",
              desc: "Submit your prescription file",
            },
            {
              icon: Clock,
              title: "Get a Quote",
              desc: "Review & quote within 2 hrs",
            },
            {
              icon: Truck,
              title: "Delivery",
              desc: "Pay & we deliver to your door",
            },
          ].map((step) => (
            <div
              key={step.title}
              className="text-center border border-border rounded-lg p-3"
            >
              <step.icon className="w-7 h-7 mx-auto mb-1 text-primary" />
              <p className="text-sm font-bold text-foreground">{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* ── Left column: warning + prescription requirements ── */}
          <div className="space-y-4">
            {/* Collapsible wrapper */}
            <div className="border border-border rounded-lg overflow-hidden">
              {/* Toggle header */}
              <button
                type="button"
                onClick={() => setInfoCollapsed((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors text-sm font-semibold text-foreground"
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Important Information
                </span>
                {infoCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {/* Collapsible body */}
              {!infoCollapsed && (
                <div className="p-4 space-y-4">
                  {/* Important Disclaimer */}
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-amber-800 mb-1">
                          Please read before submitting
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-amber-700">
                          <li>
                            <strong>
                              This service is NOT for emergencies or urgent
                              medical needs.
                            </strong>{" "}
                            If you require urgent assistance, please contact
                            emergency services or visit your nearest hospital
                            immediately.
                          </li>
                          <li>
                            Prescriptions are reviewed during business hours
                            only. Please allow up to 2 hours for a response.
                          </li>
                          <li>
                            A prescription may be{" "}
                            <strong>rejected or cancelled</strong> if it is
                            expired, illegible, incomplete, or does not meet
                            legal requirements.
                          </li>
                          <li>
                            Submitting a fraudulent or altered prescription is a
                            criminal offence.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* What your prescription must include */}
                  <div className="border border-border rounded-lg p-4 space-y-2">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <PenLine className="w-4 h-4 text-primary" />
                      What your prescription must include
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Our pharmacist will verify the following on your uploaded
                      prescription. Submissions missing any of these may be
                      rejected.
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {[
                        {
                          icon: PenLine,
                          text: "Doctor\u2019s full name, contact details and practice / hospital",
                        },
                        {
                          icon: PenLine,
                          text: "Patient\u2019s name and date of birth",
                        },
                        {
                          icon: PenLine,
                          text: "Medicine name(s), dosage and quantity",
                        },
                        {
                          icon: PenLine,
                          text: "Doctor\u2019s original signature",
                        },
                        {
                          icon: Stamp,
                          text: "Doctor\u2019s official stamp / seal",
                        },
                      ].map(({ icon: Icon, text }) => (
                        <li
                          key={text}
                          className="flex items-start gap-2 text-foreground"
                        >
                          <Icon className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: upload form ── */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ── File Upload ─────────────────────────────────────── */}
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <Upload className="w-4 h-4 text-primary" />
                  Prescription File{" "}
                  <span className="text-destructive font-normal">*</span>
                </h2>
                <div
                  className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
                    fileError
                      ? "border-destructive bg-destructive/5"
                      : file
                        ? "border-primary/60 bg-primary/5"
                        : "border-border hover:border-primary"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <>
                      <CheckCircle2 className="w-8 h-8 text-primary mb-2" />
                      <span className="text-sm font-medium text-foreground">
                        {file.name}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB · Click to
                        change
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload or drag &amp; drop
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        JPG, JPEG, PNG or PDF · Max 8 MB
                      </span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    title="Upload prescription file"
                    accept={ACCEPTED_EXTENSIONS}
                    className="hidden"
                    onChange={handleFileChange}
                    required
                  />
                </div>
                {fileError && (
                  <p className="text-xs text-destructive mt-1">{fileError}</p>
                )}
              </section>

              {/* ── Additional Notes ─────────────────────────────────── */}
              <section>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Additional Notes
                </h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any special delivery instructions, allergies or additional information..."
                  className="w-full border border-border rounded px-3 py-2 text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </section>

              {submitError && (
                <p className="text-sm text-destructive border border-destructive/30 bg-destructive/5 rounded px-3 py-2">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !file}
                className="w-full bg-primary text-primary-foreground py-3 rounded font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  "Submit Prescription"
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground">
                By submitting you confirm this is a valid, unaltered
                prescription and you agree to our{" "}
                <Link to="/Terms" className="underline hover:text-primary">
                  Terms of Service
                </Link>
                .
              </p>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
