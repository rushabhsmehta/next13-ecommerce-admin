'use client'
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
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
  selectedOption : string;
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
  page: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    padding: 10,
    backgroundColor: '#f5f5f5', // Add a base color that matches the gradient
    color: 'transparent',
    fontWeight: 'bold',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text', // For web compatibility
  },
  section: {
    marginBottom: 10,
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    marginRight: 10, // Space between image and text
    float: 'left', // Float the image to the left
  },

  tourImage: {
    width: 200,
    height: 200,
    marginRight: 10, // Space between image and text
    float: 'center', // Float the image to the left
  },

  title: {
    fontSize: 18,
    marginBottom: 5,
    color: '#333',
    fontWeight: 'bold',
  },

  textWrapperDetails: {
    padding: 10, // Add some padding around the section
    flexDirection: 'column', // Ensures the elements are stacked vertically
    justifyContent: 'flex-start', // Align items to the start
    alignItems: 'flex-start', // Align items to the start
  },

  textWrapper: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  text: {
    fontSize: 12,
    color: '#555',
    flex: 1, // Ensure the text takes up the remaining space
  },
  hotelContainer: {
    marginVertical: 10,
  },
  hotelTextContainer: {
    flex: 2,  // Adjust width as needed
    marginRight: 10,  // Space between text and image
  },

  hotelImage: {
    flex: 1,  // Adjust width as needed
    height: 100,
    width: 100,
  },
  hotelTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  hotelText: {
    fontSize: 12,
  },
  lineBreak: {
    marginBottom: 10
  },

  container: {
    padding: 20,
  },
  card: {
    marginBottom: 20,
    padding: 10,
    border: '1px solid #ddd',
    borderRadius: 5,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardContent: {
    fontSize: 12,
    marginBottom: 10,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 10,
  },
  contactInfo: {
    fontSize: 12,
    marginBottom: 10,
  },
  link: {
    color: '#0000EE',
    textDecoration: 'underline',
  },
  assignedToWrapper: {
    marginTop: 15, // Add space between Customer and Assigned To section
  },
  childPriceWrapper: {
    marginTop: 10,
    marginBottom: 10,
    // You can add more styles as needed, such as padding, border, background color, etc.
  },
  flightDetailsWrapper: {
    marginBottom: 15,
    padding: 10,
    border: '1px solid #ddd',
    borderRadius: 5,
    backgroundColor: '#fafafa',
  },
  flightRoute: {
    marginTop: 10,
    padding: 5,
    borderTop: '1px solid #ddd',
    borderBottom: '1px solid #ddd',
    borderRadius: 5,
    backgroundColor: '#f9f9f9',
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
          {locations?.find(location => location.id === data.locationId)?.label}
          <Text style={styles.text}>
            {data?.numDaysNight} - {parseHTMLContent(locations?.find(location => location.id === data.locationId)?.label ?? '')}
          </Text>
        </View>


        {selectedOption !== 'Supplier' && (
          <View style={styles.section}>
            <Text style={styles.text}>
              Customer: {data.customerName} | {data.customerNumber}
            </Text>
            <View style={styles.assignedToWrapper}>
              <Text style={styles.text}>
                Assigned To: {data.assignedTo} | {data.assignedToMobileNumber} | {data.assignedToEmail}
              </Text>
            </View>
          </View>
        )}


        {/* Tour Details Section */}
        <View style={styles.section}>
          <Text style={styles.title}>Tour Details</Text>
          {/* ... Add details from TourPackagePDFData */}
        </View>

        {/* Images */}
        {data.images && data.images.length > 0 && (
          <View style={styles.section}>
            {data.images.map((image, index) => (
              <Image key={index} style={styles.tourImage} src={image.url} />
            ))}
          </View>
        )}

        {/* Tour Package Details */}
        <View style={styles.section}><Text style={styles.text}>Location: {locations?.find(location => location.id === data.locationId)?.label}</Text></View>
        <View style={styles.section}><Text style={styles.text}>Duration: {data.numDaysNight}</Text></View>
        <View style={styles.section}><Text style={styles.text}>
          Period: {data.tourStartsFrom ? format(new Date(data.tourStartsFrom), 'dd-MM-yyyy') : ''}
          {data.tourEndsOn ? ` To ${format(new Date(data.tourEndsOn), 'dd-MM-yyyy')}` : ''}
        </Text></View>
        <View style={styles.section}><Text style={styles.text}>Transport: {data.transport}</Text></View>
        <View style={styles.section}><Text style={styles.text}>Pickup: {data.pickup_location}</Text></View>
        <View style={styles.section}><Text style={styles.text}>Drop: {data.drop_location}</Text></View>
        <View style={styles.section}><Text style={styles.text}>Adults: {data.numAdults}</Text></View>
        <View style={styles.section}><Text style={styles.text}>Children (5 - 12 Years): {data.numChild5to12}</Text></View>
        <View style={styles.section}><Text style={styles.text}>Children (0 - 5 Years): {data.numChild0to5}</Text></View>



        {/* Price Section  */}
        { selectedOption !== 'Supplier' && (
          <View style={styles.section}>
            <View style={styles.textWrapper}>
              {data.pricePerAdult !== '' && (
                <Text style={styles.text}>Price per Adult: {data.pricePerAdult}</Text>
              )}
              <View style={styles.childPriceWrapper}>
                {data.pricePerChildOrExtraBed !== '' && (
                  <Text style={styles.text}>Price for Triple Occupancy: {data.pricePerChildOrExtraBed}</Text>
                )}
                {data.pricePerChild5to12YearsNoBed !== '' && (
                  <Text style={styles.text}>Price per Child (5-12 Years - No bed): {data.pricePerChild5to12YearsNoBed}</Text>
                )}
                {data.pricePerChildwithSeatBelow5Years !== '' && (
                  <Text style={styles.text}>Price per Child with Seat (Below 5 Years): {data.pricePerChildwithSeatBelow5Years}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Total Price */}
        { selectedOption !== 'Supplier' && data.totalPrice !== '' && (
          <View style={styles.section}>
            <Text style={styles.text}>Total Price: {data.totalPrice}</Text>
          </View>
        )}

        {/* Tour Highlights */}
        {data.tour_highlights !== '' && (
          <View style={styles.section}>
            <Text style={styles.text}>Tour Highlights:</Text>
            <Text style={styles.text}>{data.tour_highlights}</Text>
          </View>
        )}
 
        {/* Flight Details */}
        {data.flightDetails.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.title}>Flight Details</Text>
            {data.flightDetails.map((flight, index) => (
              <View key={index} style={styles.flightDetailsWrapper}>
                <Text style={styles.text}>Date: {flight.date}</Text>
                <Text style={styles.text}>
                  {flight.flightName} | Flight No: {flight.flightNumber}
                </Text>
                <View style={styles.flightRoute}>
                  <Text style={styles.text}>From: {flight.from}</Text>
                  <Text style={styles.text}>Departure Time: {flight.departureTime}</Text>
                  <Text style={styles.text}>To: {flight.to}</Text>
                  <Text style={styles.text}>Arrival Time: {flight.arrivalTime}</Text>
                  <Text style={styles.text}>Duration: {flight.flightDuration}</Text>
                </View>
              </View>
            ))}
          </View>
        )}


        {/* Iterate through itineraries and create sections */}
        {data.itineraries && data.itineraries.map((itinerary, index) => (
          <View key={index} style={styles.section}>
            {/* Title without wrapping */}
            <Text style={styles.title}>
              Day {itinerary.dayNumber}: {itinerary.days} - {parseHTMLContent(itinerary.itineraryTitle || '')}
            </Text>

            {/* Image and Description */}
            <View style={styles.textWrapper}>
              {itinerary.itineraryImages && (
                <Image style={styles.image} src={itinerary.itineraryImages[0].url} />
              )}
              <Text style={styles.text}>
                {parseHTMLContent(
                  itinerary.itineraryDescription?.replace(/<\/p>/g, '\n')
                    .replace(/<p>/g, '')
                    .replace(/<br\s*\/?>/g, '\n')
                    .replace(/→/g, '→')
                    .replace(/<!--.*?-->/g, '') // Remove comments
                    .replace(/<\/?br\s*\/?>/g, '\n') // Replace <br> tags with newlines
                    .replace(/<\/?strong>/g, '') // Remove <strong> tags if not needed
                    .replace(/→/g, '→') // Ensure special characters are correctly preserved
                  || '')}
              </Text>
            </View>

            {/* Hotel Section */}

            {itinerary.hotelId && hotels?.find(hotel => hotel.id === itinerary.hotelId) && (
              <View style={styles.section}><Text style={styles.title}> Hotels </Text></View>
            )}

            {itinerary.hotelId && hotels?.find(hotel => hotel.id === itinerary.hotelId) && (
              <View style={styles.hotelContainer}>
                {/* Hotel Name at the Top */}
                <Text style={styles.hotelTitle}>{hotels.find(hotel => hotel.id === itinerary.hotelId)?.name}</Text>

                <View style={styles.textWrapper}>
                  {/* Hotel Descriptions on the Left */}
                  <View style={styles.hotelTextContainer}>
                    {/* Room Category */}
                    {itinerary.roomCategory && (
                      <>
                        <Text style={styles.hotelText}>Room Category: {itinerary.roomCategory}</Text>
                      </>
                    )}

                    {/* Meals Included */}
                    {itinerary.mealsIncluded && (
                      <>
                        <Text style={styles.hotelText}>Meal Plan: {itinerary.mealsIncluded}</Text>
                      </>
                    )}
                  </View>

                  {/* Hotel Image on the Right */}
                  {hotels.find(hotel => hotel.id === itinerary.hotelId)?.images.map((image, imgIndex) => (
                    <Image key={imgIndex} style={styles.hotelImage} src={image.url} />
                  ))}
                </View>
              </View>
            )}

            {/* Activities Section */}
            {itinerary.activities && itinerary.activities.length > 0 && (
              <View>
                <Text style={styles.title}>Activities:</Text>
                {itinerary.activities.map((activity, activityIndex) => (
                  <View key={activityIndex}>
                    <Text style={styles.text}>{activity.activityTitle}</Text>
                    <Text style={styles.text}>{activity.activityDescription}</Text>
                    {activity.activityImages[0] && (
                      <Image style={styles.image} src={activity.activityImages[0].url} />
                    )}
                    {itinerary.activities && activityIndex < itinerary.activities?.length - 1 && (
                      <View style={customStyles.separator} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Inclusions Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Inclusions</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.inclusions || '')}</Text>
        </View>

        {/* Exclusions Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Exclusions</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.exclusions || '')}</Text>
        </View>

        {/* Important Notes Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Important Notes</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.importantNotes || '')}</Text>
        </View>

        {/* Payment Policy Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Payment Policy</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.paymentPolicy || '')}</Text>
        </View>

        {/* Useful Tips Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Useful Tips</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.usefulTip || '')}</Text>
        </View>

        {/* Cancellation Policy Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Cancellation Policy</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.cancellationPolicy || '')}</Text>
        </View>

        {/* Airline Cancellation Policy Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Airline Cancellation Policy</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.airlineCancellationPolicy || '')}</Text>
        </View>

        {/* Terms and Conditions Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Terms and Conditions</Text>
          <Text style={styles.cardContent}>{parseHTMLContent(data.termsconditions || '')}</Text>
        </View>

        {
          selectedOption !== 'Empty' && selectedOption !== 'Supplier' && (
            <View style={styles.card}>
              <Image style={styles.logo} src={companyInfo.AH.logo} />
              <View>
                <Text style={styles.contactInfo}>{companyInfo.AH.address}</Text>
                <Text style={styles.contactInfo}>Phone: {companyInfo.AH.phone}</Text>
                <Text style={styles.contactInfo}>Email: <Text style={styles.link}>{companyInfo.AH.email}</Text></Text>
                <Text style={styles.contactInfo}>Website: <Text style={styles.link}>{companyInfo.AH.website || '#'}</Text></Text>
              </View>
            </View>
          )}
      </Page>


    </Document>
  );
}

export default GenerateMyPDF;