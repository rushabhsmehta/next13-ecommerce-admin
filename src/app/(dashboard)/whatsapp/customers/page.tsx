'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Download,
  Filter,
  RefreshCw,
  Upload,
  Users,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  Tag,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import clsx from 'clsx';

interface WhatsAppCustomerRow {
  id: string;
  firstName: string;
  lastName: string | null;
  phoneNumber: string;
  email: string | null;
  tags: string[];
  isOptedIn: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TagSummary {
  tag: string;
  count: number;
}

interface CustomerResponse {
  success: boolean;
  data: WhatsAppCustomerRow[];
  tags: TagSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

type PendingCustomer = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  tags: string;
  notes: string;
};

const DEFAULT_FORM: PendingCustomer = {
  firstName: '',
  lastName: '',
  phoneNumber: '',
  email: '',
  tags: '',
  notes: '',
};

function parseTagInput(raw: string) {
  if (!raw) {
    return undefined;
  }
  const tags = raw
    .split(/[,|]/)
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
  return tags.length ? tags : undefined;
}

export default function WhatsAppCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [customers, setCustomers] = useState<WhatsAppCustomerRow[]>([]);
  const [tagSummary, setTagSummary] = useState<TagSummary[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [formValues, setFormValues] = useState<PendingCustomer>(DEFAULT_FORM);
  const [csvSummary, setCsvSummary] = useState<{ created: number; updated: number; total: number } | null>(null);
  const [optInFilter, setOptInFilter] = useState<'all' | 'opted-in' | 'opted-out'>('all');

  useEffect(() => {
    const handle = setTimeout(() => setSearchTerm(searchInput), 400);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim());
      }
      if (selectedTags.length) {
        params.set('tags', selectedTags.join(','));
      }
      if (optInFilter !== 'all') {
        params.set('isOptedIn', optInFilter === 'opted-in' ? 'true' : 'false');
      }
      params.set('page', String(page));
      params.set('limit', '100');
      const response = await fetch(`/api/whatsapp/customers?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch customers' }));
        throw new Error(error.error || 'Failed to fetch customers');
      }
      const payload = (await response.json()) as CustomerResponse;
      setCustomers(
        payload.data.map((customer) => ({
          ...customer,
          tags: Array.isArray(customer.tags)
            ? (customer.tags as unknown as string[])
            : [],
        }))
      );
      setTagSummary(payload.tags);
      setTotal(payload.pagination.total);
    } catch (error: any) {
      console.error('Error loading WhatsApp customers', error);
      toast.error(error?.message || 'Could not load customers');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedTags, page, optInFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const columns = useMemo<ColumnDef<WhatsAppCustomerRow>[]>(
    () => [
      {
        accessorKey: 'firstName',
        header: 'Name',
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-semibold">
              {row.original.firstName} {row.original.lastName ? row.original.lastName : ''}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {row.original.phoneNumber}
              </span>
              {row.original.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {row.original.email}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        id: 'tags',
        header: 'Tags',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.tags?.length ? (
              row.original.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No tags</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'isOptedIn',
        header: 'Opt-In Status',
        cell: ({ row }) => (
          <Badge
            className={clsx('flex items-center gap-1', {
              'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300': row.original.isOptedIn,
              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300': !row.original.isOptedIn,
            })}
          >
            {row.original.isOptedIn ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {row.original.isOptedIn ? 'Opted In' : 'Opted Out'}
          </Badge>
        ),
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: ({ row }) => (
          row.original.notes ? (
            <span className="text-sm text-muted-foreground line-clamp-2">{row.original.notes}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete customer</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this WhatsApp customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This only deletes the record from the WhatsApp customer directory. Existing campaigns will keep past recipients.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/whatsapp/customers/${row.original.id}`, { method: 'DELETE' });
                      if (!response.ok) {
                        const error = await response.json().catch(() => ({ error: 'Failed to delete customer' }));
                        throw new Error(error.error || 'Failed to delete customer');
                      }
                      toast.success('Customer removed');
                      fetchCustomers();
                    } catch (error: any) {
                      console.error('Failed to delete customer', error);
                      toast.error(error?.message || 'Could not delete customer');
                    }
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ),
      },
    ],
    [fetchCustomers]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        firstName: formValues.firstName.trim(),
        lastName: formValues.lastName.trim() || undefined,
        phoneNumber: formValues.phoneNumber.trim(),
        email: formValues.email.trim() || undefined,
        tags: parseTagInput(formValues.tags),
        notes: formValues.notes.trim() || undefined,
        isOptedIn: true,
      };
      if (!payload.firstName || !payload.phoneNumber) {
        toast.error('First name and phone number are required');
        return;
      }
      const response = await fetch('/api/whatsapp/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create customer' }));
        throw new Error(error.error || 'Failed to create customer');
      }
      toast.success('Customer added to WhatsApp list');
      setFormValues(DEFAULT_FORM);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error creating WhatsApp customer', error);
      toast.error(error?.message || 'Could not create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) {
      return;
    }
    const file = event.target.files[0];
    setImporting(true);
    setCsvSummary(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/whatsapp/customers/import', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to import customers' }));
        throw new Error(error.error || 'Failed to import customers');
      }
      const payload = await response.json();
      toast.success('CSV import completed');
      setCsvSummary(payload.summary);
      fetchCustomers();
    } catch (error: any) {
      console.error('Error importing WhatsApp customers', error);
      toast.error(error?.message || 'Could not import customers');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const activeFilters = selectedTags.length + (optInFilter === 'all' ? 0 : 1) + (searchTerm ? 1 : 0);

  return (
    <div className="space-y-8 p-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-sm">
                <Users className="h-10 w-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">WhatsApp Customer Directory</h1>
                <p className="text-emerald-50">
                  Maintain a dedicated list of WhatsApp-ready contacts, separate from your CRM customers.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 text-right">
            <span className="text-sm uppercase tracking-wide text-emerald-100">Total Customers</span>
            <span className="text-3xl font-bold">{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Customers</CardTitle>
                <CardDescription>Filter and manage WhatsApp-specific contacts.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Input
                    placeholder="Search by name, email, or phone"
                    value={searchInput}
                    onChange={(event) => {
                      setPage(1);
                      setSearchInput(event.target.value);
                    }}
                    className="w-72"
                  />
                  <Filter className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={optInFilter === 'all' ? 'outline' : 'secondary'}
                    onClick={() => {
                      setOptInFilter('all');
                      setPage(1);
                    }}
                  >
                    All
                  </Button>
                  <Button
                    variant={optInFilter === 'opted-in' ? 'default' : 'outline'}
                    onClick={() => {
                      setOptInFilter('opted-in');
                      setPage(1);
                    }}
                  >
                    Opted In
                  </Button>
                  <Button
                    variant={optInFilter === 'opted-out' ? 'default' : 'outline'}
                    onClick={() => {
                      setOptInFilter('opted-out');
                      setPage(1);
                    }}
                  >
                    Opted Out
                  </Button>
                </div>
                <Button variant="outline" onClick={fetchCustomers}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {tagSummary.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tagSummary.map((tag) => (
                    <Button
                      key={tag.tag}
                      variant={selectedTags.includes(tag.tag) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setPage(1);
                        setSelectedTags((current) =>
                          current.includes(tag.tag)
                            ? current.filter((item) => item !== tag.tag)
                            : [...current, tag.tag]
                        );
                      }}
                      className="flex items-center gap-2"
                    >
                      <Tag className="h-3 w-3" />
                      {tag.tag}
                      <Badge variant={selectedTags.includes(tag.tag) ? 'secondary' : 'outline'}>
                        {tag.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              )}

              {activeFilters > 0 && (
                <div className="text-sm text-muted-foreground">
                  Filters applied: {activeFilters}
                  <Button
                    variant="link"
                    className="ml-2 p-0"
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                      setSelectedTags([]);
                      setOptInFilter('all');
                      setPage(1);
                    }}
                  >
                    Clear all
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-green-500" />
                </div>
              ) : (
                <DataTable columns={columns} data={customers} enablePagination={false} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                Add Customer
              </CardTitle>
              <CardDescription>Manually create a WhatsApp-only customer record.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formValues.firstName}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, firstName: event.target.value }))}
                      placeholder="Aarav"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={formValues.lastName}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, lastName: event.target.value }))}
                      placeholder="Shah"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phoneNumber">Mobile Number *</Label>
                    <Input
                      id="phoneNumber"
                      value={formValues.phoneNumber}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={formValues.email}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="customer@example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma or | separated)</Label>
                    <Input
                      id="tags"
                      value={formValues.tags}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="VIP, Bali"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formValues.notes}
                      onChange={(event) => setFormValues((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Reminders, travel preferences, etc."
                      rows={3}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Customer'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-blue-600" />
                Bulk Import
              </CardTitle>
              <CardDescription>Upload a CSV file with WhatsApp customer details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-dashed border-muted p-4">
                <div className="space-y-1 text-sm">
                  <p className="font-medium">CSV Format</p>
                  <p className="text-muted-foreground">
                    Required columns: First Name, Mobile Number. Optional: Last Name, Email, Tags, Notes.
                  </p>
                </div>
                <Link
                  href="/samples/whatsapp-customers-sample.csv"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Sample file
                </Link>
              </div>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  id="whatsapp-customer-csv"
                  className="hidden"
                  onChange={handleCsvImport}
                />
                <Button
                  type="button"
                  className="w-full"
                  variant="secondary"
                  onClick={() => document.getElementById('whatsapp-customer-csv')?.click()}
                  disabled={importing}
                >
                  {importing ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </div>
              {csvSummary && (
                <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-300">
                  Imported {csvSummary.total} rows. Added {csvSummary.created} new customers, updated {csvSummary.updated} existing records.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How this list is used</CardTitle>
              <CardDescription>WhatsApp campaigns can target these customers by tags, name, or phone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                This directory is separate from your travellers or leads stored in the primary CRM. Only contacts here are available for WhatsApp campaign targeting.
              </p>
              <p>
                Use tags to segment audiences (e.g., “Summer2025”, “Bali”, “High Value”). You can combine multiple filters when selecting recipients inside campaign creation.
              </p>
              <p>
                CSV uploads automatically normalise mobile numbers to E.164 format and merge duplicates based on phone number.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
