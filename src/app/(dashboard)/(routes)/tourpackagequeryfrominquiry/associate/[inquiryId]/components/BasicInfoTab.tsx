// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\BasicInfoTab.tsx
import { useState, useRef } from "react";
import { Control } from "react-hook-form";
import { FileText, ChevronDown, CheckIcon, BedIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import JoditEditor from "jodit-react";
import { AssociatePartner, TourPackage, TourPackageQuery } from "@prisma/client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import ImageUpload from "@/components/ui/image-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TourPackageQueryFormValues } from "./tourPackageQuery-form";
import { DISCLAIMER_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT, TOUR_CATEGORY_DEFAULT } from "./defaultValues";

interface BasicInfoProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  associatePartners: AssociatePartner[];
  tourPackages: TourPackage[] | null;
  openTemplate: boolean;
  setOpenTemplate: (open: boolean) => void;
  handleTourPackageSelection: (id: string) => void;
  form: any; // Use a more specific type if available
  // Add props for associate partner restrictions
  isAssociatePartner?: boolean;
  enableTourPackageSelection?: boolean;
  // Add inquiry prop for room allocation information
  inquiry?: any;
  applyInquiryRoomAllocationsToAllDays?: () => void;
}

const BasicInfoTab: React.FC<BasicInfoProps> = ({
  control,
  loading,
  associatePartners,
  tourPackages,
  openTemplate,
  setOpenTemplate,
  handleTourPackageSelection,
  form,
  isAssociatePartner = false,
  enableTourPackageSelection = true,
  inquiry,
  applyInquiryRoomAllocationsToAllDays
}) => {
  const editor = useRef(null);

  // For associate partners, disable all fields except tour package selection
  const getFieldDisabled = (fieldEnabled: boolean = true) => {
    if (isAssociatePartner) {
      return loading || !fieldEnabled;
    }
    return loading;
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg md:text-xl">Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="tourPackageTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={!enableTourPackageSelection && isAssociatePartner ? "text-muted-foreground" : ""}>
                Load from Tour Package
                {enableTourPackageSelection && isAssociatePartner && <span className="text-xs ml-2 text-green-600">(Editable)</span>}
                {!enableTourPackageSelection && isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
              </FormLabel>
              <Popover open={openTemplate} onOpenChange={setOpenTemplate}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between min-h-[44px] text-left",
                        !field.value && "text-muted-foreground",
                        getFieldDisabled(enableTourPackageSelection) && "opacity-50",
                        enableTourPackageSelection && isAssociatePartner && "border-green-200 bg-green-50"
                      )}
                      disabled={getFieldDisabled(enableTourPackageSelection) || !form.getValues('locationId')}
                    >
                      <span className="truncate">
                        {!form.getValues('locationId')
                          ? "Select a location first"
                          : field.value && tourPackages?.find(tp => tp.id === field.value)
                            ? tourPackages.find(tp => tp.id === field.value)?.tourPackageName
                            : "Select Tour Package Template"
                        }
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] md:w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search tour package..." />
                    <CommandEmpty>No tour package found.</CommandEmpty>
                    <CommandGroup>
                      {tourPackages
                        ?.filter(tp => tp.locationId === form.getValues('locationId'))
                        .map((tourPackage) => (
                          <CommandItem
                            value={tourPackage.tourPackageName ?? ''}
                            key={tourPackage.id}
                            onSelect={() => {
                              handleTourPackageSelection(tourPackage.id);
                              setOpenTemplate(false); // Close the popover after selection
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                tourPackage.id === field.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{tourPackage.tourPackageName}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>              <FormDescription className="text-xs md:text-sm">
                {!form.getValues('locationId')
                  ? "Please select a location first to view available tour packages"
                  : "Select an existing tour package to use as a template"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Inquiry Room Allocation Summary */}
        {inquiry?.roomAllocations && inquiry.roomAllocations.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BedIcon className="h-4 w-4 text-blue-600" />
                Inquiry Room Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-2">This inquiry has {inquiry.roomAllocations.length} room allocation(s):</p>
                <div className="space-y-1">
                  {inquiry.roomAllocations.map((allocation: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 text-xs bg-white rounded px-2 py-1">
                      <span>•</span>
                      <span>{allocation.roomType?.name || 'Custom Room'}</span>
                      <span>({allocation.occupancyType?.name || 'Unknown Occupancy'})</span>
                      <span>x{allocation.quantity || 1}</span>
                      {allocation.mealPlan && <span>+ {allocation.mealPlan.name}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <p className="text-xs text-blue-600 flex-1">
                  ✓ Room allocations are automatically applied when you select a tour package template.
                </p>
                {applyInquiryRoomAllocationsToAllDays && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    onClick={applyInquiryRoomAllocationsToAllDays}
                  >
                    Apply to All Days
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Mobile-friendly responsive grid for Associate Partner section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          <FormField
            control={control}
            name="associatePartnerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Associate Partner
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between min-h-[44px] text-left",
                          !field.value && "text-muted-foreground",
                          getFieldDisabled(false) && "opacity-50"
                        )}
                        disabled={getFieldDisabled(false)}
                      >
                        <span className="truncate">
                          {field.value
                            ? associatePartners.find((partner) => partner.id === field.value)?.name
                            : "Select Associate Partner..."}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-2rem)] md:w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search associate partner..." />
                      <CommandEmpty>No associate partner found.</CommandEmpty>
                      <CommandGroup>
                        {associatePartners.map((partner) => (
                          <CommandItem
                            value={partner.name}
                            key={partner.id}
                            onSelect={() => {
                              form.setValue("associatePartnerId", partner.id);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                partner.id === field.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{partner.name}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription className="text-xs md:text-sm">
                  Associate partner details will be automatically linked to this query
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Mobile-friendly contact details */}
          <div className="space-y-2">
            <div className="text-sm">
              <p className="text-muted-foreground font-medium mb-1">Mobile Number</p>
              {form.watch("associatePartnerId") ? (
                <p className="text-sm bg-muted p-2 rounded">
                  {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.mobileNumber || 'Not provided'}
                </p>
              ) : (
                <p className="text-muted-foreground italic text-sm">
                  Select an associate partner to view mobile number
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <p className="text-muted-foreground font-medium mb-1">Email Address</p>
              {form.watch("associatePartnerId") ? (
                <p className="text-sm bg-muted p-2 rounded break-all">
                  {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.email || 'Not provided'}
                </p>
              ) : (
                <p className="text-muted-foreground italic text-sm">
                  Select an associate partner to view email
                </p>
              )}
            </div>
          </div>
        </div>

        <FormField
          control={control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                Images
                {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
              </FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value.map((image) => image.url)}
                  disabled={getFieldDisabled(false)}
                  onChange={(url) => field.onChange([...field.value, { url }])}
                  onRemove={(url) => field.onChange([...field.value.filter((current) => current.url !== url)])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="isFeatured"
          render={({ field }) => (
            <FormItem className={cn(
              "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4",
              getFieldDisabled(false) && "opacity-50"
            )}>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  disabled={getFieldDisabled(false)}
                  className="mt-1"
                  // @ts-ignore
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none flex-1">
                <FormLabel className={cn(
                  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
                  isAssociatePartner ? "text-muted-foreground" : ""
                )}>
                  Confirmed
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormDescription className="text-xs md:text-sm">
                  Please Select Whether Query is confirmed or not?
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {/* Mobile-friendly responsive grid for form inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <FormField
            control={control}
            name="tourPackageQueryNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Tour Package Query Number
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    disabled={getFieldDisabled(false)}
                    placeholder="Tour Package Query Number"
                    value={field.value}
                    onChange={field.onChange}
                    className={cn(
                      "min-h-[44px]",
                      getFieldDisabled(false) && "opacity-50"
                    )}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="tourPackageQueryName"
            render={({ field }) => (
              <FormItem className="md:col-span-2 lg:col-span-1">
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Tour Package Query Name<span className="text-red-500">*</span>
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    disabled={getFieldDisabled(false)}
                    placeholder="Tour Package Query Name"
                    value={field.value}
                    onChange={field.onChange}
                    className={cn(
                      "min-h-[44px]",
                      form.formState.errors.tourPackageQueryName ? "border-red-500" : "",
                      getFieldDisabled(false) && "opacity-50"
                    )}
                  />
                </FormControl>
                <FormMessage>
                  {form.formState.errors.tourPackageQueryName?.message}
                </FormMessage>
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="tourPackageQueryType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Tour Package Query Type
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Select
                    disabled={getFieldDisabled(false)}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className={cn(
                      "min-h-[44px]",
                      getFieldDisabled(false) && "opacity-50"
                    )}>
                      <SelectValue placeholder="Select Tour Package Query Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOUR_PACKAGE_QUERY_TYPE_DEFAULT.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="tourCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Tour Category
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Select
                    disabled={getFieldDisabled(false)}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className={cn(
                      "min-h-[44px]",
                      getFieldDisabled(false) && "opacity-50"
                    )}>
                      <SelectValue placeholder="Select Tour Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOUR_CATEGORY_DEFAULT.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="numDaysNight"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Number of Days/Night
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    disabled={getFieldDisabled(false)} 
                    placeholder="Number of Days/Night" 
                    className={cn(
                      "min-h-[44px]",
                      getFieldDisabled(false) && "opacity-50"
                    )}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Mobile-friendly responsive grid for transport details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <FormField
            control={control}
            name="transport"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Transport
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    disabled={getFieldDisabled(false)} 
                    placeholder="Transport" 
                    className={cn(
                      "min-h-[44px]",
                      getFieldDisabled(false) && "opacity-50"
                    )}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="pickup_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Pickup Location
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    disabled={getFieldDisabled(false)} 
                    placeholder="Pickup Location" 
                    className={cn(
                      "min-h-[44px]",
                      getFieldDisabled(false) && "opacity-50"
                    )}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="drop_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Drop Location
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormControl>
                  <Input 
                    disabled={getFieldDisabled(false)} 
                    placeholder="Drop Location" 
                    className={cn(
                      "min-h-[44px]",
                      getFieldDisabled(false) && "opacity-50"
                    )}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                Remarks
                {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
              </FormLabel>
              <FormControl>
                <Input
                  disabled={getFieldDisabled(false)}
                  placeholder="Additional remarks for the tour package"
                  className={cn(
                    "min-h-[44px]",
                    getFieldDisabled(false) && "opacity-50"
                  )}
                  {...field}
                />
              </FormControl>
              <FormDescription className="text-xs md:text-sm">
                Add any special notes or requirements for this tour package
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="disclaimer"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                Disclaimer
                {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
              </FormLabel>
              <FormControl>
                <div className={cn(
                  "border rounded-md",
                  getFieldDisabled(false) && "opacity-50 bg-muted"
                )}>
                  <JoditEditor
                    ref={editor}
                    value={field.value || DISCLAIMER_DEFAULT}
                    config={{
                      readonly: getFieldDisabled(false),
                      height: 200,
                      toolbar: !getFieldDisabled(false),
                    }}
                    onChange={(e) => field.onChange(e)}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs md:text-sm">
                Legal disclaimers and important information for the client
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />        {/* Tour Package Query Template Selection has been moved up in the form, right after Load from Tour Package */}
      </CardContent>
    </Card>
  );
};

export default BasicInfoTab;
