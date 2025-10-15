'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock4,
  Filter,
  Link as LinkIcon,
  Loader2,
  MapPin,
  PackageSearch,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'react-hot-toast';

type Status = 'draft' | 'active' | 'inactive' | 'archived';
type SyncStatus = 'pending' | 'in_progress' | 'synced' | 'failed';

type CatalogSummary = {
  success: boolean;
  catalog: {
    id: string;
    metaCatalogId: string | null;
    name: string;
    currency: string;
    description: string | null;
  };
  stats: {
    totalPackages: number;
    byStatus: Record<string, number>;
    bySyncStatus: Record<string, number>;
    pendingSync: number;
  };
  metaConfigured: boolean;
  defaultCatalogId: string | null;
};

type TourPackageVariantRow = {
  id: string;
  name: string;
  description: string | null;
  heroImageUrl: string | null;
  priceOverride: string | number | null;
  availabilityNotes: string | null;
  status: Status;
  variant: {
    id: string;
    sku: string;
    price: string | number;
    salePrice: string | number | null;
    availability: string;
    imageUrl: string | null;
  };
};

type TourPackageRow = {
  id: string;
  title: string;
  subtitle: string | null;
  heroImageUrl: string | null;
  gallery: unknown;
  location: string | null;
  itinerarySummary: string | null;
  highlights: unknown;
  inclusions: unknown;
  exclusions: unknown;
  bookingUrl: string | null;
  termsAndConditions: string | null;
  basePrice: string | number | null;
  currency: string;
  seasonalAvailability: unknown;
  durationDays: number | null;
  durationNights: number | null;
  status: Status;
  syncStatus: SyncStatus;
  catalogProductId: string | null;
  retailerId: string | null;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
  updatedAt: string;
  product: {
    id: string;
    sku: string;
    name: string;
    description: string | null;
    price: string | number;
    currency: string;
    availability: string;
    imageUrl: string | null;
    metaProductId: string | null;
  };
  variants: TourPackageVariantRow[];
};

type PackagesResponse = {
  success: boolean;
  data: TourPackageRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type PackageFormVariant = {
  id?: string;
  name: string;
  description: string;
  heroImageUrl: string;
  priceOverride: string;
  availabilityNotes: string;
  status: Status;
};

type PackageFormState = {
  title: string;
  subtitle: string;
  heroImageUrl: string;
  gallery: string;
  location: string;
  itinerarySummary: string;
  highlights: string;
  inclusions: string;
  exclusions: string;
  bookingUrl: string;
  termsAndConditions: string;
  basePrice: string;
  currency: string;
  durationDays: string;
  durationNights: string;
  status: Status;
  variants: PackageFormVariant[];
};

const STATUS_LABELS: Record<Status, string> = {
  draft: 'Draft',
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Awaiting Sync',
  in_progress: 'Syncing',
  synced: 'Synced',
  failed: 'Sync Failed',
};

const STATUS_BADGE_CLASSES: Record<Status, string> = {
  draft: 'bg-slate-200 text-slate-900 dark:bg-slate-900 dark:text-slate-100',
  active: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  inactive: 'bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
  archived: 'bg-gray-300 text-gray-900 dark:bg-gray-800 dark:text-gray-200',
};

const SYNC_BADGE_CLASSES: Record<SyncStatus, string> = {
  pending: 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-100',
  in_progress: 'bg-teal-200 text-teal-900 dark:bg-teal-900 dark:text-teal-100',
  synced: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
  failed: 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-100',
};

const STATUS_FILTER_OPTIONS: Array<{ value: 'all' | Status; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

const SYNC_FILTER_OPTIONS: Array<{ value: 'all' | SyncStatus; label: string }> = [
  { value: 'all', label: 'All sync states' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'synced', label: 'Synced' },
  { value: 'failed', label: 'Failed' },
];

const EMPTY_FORM: PackageFormState = {
  title: '',
  subtitle: '',
  heroImageUrl: '',
  gallery: '',
  location: '',
  itinerarySummary: '',
  highlights: '',
  inclusions: '',
  exclusions: '',
  bookingUrl: '',
  termsAndConditions: '',
  basePrice: '',
  currency: 'INR',
  durationDays: '',
  durationNights: '',
  status: 'draft',
  variants: [],
};

function extractList(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
      }
    } catch (error) {
      return value
        .split(/\r?\n|,/) // allow newline or comma separated
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  return [];
}

function listToMultiline(list: string[]): string {
  return list.length ? list.join('\n') : '';
}

function multilineToList(value: string): string[] | undefined {
  const items = value
    .split(/\r?\n|,/) // allow quick paste from CSV
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function parseNumber(value: string): number | null {
  if (!value) {
    return null;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function formatCurrency(amount: string | number | null | undefined, currency: string) {
  if (amount === undefined || amount === null || amount === '') {
    return '—';
  }
  const numeric = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(numeric)) {
    return '—';
  }
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(numeric);
  } catch (error) {
    return `${numeric.toFixed(0)} ${currency || 'INR'}`;
  }
}

export default function WhatsAppCatalogDashboard() {
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packages, setPackages] = useState<TourPackageRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [syncFilter, setSyncFilter] = useState<'all' | SyncStatus>('all');
  const [shouldSkipFetch, setShouldSkipFetch] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [formState, setFormState] = useState<PackageFormState>(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [syncingIds, setSyncingIds] = useState<string[]>([]);
  const [archivingIds, setArchivingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchTerm(searchValue.trim());
    }, 400);
    return () => clearTimeout(handle);
  }, [searchValue]);

  useEffect(() => {
    async function loadSummary() {
      try {
        setSummaryLoading(true);
        const response = await fetch('/api/whatsapp/catalog');
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to load catalog summary');
        }
        const payload = (await response.json()) as CatalogSummary;
        setSummary(payload);
      } catch (error) {
        console.error('Failed to load catalog summary', error);
        toast.error((error as Error)?.message || 'Could not load catalog summary');
      } finally {
        setSummaryLoading(false);
      }
    }

    loadSummary();
  }, [refreshKey]);

  useEffect(() => {
    setShouldSkipFetch(true);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, syncFilter]);

  useEffect(() => {
    if (shouldSkipFetch) {
      setShouldSkipFetch(false);
      return;
    }

    let ignore = false;
    const controller = new AbortController();

    async function loadPackages() {
      try {
        setPackagesLoading(true);
        const params = new URLSearchParams();
        params.set('page', String(currentPage));
        params.set('limit', String(pagination.limit));
        params.set('includeVariants', 'true');
        if (searchTerm) {
          params.set('search', searchTerm);
        }
        if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        if (syncFilter !== 'all') {
          params.set('syncStatus', syncFilter);
        }

        const response = await fetch(`/api/whatsapp/catalog/packages?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || 'Failed to load tour packages');
        }
        const payload = (await response.json()) as PackagesResponse;
        if (ignore) {
          return;
        }
        setPackages(payload.data);
        setPagination({
          page: payload.pagination.page,
          limit: payload.pagination.limit,
          total: payload.pagination.total,
          totalPages: payload.pagination.totalPages,
        });
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        console.error('Failed to load tour packages', error);
        toast.error((error as Error)?.message || 'Could not load tour packages');
      } finally {
        if (!ignore) {
          setPackagesLoading(false);
        }
      }
    }

    loadPackages();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [currentPage, searchTerm, statusFilter, syncFilter, refreshKey, shouldSkipFetch, pagination.limit]);

  const totalPackages = summary?.stats.totalPackages ?? 0;
  const statusCounts = useMemo(() => {
    const counts: Record<Status, number> = {
      draft: summary?.stats.byStatus?.draft ?? 0,
      active: summary?.stats.byStatus?.active ?? 0,
      inactive: summary?.stats.byStatus?.inactive ?? 0,
      archived: summary?.stats.byStatus?.archived ?? 0,
    };
    return counts;
  }, [summary]);

  const syncCounts = useMemo(() => {
    const counts: Record<SyncStatus, number> = {
      pending: summary?.stats.bySyncStatus?.pending ?? 0,
      in_progress: summary?.stats.bySyncStatus?.in_progress ?? 0,
      synced: summary?.stats.bySyncStatus?.synced ?? 0,
      failed: summary?.stats.bySyncStatus?.failed ?? 0,
    };
    return counts;
  }, [summary]);

  function resetFormState() {
    setFormState(EMPTY_FORM);
    setEditingId(null);
    setFormLoading(false);
    setFormSubmitting(false);
  }

  function openCreateModal() {
    resetFormState();
    setModalOpen(true);
  }

  async function openEditModal(id: string) {
    try {
      setFormLoading(true);
      setModalOpen(true);
      setEditingId(id);
      const response = await fetch(`/api/whatsapp/catalog/packages/${id}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to load tour package');
      }
      const payload = await response.json();
      const tourPackage = payload.tourPackage as TourPackageRow;
      const highlights = extractList(tourPackage.highlights);
      const inclusions = extractList(tourPackage.inclusions);
      const exclusions = extractList(tourPackage.exclusions);
      const gallery = extractList(tourPackage.gallery);
      const next: PackageFormState = {
        title: tourPackage.title || '',
        subtitle: tourPackage.subtitle || '',
        heroImageUrl: tourPackage.heroImageUrl || '',
        gallery: listToMultiline(gallery),
        location: tourPackage.location || '',
        itinerarySummary: tourPackage.itinerarySummary || '',
        highlights: listToMultiline(highlights),
        inclusions: listToMultiline(inclusions),
        exclusions: listToMultiline(exclusions),
        bookingUrl: tourPackage.bookingUrl || '',
        termsAndConditions: tourPackage.termsAndConditions || '',
        basePrice: tourPackage.basePrice ? String(tourPackage.basePrice) : '',
        currency: tourPackage.currency || tourPackage.product.currency || 'INR',
        durationDays: tourPackage.durationDays ? String(tourPackage.durationDays) : '',
        durationNights: tourPackage.durationNights ? String(tourPackage.durationNights) : '',
        status: tourPackage.status,
        variants: (tourPackage.variants || []).map((variant) => ({
          id: variant.id,
          name: variant.name,
          description: variant.description || '',
          heroImageUrl: variant.heroImageUrl || '',
          priceOverride: variant.priceOverride ? String(variant.priceOverride) : '',
          availabilityNotes: variant.availabilityNotes || '',
          status: variant.status,
        })),
      };
      setFormState(next);
    } catch (error) {
      console.error('Failed to open edit modal', error);
      toast.error((error as Error)?.message || 'Could not load tour package');
      setModalOpen(false);
      resetFormState();
    } finally {
      setFormLoading(false);
    }
  }

  async function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formState.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        title: formState.title.trim(),
        subtitle: formState.subtitle.trim() || undefined,
        heroImageUrl: formState.heroImageUrl.trim() || undefined,
        gallery: multilineToList(formState.gallery),
        location: formState.location.trim() || undefined,
        itinerarySummary: formState.itinerarySummary.trim() || undefined,
        highlights: multilineToList(formState.highlights),
        inclusions: multilineToList(formState.inclusions),
        exclusions: multilineToList(formState.exclusions),
        bookingUrl: formState.bookingUrl.trim() || undefined,
        termsAndConditions: formState.termsAndConditions.trim() || undefined,
        basePrice: formState.basePrice ? Number(formState.basePrice) : undefined,
        currency: formState.currency.trim() || 'INR',
        durationDays: parseNumber(formState.durationDays),
        durationNights: parseNumber(formState.durationNights),
        status: formState.status,
        variants: formState.variants.map((variant) => ({
          id: variant.id,
          name: variant.name.trim(),
          description: variant.description.trim() || undefined,
          heroImageUrl: variant.heroImageUrl.trim() || undefined,
          priceOverride: variant.priceOverride ? Number(variant.priceOverride) : undefined,
          availabilityNotes: variant.availabilityNotes.trim() || undefined,
          status: variant.status,
        })),
      };

      const endpoint = editingId
        ? `/api/whatsapp/catalog/packages/${editingId}`
        : '/api/whatsapp/catalog/packages';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save tour package');
      }

      toast.success(editingId ? 'Tour package updated' : 'Tour package created');
      setModalOpen(false);
      resetFormState();
      setRefreshKey((value) => value + 1);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to submit tour package', error);
      toast.error((error as Error)?.message || 'Could not save tour package');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleBulkSync(limit = 10) {
    try {
      setBulkSyncing(true);
      const response = await fetch('/api/whatsapp/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync', limit }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to sync pending packages');
      }
      const payload = await response.json();
      toast.success(`Synced ${payload.successes} of ${payload.processed} packages`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error('Failed to trigger bulk sync', error);
      toast.error((error as Error)?.message || 'Could not sync packages');
    } finally {
      setBulkSyncing(false);
    }
  }

  async function handleSyncPackage(id: string) {
    try {
      setSyncingIds((current) => (current.includes(id) ? current : [...current, id]));
      const response = await fetch(`/api/whatsapp/catalog/packages/${id}/sync`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Sync failed');
      }
      toast.success('Package synced with Meta');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error('Failed to sync package', error);
      toast.error((error as Error)?.message || 'Could not sync package');
    } finally {
      setSyncingIds((current) => current.filter((item) => item !== id));
    }
  }

  async function handleArchivePackage(id: string) {
    try {
      setArchivingIds((current) => (current.includes(id) ? current : [...current, id]));
      const response = await fetch(`/api/whatsapp/catalog/packages/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to archive package');
      }
      toast.success('Package archived');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error('Failed to archive package', error);
      toast.error((error as Error)?.message || 'Could not archive package');
    } finally {
      setArchivingIds((current) => current.filter((item) => item !== id));
    }
  }

  async function handleDeletePackage(id: string) {
    const confirmed = window.confirm('Delete this catalog entry permanently? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingIds((current) => (current.includes(id) ? current : [...current, id]));
      const response = await fetch(`/api/whatsapp/catalog/packages/${id}?hard=true`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to delete package');
      }
      toast.success('Package deleted');
      setRefreshKey((value) => value + 1);
    } catch (error) {
      console.error('Failed to delete package', error);
      toast.error((error as Error)?.message || 'Could not delete package');
    } finally {
      setDeletingIds((current) => current.filter((item) => item !== id));
    }
  }

  const heroLoading = summaryLoading && !summary;
  const isEmpty = !packagesLoading && packages.length === 0;

  const statusCards = [
    {
      key: 'active',
      label: 'Active adventures',
      value: statusCounts.active,
      description: 'Ready to showcase on WhatsApp storefront.',
      accent: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-300/30',
      icon: CheckCircle2,
    },
    {
      key: 'draft',
      label: 'Polishing in drafts',
      value: statusCounts.draft,
      description: 'Concepts waiting for final copy and visuals.',
      accent: 'from-slate-500/20 via-slate-500/10 to-transparent border-slate-300/30',
      icon: Sparkles,
    },
    {
      key: 'inactive',
      label: 'Temporarily offline',
      value: statusCounts.inactive,
      description: 'Hidden from customers but available for edits.',
      accent: 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-300/30',
      icon: Clock4,
    },
  ] as const;

  const syncCards = [
    {
      key: 'pending',
      label: 'Awaiting sync',
      value: syncCounts.pending,
      description: 'Queued for their Meta close-up.',
      accent: 'from-blue-500/20 via-blue-500/10 to-transparent border-blue-300/30',
      icon: CalendarClock,
    },
    {
      key: 'synced',
      label: 'Live on Meta',
      value: syncCounts.synced,
      description: 'Perfectly mirrored on your catalog.',
      accent: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-300/30',
      icon: CheckCircle2,
    },
    {
      key: 'failed',
      label: 'Need attention',
      value: syncCounts.failed,
      description: 'Tap sync to resolve outstanding issues.',
      accent: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-300/30',
      icon: AlertTriangle,
    },
  ] as const;

  return (
    <div className="space-y-10 p-6 lg:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-600 via-teal-500 to-sky-600 p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.25),transparent_55%)] opacity-80" />
        <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-50">
              <Sparkles className="h-4 w-4" />
              WhatsApp tour experiences
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
                Craft an unforgettable and ultra-elevated catalog for every traveler
              </h1>
              <p className="text-lg text-emerald-50/80">
                Curate destinations, orchestrate pricing, and sync them straight to Meta with one elegant command center.
              </p>
            </div>
            <div className="flex flex-wrap gap-6 text-sm font-semibold text-emerald-50/80">
              <div className="rounded-full bg-white/15 px-4 py-2 backdrop-blur-sm">
                Total curated journeys • {heroLoading ? '—' : totalPackages.toLocaleString()}
              </div>
              <div className="rounded-full bg-white/15 px-4 py-2 backdrop-blur-sm">
                Pending sync • {heroLoading ? '—' : (summary?.stats.pendingSync ?? 0).toLocaleString()}
              </div>
              <div className="rounded-full bg-white/15 px-4 py-2 backdrop-blur-sm">
                Meta catalog • {heroLoading ? '—' : summary?.defaultCatalogId || 'Not configured'}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row lg:flex-col">
            <Button
              size="lg"
              className="h-12 w-full gap-2 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50"
              onClick={openCreateModal}
            >
              <Plus className="h-5 w-5" />
              New tour package
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full gap-2 rounded-xl border-white/40 bg-white/10 text-white hover:bg-white/20"
              onClick={() => handleBulkSync(10)}
              disabled={bulkSyncing || heroLoading}
            >
              {bulkSyncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
              {bulkSyncing ? 'Syncing...' : 'Sync pending' }
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          {statusCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                className={clsx(
                  'relative overflow-hidden rounded-2xl border bg-background/80 shadow-md backdrop-blur transition hover:shadow-xl',
                  `border ${card.accent}`,
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-70" />
                <CardHeader className="relative z-10 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-emerald-500/20 p-2 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {card.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 space-y-1">
                  <p className="text-4xl font-semibold">
                    {summaryLoading ? '—' : card.value.toLocaleString()}
                  </p>
                  <CardDescription className="text-sm text-muted-foreground">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {syncCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                className={clsx(
                  'relative overflow-hidden rounded-2xl border bg-background/80 shadow-md backdrop-blur transition hover:shadow-xl',
                  `border ${card.accent}`,
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-60" />
                <CardHeader className="relative z-10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-sky-500/15 p-2 text-sky-600 dark:bg-sky-500/10 dark:text-sky-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {card.label}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10 space-y-1">
                  <p className="text-3xl font-semibold">
                    {summaryLoading ? '—' : card.value.toLocaleString()}
                  </p>
                  <CardDescription className="text-xs text-muted-foreground">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="rounded-3xl border border-muted-foreground/10 shadow-xl">
        <CardHeader className="gap-4 border-b border-muted/20 pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-2xl font-semibold">Catalog lineup</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Filter the journey, refine the vibe, and sync each story when it is just right.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[260px]">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by title, SKU, or retailer id"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  className="h-11 rounded-xl border-muted/30 bg-muted/10 pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | Status)}>
                <SelectTrigger className="h-11 w-[160px] rounded-xl border-muted/30 bg-muted/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={syncFilter} onValueChange={(value) => setSyncFilter(value as 'all' | SyncStatus)}>
                <SelectTrigger className="h-11 w-[170px] rounded-xl border-muted/30 bg-muted/10">
                  <SelectValue placeholder="Sync state" />
                </SelectTrigger>
                <SelectContent>
                  {SYNC_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                className="h-11 rounded-xl border border-transparent bg-muted/10"
                onClick={() => {
                  setStatusFilter('all');
                  setSyncFilter('all');
                  setSearchValue('');
                }}
              >
                Reset filters
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-muted/40 bg-muted/10"
                onClick={() => setRefreshKey((value) => value + 1)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {packagesLoading && (
            <div className="grid gap-6 lg:grid-cols-2">
              {[...Array(4)].map((_, index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-3xl border border-muted/20 bg-muted/10"
                />
              ))}
            </div>
          )}

          {!packagesLoading && isEmpty && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-muted/30 bg-muted/5 p-12 text-center">
              <div className="rounded-full bg-muted/20 p-4 text-muted-foreground">
                <PackageSearch className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Your first WhatsApp tour awaits</h3>
                <p className="max-w-md text-sm text-muted-foreground">
                  Start with a hero destination, layer in activities, and elevate the experience before syncing it to Meta.
                </p>
              </div>
              <Button className="rounded-xl" onClick={openCreateModal}>
                <Plus className="mr-2 h-4 w-4" />
                Craft a tour package
              </Button>
            </div>
          )}

          {!packagesLoading && !isEmpty && (
            <div className="grid gap-6 xl:grid-cols-2">
              {packages.map((pkg) => {
                const syncing = syncingIds.includes(pkg.id);
                const archiving = archivingIds.includes(pkg.id);
                const deleting = deletingIds.includes(pkg.id);
                const lastSynced = pkg.lastSyncAt
                  ? `Synced ${formatDistanceToNow(new Date(pkg.lastSyncAt), { addSuffix: true })}`
                  : 'Not synced yet';
                return (
                  <div
                    key={pkg.id}
                    className="group relative overflow-hidden rounded-3xl border border-muted/20 bg-background shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <div
                        className={clsx(
                          'absolute inset-0 bg-gradient-to-br from-emerald-600/65 via-emerald-600/35 to-emerald-900/80 transition duration-500',
                          pkg.heroImageUrl && 'mix-blend-multiply',
                        )}
                        style={pkg.heroImageUrl ? { backgroundImage: `linear-gradient(135deg, rgba(17, 94, 89, 0.6), rgba(12, 74, 110, 0.9)), url(${pkg.heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_60%)]" />
                      <div className="relative z-10 flex h-full flex-col justify-between p-6 text-white">
                        <div className="flex items-center gap-3">
                          <Badge className={clsx('backdrop-blur-sm', STATUS_BADGE_CLASSES[pkg.status])}>
                            {STATUS_LABELS[pkg.status]}
                          </Badge>
                          <Badge className={clsx('backdrop-blur-sm', SYNC_BADGE_CLASSES[pkg.syncStatus])}>
                            {SYNC_STATUS_LABELS[pkg.syncStatus]}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-2xl font-semibold">{pkg.title}</h3>
                          {pkg.subtitle && <p className="text-sm text-emerald-50/80">{pkg.subtitle}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6 p-6">
                      <div className="grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4" />
                          <div>
                            <p className="font-medium text-foreground">Location</p>
                            <p>{pkg.location || 'Globetrotting flexible'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CalendarClock className="mt-0.5 h-4 w-4" />
                          <div>
                            <p className="font-medium text-foreground">Duration</p>
                            <p>
                              {pkg.durationDays ? `${pkg.durationDays} day${pkg.durationDays > 1 ? 's' : ''}` : 'Flexible days'}
                              {pkg.durationNights ? ` • ${pkg.durationNights} night${pkg.durationNights > 1 ? 's' : ''}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4" />
                          <div>
                            <p className="font-medium text-foreground">Base fare</p>
                            <p>{formatCurrency(pkg.basePrice ?? pkg.product.price, pkg.currency || pkg.product.currency)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <LinkIcon className="mt-0.5 h-4 w-4" />
                          <div>
                            <p className="font-medium text-foreground">SKU & retailer ID</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {pkg.product.sku}
                              {pkg.retailerId && pkg.retailerId !== pkg.product.sku ? ` • ${pkg.retailerId}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      {pkg.lastSyncError && (
                        <div className="rounded-2xl border border-rose-200/50 bg-rose-100/50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-200">
                          <div className="flex items-center gap-2 font-semibold">
                            <XCircle className="h-4 w-4" />
                            Sync warnings
                          </div>
                          <p className="mt-1 leading-relaxed">{pkg.lastSyncError}</p>
                        </div>
                      )}

                      {pkg.variants?.length > 0 && (
                        <div className="space-y-3 rounded-2xl border border-muted/20 bg-muted/10 p-4">
                          <p className="text-sm font-semibold text-foreground">
                            Variant lineup ({pkg.variants.length})
                          </p>
                          <div className="space-y-3 text-sm">
                            {pkg.variants.map((variant) => (
                              <div key={variant.id} className="flex items-center justify-between gap-4 rounded-xl bg-background/70 p-3">
                                <div className="space-y-1">
                                  <p className="font-medium text-foreground">{variant.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatCurrency(variant.priceOverride ?? variant.variant.price, pkg.currency || pkg.product.currency)} • {variant.variant.sku}
                                  </p>
                                </div>
                                <Badge className={clsx('text-xs', STATUS_BADGE_CLASSES[variant.status])}>
                                  {STATUS_LABELS[variant.status]}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{lastSynced}</span>
                        {pkg.bookingUrl && (
                          <Link
                            href={pkg.bookingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-emerald-600 hover:text-emerald-500"
                          >
                            View booking page
                          </Link>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            className="rounded-xl"
                            onClick={() => openEditModal(pkg.id)}
                            disabled={deleting}
                          >
                            Edit details
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => handleSyncPackage(pkg.id)}
                            disabled={syncing || deleting}
                          >
                            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            {syncing ? 'Syncing' : 'Sync now'}
                          </Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            className="rounded-xl text-muted-foreground hover:text-rose-600"
                            onClick={() => handleArchivePackage(pkg.id)}
                            disabled={archiving || pkg.status === 'archived' || deleting}
                          >
                            {archiving ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4" />
                            )}
                            {pkg.status === 'archived' ? 'Archived' : 'Archive'}
                          </Button>
                          <Button
                            variant="ghost"
                            className="rounded-xl text-rose-600 hover:text-rose-500"
                            onClick={() => handleDeletePackage(pkg.id)}
                            disabled={deleting}
                          >
                            {deleting ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-4 w-4" />
                            )}
                            {deleting ? 'Deleting…' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!packagesLoading && !isEmpty && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-muted/20 bg-muted/10 p-4">
              <div className="text-sm text-muted-foreground">
                Showing page {pagination.page} of {pagination.totalPages} • {pagination.total.toLocaleString()} packages
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setCurrentPage((page) => Math.min(pagination.totalPages, page + 1))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) {
            resetFormState();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-3xl border border-muted/20">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold">
              {editingId ? 'Edit tour package' : 'Create a refined tour package'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Shape the journey details, layer in your premium inclusions, and set the perfect sync-ready status.
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <ScrollArea className="max-h-[60vh] pr-4">
            {formLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <form id="catalog-package-form" className="space-y-8" onSubmit={handleFormSubmit}>
                <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Package title</Label>
                      <Input
                        id="title"
                        value={formState.title}
                        onChange={(event) => setFormState((state) => ({ ...state, title: event.target.value }))}
                        placeholder="Mystical Moroccan Summer Escape"
                        className="rounded-xl"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={formState.subtitle}
                        onChange={(event) => setFormState((state) => ({ ...state, subtitle: event.target.value }))}
                        placeholder="Enchanting riads, Sahara sunsets, and slow-travel bliss"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itinerarySummary">Itinerary summary</Label>
                      <Textarea
                        id="itinerarySummary"
                        value={formState.itinerarySummary}
                        onChange={(event) => setFormState((state) => ({ ...state, itinerarySummary: event.target.value }))}
                        placeholder="Day 1: Casablanca arrival and rooftop welcome dinner..."
                        className="min-h-[120px] rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={formState.status}
                        onValueChange={(value) => setFormState((state) => ({ ...state, status: value as Status }))}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Draft" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABELS) as Status[]).map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Primary location</Label>
                      <Input
                        id="location"
                        value={formState.location}
                        onChange={(event) => setFormState((state) => ({ ...state, location: event.target.value }))}
                        placeholder="Marrakech, Morocco"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="durationDays">Days</Label>
                        <Input
                          id="durationDays"
                          type="number"
                          min="0"
                          value={formState.durationDays}
                          onChange={(event) => setFormState((state) => ({ ...state, durationDays: event.target.value }))}
                          placeholder="7"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="durationNights">Nights</Label>
                        <Input
                          id="durationNights"
                          type="number"
                          min="0"
                          value={formState.durationNights}
                          onChange={(event) => setFormState((state) => ({ ...state, durationNights: event.target.value }))}
                          placeholder="6"
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="hero">Hero image URL</Label>
                      <Input
                        id="hero"
                        value={formState.heroImageUrl}
                        onChange={(event) => setFormState((state) => ({ ...state, heroImageUrl: event.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gallery">Gallery URLs (one per line)</Label>
                      <Textarea
                        id="gallery"
                        value={formState.gallery}
                        onChange={(event) => setFormState((state) => ({ ...state, gallery: event.target.value }))}
                        placeholder="https://images.unsplash.com/..."
                        className="min-h-[100px] rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
                      <div className="space-y-2">
                        <Label htmlFor="basePrice">Base price</Label>
                        <Input
                          id="basePrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formState.basePrice}
                          onChange={(event) => setFormState((state) => ({ ...state, basePrice: event.target.value }))}
                          placeholder="129999"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={formState.currency}
                          onChange={(event) => setFormState((state) => ({ ...state, currency: event.target.value.toUpperCase() }))}
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bookingUrl">Booking URL</Label>
                      <Input
                        id="bookingUrl"
                        value={formState.bookingUrl}
                        onChange={(event) => setFormState((state) => ({ ...state, bookingUrl: event.target.value }))}
                        placeholder="https://yourbrand.com/marrakech"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="terms">Terms & conditions</Label>
                      <Textarea
                        id="terms"
                        value={formState.termsAndConditions}
                        onChange={(event) => setFormState((state) => ({ ...state, termsAndConditions: event.target.value }))}
                        placeholder="Guests must possess a passport valid for six months..."
                        className="min-h-[100px] rounded-xl"
                      />
                    </div>
                  </div>
                </section>

                <Separator />

                <section className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="highlights">Highlights</Label>
                    <Textarea
                      id="highlights"
                      value={formState.highlights}
                      onChange={(event) => setFormState((state) => ({ ...state, highlights: event.target.value }))}
                      placeholder="Sunset camel ride\nPrivate riad stay\nChef-led cooking class"
                      className="min-h-[120px] rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inclusions">Inclusions</Label>
                    <Textarea
                      id="inclusions"
                      value={formState.inclusions}
                      onChange={(event) => setFormState((state) => ({ ...state, inclusions: event.target.value }))}
                      placeholder="Airport transfers\nDaily breakfast"
                      className="min-h-[120px] rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exclusions">Exclusions</Label>
                    <Textarea
                      id="exclusions"
                      value={formState.exclusions}
                      onChange={(event) => setFormState((state) => ({ ...state, exclusions: event.target.value }))}
                      placeholder="Flights\nTravel insurance"
                      className="min-h-[120px] rounded-xl"
                    />
                  </div>
                </section>

                <Separator />

                <section className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold">Variants</h3>
                      <p className="text-sm text-muted-foreground">
                        Offer premium tiers or seasonal tweaks. Leave blank for single-price getaways.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() =>
                        setFormState((state) => ({
                          ...state,
                          variants: [
                            ...state.variants,
                            {
                              id: undefined,
                              name: '',
                              description: '',
                              heroImageUrl: '',
                              priceOverride: '',
                              availabilityNotes: '',
                              status: 'active',
                            },
                          ],
                        }))
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add variant
                    </Button>
                  </div>

                  {formState.variants.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-muted/30 bg-muted/5 p-6 text-sm text-muted-foreground">
                      No variants yet. Add a deluxe edition or seasonal version when you are ready.
                    </div>
                  )}

                  <div className="space-y-4">
                    {formState.variants.map((variant, index) => (
                      <div key={variant.id ?? index} className="space-y-5 rounded-2xl border border-muted/20 bg-muted/5 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="text-base font-semibold">Variant {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 rounded-lg text-muted-foreground hover:text-rose-600"
                            onClick={() =>
                              setFormState((state) => ({
                                ...state,
                                variants: state.variants.filter((_, variantIndex) => variantIndex !== index),
                              }))
                            }
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={variant.name}
                              onChange={(event) =>
                                setFormState((state) => ({
                                  ...state,
                                  variants: state.variants.map((item, variantIndex) =>
                                    variantIndex === index ? { ...item, name: event.target.value } : item,
                                  ),
                                }))
                              }
                              placeholder="Desert luxury edition"
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                              value={variant.status}
                              onValueChange={(value) =>
                                setFormState((state) => ({
                                  ...state,
                                  variants: state.variants.map((item, variantIndex) =>
                                    variantIndex === index ? { ...item, status: value as Status } : item,
                                  ),
                                }))
                              }
                            >
                              <SelectTrigger className="rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(STATUS_LABELS) as Status[]).map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {STATUS_LABELS[status]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Price override</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variant.priceOverride}
                              onChange={(event) =>
                                setFormState((state) => ({
                                  ...state,
                                  variants: state.variants.map((item, variantIndex) =>
                                    variantIndex === index ? { ...item, priceOverride: event.target.value } : item,
                                  ),
                                }))
                              }
                              placeholder="149999"
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Variant hero image</Label>
                            <Input
                              value={variant.heroImageUrl}
                              onChange={(event) =>
                                setFormState((state) => ({
                                  ...state,
                                  variants: state.variants.map((item, variantIndex) =>
                                    variantIndex === index ? { ...item, heroImageUrl: event.target.value } : item,
                                  ),
                                }))
                              }
                              placeholder="https://images.unsplash.com/..."
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Description</Label>
                            <Textarea
                              value={variant.description}
                              onChange={(event) =>
                                setFormState((state) => ({
                                  ...state,
                                  variants: state.variants.map((item, variantIndex) =>
                                    variantIndex === index ? { ...item, description: event.target.value } : item,
                                  ),
                                }))
                              }
                              placeholder="Private Sahara glamping with stargazing astronomer."
                              className="min-h-[80px] rounded-xl"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Availability notes</Label>
                            <Textarea
                              value={variant.availabilityNotes}
                              onChange={(event) =>
                                setFormState((state) => ({
                                  ...state,
                                  variants: state.variants.map((item, variantIndex) =>
                                    variantIndex === index ? { ...item, availabilityNotes: event.target.value } : item,
                                  ),
                                }))
                              }
                              placeholder="Available between October and March."
                              className="min-h-[80px] rounded-xl"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </form>
            )}
          </ScrollArea>
          <Separator />
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="text-xs text-muted-foreground">
              Every save updates the catalog and queues a fresh sync request.
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  setModalOpen(false);
                  resetFormState();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="catalog-package-form"
                className="rounded-xl"
                disabled={formSubmitting || formLoading}
              >
                {formSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? 'Update package' : 'Publish package'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}