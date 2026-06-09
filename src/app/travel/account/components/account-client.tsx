"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Heart,
  Loader2,
  LogOut,
  Mail,
  MessageCircle,
  Phone,
  User,
  MapPin,
  Clock,
  Trash2,
  GitCompare,
} from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPackageDisplayName } from "@/lib/travel-display";
import {
  getSavedPackages,
  removeSavedPackage,
  syncSavedPackagesToServer,
  type TravelSavedPackage,
} from "@/lib/travel-saved-packages";

type TravelProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isApproved: boolean;
};

type ServerSavedItem = {
  tourPackageId: string;
  savedAt: string;
  package: {
    id: string;
    tourPackageName: string | null;
    slug: string | null;
    numDaysNight: string | null;
    location: { label: string | null } | null;
    images: { url: string }[];
  };
};

interface AccountClientProps {
  initialProfile: TravelProfile | null;
  chatPath: string;
  packagesPath: string;
  homePath: string;
  comparePath: string;
}

export function AccountClient({
  initialProfile,
  chatPath,
  packagesPath,
  homePath,
  comparePath,
}: AccountClientProps) {
  const router = useRouter();
  const { signOut } = useClerk();

  const [profile, setProfile] = useState<TravelProfile | null>(initialProfile);
  const [name, setName] = useState(initialProfile?.name ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [localSaved, setLocalSaved] = useState<TravelSavedPackage[]>([]);
  const [serverSaved, setServerSaved] = useState<ServerSavedItem[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);

  const loadSaved = useCallback(async () => {
    setSavedLoading(true);
    const local = getSavedPackages();
    setLocalSaved(local);

    if (profile) {
      try {
        await syncSavedPackagesToServer();
        const res = await fetch("/api/travel-auth/saved-packages");
        if (res.ok) {
          const data = await res.json();
          setServerSaved(data.items ?? []);
        }
      } catch {
        /* keep local list */
      }
    }

    setSavedLoading(false);
  }, [profile]);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const res = await fetch("/api/travel-auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const updated = await res.json();
      setProfile(updated);
      setProfileSuccess(true);
      void loadSaved();
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  function handleRemoveLocal(id: string) {
    setLocalSaved(removeSavedPackage(id));
    void fetch(`/api/travel-auth/saved-packages?tourPackageId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => null);
    setServerSaved((items) => items.filter((item) => item.tourPackageId !== id));
  }

  function handleSignOut() {
    signOut(() => router.push(homePath));
  }

  const serverIds = new Set(serverSaved.map((item) => item.tourPackageId));
  const localOnly = localSaved.filter((pkg) => !serverIds.has(pkg.id));

  const hasSaved = serverSaved.length > 0 || localOnly.length > 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pt-24 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your profile and saved tour packages
          </p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.isApproved && (
            <Link
              href={chatPath}
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              My Chats
            </Link>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
            <User className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            <p className="text-sm text-gray-500">
              {profile ? "Update your contact details" : "Complete your profile to get started"}
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-name">Full name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-phone">Phone (optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="account-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="pl-10"
              />
            </div>
          </div>
          {profile?.email && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {profile.email}
            </p>
          )}
          {profileError && (
            <p className="text-sm text-red-600">{profileError}</p>
          )}
          {profileSuccess && (
            <p className="text-sm text-green-600">Profile saved successfully.</p>
          )}
          <Button
            type="submit"
            disabled={profileSaving || !name.trim()}
            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
          >
            {profileSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </form>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Saved packages</h2>
              <p className="text-sm text-gray-500">
                Tours you&apos;ve shortlisted for later
              </p>
            </div>
          </div>
          {(localSaved.length >= 2 || serverSaved.length >= 2) && (
            <Link
              href={comparePath}
              className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <GitCompare className="w-4 h-4" />
              Compare saved
            </Link>
          )}
        </div>

        {savedLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !hasSaved ? (
          <div className="text-center py-10 space-y-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-orange-50 mx-auto">
              <Heart className="w-7 h-7 text-orange-400" />
            </div>
            <p className="text-gray-600">No saved packages yet.</p>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Tap the heart on any package page to save it here for quick access.
            </p>
            <Link
              href={packagesPath}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2.5 text-sm font-semibold text-white hover:from-orange-600 hover:to-red-600 transition-colors"
            >
              Browse packages
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {serverSaved.map((item) => (
              <SavedPackageRow
                key={item.tourPackageId}
                id={item.tourPackageId}
                name={item.package.tourPackageName}
                slug={item.package.slug}
                duration={item.package.numDaysNight}
                locationName={item.package.location?.label}
                imageUrl={item.package.images[0]?.url}
                packagesPath={packagesPath}
                onRemove={() => handleRemoveLocal(item.tourPackageId)}
              />
            ))}
            {localOnly.map((pkg) => (
              <SavedPackageRow
                key={pkg.id}
                id={pkg.id}
                name={pkg.name}
                slug={pkg.slug}
                packagesPath={packagesPath}
                onRemove={() => handleRemoveLocal(pkg.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SavedPackageRow({
  id,
  name,
  slug,
  duration,
  locationName,
  imageUrl,
  packagesPath,
  onRemove,
}: {
  id: string;
  name?: string | null;
  slug?: string | null;
  duration?: string | null;
  locationName?: string | null;
  imageUrl?: string | null;
  packagesPath: string;
  onRemove: () => void;
}) {
  const displayName = formatPackageDisplayName(name || "Tour package");
  const href = `${packagesPath}/${slug || id}`;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-orange-100 hover:shadow-sm transition-all group">
      <Link href={href} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-orange-100 relative">
        {imageUrl ? (
          <Image src={imageUrl} alt={displayName} fill className="object-cover" sizes="64px" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500" />
        )}
      </Link>
      <Link href={href} className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
          {displayName}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
          {locationName && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {locationName}
            </span>
          )}
          {duration && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {duration}
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={onRemove}
        className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        aria-label={`Remove ${displayName} from saved`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
