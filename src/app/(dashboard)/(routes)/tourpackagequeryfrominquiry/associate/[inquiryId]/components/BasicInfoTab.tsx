// filepath: d:\next13-ecommerce-admin\src\components\tour-package-query\BasicInfoTab.tsx
import { useState, useRef } from "react";
import { Control } from "react-hook-form";
import { FileText, ChevronDown, CheckIcon } from "lucide-react";
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
import { DISCLAIMER_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT } from "./defaultValues";

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
  enableTourPackageSelection = true
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
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                        "w-full justify-between",
                        !field.value && "text-muted-foreground",
                        getFieldDisabled(enableTourPackageSelection) && "opacity-50",
                        enableTourPackageSelection && isAssociatePartner && "border-green-200 bg-green-50"
                      )}
                      disabled={getFieldDisabled(enableTourPackageSelection) || !form.getValues('locationId')}
                    >
                      {!form.getValues('locationId')
                        ? "Select a location first"
                        : field.value && tourPackages?.find(tp => tp.id === field.value)
                          ? tourPackages.find(tp => tp.id === field.value)?.tourPackageName
                          : "Select Tour Package Template"
                      }
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
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
                            {tourPackage.tourPackageName}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>              <FormDescription>
                {!form.getValues('locationId')
                  ? "Please select a location first to view available tour packages"
                  : "Select an existing tour package to use as a template"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-3 gap-8">{" "}
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
                          "w-full justify-between",
                          !field.value && "text-muted-foreground",
                          getFieldDisabled(false) && "opacity-50"
                        )}
                        disabled={getFieldDisabled(false)}
                      >
                        {field.value
                          ? associatePartners.find((partner) => partner.id === field.value)?.name
                          : "Select Associate Partner..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
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
                            {partner.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Associate partner details will be automatically linked to this query
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <div className="text-sm">
              {form.watch("associatePartnerId") ? (
                <>
                  <div className="flex flex-col space-y-1">
                    <p className="text-muted-foreground">
                      Mobile: {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.mobileNumber}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground italic">
                  Select an associate partner to view contact details
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              {form.watch("associatePartnerId") ? (
                <>
                  <div className="flex flex-col space-y-1">
                    <p className="text-muted-foreground">
                      Email: {associatePartners.find((partner) => partner.id === form.watch("associatePartnerId"))?.email || 'Not provided'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground italic">
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
                  // @ts-ignore
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className={isAssociatePartner ? "text-muted-foreground" : ""}>
                  Confirmed
                  {isAssociatePartner && <span className="text-xs ml-2">(Read-only)</span>}
                </FormLabel>
                <FormDescription>
                  Please Select Whether Query is confirmed or not ?
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
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
                    className={cn(getFieldDisabled(false) && "opacity-50")}
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
              <FormItem>
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
                    <SelectTrigger className={cn(getFieldDisabled(false) && "opacity-50")}>
                      {field.value || 'Select Tour Package Query Type'}
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
                    className={cn(getFieldDisabled(false) && "opacity-50")}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
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
                    className={cn(getFieldDisabled(false) && "opacity-50")}
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
                    className={cn(getFieldDisabled(false) && "opacity-50")}
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
                    className={cn(getFieldDisabled(false) && "opacity-50")}
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
                  className={cn(getFieldDisabled(false) && "opacity-50")}
                  {...field}
                />
              </FormControl>
              <FormDescription>
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
                <JoditEditor
                  ref={editor}
                  value={field.value || DISCLAIMER_DEFAULT}
                  config={{
                    readonly: getFieldDisabled(false),
                  }}
                  onChange={(e) => field.onChange(e)}
                />
              </FormControl>
              <FormDescription>
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
