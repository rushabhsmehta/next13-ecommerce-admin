'use client'
import Image from 'next/image';
import Link from 'next/link';
import { PlaneTakeoffIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Location, Images, Hotel, TourPackageQuery, Itinerary, FlightDetails, Activity } from "@prisma/client";
import { useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns';
import { Separator } from '@radix-ui/react-separator';

interface TourPackageQueryDisplayProps {
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
    address: 'Kobawala holidays, 25 Sarthak Shri Ganesh, K-Raheja road, Koba, Gandhinagar-382007',
    phone: '+91-99040 35277',
    email: 'kobawala.holiday@gmail.com', // Add the missing fields
    website: 'http://kobawalaholidays.com'
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

// ...rest of your component


export const TourPackageQueryDisplay: React.FC<TourPackageQueryDisplayProps> = ({
  initialData,
  locations,
  hotels,
  // selectedOption = 'Empty', // Provide a default value
}) => {

  const searchParams = useSearchParams();
  const selectedOption = searchParams.get('search') || 'Empty'; // 'option' is the name of your query parameter

  // Now you can use selectedOption to get data from your companyInfo object
  const currentCompany = companyInfo[selectedOption] ?? companyInfo['Empty'];

  if (!initialData) return <div>No data available</div>;

  return (
    <div className="flex flex-col space-y-2 md:space-y-4 px-4 sm:px-2 md:px-8 lg:px-40">

      <Card className="break-inside-avoid font-bold">
        <CardHeader>
          <CardTitle className="text-2xl">{initialData.tourPackageQueryName}</CardTitle>
          <CardDescription>{initialData.tourPackageQueryNumber}</CardDescription>

          {selectedOption !== 'SupplierA' && selectedOption !== "SupplierB" && (
            <CardDescription>
              Customer: {initialData.customerName} | {initialData.customerNumber} |
              Assigned To: {initialData.assignedTo} | {initialData.assignedToMobileNumber} | {initialData.assignedToEmail}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-1 justify-center items-center">
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
        </CardContent>
      </Card>

      {/* Tour Package Details */}
      <Card className="break-inside-avoid">
        <CardHeader>

        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-1">
            <div>
              <div className="font-semibold text-2xl">Location : {locations.find(location => location.id === initialData.locationId)?.label}</div>
            </div>
            <div>
              {initialData.numDaysNight !== '' && (
                <div className="font-semibold text-2xl">Duration : {initialData.numDaysNight}</div>
              )}
            </div>

            <div className="flex">
              {initialData.tourStartsFrom && (
                <div className="font-semibold text-2xl">Period : {format(initialData.tourStartsFrom, 'dd-MM-yyyy')}</div>
              )}
              {initialData.tourEndsOn && (
                <div className="font-semibold text-2xl ml-2">To {format(initialData.tourEndsOn, 'dd-MM-yyyy')}</div>
              )}
            </div>

            <div>
              {initialData.transport !== '' && (
                <div className="font-semibold text-2xl">Transport  : {initialData.transport}</div>
              )}
            </div>
            <div>
              {initialData.pickup_location !== '' && (
                <div className="font-semibold text-2xl">Pickup  : {initialData.pickup_location}</div>
              )}
            </div>
            <div>
              {initialData.drop_location !== '' && (
                <div className="font-semibold text-2xl">Drop  : {initialData.drop_location}</div>
              )}
            </div>
            <div>
              {initialData.numAdults !== '' && (
                <div className="font-semibold text-2xl">Adults : {initialData.numAdults}</div>
              )}
            </div>
            <div>
              {initialData.numChild5to12 !== '' && (
                <div className="font-semibold text-2xl">Children (5 - 12 Years) : {initialData.numChild5to12}</div>
              )}

            </div>
            <div>
              {initialData.numChild0to5 !== '' && (
                <div className="font-semibold text-2xl">Children (0 - 5 Years) : {initialData.numChild0to5}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="break-inside-avoid">
        <CardHeader>

        </CardHeader>

        {selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (
          <CardContent>
            <div className="grid gap-4 md:grid-cols-1">
              <>
                {/* Price per Adult on the left side */}
                {initialData.pricePerAdult !== '' && (
                  <div className="md:col-span-1">
                    <div className="font-semibold text-2xl">Price per Adult: {initialData.pricePerAdult}</div>
                  </div>
                )}

                {/* Price for Children Section on the right side */}
                <div className="md:col-span-1 space-y-4">
                  {initialData.pricePerChildOrExtraBed !== '' && (
                    <div>
                      <div className="font-semibold text-2xl">Price for Triple Occupancy : {initialData.pricePerChildOrExtraBed}</div>
                    </div>
                  )}
                  {initialData.pricePerChild5to12YearsNoBed !== '' && (
                    <div>
                      <div className="font-semibold text-2xl">Price per Child (5-12 Years - No bed): {initialData.pricePerChild5to12YearsNoBed}</div>
                    </div>
                  )}
                  {initialData.pricePerChildwithSeatBelow5Years !== '' && (
                    <div>
                      <div className="font-semibold text-2xl">Price per Child with Seat (Below 5 Years): {initialData.pricePerChildwithSeatBelow5Years}</div>
                    </div>
                  )}

                </div>
              </>
            </div>
          </CardContent >
        )}
      </Card >


      {selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.totalPrice !== '' && (
        <Card className="grid gap-4">
          <CardContent>
            <div>
              <div className="font-semibold text-2xl">Total Price: {initialData.totalPrice}</div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Tour Highlights */}
      {selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.tour_highlights !== '' && (
        < Card >
          <CardContent>
            <div>
              <div className="font-semibold text-2xl" dangerouslySetInnerHTML={{ __html: initialData.tour_highlights || '' }}></div>
            </div>
          </CardContent>
        </Card >
      )}

      {initialData.remarks !== '' && (
        <Card className="break-inside-avoid text-2xl">
          <CardContent>
            <div>
              <div dangerouslySetInnerHTML={{ __html: initialData.remarks || '' }}></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flight Details */}
      {selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && initialData.flightDetails.length > 0 && (
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
      )
      }

      {/* Itineraries */}
      {selectedOption != 'SupplierA' && initialData.itineraries && initialData.itineraries.map((itinerary, index) => (
        <Card key={index} className="mb-4 break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Day : {itinerary.dayNumber} </CardTitle>
            <CardDescription className='text-2xl'>{itinerary.days}</CardDescription>
          </CardHeader>

          {/* Image Section */}
          <div className="flex justify-center items-center break-inside-avoid">
            {itinerary.itineraryImages && itinerary.itineraryImages.length > 0 && itinerary.itineraryImages.map((image, imageIndex) => (
              <Image
                key={imageIndex}
                src={image.url}
                alt={`Itinerary Image ${imageIndex + 1}`}
                width={600}
                height={300} // Ensure the height is the same as width to make it square
                className="rounded-lg object-cover mb-2"
                style={{ maxWidth: '100%', height: 'auto' }} // Ensures images are responsive and maintain aspect ratio
              />
            ))}
          </div>

          {/* Description Section */}
          <div className="flex-grow ml-8 mr-8 mt-4">
            <div className="text-2xl font-bold mb-2" dangerouslySetInnerHTML={{ __html: itinerary.itineraryTitle || '' }}></div>
            <div>
              <div className="text-2xl mb-2 text-justify" dangerouslySetInnerHTML={{ __html: itinerary.itineraryDescription || '' }}></div>
            </div>
          </div>

          <CardContent className="p-12">

            {/* Hotel Section */}
            {itinerary.hotelId && hotels.find(hotel => hotel.id === itinerary.hotelId) && (
              <Card>
                <CardHeader className="p-4 text-2xl font-bold text-center"> Hotel Details </CardHeader>
                <div className="mb-4 ml-4">
                  {/* Image Section */}
                  {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.length === 1 ? (
                    <div className="flex items-start mx-2 my-2 break-inside-avoid">
                      <div className="relative w-[250px] h-[250px] flex-shrink-0">
                        <Image
                          src={hotels.find(hotel => hotel.id === itinerary.hotelId)?.images[0].url || ''}
                          alt="Hotel Image"
                          className="rounded-lg object-cover"
                          fill={true} // Automatically fills the container
                        />
                      </div>
                      {/* Text Content - Displayed on the right side */}
                      <div className="flex-grow mx-4">
                        <div className="text-2xl font-bold">Hotel Name :</div>
                        <p className="text-2xl mb-2">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>

                        {itinerary.numberofRooms && (
                          <>
                            <div className="text-2xl font-bold">Number of Rooms :</div>
                            <p className="text-2xl mb-4">{itinerary.numberofRooms}</p>
                          </>
                        )}

                        {itinerary.roomCategory && (
                          <>
                            <div className="text-2xl font-bold">Room Category :</div>
                            <p className="text-2xl mb-4">{itinerary.roomCategory}</p>
                          </>
                        )}

                        {itinerary.mealsIncluded && (
                          <>
                            <div className="text-2xl font-bold">Meal Plan:</div>
                            <p className="text-2xl mb-4">{itinerary.mealsIncluded}</p>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Multiple Images Grid */}
                      <div className="grid grid-cols-3 gap-4 mx-2 my-2 break-inside-avoid">
                        {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.map((image, imgIndex) => (
                          <div key={imgIndex} className="relative w-[250px] h-[250px]">
                            <Image
                              src={image.url}
                              alt={`Hotel Image ${imgIndex + 1}`}
                              className="rounded-lg object-cover"
                              fill={true} // Automatically fills the container
                            />
                          </div>
                        ))}
                      </div>

                      {/* Text Content - Displayed below the images */}
                      <div className="flex-grow mx-2 my-2">
                        <div className="text-2xl font-bold">Hotel Name:</div>
                        <p className="text-2xl mb-2">{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</p>

                        {itinerary.numberofRooms && (
                          <>
                            <div className="text-2xl font-bold">Number of Rooms :</div>
                            <p className="text-2xl mb-4">{itinerary.numberofRooms}</p>
                          </>
                        )}

                        {itinerary.roomCategory && (
                          <>
                            <div className="text-2xl font-bold">Room Category :</div>
                            <p className="text-2xl mb-4">{itinerary.roomCategory}</p>
                          </>
                        )}

                        {itinerary.mealsIncluded && (
                          <>
                            <div className="text-2xl font-bold">Meal Plan:</div>
                            <p className="text-2xl mb-4">{itinerary.mealsIncluded}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Activities Section */}
            {itinerary.activities && itinerary.activities.length > 0 && (
              <Card className="break-inside-avoid">
                <CardHeader className="p-4 text-2xl font-bold text-center"> 🅰🅲🆃🅸🆅🅸🆃🅸🅴🆂 </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {/* Activities List */}
                    {/* Activities Section */}
                    {itinerary.activities && itinerary.activities.length > 0 && (
                      <Card className="break-inside-avoid">
                        <CardHeader className="p-4 text-2xl font-bold text-center">Activities</CardHeader>
                        <CardContent>
                          <div className="grid gap-4">
                            {/* Activities List */}
                            {itinerary.activities.map((activity, activityIndex) => (
                              <div key={activityIndex} className="mb-4">
                                {activity.activityImages && activity.activityImages.length === 1 ? (
                                  // Single image layout
                                  <div className="flex items-start mx-2 my-2 break-inside-avoid">
                                    <div className="relative w-[250px] h-[250px] flex-shrink-0">
                                      <Image
                                        src={activity.activityImages[0].url}
                                        alt={`Activity Image ${activityIndex + 1}`}
                                        className="rounded-lg object-cover"
                                        fill={true}
                                      />
                                    </div>
                                    {/* Text Content - Displayed on the right side */}
                                    <div className="flex-grow mx-4">
                                      <div className="text-2xl font-bold" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }}></div>
                                      <p className="text-2xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }}></p>
                                    </div>
                                  </div>
                                ) : (
                                  // Multiple images layout
                                  <div>
                                    <div className="flex justify-center items-center mx-2 my-2">
                                      {activity.activityImages && activity.activityImages.map((image, actImgIndex) => (
                                        <div key={actImgIndex} className="relative w-[250px] h-[250px]">
                                          <Image
                                            src={image.url}
                                            alt={`Activity Image ${actImgIndex + 1}`}
                                            className="rounded-lg object-cover"
                                            fill={true}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                    {/* Text Content - Displayed below the images */}
                                    <div className="flex-grow mx-2 my-2">
                                      <div className="text-2xl font-bold" dangerouslySetInnerHTML={{ __html: activity.activityTitle || '' }}></div>
                                      <p className="text-2xl text-justify" dangerouslySetInnerHTML={{ __html: activity.activityDescription || '' }}></p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      ))
      }

      {selectedOption === 'SupplierA' && initialData.itineraries && (
        <Card className="mb-4 break-inside-avoid">
          <CardTitle className="text-4xl font-bold lg:px-8 md:px-8 py-2 mb-2">
            Itinerary
          </CardTitle>
          <CardContent className="space-y-4">
            {initialData.itineraries.map((itinerary, index) => (
              <div key={index} className="mb-4">
                <h3
                  className="text-xl font-semibold text-gray-800 lg:px-8 md:px-8 py-2"
                  dangerouslySetInnerHTML={{
                    __html: `Day ${itinerary.dayNumber}: ${itinerary.itineraryTitle?.replace(/^<p>/, '').replace(/<\/p>$/, '')}` || '',
                  }}
                />

              </div>
            ))}
          </CardContent>
        </Card>
      )}


      <div className="grid gap-4">
        {/* Inclusions Card */}


        {/* Inclusions Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Inclusions</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.inclusions || '' }} >
          </CardContent>
        </Card>

        {/* Exclusions Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Exclusions</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.exclusions || '' }}>
          </CardContent>
        </Card>

        {/* Important Notes Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Important Notes</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.importantNotes || '' }}>
          </CardContent>
        </Card>

        {/* Payment Policy Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Payment Policy</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.paymentPolicy || '' }} >
          </CardContent>
        </Card>

        {/* Useful Tips Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Useful Tips</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.usefulTip || '' }} >
          </CardContent>
        </Card>

        {/* Cancellation Policy Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.cancellationPolicy || '' }}>
          </CardContent>
        </Card>

        {/* Airline Cancellation Policy Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Airline Cancellation Policy</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.airlineCancellationPolicy || '' }}>
          </CardContent>
        </Card>

        {/* Terms and Conditions Card */}
        <Card className="break-inside-avoid">
          <CardHeader>
            <CardTitle className='text-2xl'>Terms and Conditions</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl' dangerouslySetInnerHTML={{ __html: initialData.termsconditions || '' }}>
          </CardContent>
        </Card>
      </div>

      {
        selectedOption !== 'Empty' && selectedOption !== 'SupplierA' && selectedOption !== 'SupplierB' && (

          <Card className="border-b break-inside-avoid m-2">
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
        )
      }

      {selectedOption === 'SupplierA' || selectedOption === 'SupplierB' && (
        <Card className="border-b break-inside-avoid">
          <CardDescription className="flex justify-between items-center px-4">
            <div className="inline-block relative w-48 h-48">
              <Image src={companyInfo.AH.logo} alt={`${companyInfo.AH.name} Logo`} fill className="object-contain" />
            </div>
            <ul>

              <li>{companyInfo.AH.address}</li>
              <li>Phone: {companyInfo.AH.phone}</li>
              <li>Email: <Link href={`mailto:${companyInfo.AH.email}`} className="text-blue-600 underline">{companyInfo.AH.email}</Link></li>
              <li>Website: <Link href={companyInfo.AH.website || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{companyInfo.AH.website}</Link></li>
            </ul>
          </CardDescription>
        </Card>
      )
      }

      {/* Footer Section with Company Details */}


    </div >
  );
};
