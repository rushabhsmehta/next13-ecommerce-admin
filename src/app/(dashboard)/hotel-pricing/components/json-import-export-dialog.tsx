"use client"

import { useState } from "react"
import axios from "axios"
import { toast } from "react-hot-toast"
import {
  FileJson,
  Upload,
  Copy,
  Download,
  CheckCircle2,
  XCircle,
  FileWarning,
  Loader2,
  AlertTriangle
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { ImportPreview } from "@/lib/hotel-pricing-json"

interface JsonImportExportDialogProps {
  hotelId: string | null;
  hotelName?: string;
  locationId?: string;
  locationName?: string;
  onImportSuccess?: () => void;
  disabled?: boolean;
}

export function JsonImportExportDialog({
  hotelId,
  hotelName,
  locationId,
  locationName,
  onImportSuccess,
  disabled = false
}: JsonImportExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"export" | "import">("export")

  // Export state
  const [includeExistingPricing, setIncludeExistingPricing] = useState(false)
  const [exportedJson, setExportedJson] = useState<string>("")
  const [aiPrompt, setAiPrompt] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)

  // Import state
  const [importJson, setImportJson] = useState<string>("")
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)

  const resetState = () => {
    setExportedJson("")
    setAiPrompt("")
    setImportJson("")
    setPreview(null)
    setImportSuccess(false)
    setIncludeExistingPricing(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const handleGenerateJson = async () => {
    if (!hotelId) {
      toast.error("Please select a hotel first")
      return
    }

    setIsExporting(true)
    try {
      const response = await axios.post("/api/hotel-pricing/export-json", {
        hotelId,
        includeExistingPricing
      })

      const formattedJson = JSON.stringify(response.data, null, 2)
      setExportedJson(formattedJson)
      toast.success("JSON generated successfully")
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to generate JSON")
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleGeneratePrompt = async () => {
    if (!hotelId) {
      toast.error("Please select a hotel first")
      return
    }

    setIsGeneratingPrompt(true)
    try {
      const response = await axios.post("/api/hotel-pricing/export-ai-prompt", {
        hotelId
      })

      setAiPrompt(response.data.prompt)
      toast.success("AI prompt generated successfully")
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to generate prompt")
      console.error(error)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(exportedJson)
    toast.success("JSON copied to clipboard")
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(aiPrompt)
    toast.success("Prompt copied to clipboard")
  }

  const handleDownloadJson = () => {
    const blob = new Blob([exportedJson], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hotel-pricing-${hotelName?.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("JSON downloaded")
  }

  const handleValidate = async () => {
    if (!importJson.trim()) {
      toast.error("Please paste JSON to import")
      return
    }

    setIsValidating(true)
    setPreview(null)
    setImportSuccess(false)

    try {
      // Parse JSON first to check syntax
      JSON.parse(importJson)

      const response = await axios.post("/api/hotel-pricing/import-json", JSON.parse(importJson))

      setPreview(response.data)
      toast.success("Validation successful - review preview below")
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        toast.error("Invalid JSON syntax")
      } else if (error.response?.data?.details) {
        setPreview(error.response.data.details)
        toast.error("Validation errors found - see details below")
      } else {
        toast.error(error.response?.data?.error || "Validation failed")
      }
      console.error(error)
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!preview || preview.summary.errors > 0) {
      toast.error("Cannot import with validation errors")
      return
    }

    setIsImporting(true)
    try {
      const payload = { ...JSON.parse(importJson), confirm: true }
      const response = await axios.post("/api/hotel-pricing/import-json", payload)

      setImportSuccess(true)
      toast.success(`Successfully imported ${response.data.summary.created} pricing entries!`)

      // Refresh parent data
      if (onImportSuccess) {
        onImportSuccess()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Import failed")
      console.error(error)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} size="sm">
          <FileJson className="mr-2 h-4 w-4" />
          JSON Import/Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hotel Pricing JSON Import/Export</DialogTitle>
          <DialogDescription>
            Export sample JSON for AI conversion or import pricing data
            {hotelName && ` for ${hotelName}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "export" | "import")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export & AI Prompt</TabsTrigger>
            <TabsTrigger value="import">Import JSON</TabsTrigger>
          </TabsList>

          {/* EXPORT TAB */}
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeExisting"
                  checked={includeExistingPricing}
                  onCheckedChange={(checked) => setIncludeExistingPricing(checked as boolean)}
                />
                <Label htmlFor="includeExisting" className="text-sm font-normal cursor-pointer">
                  Include existing pricing as examples
                </Label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleGenerateJson} disabled={isExporting}>
                  {isExporting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><FileJson className="mr-2 h-4 w-4" /> Generate JSON</>
                  )}
                </Button>
                <Button onClick={handleGeneratePrompt} variant="outline" disabled={isGeneratingPrompt}>
                  {isGeneratingPrompt ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <>Generate AI Prompt</>
                  )}
                </Button>
              </div>

              {exportedJson && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Generated JSON</Label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopyJson}>
                        <Copy className="mr-2 h-3 w-3" /> Copy
                      </Button>
                      <Button size="sm" variant="outline" onClick={handleDownloadJson}>
                        <Download className="mr-2 h-3 w-3" /> Download
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-64 w-full rounded-md border">
                    <pre className="p-4 text-xs">
                      <code>{exportedJson}</code>
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {aiPrompt && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>AI Prompt (for ChatGPT/Claude)</Label>
                    <Button size="sm" variant="outline" onClick={handleCopyPrompt}>
                      <Copy className="mr-2 h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <ScrollArea className="h-64 w-full rounded-md border">
                    <pre className="p-4 text-xs whitespace-pre-wrap">
                      {aiPrompt}
                    </pre>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground">
                    Copy this prompt and your image/Excel file to ChatGPT or Claude to convert pricing data to JSON
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* IMPORT TAB */}
          <TabsContent value="import" className="space-y-4">
            {!importSuccess ? (
              <>
                <div className="space-y-2">
                  <Label>Paste JSON from AI</Label>
                  <Textarea
                    placeholder='Paste the JSON here...'
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    className="font-mono text-xs min-h-[200px]"
                  />
                </div>

                <Button onClick={handleValidate} disabled={isValidating || !importJson.trim()}>
                  {isValidating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validating...</>
                  ) : (
                    <>Validate & Preview</>
                  )}
                </Button>

                {preview && (
                  <div className="space-y-4">
                    <Separator />

                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="rounded-lg border p-3 text-center">
                        <div className="text-2xl font-bold">{preview.summary.totalEntries}</div>
                        <div className="text-xs text-muted-foreground">Total Entries</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center bg-green-50">
                        <div className="text-2xl font-bold text-green-700">{preview.summary.newEntries}</div>
                        <div className="text-xs text-muted-foreground">Valid</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center bg-red-50">
                        <div className="text-2xl font-bold text-red-700">{preview.summary.errors}</div>
                        <div className="text-xs text-muted-foreground">Errors</div>
                      </div>
                      <div className="rounded-lg border p-3 text-center bg-amber-50">
                        <div className="text-2xl font-bold text-amber-700">{preview.summary.warnings}</div>
                        <div className="text-xs text-muted-foreground">Warnings</div>
                      </div>
                    </div>

                    {/* Errors */}
                    {preview.errors.length > 0 && (
                      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 space-y-2">
                        <div className="flex items-center gap-2 font-medium text-destructive">
                          <XCircle className="h-4 w-4" /> Validation Errors
                        </div>
                        <ScrollArea className="max-h-40">
                          <ul className="text-xs text-destructive space-y-1">
                            {preview.errors.map((error, index) => (
                              <li key={index}>
                                {error.entryIndex !== undefined && `Entry ${error.entryIndex + 1}`}
                                {error.field && ` (${error.field})`}: {error.message}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Warnings */}
                    {preview.warnings.length > 0 && (
                      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                        <div className="flex items-center gap-2 font-medium text-amber-700">
                          <FileWarning className="h-4 w-4" /> Warnings (non-blocking)
                        </div>
                        <ScrollArea className="max-h-32">
                          <ul className="text-xs text-amber-800 space-y-1">
                            {preview.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Preview Table */}
                    {preview.entries.length > 0 && (
                      <div className="space-y-2">
                        <Label>Preview ({preview.entries.length} entries)</Label>
                        <ScrollArea className="h-64 rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Room Type</TableHead>
                                <TableHead>Occupancy</TableHead>
                                <TableHead>Meal Plan</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>End Date</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {preview.entries.map((entry) => (
                                <TableRow key={entry.index}>
                                  <TableCell className="font-medium">{entry.index + 1}</TableCell>
                                  <TableCell>{entry.roomTypeName}</TableCell>
                                  <TableCell>{entry.occupancyTypeName}</TableCell>
                                  <TableCell>{entry.mealPlanCode || "-"}</TableCell>
                                  <TableCell className="text-xs">{entry.startDate}</TableCell>
                                  <TableCell className="text-xs">{entry.endDate}</TableCell>
                                  <TableCell className="text-right">₹{entry.price.toLocaleString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Confirm Button */}
                    {preview.summary.errors === 0 && (
                      <Button
                        onClick={handleConfirmImport}
                        disabled={isImporting}
                        className="w-full"
                      >
                        {isImporting ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                        ) : (
                          <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Import ({preview.summary.newEntries} entries)</>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md border border-emerald-600/30 bg-emerald-600/10 p-6 text-center space-y-2">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                <div className="text-lg font-medium text-emerald-800">Import Successful!</div>
                <p className="text-sm text-emerald-700">Pricing data has been imported successfully</p>
                <Button onClick={() => setOpen(false)} className="mt-4">
                  Close
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
