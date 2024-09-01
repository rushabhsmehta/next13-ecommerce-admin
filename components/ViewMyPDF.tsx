"use client";

import dynamic from "next/dynamic";
import GenerateMyPDF from "./GenerateMyPDF";
import { TourPackageQuery, Images, Itinerary, Activity, FlightDetails, Location, Hotel } from "@prisma/client"


interface ViewMyPDFProps {
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
    
}

const PDFViewer = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
    {
        ssr: false,
        loading: () => <p>Loading...</p>,
    },
);

const ViewMyPDF: React.FC<ViewMyPDFProps> = ({
    data,
    locations,
    hotels,
}) => (

    <PDFViewer style={{ width: "100%", height: "100vh" }}>
        <GenerateMyPDF data ={data} locations ={locations} hotels={hotels}/>
    </PDFViewer>
)

export default ViewMyPDF;