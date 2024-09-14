'use client'
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link } from '@react-pdf/renderer';
import htmlReactParser, { DOMNode, Element, Text as HtmlTextNode } from 'html-react-parser';
import { TourPackageQuery, Images, Itinerary, Activity, FlightDetails, Location, Hotel } from "@prisma/client"
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { MailIcon, PhoneCallIcon, PhoneIcon } from 'lucide-react';

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
// Create styles

const styles = StyleSheet.create({
  // General Page Styles
  page: {
    padding: 20,
  },
  header: {
    marginBottom: 10,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  imageContainer: {
    width: 48,
    height: 48,
    position: 'relative',
  },
  list: {
    listStyleType: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    marginBottom: 4,
  },
  link: {
    color: 'blue',
    textDecoration: 'underline',
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

});



const customStyles = {
  b: { fontWeight: 700 },
  i: { fontStyle: 'italic' },
  ul: { marginLeft: 10, marginBottom: 5 },  // Unordered list
  li: { marginLeft: 10, fontSize: 12 },  // List item
  p: { marginBottom: 10, fontSize: 12 },  // Paragraph
  separator: { borderBottomWidth: 1, borderBottomColor: '#ddd', marginVertical: 10 }, // Separator line
  // Add more custom styles as needed
};

// Define custom styles for parsed HTML content
const renderHTML = (htmlString: string) => {
  return htmlReactParser(htmlString, {
    replace: (node: DOMNode) => {
      // Handle bold text
      if (node instanceof Element && node.name === 'b') {
        return (
          <Text style={customStyles.b}>
            {node.children.map((child, index) => {
              if (child instanceof HtmlTextNode) {
                return child.data; // Access data for text nodes
              }
              return renderHTML(child as any); // Recursively render HTML for other child elements
            })}
          </Text>
        );
      }

      // Handle italic text
      if (node instanceof Element && node.name === 'i') {
        return (
          <Text style={customStyles.i}>
            {node.children.map((child, index) => {
              if (child instanceof HtmlTextNode) {
                return child.data;
              }
              return renderHTML(child as any);
            })}
          </Text>
        );
      }
      // Handle unordered list (ul)
      if (node instanceof Element && node.name === 'ul') {
        return (
          <View style={customStyles.ul}>
            {node.children.map((child, index) => renderHTML(child as any))}
          </View>
        );
      }

      // Handle list item (li)
      if (node instanceof Element && node.name === 'li') {
        return (
          <Text style={customStyles.li}>
            {node.children.map((child, index) => {
              if (child instanceof HtmlTextNode) {
                return child.data;
              }
              return renderHTML(child as any);
            })}
          </Text>
        );
      }


      // Handle paragraph (p)
      if (node instanceof Element && node.name === 'p') {
        return (
          <View key={node.name}>
            <Text style={customStyles.p}>
              {node.children.map((child, index) => {
                if (child instanceof HtmlTextNode) {
                  return child.data;
                }
                return renderHTML(child as any);
              })}
            </Text>
            <Text style={styles.lineBreak}></Text>
            <View style={customStyles.separator} />

          </View>
        );
      } return null;
    },
  });
};
const parseHTMLContent = (htmlString: string) => {
  const parser = new DOMParser();
  const parsedHTML = parser.parseFromString(htmlString, 'text/html');
  return parsedHTML.body.textContent || "";
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
            <Text style={styles.title}>{data?.tourPackageQueryName}</Text>
          </View>


          {selectedOption !== 'Supplier' && (
            <View>
              {/* Customer Information */}
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Customer: </Text>
                <Text style={styles.tableValue}>
                  {data?.customerName} |
                  {data?.customerNumber} | 
                      {data?.customerNumber} |
                </Text>
              </View>

              {/* Assigned To Information */}
              <View style={styles.tableRow}>
                <Text style={styles.tableLabel}>Assigned To: </Text>
                <Text style={styles.tableValue}>
                  {data?.assignedTo} |
                  {data?.assignedToMobileNumber && (
                    <>
                      <PhoneIcon size={16} color="#000" style={styles.icon} />
                      {data?.assignedToMobileNumber} |
                    </>
                  )}
                  {data?.assignedToEmail && (
                    <>
                      <MailIcon size={16} color="#000" style={styles.icon} />
                      {data?.assignedToEmail}
                    </>
                  )}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.imagesContainer}>
            {data?.images.map((image, index) => (
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
                <Text style={styles.tableLabel}>Period:</Text>
                <Text style={styles.tableValue}>
                  {format(new Date(data.tourStartsFrom), 'dd-MM-yyyy')} To {format(new Date(data.tourEndsOn), 'dd-MM-yyyy')}
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

        {data.tour_highlights && (
          <View style={styles.card} >
            <View style={styles.cardContainer}>
              <Text style={styles.cardTitle}>Tour Highlights</Text>
              <Text style={styles.cardText}>{parseHTMLContent(data.tour_highlights)} </Text>
            </View>
          </View>
        )}

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
              <Text style={styles.cardText}>{parseHTMLContent(itinerary.itineraryDescription || '')} </Text>

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
            <Text style={styles.text}> {parseHTMLContent(data.inclusions || '')} </Text>
          </View>
        )}

        {/* Exclusions Section */}
        {data.exclusions && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Exclusions</Text>
            <Text style={styles.text}> {parseHTMLContent(data.exclusions || '')} </Text>
          </View>
        )}

        {/* Important Notes Section */}
        {data.importantNotes && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Important Notes</Text>
            <Text style={styles.text} > {parseHTMLContent(data.importantNotes || '')} </Text>
          </View>
        )}

        {/* Payment Policy Section */}
        {data.paymentPolicy && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Payment Policy</Text>
            <Text style={styles.text} > {parseHTMLContent(data.paymentPolicy || '')} </Text>
          </View>
        )}

        {/* Useful Tips Section */}
        {data.usefulTip && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Useful Tips</Text>
            <Text style={styles.text} > {parseHTMLContent(data.usefulTip || '')} </Text>
          </View>
        )}

        {/* Cancellation Policy Section */}
        {data.cancellationPolicy && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Cancellation Policy</Text>
            <Text style={styles.text} > {parseHTMLContent(data.cancellationPolicy || '')} </Text>
          </View>
        )}

        {/* Airline Cancellation Policy Section */}
        {data.airlineCancellationPolicy && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Airline Cancellation Policy</Text>
            <Text style={styles.text} > {parseHTMLContent(data.airlineCancellationPolicy || '')} </Text>
          </View>
        )}

        {/* Terms and Conditions Section */}
        {data.termsconditions && (
          <View wrap={false} style={styles.card}>
            <Text style={styles.title}>Terms and Conditions</Text>
            <Text style={styles.text}> {parseHTMLContent(data.termsconditions || '')} </Text>
          </View>
        )}

        {selectedOption !== 'Empty' && selectedOption !== 'Supplier' && (
          <View wrap={false} style={styles.card}>
            <View style={styles.cardDescription}>
              <View style={styles.imageContainer}>
                <Image src={currentCompany.logo} style={styles.image} />
              </View>
              <View>
                <Text style={styles.listItem}>{currentCompany.address}</Text>
                <Text style={styles.listItem}>Phone: {currentCompany.phone}</Text>
                <Text style={styles.listItem}>
                  Email: <Link style={styles.link} src={`mailto:${currentCompany.email}`}>{currentCompany.email}</Link>
                </Text>
                <Text style={styles.listItem}>
                  Website: <Link style={styles.link} src={currentCompany.website || '#'}>{currentCompany.website}</Link>
                </Text>
              </View>
            </View>
          </View>
        )}

        {selectedOption === 'Supplier' && (
          <View wrap={false} style={styles.card}>
            <View style={styles.cardDescription}>
              <View style={styles.imageContainer}>
                <Image src={companyInfo.AH.logo} style={styles.image} />
              </View>
              <View>
                <Text style={styles.listItem}>{companyInfo.AH.address}</Text>
                <Text style={styles.listItem}>Phone: {companyInfo.AH.phone}</Text>
                <Text style={styles.listItem}>
                  Email: <Link style={styles.link} src={`mailto:${companyInfo.AH.email}`}>{companyInfo.AH.email}</Link>
                </Text>
                <Text style={styles.listItem}>
                  Website: <Link style={styles.link} src={companyInfo.AH.website || '#'}>{companyInfo.AH.website}</Link>
                </Text>
              </View>
            </View>
          </View>
        )}

      </Page>
    </Document >
  )
}
export default GenerateMyPDF;