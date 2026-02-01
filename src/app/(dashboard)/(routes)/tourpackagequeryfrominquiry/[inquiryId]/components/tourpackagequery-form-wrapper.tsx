"use client"

import { useState } from "react"
import {
  Activity,
  ActivityMaster,
  AssociatePartner,
  FlightDetails,
  Hotel,
  Images,
  Inquiry,
  Itinerary,
  ItineraryMaster,
  Location,
  MealPlan,
  OccupancyType,
  PackageVariant,
  PricingAttribute,
  PricingComponent,
  RoomType,
  TourPackage,
  TourPackagePricing,
  TourPackageQuery,
  VariantHotelMapping,
  VehicleType,
  LocationSeasonalPeriod,
} from "@prisma/client"

import { Button } from "@/components/ui/button"
import { TourPackageQueryFormClassic } from "./tourpackagequery-form-classic"
import { TourPackageQueryFormWYSIWYG } from "./tourpackagequery-form-wysiwyg"
import { LayoutTemplate, Settings2 } from "lucide-react"

interface TourPackageQueryFormProps {
  inquiry: (Inquiry & {
    images: Images[];
  }) | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
  })[];
  activitiesMaster: (ActivityMaster & {
    activityMasterImages: Images[];
  })[] | null;
  itinerariesMaster: (ItineraryMaster & {
    itineraryMasterImages: Images[];
    activities: (Activity & {
      activityImages: Images[];
    })[] | null;
  })[] | null;
  associatePartners: AssociatePartner[];
  tourPackages: (TourPackage & {
    images: Images[];
    flightDetails: (FlightDetails & {
      images: Images[];
    })[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[] | null;
    })[] | null;
    packageVariants?: (PackageVariant & {
      variantHotelMappings: (VariantHotelMapping & {
        hotel: Hotel & { images: Images[] };
        itinerary: Itinerary | null;
      })[];
      tourPackagePricings: (TourPackagePricing & {
        mealPlan: MealPlan | null;
        vehicleType: VehicleType | null;
        locationSeasonalPeriod: LocationSeasonalPeriod | null;
        pricingComponents: (PricingComponent & {
          pricingAttribute: PricingAttribute | null;
        })[];
      })[];
    })[] | null;
  })[] | null;
  tourPackageQueries?: (TourPackageQuery & {
    images: Images[];
    flightDetails: FlightDetails[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[] | null;
    })[] | null;
  })[] | null;
  roomTypes?: RoomType[];
  occupancyTypes?: OccupancyType[];
  mealPlans?: MealPlan[];
  vehicleTypes?: VehicleType[];
}

export const TourPackageQueryFormWrapper: React.FC<TourPackageQueryFormProps> = (props) => {
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
        <TourPackageQueryFormClassic {...props} />
      ) : (
        <TourPackageQueryFormWYSIWYG {...props} />
      )}
    </div>
  );
}
