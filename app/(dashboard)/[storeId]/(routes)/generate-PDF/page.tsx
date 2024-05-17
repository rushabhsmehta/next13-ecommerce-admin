
import { useState } from 'react';
const puppeteer = require('puppeteer');

const url = 'https://aagamholidays.com/tourPackage/e44a13d2-27f8-4bbf-b872-5de03e31d417';
const outputfile = 'generated.pdf';

export default function generateNewPDF() {

    async function pdfGenFunction(url: any, outputfile: string) {
        try {
            const browser = await puppeteer.launch({ headless: false });
            const page = await browser.newPage();

            await page.goto(url, { waitUntil: 'networkidle0' });

            await page.pdf({ path: outputfile, format: 'A4', margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' } });

            await browser.close();
        }
        catch (error) {
            console.error(error);
        }

    }
    pdfGenFunction(url, outputfile)
}