"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Globe,
  Link,
  AlertCircle,
  RefreshCcw,
  Save,
  ArrowUp,
  ArrowDown,
  Trash,
} from "lucide-react";

import { Heading } from "@/components/ui/heading";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MultiSelect } from "@/components/ui/multi-select";

interface LocationOption {
  id: string;
  label: string;
}

interface RelatedPackageSummary {
  id: string;
  name: string;
  locationId: string;
  isArchived: boolean;
  websiteSortOrder: number;
  sortOrder: number;
}

interface WebsiteTourPackage {
  id: string;
  name: string;
  locationId: string;
  locationLabel: string;
  isFeatured: boolean;
  isArchived: boolean;
  websiteSortOrder: number;
  updatedAt: string;
  relatedPackages: RelatedPackageSummary[];
}

interface WebsiteManagementClientProps {
  locations: LocationOption[];
  packages: WebsiteTourPackage[];
  readOnly?: boolean;
}

interface SortablePackageCardProps {
  pkg: WebsiteTourPackage;
  disabled: boolean;
}

const SortablePackageCard = ({ pkg, disabled }: SortablePackageCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: pkg.id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow ${
        isDragging ? "ring-2 ring-orange-400 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className={`mt-1 flex h-8 w-8 items-center justify-center rounded-md border bg-muted text-muted-foreground ${
              disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing"
            }`}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="font-semibold leading-tight">{pkg.name}</div>
            <div className="text-xs text-muted-foreground">
              Website order: {pkg.websiteSortOrder + 1}
            </div>
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(pkg.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {pkg.isFeatured && <Badge variant="outline">Featured</Badge>}
          {pkg.isArchived && <Badge variant="destructive">Archived</Badge>}
        </div>
      </div>
    </div>
  );
};

const arraysMatch = (first: string[], second: string[]): boolean => {
  if (first.length !== second.length) {
    return false;
  }
  return first.every((value, index) => value === second[index]);
};

export const WebsiteManagementClient = ({
  locations,
  packages,
  readOnly = false,
}: WebsiteManagementClientProps) => {
  const router = useRouter();
  const [packageState, setPackageState] = useState<WebsiteTourPackage[]>(packages);
  const [selectedLocationId, setSelectedLocationId] = useState(() => {
    const firstWithPackages = locations.find((location) =>
      packages.some((pkg) => pkg.locationId === location.id && !pkg.isArchived)
    );
    return firstWithPackages?.id ?? locations[0]?.id ?? "";
  });
  const [selectedPrimaryId, setSelectedPrimaryId] = useState<string>("");
  const [relationDraft, setRelationDraft] = useState<string[]>([]);
  const [relationDirty, setRelationDirty] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [savingRelations, setSavingRelations] = useState(false);

  useEffect(() => {
    if (!locations.some((location) => location.id === selectedLocationId)) {
      setSelectedLocationId(locations[0]?.id ?? "");
    }
  }, [locations, selectedLocationId]);

  const packagesForLocation = useMemo(() => {
    return packageState
      .filter((pkg) => pkg.locationId === selectedLocationId && !pkg.isArchived)
      .sort((a, b) => {
        if (a.websiteSortOrder !== b.websiteSortOrder) {
          return a.websiteSortOrder - b.websiteSortOrder;
        }
        return a.name.localeCompare(b.name);
      });
  }, [packageState, selectedLocationId]);

  useEffect(() => {
    if (packagesForLocation.length === 0) {
      if (selectedPrimaryId !== "") {
        setSelectedPrimaryId("");
      }
      setRelationDirty(false);
      return;
    }

    if (!packagesForLocation.some((pkg) => pkg.id === selectedPrimaryId)) {
      setSelectedPrimaryId(packagesForLocation[0].id);
      setRelationDirty(false);
    }
  }, [packagesForLocation, selectedPrimaryId]);

  useEffect(() => {
    if (!selectedPrimaryId) {
      if (relationDraft.length > 0) {
        setRelationDraft([]);
      }
      setRelationDirty(false);
      return;
    }

    if (relationDirty) {
      return;
    }

    const selectedPackage = packageState.find((pkg) => pkg.id === selectedPrimaryId);
    const savedRelations = selectedPackage?.relatedPackages
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((relation) => relation.id) ?? [];

    if (arraysMatch(savedRelations, relationDraft)) {
      return;
    }

    setRelationDraft(savedRelations);
  }, [selectedPrimaryId, packageState, relationDirty, relationDraft]);

  const sensors = useSensors(useSensor(PointerSensor));

  const selectedPackage = packageState.find((pkg) => pkg.id === selectedPrimaryId) ?? null;
  const savedRelations = selectedPackage?.relatedPackages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((relation) => relation.id) ?? [];
  const hasRelationChanges = !arraysMatch(savedRelations, relationDraft);

  const relationOptions = useMemo(() => {
    return packageState
      .filter((pkg) => pkg.locationId === selectedLocationId && !pkg.isArchived && pkg.id !== selectedPrimaryId)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((pkg) => ({
        value: pkg.id,
        label: pkg.name,
      }));
  }, [packageState, selectedLocationId, selectedPrimaryId]);

  const handleRelationDraftChange = (values: string[]) => {
    setRelationDraft(values);
    setRelationDirty(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (readOnly) {
      return;
    }

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const currentOrder = packagesForLocation.map((pkg) => pkg.id);
    const oldIndex = currentOrder.indexOf(active.id as string);
    const newIndex = currentOrder.indexOf(over.id as string);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reorderedIds = arrayMove(currentOrder, oldIndex, newIndex);
    const previousState = packageState.map((pkg) => ({
      ...pkg,
      relatedPackages: pkg.relatedPackages.map((relation) => ({ ...relation })),
    }));

    setPackageState((prev) =>
      prev.map((pkg) => {
        if (pkg.locationId !== selectedLocationId || pkg.isArchived) {
          return pkg;
        }
        const newPosition = reorderedIds.indexOf(pkg.id);
        if (newPosition === -1) {
          return pkg;
        }
        return {
          ...pkg,
          websiteSortOrder: newPosition,
        };
      })
    );

    try {
      setSavingOrder(true);
      await axios.patch("/api/tourPackages/reorder", {
        locationId: selectedLocationId,
        orderedIds: reorderedIds,
      });
      toast.success("Website ordering updated");
      router.refresh();
    } catch (error) {
      console.error("Failed to update website order", error);
      toast.error("Could not update ordering");
      setPackageState(previousState);
    } finally {
      setSavingOrder(false);
    }
  };

  const handleRelationsSave = async () => {
    if (!selectedPrimaryId) {
      return;
    }

    try {
      setSavingRelations(true);
      const response = await axios.put(`/api/tourPackages/${selectedPrimaryId}/related`, {
        relatedIds: relationDraft,
      });

      const finalIds = Array.isArray(response.data?.relatedIds)
        ? (response.data.relatedIds as string[])
        : relationDraft;

      setRelationDraft(finalIds);

      setPackageState((prev) =>
        prev.map((pkg) => {
          if (pkg.id !== selectedPrimaryId) {
            return pkg;
          }
          return {
            ...pkg,
            relatedPackages: finalIds.map((relatedId, index) => {
              const target = prev.find((candidate) => candidate.id === relatedId);
              return {
                id: relatedId,
                name: target?.name ?? "Related Package",
                locationId: target?.locationId ?? pkg.locationId,
                isArchived: target?.isArchived ?? false,
                websiteSortOrder: target?.websiteSortOrder ?? 0,
                sortOrder: index,
              };
            }),
          };
        })
      );

      toast.success("Related packages saved");
      setRelationDirty(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save related packages", error);
      toast.error("Could not save related packages");
    } finally {
      setSavingRelations(false);
    }
  };

  const handleRelationsReset = () => {
    setRelationDraft(savedRelations);
    setRelationDirty(false);
  };

  const locationHasPackages = packagesForLocation.length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading
          title="Website Management"
          description="Control website ordering and related recommendations for tour packages."
        />
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedLocationId}
            onValueChange={(value) => {
              setSelectedLocationId(value);
              setRelationDirty(false);
            }}
          >
            <SelectTrigger className="min-w-[220px]">
              <SelectValue placeholder="Select a location" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Separator />

      {readOnly && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-900">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You&apos;re viewing this page in read-only mode. Drag-and-drop and save actions are disabled.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-orange-200">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-orange-500" /> Website Ordering
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Drag and drop to control how tour packages appear on the public website.
              </p>
            </div>
            {savingOrder && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <RefreshCcw className="h-3 w-3 animate-spin" /> Saving…
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!locationHasPackages && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No active tour packages found for this location. Activate or create packages to manage ordering.
                </AlertDescription>
              </Alert>
            )}

            {locationHasPackages && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={packagesForLocation} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {packagesForLocation.map((pkg) => (
                      <SortablePackageCard key={pkg.id} pkg={pkg} disabled={readOnly} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Link className="h-5 w-5 text-slate-600" /> Related Tour Packages
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Curate related experiences that appear alongside this package on the website.
              </p>
            </div>
            {savingRelations && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <RefreshCcw className="h-3 w-3 animate-spin" /> Saving…
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {!locationHasPackages && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Add at least one active tour package in this location to configure related suggestions.
                </AlertDescription>
              </Alert>
            )}

            {locationHasPackages && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium">Primary package</span>
                  <Select
                    value={selectedPrimaryId}
                    onValueChange={(value) => {
                      setSelectedPrimaryId(value);
                      setRelationDirty(false);
                    }}
                    disabled={packagesForLocation.length === 0}
                  >
                    <SelectTrigger className="min-w-[260px]">
                      <SelectValue placeholder="Choose a tour package" />
                    </SelectTrigger>
                    <SelectContent>
                      {packagesForLocation.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Related packages</span>
                  <MultiSelect
                    options={relationOptions}
                    selected={relationDraft}
                    onChange={handleRelationDraftChange}
                    disabled={readOnly || !selectedPrimaryId}
                    placeholder="Select related packages"
                  />
                  {relationDraft.length > 0 && (
                    <div className="space-y-2 rounded-md border bg-slate-50 p-3">
                      {relationDraft.map((relatedId, index) => {
                        const related = relationOptions.find((option) => option.value === relatedId);
                        return (
                          <div
                            key={relatedId}
                            className="flex items-center justify-between rounded-md bg-white px-3 py-2 shadow-sm"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium leading-tight">
                                {related?.label ?? "Related package"}
                              </span>
                              <span className="text-xs text-muted-foreground">Display position: {index + 1}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setRelationDraft((prev) => {
                                    const targetIndex = prev.indexOf(relatedId);
                                    if (targetIndex <= 0) {
                                      return prev;
                                    }
                                    const reordered = [...prev];
                                    const [removed] = reordered.splice(targetIndex, 1);
                                    reordered.splice(targetIndex - 1, 0, removed);
                                    setRelationDirty(true);
                                    return reordered;
                                  });
                                }}
                                disabled={readOnly || index === 0}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setRelationDraft((prev) => {
                                    const targetIndex = prev.indexOf(relatedId);
                                    if (targetIndex === -1 || targetIndex === prev.length - 1) {
                                      return prev;
                                    }
                                    const reordered = [...prev];
                                    const [removed] = reordered.splice(targetIndex, 1);
                                    reordered.splice(targetIndex + 1, 0, removed);
                                    setRelationDirty(true);
                                    return reordered;
                                  });
                                }}
                                disabled={readOnly || index === relationDraft.length - 1}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500"
                                onClick={() => {
                                  setRelationDraft((prev) => {
                                    if (!prev.includes(relatedId)) {
                                      return prev;
                                    }
                                    setRelationDirty(true);
                                    return prev.filter((id) => id !== relatedId);
                                  });
                                }}
                                disabled={readOnly}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={handleRelationsSave}
                    disabled={readOnly || !selectedPrimaryId || !hasRelationChanges || savingRelations}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save related packages
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRelationsReset}
                    disabled={readOnly || !hasRelationChanges || savingRelations}
                    className="flex items-center gap-2"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Reset changes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};
