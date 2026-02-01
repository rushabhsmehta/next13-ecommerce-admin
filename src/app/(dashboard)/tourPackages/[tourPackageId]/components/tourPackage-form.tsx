"use client"

import { useState } from "react"
import {
  Activity,
  Images,
  ItineraryMaster,
  RoomType,
  OccupancyType,
  MealPlan,
  VehicleType,
  Location,
  Hotel,
  TourPackage,
  Itinerary,
  FlightDetails,
  ActivityMaster,
  PackageVariant as PrismaPackageVariant,
  TourPackagePricing,
  PricingComponent,
  PricingAttribute,
  LocationSeasonalPeriod,
} from "@prisma/client"

import { Button } from "@/components/ui/button"
import { TourPackageFormClassic } from "./tourPackage-form-classic"
import { TourPackageFormWYSIWYG } from "./tourPackage-form_wysiwyg"
import { AlertCircle, LayoutTemplate, Settings2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface TourPackageSummaryItinerary {
  id: string;
  dayNumber: number | null;
  hotelId: string | null;
}

interface TourPackageSummary {
  id: string;
  tourPackageName: string | null;
  numDaysNight: string | null;
  itineraries: TourPackageSummaryItinerary[];
}

type TourPackageVariantWithRelations = PrismaPackageVariant & {
  variantHotelMappings: Array<{
    id: string;
    itineraryId: string;
    hotelId: string;
    itinerary: Itinerary;
    hotel: (Hotel & { images: Images[] }) | null;
  }>;
  tourPackagePricings: Array<
    TourPackagePricing & {
      mealPlan: MealPlan | null;
      vehicleType: VehicleType | null;
      locationSeasonalPeriod: LocationSeasonalPeriod | null;
      pricingComponents: Array<
        PricingComponent & {
          pricingAttribute: PricingAttribute | null;
        }
      >;
    }
  >;
};

interface TourPackageFormProps {
  initialData: (TourPackage & {
    images: Images[];
    itineraries: Itinerary[];
    flightDetails: FlightDetails[];
    packageVariants: TourPackageVariantWithRelations[];
  }) | null;
  locations: Location[];
  hotels: (Hotel & { images: Images[] })[];
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;

  })[] | null;
  availableTourPackages: TourPackageSummary[];
  readOnly?: boolean;
};

export const TourPackageForm: React.FC<TourPackageFormProps> = (props) => {
  const [mode, setMode] = useState<'classic' | 'wysiwyg'>('wysiwyg');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
         <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-gray-500" />
            <h2 className="text-sm font-medium text-gray-700">Editor Mode</h2>
         </div>
         <div className="flex items-center gap-2">
            <Button 
                variant={mode === 'classic' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                    if (confirm("Switching editors may lose unsaved changes. Continue?")) {
                        setMode('classic');
                    }
                }}
                className="gap-2"
            >
                Classic Form
            </Button>
            <Button 
                variant={mode === 'wysiwyg' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                    if (confirm("Switching editors may lose unsaved changes. Continue?")) {
                        setMode('wysiwyg');
                    }
                }}
                className="gap-2"
            >
                <LayoutTemplate className="h-4 w-4" />
                PDF Preview Mode
            </Button>
         </div>
      </div>

      {mode === 'classic' ? (
        <TourPackageFormClassic {...props} />
      ) : (
        <TourPackageFormWYSIWYG {...props} />
      )}
    </div>
  );
}
