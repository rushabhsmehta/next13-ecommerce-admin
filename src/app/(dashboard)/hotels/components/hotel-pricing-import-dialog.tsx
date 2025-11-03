"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, FileWarning, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

interface ImportSummary {
  sheetName: string;
  processed: number;
  created: number;
  updated: number;
  skippedEmptyRows: number;
  fileName?: string;
}

interface ImportSuccessResponse {
  success: true;
  summary: ImportSummary;
  warnings?: string[];
}

interface ImportErrorDetail {
  rowNumber: number;
  field?: string;
  message: string;
  value?: unknown;
}

interface ImportStats {
  sheetName?: string;
  totalRows?: number;
  dataRows?: number;
  skippedEmptyRows?: number;
  fileName?: string;
}

interface ImportErrorResponse {
  error?: string;
  code?: string;
  details?: {
    errors?: ImportErrorDetail[];
    warnings?: string[];
    stats?: ImportStats;
  };
}

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

export function HotelPricingImportDialog() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportSuccessResponse | null>(null);
  const [errors, setErrors] = useState<ImportErrorDetail[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);

  const resetState = () => {
    setFile(null);
    setIsSubmitting(false);
    setResult(null);
    setErrors([]);
    setWarnings([]);
    setStats(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleSelectFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      return;
    }
    setFile(nextFile);
    setResult(null);
    setErrors([]);
    setWarnings([]);
    setStats(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      toast.error("Select a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsSubmitting(true);
    setErrors([]);
    setWarnings([]);
    setStats(null);
    setResult(null);

    try {
      const response = await fetch("/api/hotel-pricing/import", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as ImportSuccessResponse | ImportErrorResponse;

      if (!response.ok) {
        const errorPayload = payload as ImportErrorResponse;
        setErrors(errorPayload.details?.errors ?? []);
        setWarnings(errorPayload.details?.warnings ?? []);
        setStats(errorPayload.details?.stats ?? null);
        toast.error(errorPayload.error || "Failed to import pricing");
        return;
      }

      const successPayload = payload as ImportSuccessResponse;
      setResult(successPayload);
      setWarnings(successPayload.warnings ?? []);
      toast.success("Hotel pricing imported");
      router.refresh();
    } catch (error) {
      toast.error("Unexpected error while uploading pricing");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" /> Import Pricing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk update hotel pricing</DialogTitle>
          <DialogDescription>
            Upload the CSV or Excel template generated from the pricing exporter to update rates in bulk.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Run <code>npx tsx scripts/utilities/export-hotel-pricing-template.ts</code> to generate the latest workbook with drop-down validation. The importer accepts either the Excel file or a CSV exported from it.
            </p>
            <p>
              If a range overlaps another row (either already in the database or inside the file), the uploader will still process it but flag the overlap so you can reconcile periods later.
            </p>
          </div>

          <div className="rounded-md border border-dashed border-muted-foreground/60 bg-muted/20 p-4 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileChange}
            />
            <Button type="button" variant="secondary" onClick={handleSelectFile} disabled={isSubmitting}>
              <Upload className="mr-2 h-4 w-4" /> {file ? "Change file" : "Choose file"}
            </Button>
            {file ? (
              <div className="mt-2 text-sm">
                <div className="font-medium text-foreground">{file.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                Accepts .xlsx, .xls, or .csv exported from the pricing template.
              </p>
            )}
          </div>

          {result && (
            <div className="space-y-2 rounded-md border border-emerald-600/30 bg-emerald-600/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Import completed successfully
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-emerald-900">
                <span>Worksheet</span>
                <span className="text-right font-medium">{result.summary.sheetName}</span>
                <span>Rows processed</span>
                <span className="text-right font-medium">{result.summary.processed}</span>
                <span>Created</span>
                <span className="text-right font-medium">{result.summary.created}</span>
                <span>Updated</span>
                <span className="text-right font-medium">{result.summary.updated}</span>
                <span>Skipped blanks</span>
                <span className="text-right font-medium">{result.summary.skippedEmptyRows}</span>
              </div>
              {warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                    <FileWarning className="h-3.5 w-3.5" /> Warnings
                  </div>
                  <ul className="max-h-24 overflow-y-auto text-xs text-amber-800">
                    {warnings.slice(0, 20).map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                  {warnings.length > 20 && (
                    <div className="text-[11px] text-amber-700">Showing first 20 warnings.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {errors.length > 0 && (
            <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-destructive">
                <XCircle className="h-4 w-4" /> Validation issues detected
              </div>
              <ul className="max-h-40 overflow-y-auto text-xs text-destructive">
                {errors.slice(0, 40).map((error, index) => (
                  <li key={`${error.rowNumber}-${error.field ?? ""}-${index}`}>
                    Row {error.rowNumber}
                    {error.field ? ` (${error.field})` : ""}: {error.message}
                  </li>
                ))}
              </ul>
              {errors.length > 40 && (
                <div className="text-[11px] font-medium text-destructive">
                  Showing first 40 issues.
                </div>
              )}
              {stats && (
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-destructive">
                  {typeof stats.totalRows === "number" && (
                    <Badge variant="outline" className="border-destructive/60 text-destructive">
                      {stats.totalRows} rows detected
                    </Badge>
                  )}
                  {typeof stats.dataRows === "number" && (
                    <Badge variant="outline" className="border-destructive/60 text-destructive">
                      {stats.dataRows} rows with data
                    </Badge>
                  )}
                  {typeof stats.skippedEmptyRows === "number" && (
                    <Badge variant="outline" className="border-destructive/60 text-destructive">
                      {stats.skippedEmptyRows} blanks skipped
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {!result && warnings.length > 0 && errors.length === 0 && (
            <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800">
              <div className="flex items-center gap-2 font-medium">
                <FileWarning className="h-4 w-4" /> Warnings
              </div>
              <ul className="max-h-32 overflow-y-auto">
                {warnings.slice(0, 20).map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <Separator />

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2 text-left text-xs text-muted-foreground">
              <span>Accepted columns:</span>
              <Badge variant="outline" className="text-[11px]">hotel_id</Badge>
              <Badge variant="outline" className="text-[11px]">room_type_name</Badge>
              <Badge variant="outline" className="text-[11px]">occupancy_type_name</Badge>
              <Badge variant="outline" className="text-[11px]">meal_plan_code</Badge>
              <Badge variant="outline" className="text-[11px]">start_date</Badge>
              <Badge variant="outline" className="text-[11px]">end_date</Badge>
              <Badge variant="outline" className="text-[11px]">price_per_night</Badge>
              <Badge variant="outline" className="text-[11px]">is_active</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Close
              </Button>
              <Button type="submit" disabled={!file || isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" /> Upload &amp; Process
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
