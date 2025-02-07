"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const GeneratePDFPage = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Waiting to generate PDF...");
  const searchParams = useSearchParams();
  const router = useRouter(); // ✅ Import Next.js router for navigation
  const url = searchParams.get("url"); // Get URL from query params

  const generatePDFfromURL = async () => {
    if (!url) {
      setMessage("❌ No URL provided. Please provide a valid URL.");
      setTimeout(() => router.push("/tourPackageQuery"), 3000); // ✅ Redirect after delay
      return;
    }

    setLoading(true);
    setMessage("⏳ Generating PDF, please wait...");

    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const pdfUrl = window.URL.createObjectURL(blob);

      setMessage("✅ PDF generated successfully! Downloading...");

      // Create a download link
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = "GeneratedPDF.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // ✅ Redirect to `/tourpackagequery` after 5 seconds
      setTimeout(() => router.push("/tourPackageQuery"), 5000);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      setMessage("❌ Error generating PDF. Please try again.");
      
      // ✅ Redirect to `/tourpackagequery` after 3 seconds on error
      setTimeout(() => router.push("/tourPackageQuery"), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Automatically generate PDF if a URL is provided
  useEffect(() => {
    if (url) {
      generatePDFfromURL();
    }
  }, [url]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <p className={`text-xl ${loading ? "text-blue-500" : "text-gray-700"}`}>
        {message}
      </p>
      {loading && <p className="text-sm text-gray-500 mt-2">This may take a few seconds...</p>}
    </div>
  );
};

export default GeneratePDFPage;
