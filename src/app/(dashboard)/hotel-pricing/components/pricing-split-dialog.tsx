"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { formatLocalDate, utcToLocal } from "@/lib/timezone-utils"

interface SplitPeriod {
  startDate: Date | string;
  endDate: Date | string;
  price: number;
  isNew: boolean;
  isExisting: boolean;
}

interface PricingSplitPreview {
  willSplit: boolean;
  affectedPeriods: Array<{
    id: string;
    startDate: Date | string;
    endDate: Date | string;
    price: number;
    roomType: string;
    occupancy: string;
    mealPlan?: string;
  }>;
  resultingPeriods: SplitPeriod[];
  message: string;
}

interface PricingSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PricingSplitPreview | null;
  onConfirm: () => void;
  loading: boolean;
}

export function PricingSplitDialog({ 
  open, 
  onOpenChange, 
  preview, 
  onConfirm,
  loading 
}: PricingSplitDialogProps) {
  if (!preview) return null;

  const formatDate = (date: Date | string) => {
    return formatLocalDate(utcToLocal(date) || new Date(), "PPP")
  }

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString()}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {preview.willSplit ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Period Overlap Detected
              </>
            ) : (
              <>
                <Info className="h-5 w-5 text-blue-500" />
                Pricing Confirmation
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {preview.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {preview.willSplit && preview.affectedPeriods.length > 0 && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Existing Pricing Will Be Modified</AlertTitle>
              <AlertDescription className="text-amber-800">
                The following existing pricing periods will be split or modified:
                <div className="mt-3 space-y-2">
                  {preview.affectedPeriods.map((period, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-amber-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {formatDate(period.startDate)} - {formatDate(period.endDate)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {period.roomType} • {period.occupancy}
                            {period.mealPlan && ` • ${period.mealPlan}`}
                          </div>
                        </div>
                        <div className="font-semibold text-amber-700">
                          {formatPrice(period.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {preview.resultingPeriods.length > 0 && (
            <Alert variant="default" className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Resulting Pricing Periods</AlertTitle>
              <AlertDescription className="text-green-800">
                After applying this change, the following pricing periods will exist:
                <div className="mt-3 space-y-2">
                  {preview.resultingPeriods.map((period, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded border ${
                        period.isNew 
                          ? 'bg-green-100 border-green-300' 
                          : 'bg-white border-green-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {formatDate(period.startDate)} - {formatDate(period.endDate)}
                            {period.isNew && (
                              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                                NEW
                              </span>
                            )}
                            {period.isExisting && !period.isNew && (
                              <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                PRESERVED
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`font-semibold ${period.isNew ? 'text-green-700' : 'text-blue-700'}`}>
                          {formatPrice(period.price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {preview.willSplit && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>What will happen?</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Existing overlapping pricing periods will be automatically split</li>
                  <li>Original pricing will be preserved for non-overlapping date ranges</li>
                  <li>Your new pricing will apply to the specified date range</li>
                  <li>No data will be permanently lost - you can modify or delete these periods later</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? "Applying..." : "Confirm & Apply Pricing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
