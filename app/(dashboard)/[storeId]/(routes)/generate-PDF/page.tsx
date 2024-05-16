'use client'
import { useState } from 'react';

const MyComponent = () => {
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const handleGeneratePDF = async () => {
        setIsGeneratingPDF(true);
        const url = 'https://aagamholidays.com'; // The URL you want to generate a PDF from

        try {
            // Make a request to your API route, passing the URL as a query parameter
            const response = await fetch(`/api/generatePDF?url=${encodeURIComponent(url)}`);
            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }
            const data = await response.json();

            // Handle successful PDF generation
            console.log('PDF generated successfully!', data);

            // Optionally, if your API returns the path or URL to the generated PDF
            window.location.href = data.pdfUrl; // Redirect user to the PDF URL
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div>
            <button onClick={handleGeneratePDF} disabled={isGeneratingPDF}>
                {isGeneratingPDF ? 'Generating PDF...' : 'Generate PDF'}
            </button>
        </div>
    );
};

export default MyComponent;