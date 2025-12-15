'use client'
/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link } from '@react-pdf/renderer';
import htmlReactParser, { DOMNode, Element, Text as HtmlTextNode } from 'html-react-parser';
import { TourPackageQuery, Images, Itinerary, Activity, FlightDetails, Location, Hotel } from "@prisma/client"
import { format, parseISO } from 'date-fns';
import { formatLocalDate } from '@/lib/timezone-utils';
import { useSearchParams } from 'next/navigation';
import { MailIcon, PhoneCallIcon, PhoneIcon } from 'lucide-react';
import parse from 'html-react-parser'; // Assuming you have this installed

interface GenerateMyPDFProps {
  data: TourPackageQuery & {
    images: Images[];
    itineraries: (Itinerary & {
      itineraryImages: Images[];
      activities: (Activity & {
        activityImages: Images[];
      })[] | null;
    })[] | null;
    flightDetails: FlightDetails[];
  } | null;
  locations: Location[] | null;
  hotels: (Hotel & {
    images: Images[];
  })[] | null;
  selectedOption: string;
};

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


const companyInfo: CompanyInfo = {
  Empty: { logo: '', name: '', address: '', phone: '', email: '', website: '' },
  AH: {
    logo: '/aagamholidays.png',
    name: 'Aagam Holidays',
    address: 'B - 1203, PNTC, Times of India Press Road, Satellite, Ahmedabad - 380015, Gujarat, India',
    phone: '+91-97244 44701',
    email: 'info@aagamholidays.com', // Add the missing fields
    website: 'https://aagamholidays.com',
  },
};
// Create styles

const styles = StyleSheet.create({
  // General Page Styles
  page: {
    padding: 20,
  },
  header: {
    marginBottom: 10,
  },
  tourPackageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  text: {
    fontSize: 12,
    textAlign: 'justify',
    textJustify: 'inter-word',
    padding: 4,
  },
  section: {
    marginBottom: 10,
  },

  // Flexbox Layouts
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  column: {
    width: '48%', // Adjust as needed for spacing
  },

  row: {
    flexDirection: 'row', // Set the row layout
    alignItems: 'center', // Align items in the center vertically
  },
  marginLeft: {
    marginLeft: 5,
  },

  // Image Styles
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  image: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    marginBottom: 10,
    borderRadius: 10,
  },
  itineraryImage: {
    width: '80%',
    height: 250,
    resizeMode: 'cover',
    marginBottom: 10,
    borderRadius: 10, // Use borderRadius for rounded corners
  },
  hotelImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
    marginBottom: 10,
    borderRadius: 10, // Use borderRadius for rounded corners
  },
  singleImageContainer: {
    flexDirection: 'row', // Display the image and details side by side for single image
    alignItems: 'center',
  },
  hotelImageSingle: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 10, // Adds space between the image and the text
  },
  hotelDetails: {
    flex: 1, // Let the description take up the remaining space
  },


  activityImage: {
    width: 150,
    height: 150,
    resizeMode: 'cover',
    marginBottom: 10,
    borderRadius: 10, // Use borderRadius for rounded corners

  },

  // Card Styles
  card: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 5,
  },
  cardContainer: {
    marginBottom: 10,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardItem: {
    width: '48%',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 10,
  },

  // Specific Card Styles
  cardDescription: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 20,
    borderTop: '3px solid #2563eb',
  },
  imageContainer: {
    width: 80,
    height: 80,
    position: 'relative',
    marginRight: 20,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    border: '2px solid #e5e7eb',
    padding: 5,
  },
  list: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    marginBottom: 8,
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.5,
  },
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
    fontSize: 11,
  },

  // Price and Flight Details
  priceSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  priceItem: {
    width: '48%',
    marginBottom: 10,
    flexDirection: 'row',
  },
  flightDetails: {
    marginBottom: 20,
  },
  flightDetail: {
    marginBottom: 10,
  },

  // Additional Containers
  customerInfo: {
    fontSize: 12,
    marginBottom: 10,
  },
  hotelContainer: {
    marginBottom: 20,
  },

  hotelTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    padding: 4,
  },
  hotelText: {
    fontSize: 12,
    padding: 4,

  },
  activitiesContainer: {
    marginBottom: 20,
  },

  // Line Break
  lineBreak: {
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  tableRow: {
    flexDirection: 'row',       // Ensures label and value are in a row
    justifyContent: 'flex-start',
    marginBottom: 10,           // Adds spacing between rows
    alignItems: 'center',       // Aligns content vertically
  },
  tableLabel: {
    fontWeight: 'bold',         // Makes the label bold
    fontSize: 12,
    width: '30%',               // Ensures the label takes up 40% of the width
    textAlign: 'left',          // Aligns the label text to the left
  },
  tableValue: {
    fontSize: 12,
    width: '60%',               // Ensures the value takes up the remaining 60% of the width
    textAlign: 'left',         // Aligns the value text to the right
  },
  icon: {
    marginRight: 5, // Add space between the icon and the text
  },

  // Enhanced Footer Styles
  footerContainer: {
    marginTop: 30,
    paddingTop: 20,
    borderTop: '2px solid #e5e7eb',
  },
  footerHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 15,
    textAlign: 'center',
    paddingBottom: 10,
    borderBottom: '1px solid #e5e7eb',
  },
  companyInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    border: '1px solid #e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  companyLogo: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginRight: 25,
    backgroundColor: '#ffffff',
    border: '2px solid #f3f4f6',
    padding: 8,
  },
  companyDetailsContainer: {
    flex: 1,
    paddingTop: 5,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  contactInfo: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 6,
    lineHeight: 1.6,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginRight: 5,
  },
  websiteLink: {
    color: '#2563eb',
    textDecoration: 'underline',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emailLink: {
    color: '#2563eb',
    textDecoration: 'underline',
    fontSize: 11,
  },

});


const customStyles = {
  b: { fontWeight: 700 },
  i: { fontStyle: 'italic' },
  ul: { marginLeft: 10, marginBottom: 5 },  // Unordered list
  li: { marginLeft: 10, fontSize: 12 },  // List item
  p: { marginBottom: 10, fontSize: 12 },  // Paragraph
  separator: { height: 1, backgroundColor: '#ccc' },
  lineBreak: { height: 10 }  // Add more custom styles as needed
};

const parseHTMLContent = (htmlString: string): string => {
  // Replace <li> tags first, as they may be removed or altered by other replacements
  let parsedString = htmlString
    .replace(/<\/?ul>/g, '')                 // Remove <ul> and </ul>
    .replace(/<\/?strong>/g, '')             // Remove <strong> and </strong>
    .replace(/<li>/g, '-> ')                 // Replace <li> with '-> '
    .replace(/<\/li>/g, '\n')                // Replace </li> with newline
    .replace(/<br\s*\/?>/g, '\n')            // Replace <br> tags with newline
    .replace(/<\/?p>/g, '\n')                 // Replace <p> and </p> tags with newline
    .replace(/”/g, '')                       // Remove specific character
    .trim();                                // Trim any leading or trailing whitespace/newlines

  // Ensure multiple newlines are not collapsed
  parsedString = parsedString.replace(/\n{2,}/g, '\n\n');

  return parsedString;
};

// Add a utility function to handle JSON formatted policies
const handlePolicyContent = (policyData: any): string => {
  if (!policyData) return '';

  // If it's a string, return it directly
  if (typeof policyData === 'string') return policyData;

  // If it's an object (parsed JSON), extract the content property or convert it to string
  if (typeof policyData === 'object') {
    if (policyData.content) return policyData.content;
    try {
      return JSON.stringify(policyData);
    } catch (e) {
      return '';
    }
  }

  return '';
};

// Create Document Component
const GenerateMyPDF: React.FC<GenerateMyPDFProps> = ({ data, locations, hotels, selectedOption }) => {


  // Now you can use selectedOption to get data from your companyInfo object
  const currentCompany = companyInfo[selectedOption] ?? companyInfo['Empty'];

  if (!data) {
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>No Data Available</Text>
          </View>
        </Page>
      </Document>
    );
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.tourPackageTitle}>{data?.tourPackageQueryName}</Text>
          </View>


          {selectedOption !== 'Supplier' && (
            <View>
              {/* Customer Information */}
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Customer: </Text>
                <Text style={styles.tableValue}>
                  {data?.customerName} |
                  {data?.customerNumber}
                </Text>
              </View>

              {/* Assigned To Information - Removed */}
            </View>
          )}

          <View style={styles.imagesContainer}>            {data?.images.map((image, index) => (
            <Image
              key={index}
              src={image.url}
              style={styles.image}
            />
          ))}
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Location:</Text>
            <Text style={styles.tableValue}>{locations?.find(location => location.id === data.locationId)?.label}</Text>
          </View>

          {data.numDaysNight !== '' && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Duration:</Text>
              <Text style={styles.tableValue}>{data.numDaysNight}</Text>
            </View>
          )}

          <View style={styles.tableRow}>
            {data.tourStartsFrom && data.tourEndsOn && (
              <>
                <Text style={styles.tableLabel}>Period:</Text>                <Text style={styles.tableValue}>
                  {formatLocalDate(data.tourStartsFrom, 'dd-MM-yyyy')} To {formatLocalDate(data.tourEndsOn, 'dd-MM-yyyy')}
                </Text>
              </>
            )}
          </View>


          {data.transport !== '' && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Transport:</Text>
              <Text style={styles.tableValue}>{data.transport}</Text>
            </View>
          )}

          {data.pickup_location !== '' && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Pickup:</Text>
              <Text style={styles.tableValue}>{data.pickup_location}</Text>
            </View>
          )}

          {data.drop_location !== '' && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Drop:</Text>
              <Text style={styles.tableValue}>{data.drop_location}</Text>
            </View>
          )}

          {data.numAdults !== '' && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Adults:</Text>
              <Text style={styles.tableValue}>{data.numAdults}</Text>
            </View>
          )}

          {data.numChild5to12 !== '' && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Children (5 - 12 Years):</Text>
              <Text style={styles.tableValue}>{data.numChild5to12}</Text>
            </View>
          )}

          {data.numChild0to5 !== '' && (
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Children (0 - 5 Years):</Text>
              <Text style={styles.tableValue}>{data.numChild0to5}</Text>
            </View>
          )}
        </View>

        {selectedOption !== 'Supplier' && (
          <View style={styles.card}>
            <View style={styles.cardContainer}>
              <View style={styles.cardContent}>
                {/* Price Details in Tabular Format */}
                {/* Price per Adult */}
                {data.price !== '' && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableValue}>{data.price}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {selectedOption !== 'Supplier' && (
          <View style={styles.card}>
            <View style={styles.cardContainer}>
              <View style={styles.cardContent}>
                {/* Price Details in Tabular Format */}
                {/* Price per Adult */}
                {data.pricePerAdult !== '' && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Price per Adult:</Text>
                    <Text style={styles.tableValue}>{data.pricePerAdult}</Text>
                  </View>
                )}

                {/* Price for Children Section */}
                {data.pricePerChildOrExtraBed !== '' && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Price for Triple Occupancy:</Text>
                    <Text style={styles.tableValue}>{data.pricePerChildOrExtraBed}</Text>
                  </View>
                )}

                {data.pricePerChild5to12YearsNoBed !== '' && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Price per Child (5-12 Years - No bed):</Text>
                    <Text style={styles.tableValue}>{data.pricePerChild5to12YearsNoBed}</Text>
                  </View>
                )}

                {data.pricePerChildwithSeatBelow5Years !== '' && (
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Price per Child with Seat (Below 5 Years):</Text>
                    <Text style={styles.tableValue}>{data.pricePerChildwithSeatBelow5Years}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {selectedOption !== 'Supplier' && data.totalPrice !== '' && (
          <View style={styles.card}>
            <View style={styles.cardContainer}>
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Total Price:</Text>
                <Text style={styles.tableValue}>{data.totalPrice}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tour highlights removed */}

        {/* Flight Details */}
        {data.flightDetails.length > 0 && (
          <View style={styles.card} >
            <View style={styles.flightDetails}>
              <Text style={styles.cardTitle}>Flight Details</Text>
              {data.flightDetails.map((flight, index) => (
                <View key={index} style={styles.flightDetail}>
                  <Text>{flight.date}</Text>
                  <Text>{flight.flightName} | {flight.flightNumber}</Text>
                  <View style={styles.cardContent}>
                    <Text>{flight.from} - {flight.departureTime}</Text>
                    <Text>{flight.flightDuration}</Text>
                    <Text>{flight.to} - {flight.arrivalTime}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Itineraries */}
        {data.itineraries && data.itineraries.map((itinerary, index) => (
          <View wrap={false} key={index} style={styles.card} >
            <View key={index} style={styles.cardContainer}>
              <Text style={styles.cardTitle}>Day : {itinerary.dayNumber}</Text>
              <Text style={styles.cardText}>{itinerary.days}</Text>

              {/* Image Section */}
              {itinerary.itineraryImages && itinerary.itineraryImages.length > 0 && (
                <View style={styles.imagesContainer}>
                  {itinerary.itineraryImages.map((image, imageIndex) => (
                    <Image
                      key={imageIndex}
                      src={image.url}
                      style={styles.itineraryImage}
                    />
                  ))}
                </View>
              )}

              {/* Description Section */}
              <Text style={styles.cardTitle}>{parseHTMLContent(itinerary.itineraryTitle || '')} </Text>
              <Text style={styles.cardText}>
                {itinerary.itineraryDescription
                  ?.replace(/<\/?ul>/g, '')               // Remove <ul> and </ul>
                  .replace(/<\/li>/g, '\n')              // Replace </li> with newline
                  .replace(/<br\s*\/?>/g, '\n')               // Replace <br> tags with newline
                  .replace(/<li>/g, '➔  ')               // Replace <li> with "-> "
                  .replace(/<\/?strong>/g, '')           // Remove <strong> and </strong>
                  .replace(/➔/g, '')
                  .replace(/”/g, '')                       // Remove ”
                  .trim()                                // Trim any leading or trailing whitespace/newlines
                  || ''
                }
              </Text>


              {/* Hotel Section */}
              {itinerary.hotelId && hotels?.find(hotel => hotel.id === itinerary.hotelId) && (
                <View style={styles.card}>
                  <View style={styles.hotelContainer}>
                    <Text style={styles.cardTitle}>Stay</Text>

                    {hotels?.find(hotel => hotel.id === itinerary.hotelId)?.images.length === 1 ? (
                      // Layout for one image: Image on the left and description on the right
                      <View style={styles.singleImageContainer}>
                        <Image
                          src={hotels?.find(hotel => hotel.id === itinerary.hotelId)?.images[0].url || ''}
                          style={styles.hotelImageSingle}
                        />
                        <View style={styles.hotelDetails}>
                          <Text style={styles.hotelTitle}>Hotel : {hotels?.find(hotel => hotel.id === itinerary.hotelId)?.name}</Text>

                          {itinerary.numberofRooms && (
                            <Text style={styles.hotelText}>Number of Rooms : {itinerary.numberofRooms}</Text>
                          )}

                          {itinerary.roomCategory && (
                            <View style={styles.flexRow}>
                              <Text style={styles.hotelText}>Room Category : </Text>
                              <Text style={styles.hotelText}>{itinerary.roomCategory}</Text>
                            </View>
                          )}

                          {itinerary.mealsIncluded && (
                            <View style={styles.flexRow}>
                              <Text style={styles.hotelText}>Meal Plan : </Text>
                              <Text style={styles.hotelText}>{itinerary.mealsIncluded}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ) : (
                      // Layout for multiple images: Images on top, description below
                      <View>
                        {/* Multiple Images Grid */}
                        <View style={styles.imagesContainer}>
                          {hotels?.find(hotel => hotel.id === itinerary.hotelId)?.images.map((image, imgIndex) => (
                            <Image
                              key={imgIndex}
                              src={image.url}
                              style={styles.hotelImage}
                            />
                          ))}
                        </View>

                        {/* Text Content - Displayed below the images */}
                        <View>
                          <Text style={styles.hotelTitle}>Hotel: {hotels?.find(hotel => hotel.id === itinerary.hotelId)?.name}</Text>

                          {itinerary.numberofRooms && (
                            <Text style={styles.hotelText}>Number of Rooms: {itinerary.numberofRooms}</Text>
                          )}

                          {itinerary.roomCategory && (
                            <View style={styles.flexRow}>
                              <Text style={styles.hotelText}>Room Category: </Text>
                              <Text style={styles.hotelText}>{itinerary.roomCategory}</Text>
                            </View>
                          )}

                          {itinerary.mealsIncluded && (
                            <View style={styles.flexRow}>
                              <Text style={styles.hotelText}>Meal Plan: </Text>
                              <Text style={styles.hotelText}>{itinerary.mealsIncluded}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Activities Section */}
              {itinerary.activities && itinerary.activities.length > 0 && (
                <View wrap={false} style={styles.card} >
                  <View style={styles.activitiesContainer}>
                    <Text style={styles.cardTitle}>Activities</Text>
                    {itinerary.activities.map((activity, activityIndex) => (
                      <View key={activityIndex} style={styles.cardContainer}>
                        {activity.activityImages && activity.activityImages.length === 1 ? (
                          <View style={styles.cardContent}>
                            <Image
                              src={activity.activityImages[0].url}
                              style={styles.activityImage}
                            />
                            <View>
                              <Text style={styles.cardTitle}>{parseHTMLContent(activity.activityTitle || '')} </Text>
                              <Text style={styles.cardText}>{parseHTMLContent(activity.activityDescription || '')}</Text>
                            </View>
                          </View>
                        ) : (
                          <View>
                            {/* Multiple Images Layout */}
                            <View style={styles.imagesContainer}>
                              {activity.activityImages.map((image, actImgIndex) => (
                                <Image
                                  key={actImgIndex}
                                  src={image.url}
                                  style={styles.activityImage}
                                />
                              ))}
                            </View>
                            {/* Text Content - Displayed below the images */}
                            <View>
                              <Text style={styles.cardTitle}>{parseHTMLContent(activity.activityTitle || '')} </Text>
                              <Text style={styles.cardText}> {parseHTMLContent(activity.activityDescription || '')}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Remarks Section */}
        {data.remarks !== '' && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Remarks</Text>
            <Text style={styles.text}> {parseHTMLContent(data.remarks || '')} </Text>
          </View>
        )}

        {/* Inclusions Section */}
        {data.inclusions && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Inclusions</Text>
            <Text style={styles.text}> {parseHTMLContent(handlePolicyContent(data.inclusions))} </Text>
          </View>
        )}

        {/* Exclusions Section */}
        {data.exclusions && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Exclusions</Text>
            <Text style={styles.text}> {parseHTMLContent(handlePolicyContent(data.exclusions))} </Text>
          </View>
        )}

        {/* Important Notes Section */}
        {data.importantNotes && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Important Notes</Text>
            <Text style={styles.text} > {parseHTMLContent(handlePolicyContent(data.importantNotes))} </Text>
          </View>
        )}

        {/* Payment Policy Section */}
        {data.paymentPolicy && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Payment Policy</Text>
            <Text style={styles.text} > {parseHTMLContent(handlePolicyContent(data.paymentPolicy))} </Text>
          </View>
        )}

        {/* Kitchen Group Policy Section */}
        {data.kitchenGroupPolicy && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Kitchen Group Policy</Text>
            <Text style={styles.text} > {parseHTMLContent(handlePolicyContent(data.kitchenGroupPolicy))} </Text>
          </View>
        )}

        {/* Useful Tips Section */}
        {data.usefulTip && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Useful Tips</Text>
            <Text style={styles.text} > {parseHTMLContent(handlePolicyContent(data.usefulTip))} </Text>
          </View>
        )}

        {/* Cancellation Policy Section */}
        {data.cancellationPolicy && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Cancellation Policy</Text>
            <Text style={styles.text} > {parseHTMLContent(handlePolicyContent(data.cancellationPolicy))} </Text>
          </View>
        )}

        {/* Airline Cancellation Policy Section */}
        {data.airlineCancellationPolicy && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Airline Cancellation Policy</Text>
            <Text style={styles.text} > {parseHTMLContent(handlePolicyContent(data.airlineCancellationPolicy))} </Text>
          </View>
        )}

        {/* Terms and Conditions Section */}
        {data.termsconditions && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Terms and Conditions</Text>
            <Text style={styles.text}> {parseHTMLContent(handlePolicyContent(data.termsconditions))} </Text>
          </View>
        )}

        {selectedOption !== 'Empty' && selectedOption !== 'Supplier' && (
          <View wrap={false} style={styles.footerContainer}>
            <Text style={styles.footerHeader}>Contact Information</Text>
            <View style={styles.companyInfoContainer}>
              <View style={styles.imageContainer}>
                <Image src={currentCompany.logo} style={styles.companyLogo} />
              </View>
              <View style={styles.companyDetailsContainer}>
                <Text style={styles.companyName}>{currentCompany.name}</Text>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Address:</Text>
                  <Text style={styles.contactInfo}>{currentCompany.address}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Phone:</Text>
                  <Text style={styles.contactInfo}>{currentCompany.phone}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Email:</Text>
                  <Link style={styles.emailLink} src={`mailto:${currentCompany.email}`}>
                    {currentCompany.email}
                  </Link>
                </View>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Website:</Text>
                  <Link style={styles.websiteLink} src={currentCompany.website || '#'}>
                    {currentCompany.website}
                  </Link>
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedOption === 'Supplier' && (
          <View wrap={false} style={styles.footerContainer}>
            <Text style={styles.footerHeader}>Contact Information</Text>
            <View style={styles.companyInfoContainer}>
              <View style={styles.imageContainer}>
                <Image src={companyInfo.AH.logo} style={styles.companyLogo} />
              </View>
              <View style={styles.companyDetailsContainer}>
                <Text style={styles.companyName}>{companyInfo.AH.name}</Text>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Address:</Text>
                  <Text style={styles.contactInfo}>{companyInfo.AH.address}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Phone:</Text>
                  <Text style={styles.contactInfo}>{companyInfo.AH.phone}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Email:</Text>
                  <Link style={styles.emailLink} src={`mailto:${companyInfo.AH.email}`}>
                    {companyInfo.AH.email}
                  </Link>
                </View>
                <View style={styles.row}>
                  <Text style={styles.contactLabel}>Website:</Text>
                  <Link style={styles.websiteLink} src={companyInfo.AH.website || '#'}>
                    {companyInfo.AH.website}
                  </Link>
                </View>
              </View>
            </View>
          </View>
        )}

      </Page>
    </Document >
  )
}
export default GenerateMyPDF;
