"use client";

import { useState } from "react";
import { Download, Users, FileText, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";

export default function ExportContactsPage() {
  const [loadingInquiries, setLoadingInquiries] = useState(false);
  const [loadingQueries, setLoadingQueries] = useState(false);

  const handleExportInquiries = async () => {
    try {
      setLoadingInquiries(true);
      console.log('Starting inquiries export...');
      
      const response = await fetch('/api/export/inquiries-contacts');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to export inquiries: ${response.status} ${errorText}`);
      }

      console.log('Creating blob...');
      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inquiries-contacts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      console.log('Clicking download link...');
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast.success('Inquiries contacts exported successfully');
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleExportQueries = async () => {
    try {
      setLoadingQueries(true);
      console.log('Starting queries export...');
      
      const response = await fetch('/api/export/queries-contacts');
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to export queries: ${response.status} ${errorText}`);
      }

      console.log('Creating blob...');
      const blob = await response.blob();
      console.log('Blob size:', blob.size);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tour-queries-contacts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      console.log('Clicking download link...');
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      toast.success('Tour queries contacts exported successfully');
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingQueries(false);
    }
  };

  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 pt-4 md:p-8 md:pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Export Customer Contacts</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Inquiries Export Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle>Inquiries Contacts</CardTitle>
              </div>
              <CardDescription>
                Export all customer contact information from inquiries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This export includes:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Customer Name & Mobile Number
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Location & Status
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Journey & Inquiry Dates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Associate Partner Info (Name, Mobile, Email)
                  </li>
                </ul>
              </div>
              <Button
                onClick={handleExportInquiries}
                disabled={loadingInquiries}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {loadingInquiries ? 'Exporting...' : 'Export Inquiries CSV'}
              </Button>
            </CardContent>
          </Card>

          {/* Tour Queries Export Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Tour Queries Contacts</CardTitle>
              </div>
              <CardDescription>
                Export all customer contact information from tour package queries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This export includes:
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Query Number & Customer Details
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Original Inquiry Contact Info
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Location & Tour Start Date
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    Associate Partner Info (Name, Mobile, Email)
                  </li>
                </ul>
              </div>
              <Button
                onClick={handleExportQueries}
                disabled={loadingQueries}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {loadingQueries ? 'Exporting...' : 'Export Queries CSV'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Export Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">File Format</h4>
              <p className="text-sm text-muted-foreground">
                All exports are in CSV (Comma-Separated Values) format, which can be opened in Excel, Google Sheets, or any spreadsheet application.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Data Privacy</h4>
              <p className="text-sm text-muted-foreground">
                These exports contain sensitive customer contact information. Please handle the downloaded files securely and in compliance with data protection regulations.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">File Naming</h4>
              <p className="text-sm text-muted-foreground">
                Files are automatically named with the current date (e.g., inquiries-contacts-2025-10-01.csv) to help you organize exports by date.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
