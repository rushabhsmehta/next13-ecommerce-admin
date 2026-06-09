"use client";

import dynamic from "next/dynamic";

const ViewMyPDF = dynamic(() => import("./ViewMyPDF"), {
  ssr: false,
  loading: () => <p>Loading PDF viewer...</p>,
});

export default ViewMyPDF;
