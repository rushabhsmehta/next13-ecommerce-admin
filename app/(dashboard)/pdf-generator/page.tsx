"use client";
import { useState } from "react";

export default function GeneratePDF() {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    const htmlContent =
      `
<html>
  <body>
    <!--StartFragment-->
    <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; height: 266px;">
      <caption style="margin-bottom: 10px; font-weight: bold; color: #333; font-size: 22px;">
        Pricing Details
      </caption>
      <thead>
        <tr>
          <th style="width: 50%; background: linear-gradient(to right, #ff0000, #ffa500); color: white; text-transform: uppercase; letter-spacing: 1px; padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; font-size: 16px;">
            Criteria
          </th>
          <th style="width: 50%; background: linear-gradient(to right, #ff0000, #ffa500); color: white; text-transform: uppercase; letter-spacing: 1px; padding: 12px 15px; text-align: left; border-bottom: 1px solid #ddd; font-size: 16px;" colspan="2">
            Price
          </th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #f2f2f2;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Per Person Cost&nbsp;</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            ₹
          </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Per Couple Cost&nbsp;</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            ₹
          </td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Per Person With Extra Bed/Mattress</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            ₹
          </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Child with Mattress (5 to 11)</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            ₹
          </td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Child without Mattress (5 to 11)</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            ₹
          </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Child below 5 years (With Seat - Parents Sharing Bed)</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            ₹
          </td>
        </tr>
        <tr style="background-color: #f2f2f2;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Child below 5 years Without Seat (Parents Sharing Bed)</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            Complimentary With Parents Sharing Bed
          </td>
        </tr>
        <tr style="background-color: #f9f9f9;">
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;">
            <strong>Air Fare</strong>
          </td>
          <td style="padding: 12px 15px; color: #555; border-bottom: 1px solid #ddd; font-size: 15px;" colspan="2">
            ₹
          </td>
        </tr>
      </tbody>
    </table>
    <!--EndFragment-->
  </body>
</html>
`;

    const response = await fetch("/api/generate-pdf", {
      method: "POST",
      body: JSON.stringify({ htmlContent }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "generated.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Failed to generate PDF");
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <button
        onClick={generatePDF}
        className="bg-blue-500 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? "Generating..." : "Download PDF"}
      </button>
    </div>
  );
}