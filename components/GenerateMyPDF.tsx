'use client'
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Link } from '@react-pdf/renderer';
import htmlReactParser, { DOMNode, Element, Text as HtmlTextNode } from 'html-react-parser';
import { TourPackageQuery, Images, Itinerary, Activity, FlightDetails, Location, Hotel } from "@prisma/client"
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'next/navigation';

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
  },
  text: {
    fontSize: 12,
    textAlign : 'justify',
    textJustify : 'inter-word',
    padding : 4,
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
    height: 150,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  itineraryImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  hotelImage: {
    width: 250,
    height: 250,
    resizeMode: 'cover',
    marginBottom: 10,
  },
  activityImage: {
    width: 250,
    height: 250,
    resizeMode: 'cover',
    marginBottom: 10,
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
    marginBottom: 20,
  },
  cardHeader: {
    marginBottom: 10,
  },
  cardContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cardItem: {
    width: '48%',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardText: {
    fontSize: 12,
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
  activitiesContainer: {
    marginBottom: 20,
  },

  // Line Break
  lineBreak: {
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
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
        <View style={styles.header}>
          <Text style={styles.title}>{data?.tourPackageQueryName}</Text>
          <Text style={styles.text}>
            {locations?.find(location => location.id === data.locationId)?.label}
          </Text>
          <Text style={styles.text}>
            {data?.numDaysNight} - {parseHTMLContent(locations?.find(location => location.id === data.locationId)?.label ?? '')}
          </Text>
        </View>

        {selectedOption !== 'Supplier' && (
          <View style={styles.customerInfo}>
            <Text>Customer: {data?.customerName} | {data?.customerNumber} |</Text>
            <Text>Assigned To: {data?.assignedTo} | {data?.assignedToMobileNumber} | {data?.assignedToEmail}</Text>
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
        <View style={styles.card} >
          <View style={styles.section}>
            <Text style={styles.title}>Location</Text>
            <Text style={styles.text}>{locations?.find(location => location.id === data.locationId)?.label}</Text>
          </View>

          <View style={styles.section}>
            {data.numDaysNight !== '' && (
              <><Text style={styles.title}>Duration</Text><Text style={styles.text}>{data.numDaysNight}</Text></>
            )}
          </View>

          <View style={styles.flexRow}>
            {data.tourStartsFrom && (
              <Text style={styles.text}>Period: {format(new Date(data.tourStartsFrom), 'dd-MM-yyyy')}</Text>
            )}
            {data.tourEndsOn && (
              <Text style={[styles.text, styles.marginLeft]}>To {format(new Date(data.tourEndsOn), 'dd-MM-yyyy')}</Text>
            )}
          </View>

          <View style={styles.grid}>
            {data.transport !== '' && (
              <View style={styles.column}>
                <Text style={styles.title}>Transport</Text>
                <Text style={styles.text}>{data.transport}</Text>
              </View>
            )}
            {data.pickup_location !== '' && (
              <View style={styles.column}>
                <Text style={styles.title}>Pickup</Text>
                <Text style={styles.text}>{data.pickup_location}</Text>
              </View>
            )}
            {data.drop_location !== '' && (
              <View style={styles.column}>
                <Text style={styles.title}>Drop</Text>
                <Text style={styles.text}>{data.drop_location}</Text>
              </View>
            )}
            {data.numAdults !== '' && (
              <View style={styles.column}>
                <Text style={styles.title}>Adults</Text>
                <Text style={styles.text}>{data.numAdults}</Text>
              </View>
            )}
            {data.numChild5to12 !== '' && (
              <View style={styles.column}>
                <Text style={styles.title}>Children (5 - 12 Years)</Text>
                <Text style={styles.text}>{data.numChild5to12}</Text>
              </View>
            )}
            {data.numChild0to5 !== '' && (
              <View style={styles.column}>
                <Text style={styles.title}>Children (0 - 5 Years)</Text>
                <Text style={styles.text}>{data.numChild0to5}</Text>
              </View>
            )}
          </View>
        </View>

        {selectedOption !== 'Supplier' && (
          <View style={styles.card} >
            <View style={styles.cardContainer}>
              <View style={styles.cardContent}>
                {/* Price per Adult on the left side */}
                {data.pricePerAdult !== '' && (
                  <View style={styles.priceItem}>
                    <Text style={styles.cardTitle}>Price per Adult:</Text>
                    <Text style={styles.cardText}>{data.pricePerAdult}</Text>
                  </View>
                )}

                {/* Price for Children Section on the right side */}
                <View style={styles.priceSection}>
                  {data.pricePerChildOrExtraBed !== '' && (
                    <View style={styles.priceItem}>
                      <Text style={styles.cardTitle}>Price for Triple Occupancy:</Text>
                      <Text style={styles.cardText}>{data.pricePerChildOrExtraBed}</Text>
                    </View>
                  )}
                  {data.pricePerChild5to12YearsNoBed !== '' && (
                    <View style={styles.priceItem}>
                      <Text style={styles.cardTitle}>Price per Child (5-12 Years - No bed):</Text>
                      <Text style={styles.cardText}>{data.pricePerChild5to12YearsNoBed}</Text>
                    </View>
                  )}
                  {data.pricePerChildwithSeatBelow5Years !== '' && (
                    <View style={styles.priceItem}>
                      <Text style={styles.cardTitle}>Price per Child with Seat (Below 5 Years):</Text>
                      <Text style={styles.cardText}>{data.pricePerChildwithSeatBelow5Years}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedOption !== 'Supplier' && data.totalPrice !== '' && (
          <View style={styles.card} >
            <View style={styles.cardContainer}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Total Price:</Text>
                <Text style={styles.cardText}>{data.totalPrice}</Text>
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
          <View key = {index} style={styles.card} >
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
                <View style={styles.card} >
                  <View style={styles.hotelContainer}>
                    <Text style={styles.cardTitle}>Stay</Text>
                    {hotels?.find(hotel => hotel.id === itinerary.hotelId)?.images.length === 1 ? (
                      <View style={styles.cardContent}>
                        <Image
                          src={hotels?.find(hotel => hotel.id === itinerary.hotelId)?.images[0].url || ''}
                          style={styles.hotelImage}
                        />
                        <View>
                          <Text style={styles.cardTitle}>Hotel:</Text>
                          <Text style={styles.cardText}>{hotels?.find(hotel => hotel.id === itinerary.hotelId)?.name}</Text>

                          {itinerary.numberofRooms && (
                            <>
                              <Text style={styles.cardTitle}>Number of Rooms:</Text>
                              <Text style={styles.cardText}>{itinerary.numberofRooms}</Text>
                            </>
                          )}

                          {itinerary.roomCategory && (
                            <>
                              <Text style={styles.cardTitle}>Room Category:</Text>
                              <Text style={styles.cardText}>{itinerary.roomCategory}</Text>
                            </>
                          )}

                          {itinerary.mealsIncluded && (
                            <>
                              <Text style={styles.cardTitle}>Meal Plan:</Text>
                              <Text style={styles.cardText}>{itinerary.mealsIncluded}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    ) : (
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
                          <Text style={styles.cardTitle}>Hotel:</Text>
                          <Text style={styles.cardText}>{hotels?.find(hotel => hotel.id === itinerary.hotelId)?.name}</Text>

                          {itinerary.numberofRooms && (
                            <>
                              <Text style={styles.cardTitle}>Number of Rooms:</Text>
                              <Text style={styles.cardText}>{itinerary.numberofRooms}</Text>
                            </>
                          )}

                          {itinerary.roomCategory && (
                            <>
                              <Text style={styles.cardTitle}>Room Category:</Text>
                              <Text style={styles.cardText}>{itinerary.roomCategory}</Text>
                            </>
                          )}

                          {itinerary.mealsIncluded && (
                            <>
                              <Text style={styles.cardTitle}>Meal Plan:</Text>
                              <Text style={styles.cardText}>{itinerary.mealsIncluded}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Activities Section */}
              {itinerary.activities && itinerary.activities.length > 0 && (
                <View style={styles.card} >
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

        <View style={styles.grid}>
          {/* Remarks Section */}
          {data.remarks !== '' && (
            <View style={styles.card}>
              <Text style={styles.title}>Remarks</Text>
              <Text style={styles.text}> {parseHTMLContent(data.remarks || '')} </Text>
            </View>
          )}

          {/* Inclusions Section */}
          {data.inclusions && (
            <View style={styles.card}>
              <Text style={styles.title}>Inclusions</Text>
              <Text style={styles.text}> {parseHTMLContent(data.inclusions || '')} </Text>
            </View>
          )}

          {/* Exclusions Section */}
          {data.exclusions && (
            <View style={styles.card}>
              <Text style={styles.title}>Exclusions</Text>
              <Text style={styles.text}> {parseHTMLContent(data.exclusions || '')} </Text>
            </View>
          )}

          {/* Important Notes Section */}
          {data.importantNotes && (
            <View style={styles.card}>
              <Text style={styles.title}>Important Notes</Text>
              <Text style={styles.text} > {parseHTMLContent(data.importantNotes || '')} </Text>
            </View>
          )}

          {/* Payment Policy Section */}
          {data.paymentPolicy && (
            <View style={styles.card}>
              <Text style={styles.title}>Payment Policy</Text>
              <Text style={styles.text} > {parseHTMLContent(data.paymentPolicy || '')} </Text>
            </View>
          )}

          {/* Useful Tips Section */}
          {data.usefulTip && (
            <View style={styles.card}>
              <Text style={styles.title}>Useful Tips</Text>
              <Text style={styles.text} > {parseHTMLContent(data.usefulTip || '')} </Text>
            </View>
          )}

          {/* Cancellation Policy Section */}
          {data.cancellationPolicy && (
            <View style={styles.card}>
              <Text style={styles.title}>Cancellation Policy</Text>
              <Text style={styles.text} > {parseHTMLContent(data.cancellationPolicy || '')} </Text>
            </View>
          )}

          {/* Airline Cancellation Policy Section */}
          {data.airlineCancellationPolicy && (
            <View style={styles.card}>
              <Text style={styles.title}>Airline Cancellation Policy</Text>
              <Text style={styles.text} > {parseHTMLContent(data.airlineCancellationPolicy || '')} </Text>
            </View>
          )}

          {/* Terms and Conditions Section */}
          {data.termsconditions && (
            <View style={styles.card}>
              <Text style={styles.title}>Terms and Conditions</Text>
              <Text style={styles.text}> {parseHTMLContent(data.termsconditions || '')} </Text>
            </View>
          )}
        </View>

        {selectedOption !== 'Empty' && selectedOption !== 'Supplier' && (
          <View style={styles.card}>
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
          <View style={styles.card}>
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
    </Document>
  )
}
export default GenerateMyPDF;