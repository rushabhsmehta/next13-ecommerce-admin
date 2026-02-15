import { useState, useEffect, useRef } from 'react';

interface AssociatePartner {
  id: string;
  name: string;
  email?: string;
  mobileNumber?: string;
  [key: string]: any;
}

// Module-level cache for the fetched data
let cachedAssociatePartner: AssociatePartner | null = null;
let fetchPromise: Promise<AssociatePartner | null> | null = null;

/** Reset cached state on logout or domain change */
export function clearAssociatePartnerCache() {
  cachedAssociatePartner = null;
  fetchPromise = null;
}

export function useAssociatePartner() {
  const [isAssociatePartner, setIsAssociatePartner] = useState<boolean>(!!cachedAssociatePartner);
  const [associatePartner, setAssociatePartner] = useState<AssociatePartner | null>(cachedAssociatePartner);
  const [isLoading, setIsLoading] = useState<boolean>(!cachedAssociatePartner);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Already have data
    if (cachedAssociatePartner) {
      setAssociatePartner(cachedAssociatePartner);
      setIsAssociatePartner(true);
      setIsLoading(false);
      return;
    }

    // Check if we're on an associate domain
    const hostname = window.location.hostname;
    if (!hostname.includes('associate.aagamholidays.com')) {
      setIsLoading(false);
      return;
    }

    // Deduplicate concurrent requests using a shared promise
    if (!fetchPromise) {
      fetchPromise = fetch('/api/associate-partners/me')
        .then(response => (response.ok ? response.json() : null))
        .then(data => {
          cachedAssociatePartner = data;
          return data;
        })
        .catch(err => {
          console.error("Error fetching associate details:", err);
          fetchPromise = null; // allow retry on error
          throw err;
        });
    }

    fetchPromise
      .then(data => {
        if (!mountedRef.current) return;
        setAssociatePartner(data);
        setIsAssociatePartner(!!data);
        setIsLoading(false);
      })
      .catch(err => {
        if (!mountedRef.current) return;
        setError(err);
        setIsLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    isAssociatePartner,
    associatePartner,
    isLoading,
    error
  };
}
