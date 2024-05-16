import { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

// Handler for GET requests
export async function GET(req: NextApiRequest, res: NextApiResponse) {
    console.log('PDF generation API called with URL:', req.query.url); // Log the API call with the URL parameter

    const url = req.query.url as string; // Get the URL to convert to PDF

    try {
        const browser = await puppeteer.launch(); // Launch a headless Chrome instance
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0' }); // Wait for page to load

        const pdfBuffer = await page.pdf({ format: 'A4', margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' } }); // Generate PDF with options
        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="generated.pdf"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to generate PDF' });
    }
}