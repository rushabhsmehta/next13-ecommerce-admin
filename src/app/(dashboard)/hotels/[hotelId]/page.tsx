import prismadb from "@/lib/prismadb";
import { HotelForm } from "./components/hotel-form";
import { Button } from "@/components/ui/button";
import { CalendarRange, CreditCard } from "lucide-react";
import Link from "next/link";

const HotelPage = async (
  props: {
    params: Promise<{ hotelId: string }>
  }
) => {
  const params = await props.params;
  const hotel = await prismadb.hotel.findUnique({
    where: {
      id: params.hotelId
    },
    include: {
      images: true,
    }
  });

  const locations = await prismadb.location.findMany({

  });

  return (
    <>
      <div className="flex-col">
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div />
            <Link href={`/hotels/${params.hotelId}/pricing`}>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" />
                Manage Seasonal Pricing
              </Button>
            </Link>
          </div>
          <HotelForm locations={locations} initialData={hotel} />
        </div>
      </div>
    </>
  );
}

export default HotelPage;
