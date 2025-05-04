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
import { TourPackageQueryFormValues } from "@/app/(dashboard)/tourPackageQuery/[tourPackageQueryId]/components/tourPackageQuery-form"; // Adjust path if needed
import { DISCLAIMER_DEFAULT, TOUR_PACKAGE_QUERY_TYPE_DEFAULT } from "./defaultValues";

interface BasicInfoProps {
  control: Control<TourPackageQueryFormValues>;
  loading: boolean;
  associatePartners: AssociatePartner[];
  tourPackages: TourPackage[] | null;
  tourPackageQueries: TourPackageQuery[] | null;
  openTemplate: boolean;
  setOpenTemplate: (open: boolean) => void;
  openQueryTemplate: boolean;
  setOpenQueryTemplate: (open: boolean) => void;
  handleTourPackageSelection: (id: string) => void;
  handleTourPackageQuerySelection: (id: string) => void;
  form: any; // Use a more specific type if available
}

const BasicInfoTab: React.FC<BasicInfoProps> = ({
  control,
  loading,
  associatePartners,
  tourPackages,
  tourPackageQueries,
  openTemplate,
  setOpenTemplate,
  openQueryTemplate,
  setOpenQueryTemplate,
  handleTourPackageSelection,
  handleTourPackageQuerySelection,
  form
}) => {
  const editor = useRef(null);

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
              <FormLabel>Load from Tour Package</FormLabel>
              <Popover open={openTemplate} onOpenChange={setOpenTemplate}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={!form.getValues('locationId')}                    >
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

        <FormField
          control={control}
          name="tourPackageQueryTemplate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Load from Tour Package Query</FormLabel>
              <Popover open={openQueryTemplate} onOpenChange={setOpenQueryTemplate}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {tourPackageQueries?.find((query) => query.id === field.value)?.tourPackageQueryName || "Select Tour Package Query Template"}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command>
                    <CommandInput placeholder="Search tour package query..." />
                    <CommandEmpty>No tour package query found.</CommandEmpty>
                    <CommandGroup>
                      {tourPackageQueries
                        ?.filter(tpq => tpq.id !== form.getValues('id')) // Filter out the current query to avoid self-reference
                        ?.filter(tpq => !form.getValues('locationId') || tpq.locationId === form.getValues('locationId')) // Filter by selected locationId
                        .map((query) => (
                          <CommandItem
                            key={query.id}
                            value={query.tourPackageQueryName ?? ''}
                            onSelect={() => {
                              handleTourPackageQuerySelection(query.id);
                              setOpenQueryTemplate(false);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "mr-2 h-4 w-4",
                                query.id === field.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {query.tourPackageQueryName}
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Load initial data from an existing tour package query template
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-3 gap-8">
          <FormField
            control={control}
            name="associatePartnerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Associate Partner</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
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
              <FormLabel>Images</FormLabel>
              <FormControl>
                <ImageUpload
                  value={field.value.map((image) => image.url)}
                  disabled={loading}
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
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  // @ts-ignore
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Confirmed
                </FormLabel>
                <FormDescription>
                  Please Select Whether Query is confirmed or not ?
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-8">
          <FormField
            control={control}
            name="tourPackageQueryNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tour Package Query Number</FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    placeholder="Tour Package Query Number"
                    value={field.value}
                    onChange={field.onChange}
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
                <FormLabel>Tour Package Query Name<span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <Input
                    disabled={loading}
                    placeholder="Tour Package Query Name"
                    value={field.value}
                    onChange={field.onChange}
                    className={form.formState.errors.tourPackageQueryName ? "border-red-500" : ""}
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
                <FormLabel>Tour Package Query Type</FormLabel>
                <FormControl>
                  <Select
                    disabled={loading}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
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
                <FormLabel>Number of Days/Night</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Number of Days/Night" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-3 gap-8">
          <FormField
            control={control}
            name="transport"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transport</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Transport" {...field} />
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
                <FormLabel>Pickup Location</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Pickup Location" {...field} />
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
                <FormLabel>Drop Location</FormLabel>
                <FormControl>
                  <Input disabled={loading} placeholder="Drop Location" {...field} />
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
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Input
                  disabled={loading}
                  placeholder="Additional remarks for the tour package"
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
              <FormLabel>Disclaimer</FormLabel>
              <FormControl>
                <JoditEditor
                  ref={editor}
                  value={field.value || DISCLAIMER_DEFAULT}
                  config={{
                    readonly: loading,
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
