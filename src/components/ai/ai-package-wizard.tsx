"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { useToast } from "@/components/ui/use-toast";
import {
    Sparkles,
    ArrowRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    MapPin,
    Calendar,
    Users,
    Wallet,
    FileText,
    Eye,
    Pencil,
    RotateCcw,
    Package,
    PlusCircle,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Form schema for Step 1
const wizardFormSchema = z.object({
    destination: z.string().min(1, "Please select a destination"),
    selectedTourPackageId: z.string().optional(),
    nights: z.number().min(1, "Minimum 1 night").max(30, "Maximum 30 nights"),
    days: z.number().min(1, "Minimum 1 day").max(31, "Maximum 31 days"),
    groupType: z.enum(["family", "couple", "friends", "solo", "corporate", "seniors"]),
    budgetCategory: z.enum(["budget", "mid-range", "premium", "luxury"]),
    specialRequirements: z.string().optional(),
    // For Query mode
    customerName: z.string().optional(),
    startDate: z.string().optional(),
    numAdults: z.number().optional(),
    numChildren: z.number().optional(),
});

type WizardFormValues = z.infer<typeof wizardFormSchema>;

interface Location {
    id: string;
    label: string;
}

interface TourPackageSummary {
    id: string;
    tourPackageName: string;
    tourPackageType: string;
    numDaysNight: string;
}

interface AIPackageWizardProps {
    locations: Location[];
    mode?: "tourPackage" | "tourPackageQuery";
}

interface GeneratedItinerary {
    tourPackageName: string;
    tourCategory: string;
    tourPackageType: string;
    numDaysNight: string;
    transport: string;
    pickup_location: string;
    drop_location: string;
    highlights?: string[];
    itineraries: Array<{
        dayNumber: number;
        itineraryTitle: string;
        itineraryDescription: string;
        mealsIncluded: string;
        suggestedHotel: string;
        activities: Array<{
            activityTitle: string;
            activityDescription: string;
        }>;
    }>;
    estimatedBudget?: {
        perPerson: string;
        total: string;
        note: string;
    };
    customerName?: string;
    tourStartsFrom?: string;
    numAdults?: number;
    numChildren?: number;
}

const GROUP_TYPES = [
    { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
    { value: "couple", label: "Couple", icon: "💑" },
    { value: "friends", label: "Friends", icon: "👯" },
    { value: "solo", label: "Solo", icon: "🧳" },
    { value: "corporate", label: "Corporate", icon: "💼" },
    { value: "seniors", label: "Seniors", icon: "👴👵" },
];

const BUDGET_CATEGORIES = [
    { value: "budget", label: "Budget", description: "3-star hotels, shared transfers", color: "bg-success/15 text-success" },
    { value: "mid-range", label: "Mid-Range", description: "4-star hotels, private transfers", color: "bg-info/15 text-info" },
    { value: "premium", label: "Premium", description: "4-5 star hotels, premium services", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
    { value: "luxury", label: "Luxury", description: "5-star hotels, exclusive experiences", color: "bg-warning/15 text-warning" },
];

export function AIPackageWizard({ locations, mode = "tourPackage" }: AIPackageWizardProps) {
    const [step, setStep] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [generatedData, setGeneratedData] = useState<GeneratedItinerary | null>(null);
    const [tokenUsage, setTokenUsage] = useState<{ promptTokens: number; completionTokens: number } | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Tour package selection state
    const [locationPackages, setLocationPackages] = useState<TourPackageSummary[]>([]);
    const [isLoadingPackages, setIsLoadingPackages] = useState(false);

    // Refinement State
    const [refinementInput, setRefinementInput] = useState("");
    const [isRefining, setIsRefining] = useState(false);

    const form = useForm<WizardFormValues>({
        resolver: zodResolver(wizardFormSchema),
        defaultValues: {
            destination: "",
            selectedTourPackageId: "",
            nights: 3,
            days: 4,
            groupType: "family",
            budgetCategory: "mid-range",
            specialRequirements: "",
            customerName: "",
            startDate: "",
            numAdults: 2,
            numChildren: 0,
        },
    });

    // Sync nights and days
    const nights = form.watch("nights");
    useEffect(() => {
        form.setValue("days", nights + 1);
    }, [nights, form]);

    // Fetch tour packages when destination changes
    const destination = form.watch("destination");
    const fetchPackagesForLocation = useCallback(async (locationId: string) => {
        if (!locationId) {
            setLocationPackages([]);
            return;
        }
        setIsLoadingPackages(true);
        try {
            const apiPath = mode === "tourPackageQuery"
                ? `/api/tourPackageQuery?locationId=${locationId}&summary=true`
                : `/api/tourPackages?locationId=${locationId}&summary=true`;
            const response = await fetch(apiPath);
            if (response.ok) {
                const data = await response.json();
                const packages: TourPackageSummary[] = data.map((pkg: any) => {
                    const name = mode === "tourPackageQuery" ? pkg.tourPackageQueryName : pkg.tourPackageName;
                    return {
                        id: pkg.id,
                        tourPackageName: name || "Untitled",
                        tourPackageType: pkg.tourPackageType || "",
                        numDaysNight: pkg.numDaysNight || "",
                    };
                });
                setLocationPackages(packages);
            } else {
                console.error("[AI_WIZARD] Failed to fetch packages: non-OK response", {
                    status: response.status,
                    statusText: response.statusText,
                });
                setLocationPackages([]);
            }
        } catch (error) {
            console.error("[AI_WIZARD] Failed to fetch packages:", error);
            setLocationPackages([]);
        } finally {
            setIsLoadingPackages(false);
        }
    }, [mode]);

    useEffect(() => {
        // Reset selected package when destination changes
        form.setValue("selectedTourPackageId", "");
        fetchPackagesForLocation(destination);
    }, [destination, fetchPackagesForLocation]);

    const rawSelectedTourPackageId = form.watch("selectedTourPackageId");

    // Normalize sentinel "__none__" value to an empty string in form state
    useEffect(() => {
        if (rawSelectedTourPackageId === "__none__") {
            form.setValue("selectedTourPackageId", "");
        }
    }, [rawSelectedTourPackageId, form]);

    const selectedTourPackageId =
        rawSelectedTourPackageId === "__none__" ? "" : rawSelectedTourPackageId;
    const selectedPackage = selectedTourPackageId
        ? locationPackages.find((p) => p.id === selectedTourPackageId)
        : undefined;

    const handleGenerate = async (values: WizardFormValues) => {
        setIsGenerating(true);
        setProgress(0);

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress((prev) => Math.min(prev + 10, 90));
        }, 500);

        try {
            const response = await fetch("/api/ai/generate-itinerary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    destination: locations.find((l) => l.id === values.destination)?.label || values.destination,
                    duration: { nights: values.nights, days: values.days },
                    groupType: values.groupType,
                    budgetCategory: values.budgetCategory,
                    specialRequirements: values.specialRequirements,
                    targetType: mode,
                    customerName: values.customerName,
                    startDate: values.startDate,
                    numAdults: values.numAdults,
                    numChildren: values.numChildren,
                }),
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to generate itinerary");
            }

            const result = await response.json();
            setGeneratedData(result.data);
            setTokenUsage({
                promptTokens: result.usage?.promptTokens || 0,
                completionTokens: result.usage?.completionTokens || 0,
            });
            setProgress(100);

            // Move to preview step after short delay
            setTimeout(() => {
                setStep(3);
            }, 500);

        } catch (error) {
            clearInterval(progressInterval);
            setProgress(0);
            console.error("[AI_WIZARD] Generation failed:", error);
            toast({
                variant: "destructive",
                title: "Generation Failed",
                description: error instanceof Error ? error.message : "Please try again",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateDraft = () => {
        if (!generatedData) return;

        // Find the location ID
        const selectedLocationId = form.getValues("destination");

        // Store in localStorage for the form to pick up
        const draftKey = mode === "tourPackageQuery" ? "autoQueryDraft" : "aiPackageWizardDraft";
        localStorage.setItem(draftKey, JSON.stringify({
            timestamp: new Date().toISOString(),
            locationId: selectedLocationId,
            data: {
                ...generatedData,
                locationId: selectedLocationId,
            },
        }));

        toast({
            title: "Draft Ready",
            description: "Redirecting to create a new package...",
        });

        // Navigate to create page
        if (mode === "tourPackageQuery") {
            router.push("/tourPackageQuery/new");
        } else {
            router.push("/tourPackages/new");
        }
    };

    const handleApplyToExisting = () => {
        if (!generatedData) return;

        // Ensure a valid existing package is selected before proceeding
        if (!selectedTourPackageId || selectedTourPackageId === "__none__") {
            toast({
                title: "No package selected",
                description: "Please select an existing tour package before applying the AI itinerary.",
                variant: "destructive",
            });
            return;
        }

        const selectedLocationId = form.getValues("destination");

        // Store in localStorage with a special key for "apply to existing" mode
        const draftKey = mode === "tourPackageQuery" ? "aiApplyToQueryDraft" : "aiApplyToPackageDraft";
        localStorage.setItem(draftKey, JSON.stringify({
            timestamp: new Date().toISOString(),
            locationId: selectedLocationId,
            data: {
                ...generatedData,
                locationId: selectedLocationId,
            },
        }));

        toast({
            title: "Applying AI Itinerary",
            description: `Redirecting to update "${selectedPackage?.tourPackageName}"...`,
        });

        // Navigate to the existing package's edit page
        if (mode === "tourPackageQuery") {
            router.push(`/tourPackageQuery/${selectedTourPackageId}`);
        } else {
            router.push(`/tourPackages/${selectedTourPackageId}`);
        }
    };

    const handleRegenerate = () => {
        setGeneratedData(null);
        setStep(2);
        form.handleSubmit(handleGenerate)();
    };

    const handleRefine = async () => {
        if (!refinementInput.trim() || !generatedData) return;

        setIsRefining(true);
        try {
            const response = await fetch("/api/ai/refine-itinerary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentItinerary: generatedData,
                    userPrompt: refinementInput,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to refine itinerary");
            }

            const result = await response.json();
            setGeneratedData(result.data);
            setRefinementInput(""); // Clear input
            toast({
                title: "Itinerary Updated",
                description: "Your changes have been applied successfully.",
            });

        } catch (error) {
            console.error("[AI_REFINE] Failed:", error);
            toast({
                variant: "destructive",
                title: "Refinement Failed",
                description: error instanceof Error ? error.message : "Please try again",
            });
        } finally {
            setIsRefining(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                    <div
                        className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                            step >= s
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                        )}
                    >
                        {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                    </div>
                    {s < 3 && (
                        <div
                            className={cn(
                                "w-16 h-1 mx-2 transition-all",
                                step > s ? "bg-primary" : "bg-muted"
                            )}
                        />
                    )}
                </div>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <Card className="border-2">
            <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit">
                    <FileText className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Trip Details</CardTitle>
                <CardDescription>
                    Tell us about your ideal trip and we&apos;ll create a personalized itinerary
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((values) => { setStep(2); handleGenerate(values); })} className="space-y-6">
                        {/* Destination */}
                        <FormField
                            control={form.control}
                            name="destination"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4" /> Destination
                                    </FormLabel>
                                    <FormControl>
                                        <LocationCombobox
                                            locations={locations}
                                            value={field.value}
                                            onValueChange={field.onChange}
                                            placeholder="Select destination..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Tour Package Selection (filtered by location) */}
                        {destination && (
                            <FormField
                                control={form.control}
                                name="selectedTourPackageId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Package className="h-4 w-4" /> Existing {mode === "tourPackageQuery" ? "Query" : "Tour Package"} (Optional)
                                        </FormLabel>
                                        <FormDescription className="text-xs">
                                            Select an existing {mode === "tourPackageQuery" ? "query" : "package"} to apply the AI-generated itinerary to, or leave empty to create a new one.
                                        </FormDescription>
                                        {isLoadingPackages ? (
                                            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm text-muted-foreground">Loading packages...</span>
                                            </div>
                                        ) : locationPackages.length === 0 ? (
                                            <div className="p-3 border rounded-lg bg-muted/50">
                                                <p className="text-sm text-muted-foreground">
                                                    No existing {mode === "tourPackageQuery" ? "queries" : "packages"} found for this destination. A new one will be created.
                                                </p>
                                            </div>
                                        ) : (
                                            <FormControl>
                                                <Select
                                                    value={field.value || ""}
                                                    onValueChange={field.onChange}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={`Select a ${mode === "tourPackageQuery" ? "query" : "package"} or leave empty for new...`} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__none__">
                                                            <span className="flex items-center gap-2">
                                                                <PlusCircle className="h-4 w-4" /> Create New {mode === "tourPackageQuery" ? "Query" : "Package"}
                                                            </span>
                                                        </SelectItem>
                                                        {locationPackages.map((pkg) => (
                                                            <SelectItem key={pkg.id} value={pkg.id}>
                                                                <div className="flex flex-col">
                                                                    <span>{pkg.tourPackageName}</span>
                                                                    {pkg.numDaysNight && (
                                                                        <span className="text-xs text-muted-foreground">{pkg.numDaysNight} | {pkg.tourPackageType}</span>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                        )}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Selected Package Info */}
                        {selectedPackage && (
                            <Card className="bg-info/10 border-info/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-info">
                                        <Package className="h-4 w-4" />
                                        <span className="text-sm font-medium">
                                            AI itinerary will be applied to: <strong>{selectedPackage.tourPackageName}</strong>
                                        </span>
                                    </div>
                                    {selectedPackage.numDaysNight && (
                                        <p className="text-xs text-info mt-1 ml-6">
                                            {selectedPackage.numDaysNight} | {selectedPackage.tourPackageType}
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Duration */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nights"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> Nights
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={30}
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="days"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Days</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                disabled
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">Auto-calculated</FormDescription>
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Group Type */}
                        <FormField
                            control={form.control}
                            name="groupType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Users className="h-4 w-4" /> Group Type
                                    </FormLabel>
                                    <div className="grid grid-cols-3 gap-2">
                                        {GROUP_TYPES.map((type) => (
                                            <div
                                                key={type.value}
                                                onClick={() => field.onChange(type.value as typeof field.value)}
                                                className={cn(
                                                    "p-3 rounded-lg border-2 cursor-pointer text-center transition-all hover:border-primary/50",
                                                    field.value === type.value
                                                        ? "border-primary bg-primary/5"
                                                        : "border-muted"
                                                )}
                                            >
                                                <span className="text-2xl">{type.icon}</span>
                                                <p className="text-sm font-medium mt-1">{type.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Budget Category */}
                        <FormField
                            control={form.control}
                            name="budgetCategory"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Wallet className="h-4 w-4" /> Budget Category
                                    </FormLabel>
                                    <div className="grid grid-cols-2 gap-2">
                                        {BUDGET_CATEGORIES.map((budget) => (
                                            <div
                                                key={budget.value}
                                                onClick={() => field.onChange(budget.value as typeof field.value)}
                                                className={cn(
                                                    "p-3 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/50",
                                                    field.value === budget.value
                                                        ? "border-primary bg-primary/5"
                                                        : "border-muted"
                                                )}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium">{budget.label}</span>
                                                    {field.value === budget.value && (
                                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">{budget.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Customer Details (Query Mode) */}
                        {mode === "tourPackageQuery" && (
                            <>
                                <Separator />
                                <div className="space-y-4">
                                    <h3 className="font-medium">Customer Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="customerName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Customer Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g., Sharma Family" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="startDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Travel Date</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="numAdults"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Adults</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="numChildren"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Children</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min={0}
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Special Requirements */}
                        <FormField
                            control={form.control}
                            name="specialRequirements"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Special Requirements (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g., Include local food experiences, avoid long drives, focus on adventure activities..."
                                            className="min-h-[80px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Add any specific preferences or must-have experiences
                                    </FormDescription>
                                </FormItem>
                            )}
                        />

                        <Button type="submit" size="lg" className="w-full gap-2">
                            Generate Itinerary <ArrowRight className="h-4 w-4" />
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );

    const renderStep2 = () => (
        <Card className="border-2">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 w-fit animate-pulse">
                    <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Creating Your Itinerary</CardTitle>
                <CardDescription>
                    Our AI is crafting a personalized travel experience just for you
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Progress value={progress} className="h-3" />
                <div className="text-center">
                    <p className="text-lg font-medium">{progress}%</p>
                    <p className="text-sm text-muted-foreground">
                        {progress < 30 && "Analyzing destination..."}
                        {progress >= 30 && progress < 60 && "Planning activities..."}
                        {progress >= 60 && progress < 90 && "Crafting descriptions..."}
                        {progress >= 90 && "Finalizing itinerary..."}
                    </p>
                </div>
                <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </CardContent>
        </Card>
    );

    const renderStep3 = () => {
        if (!generatedData) return null;

        const entityLabel = mode === "tourPackageQuery" ? "Query" : "Package";

        return (
            <div className="space-y-6">
                {/* Header Card */}
                <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl">{generatedData.tourPackageName}</CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline">{generatedData.numDaysNight}</Badge>
                                    <Badge variant="outline">{generatedData.tourPackageType}</Badge>
                                    <Badge variant="outline">{generatedData.transport}</Badge>
                                </CardDescription>
                            </div>
                            {tokenUsage && (
                                <Badge variant="secondary" className="text-xs">
                                    {tokenUsage.promptTokens + tokenUsage.completionTokens} tokens
                                </Badge>
                            )}
                        </div>
                    </CardHeader>
                    {generatedData.highlights && (
                        <CardContent>
                            <h4 className="font-medium mb-2">Highlights</h4>
                            <div className="flex flex-wrap gap-2">
                                {generatedData.highlights.map((h, i) => (
                                    <Badge key={i} variant="secondary">{h}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>

                {/* Itinerary Preview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" /> Itinerary Preview
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6">
                                {generatedData.itineraries.map((day, index) => (
                                    <div key={index} className="relative pl-6 pb-6 border-l-2 border-primary/20 last:pb-0">
                                        <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">
                                            {day.dayNumber}
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="font-semibold text-lg">Day {day.dayNumber}: {day.itineraryTitle}</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {day.itineraryDescription}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">{day.mealsIncluded}</Badge>
                                                <Badge variant="outline" className="text-xs">🏨 {day.suggestedHotel}</Badge>
                                            </div>
                                            {day.activities.length > 0 && (
                                                <div className="mt-3 space-y-3">
                                                    <p className="text-xs font-medium text-muted-foreground">ACTIVITIES</p>
                                                    {day.activities.map((act, i) => (
                                                        <div key={i} className="p-3 border rounded-lg bg-card shadow-sm">
                                                            <h5 className="text-sm font-medium text-foreground mb-2">Activity {i + 1}</h5>
                                                            <div className="space-y-1">
                                                                <div className="text-sm"><strong>{act.activityTitle}</strong></div>
                                                                <div className="text-sm text-muted-foreground">{act.activityDescription}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Budget Estimate */}
                {generatedData.estimatedBudget && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Estimated Budget</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-bold">{generatedData.estimatedBudget.total}</p>
                                    <p className="text-sm text-muted-foreground">{generatedData.estimatedBudget.perPerson} per person</p>
                                </div>
                                <p className="text-sm text-muted-foreground max-w-xs">{generatedData.estimatedBudget.note}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Refinement Section */}
                <Card className="border-2 border-primary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" /> Modify Itinerary with AI
                        </CardTitle>
                        <CardDescription>
                            Want to change something? Just ask Aagam AI to tweak the itinerary.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            placeholder="e.g., 'Change the hotel in Jaipur to something more heritage', 'Add a visit to Hawa Mahal on Day 2', 'Make the whole trip more relaxed'..."
                            value={refinementInput}
                            onChange={(e) => setRefinementInput(e.target.value)}
                            className="min-h-[80px]"
                        />
                        <Button
                            onClick={handleRefine}
                            disabled={isRefining || !refinementInput.trim()}
                            className="w-full gap-2"
                        >
                            {isRefining ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Updating Itinerary...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" /> Update Itinerary
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <Card className="border-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">What would you like to do?</CardTitle>
                        <CardDescription>
                            {selectedPackage
                                ? `You selected "${selectedPackage.tourPackageName}". You can apply this AI itinerary to it or create a new ${entityLabel.toLowerCase()}.`
                                : `Create a new ${entityLabel.toLowerCase()} from this AI-generated itinerary.`
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Apply to Existing Package Button */}
                        {selectedPackage && (
                            <Button
                                onClick={handleApplyToExisting}
                                className="w-full gap-2"
                                disabled={isRefining}
                                variant="default"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Apply to &quot;{selectedPackage.tourPackageName}&quot;
                            </Button>
                        )}

                        {/* Create New Package Button */}
                        <Button
                            onClick={handleCreateDraft}
                            className="w-full gap-2"
                            disabled={isRefining}
                            variant={selectedPackage ? "outline" : "default"}
                        >
                            <PlusCircle className="h-4 w-4" />
                            Create New {entityLabel}
                        </Button>

                        <Separator />

                        {/* Start Over Button */}
                        <Button variant="ghost" onClick={() => setStep(1)} className="w-full gap-2">
                            <Pencil className="h-4 w-4" /> Start Over
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto">
            {renderStepIndicator()}

            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
        </div>
    );
}
