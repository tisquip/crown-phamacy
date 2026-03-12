import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Pencil,
  Minus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const Route = createFileRoute("/admin/BulkUpload")({
  component: BulkUploadPage,
});

function BulkUploadPage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const latestUpload = useQuery(api.adminFns.bulkUpload.getLatestUpload, {});
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);
  const initiateUpload = useMutation(api.adminFns.bulkUpload.initiateUpload);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
      ];
      if (
        !validTypes.includes(file.type) &&
        !file.name.endsWith(".xlsx") &&
        !file.name.endsWith(".xls")
      ) {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel file (.xlsx or .xls)",
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);
      try {
        // 1. Get upload URL
        const uploadUrl = await generateUploadUrl();

        // 2. Upload file to Convex storage
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw new Error("Failed to upload file");

        const { storageId } = await result.json();

        // 3. Initiate processing
        await initiateUpload({ storageId, fileName: file.name });

        toast({
          title: "Upload started",
          description:
            "Your Excel file is being processed. Results will appear below.",
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description:
            error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        // Reset the input so the same file can be re-uploaded
        e.target.value = "";
      }
    },
    [generateUploadUrl, initiateUpload, toast],
  );

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Bulk Product Upload
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload an Excel document to create or update products in bulk.
          </p>
        </div>

        {/* Upload card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Upload Excel File
            </CardTitle>
            <CardDescription>
              The Excel file should have 1 sheet with headers in the first row.
              Columns: <strong>stockCode</strong>, name, description,
              promotionPriceInUSDCents, bulkOfferPriceInUSDCents, bulkOfferQty,
              retailPriceInUSDCents, barcode, isMedicine,
              isPrescriptionControlled, inStock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label
                htmlFor="excel-upload"
                className={`flex items-center gap-2 px-4 py-2 rounded-md cursor-pointer transition-colors ${
                  isUploading
                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isUploading ? "Uploading..." : "Choose Excel File"}
              </label>
              <input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              {latestUpload?.fileName && (
                <span className="text-sm text-muted-foreground">
                  Last uploaded: {latestUpload.fileName}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Processing status */}
        {latestUpload && <UploadStatusCard upload={latestUpload} />}
      </div>
    </AdminLayout>
  );
}

// ── Upload status display ──────────────────────────────────────────────

interface UploadData {
  _id: string;
  status: "processing" | "completed" | "failed";
  fileName?: string;
  uploadedAt: number;
  completedAt?: number;
  errorMessage?: string;
  productsAdded?: Array<{ stockCode: string; name: string }>;
  productsUpdated?: Array<{
    stockCode: string;
    name: string;
    changes: Array<string>;
  }>;
  productsUntouched?: Array<{ stockCode: string; name: string }>;
}

function UploadStatusCard({ upload }: { upload: UploadData }) {
  const statusConfig = {
    processing: {
      icon: <Loader2 className="w-5 h-5 animate-spin text-blue-500" />,
      badge: (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
          Processing
        </Badge>
      ),
    },
    completed: {
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
      badge: (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          Completed
        </Badge>
      ),
    },
    failed: {
      icon: <XCircle className="w-5 h-5 text-red-500" />,
      badge: <Badge variant="destructive">Failed</Badge>,
    },
  };

  const config = statusConfig[upload.status];
  const addedCount = upload.productsAdded?.length ?? 0;
  const updatedCount = upload.productsUpdated?.length ?? 0;
  const untouchedCount = upload.productsUntouched?.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {config.icon}
            Upload Status
          </CardTitle>
          {config.badge}
        </div>
        <CardDescription>
          {upload.fileName && <>File: {upload.fileName} &middot; </>}
          Uploaded: {new Date(upload.uploadedAt).toLocaleString()}
          {upload.completedAt && (
            <>
              {" "}
              &middot; Completed:{" "}
              {new Date(upload.completedAt).toLocaleString()}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {upload.status === "processing" && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <div>
              <p className="font-medium text-blue-700">
                Processing your Excel file...
              </p>
              <p className="text-sm text-blue-600">
                This may take a moment depending on the number of products.
              </p>
            </div>
          </div>
        )}

        {upload.status === "failed" && upload.errorMessage && (
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-700">Processing failed</p>
              <p className="text-sm text-red-600">{upload.errorMessage}</p>
            </div>
          </div>
        )}

        {upload.status === "completed" && (
          <>
            {/* Summary counters */}
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <Plus className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-700">
                    {addedCount}
                  </p>
                  <p className="text-xs text-green-600">Products Added</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Pencil className="w-5 h-5 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold text-amber-700">
                    {updatedCount}
                  </p>
                  <p className="text-xs text-amber-600">Products Updated</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <Minus className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-700">
                    {untouchedCount}
                  </p>
                  <p className="text-xs text-gray-500">Untouched</p>
                </div>
              </div>
            </div>

            {/* Detailed accordion sections */}
            <Accordion type="multiple" className="w-full">
              {/* Added products */}
              {addedCount > 0 && (
                <AccordionItem value="added">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-green-600" />
                      Products Added ({addedCount})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">
                            Stock Code
                          </TableHead>
                          <TableHead>Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upload.productsAdded!.map((p) => (
                          <TableRow key={p.stockCode}>
                            <TableCell className="font-mono text-sm">
                              {p.stockCode}
                            </TableCell>
                            <TableCell>{p.name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Updated products */}
              {updatedCount > 0 && (
                <AccordionItem value="updated">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Pencil className="w-4 h-4 text-amber-600" />
                      Products Updated ({updatedCount})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">
                            Stock Code
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Changes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upload.productsUpdated!.map((p) => (
                          <TableRow key={p.stockCode}>
                            <TableCell className="font-mono text-sm">
                              {p.stockCode}
                            </TableCell>
                            <TableCell>{p.name}</TableCell>
                            <TableCell>
                              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-0.5">
                                {p.changes.map((change, i) => (
                                  <li key={i}>{change}</li>
                                ))}
                              </ul>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Untouched products */}
              {untouchedCount > 0 && (
                <AccordionItem value="untouched">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-gray-500" />
                      Products Untouched ({untouchedCount})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[180px]">
                            Stock Code
                          </TableHead>
                          <TableHead>Name</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upload.productsUntouched!.map((p) => (
                          <TableRow key={p.stockCode}>
                            <TableCell className="font-mono text-sm">
                              {p.stockCode}
                            </TableCell>
                            <TableCell>{p.name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {addedCount === 0 && updatedCount === 0 && untouchedCount === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">
                No products were found in the uploaded file.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
