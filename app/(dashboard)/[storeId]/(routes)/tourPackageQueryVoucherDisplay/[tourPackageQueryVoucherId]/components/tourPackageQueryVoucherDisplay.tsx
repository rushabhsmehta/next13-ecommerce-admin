'use client'
import Image from 'next/image';
import Link from 'next/link';
import { PlaneTakeoffIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity } from "@prisma/client";
import { useSearchParams } from 'next/navigation';
import { table } from 'console';

interface TourPackageQueryVoucherDisplayProps {
  initialData: TourPackageQuery & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[];
    })[];
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[];
  hotels: (Hotel & {
    images: Images[];
  })[];
  selectedOption?: string; // Add this line to accept the selected option

};

// Define a type for the company information
type CompanyInfo = {
  [key: string]: {
    logo: string;
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
};

// Define the company data using the CompanyInfo type
const companyInfo: CompanyInfo = {
  Empty: { logo: '', name: '', address: '', phone: '', email: '', website: '' },
  AH: {
    logo: '/aagamholidays.png',
    name: 'Aagam Holidays',
    address: '1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com', // Add the missing fields
    website: 'https://aagamholidays.com',
  },
  // Define KH and MT with their respective details
  KH: {
    logo: '/kobawala.png',
    name: 'Kobawala Holidays',
    address: 'Kobawala Holidays, Gandhinagar',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com', // Add the missing fields
    website: 'https://kobawala.com',
  },
  MT: {
    logo: '/mahavirtravels.png',
    name: 'Mahavir Tour and Travels',
    address: 'Mahavir Travels, Ahmedabad',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com', // Add the missing fields
    website: 'https://mahavirtravels.com',
  },
};



export const TourPackageQueryVoucherDisplay: React.FC<TourPackageQueryVoucherDisplayProps> = ({
  initialData,
  locations,
  hotels,
}) => {

  const searchParams = useSearchParams();
  const selectedOption = searchParams.get('search') || 'Empty'; // 'option' is the name of your query parameter

  // Now you can use selectedOption to get data from your companyInfo object
  const currentCompany = companyInfo[selectedOption] ?? companyInfo['Empty'];


  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">
      {/* Tour Images */}
      <Card>
        <CardHeader className="text-center text-2xl font-bold">Booking Voucher</CardHeader>
      </Card>

      {selectedOption !== 'Empty' && (

        <Card className="border-b">
          <CardDescription className="flex justify-between items-center px-4">
            <div className="inline-block relative w-48 h-48">
              <Image src={currentCompany.logo} alt={`${currentCompany.name} Logo`} fill className="object-contain" />
            </div>
            <ul>
              <li>{currentCompany.address}</li>
              <li>Phone: {currentCompany.phone}</li>
              <li>Email: <Link href={`mailto:${currentCompany.email}`} className="text-blue-600 underline">{currentCompany.email}</Link></li>
              <li>Website: <Link href={currentCompany.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{currentCompany.website}</Link></li>

            </ul>
          </CardDescription>
        </Card >
      )}

      <Card className="break-inside-avoid">
        <CardHeader>

          <CardTitle>{initialData.tourPackageQueryName}</CardTitle>
          <CardDescription>
            Customer: {initialData.customerName} | Confirmed By: {initialData.assignedTo} | {initialData.assignedToMobileNumber}
          </CardDescription>
          <CardDescription>
            Voucher Number : {initialData.id.slice(-12)}
          </CardDescription>
        </CardHeader>

        {/*  <CardContent className="grid gap-4 md:grid-cols-1 justify-center items-center">
          {initialData.images.map((image, index) => (
            <div key={index} className="flex justify-center items-center">
              <Image
                src={image.url}
                alt={`Tour Image ${index + 1}`}
                width={800}
                height={300}
                className="rounded-lg object-cover"
                style={{ maxWidth: '100%', height: 'auto' }} // Ensures images are responsive and maintain aspect ratio
              />
            </div>
          ))}
        </CardContent> */}
      </Card>

      {/* Tour Package Details */}
      <Card className="break-inside-avoid">
        <CardHeader>

        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-bold">Location : {locations.find(location => location.id === initialData.locationId)?.label}</div>
            </div>
            <div>
              <div className="font-semibold">Duration : {initialData.numDaysNight}</div>
            </div>
            <div>
              <div className="font-semibold">Period : {initialData.period}</div>
            </div>
            <div>
              <div className="font-semibold">Transport  : {initialData.transport}</div>
            </div>
            <div>
              <div className="font-semibold">Adults : {initialData.numAdults}</div>
            </div>
            <div>
              <div className="font-semibold">Children (5 - 12 Years) : {initialData.numChild5to12}</div>
            </div>
            <div>
              <div className="font-semibold">Children (0 - 5 Years) : {initialData.numChild0to5}</div>
            </div>
            {/*  <div>
              <div className="font-semibold">Price : {initialData.price}</div>
            </div> */}
            <div>
              <div className="font-semibold">Price per Adult : {initialData.pricePerAdult}</div>
            </div>
            <div>
              <div className="font-semibold">Price per Child/Extra Bed : {initialData.pricePerChildOrExtraBed}</div>
            </div>
            <div>
              <div className="font-semibold">Price per Child (5-12 Years - No bed) : {initialData.pricePerChild5to12YearsNoBed}</div>
            </div>
            <div>
              <div className="font-semibold">Price per Child with Seat (Below 5 Years) : {initialData.pricePerChildwithSeatBelow5Years}</div>
            </div>
            <div>
              <div className="font-semibold">Total Price : {initialData.totalPrice}</div>
            </div>
          </div>
        </CardContent>

      </Card>

      {/* Flight Details */}
      {initialData.flightDetails.length > 0 && (

        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle>Flight Details</CardTitle>
          </CardHeader>
          {initialData.flightDetails.map((flight, index) => (
            <CardContent key={index} className="flex flex-col rounded-lg shadow-lg p-4 my-4">
              <div className="flex items-center justify-between border-b pb-2 mb-2">
                <span className="font-semibold text-sm">{flight.date}</span>
                <div>
                  <span className="font-semibold text-xs">{flight.flightName}</span> |
                  <span className="text-xs ml-1">{flight.flightNumber}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="font-bold text-xs">{flight.from}</div>
                  <div className="text-xs ml-2">{flight.departureTime}</div>
                </div>
                <div className="mx-2 text-center">
                  <span> <PlaneTakeoffIcon /> </span>
                  <div className="text-xs">{flight.flightDuration}</div>
                  <hr className="border-t-2 border-black mx-1" />
                </div>
                <div className="flex items-center">
                  <div className="font-bold text-xs">{flight.to}</div>
                  <div className="text-sm ml-2">{flight.arrivalTime}</div>
                </div>
              </div>
            </CardContent>
          ))}
        </Card>
      )}



      {/* Itineraries and Hotel Details */}
      {initialData.itineraries && initialData.itineraries.length > 0 && (
        <Card className="mb-4 break-inside-avoid">
          <CardHeader>
            <CardTitle>Accommodation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day/Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hotel Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Room Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meal Plan
                    </th>
                    {/* Add more headers if needed */}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {initialData.itineraries.map((itinerary, idx) => {
                    const hotelDetails = hotels.find(hotel => hotel.id === itinerary.hotelId);
                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {itinerary.days ? itinerary.days : itinerary.dayNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {hotelDetails?.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {itinerary.roomCategory}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {itinerary.mealsIncluded}
                        </td>
                        {/* Add more cells if needed */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}





      {/* Payment Policy Card */}
      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Payment Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap">{initialData.paymentPolicy}</pre>
        </CardContent>
      </Card>



      {/* Cancellation Policy Card */}
      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Cancellation Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap">{initialData.cancellationPolicy}</pre>
        </CardContent>
      </Card>

      {/* Airline Cancellation Policy Card */}
      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Airline Cancellation Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap">{initialData.airlineCancellationPolicy}</pre>
        </CardContent>
      </Card>
    </div>
  );
};
