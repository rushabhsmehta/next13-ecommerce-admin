import { useState, useEffect } from 'react';

interface AssociatePartner {
  id: string;
  name: string;
  email?: string;
  mobileNumber?: string;
  [key: string]: any;
}

// Create a module-level cache to avoid duplicate requests
let cachedAssociatePartner: AssociatePartner | null = null;
let isLoadingGlobal = false;
let listeners: Array<(data: AssociatePartner | null) => void> = [];

export function useAssociatePartner() {
  const [isAssociatePartner, setIsAssociatePartner] = useState<boolean>(false);
  const [associatePartner, setAssociatePartner] = useState<AssociatePartner | null>(cachedAssociatePartner);
  const [isLoading, setIsLoading] = useState<boolean>(isLoadingGlobal);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    // Add this component as a listener for updates
    const updateData = (data: AssociatePartner | null) => {
      setAssociatePartner(data);
      setIsAssociatePartner(!!data);
    };
    
    listeners.push(updateData);

    // If data is already loaded or being loaded, use it
    if (cachedAssociatePartner) {
      setAssociatePartner(cachedAssociatePartner);
      setIsAssociatePartner(!!cachedAssociatePartner);
      return;
    }

    // Only fetch if no one else is currently fetching
    if (!isLoadingGlobal) {
      isLoadingGlobal = true;
      setIsLoading(true);

      // Check if we're on an associate domain
      const hostname = window.location.hostname;
      const isAssociate = hostname.includes('associate.aagamholidays.com');
      
      if (!isAssociate) {
        isLoadingGlobal = false;
        setIsLoading(false);
        return;
      }

      fetch('/api/associate-partners/me')
        .then(response => {
          if (response.ok) return response.json();
          return null;
        })
        .then(data => {
          cachedAssociatePartner = data;
          // Notify all listeners
          listeners.forEach(listener => listener(data));
          setIsAssociatePartner(!!data);
          setIsLoading(false);
          isLoadingGlobal = false;
        })
        .catch(err => {
          console.error("Error fetching associate details:", err);
          setError(err);
          setIsLoading(false);
          isLoadingGlobal = false;
        });
    }

    // Cleanup: remove the listener when the component unmounts
    return () => {
      listeners = listeners.filter(listener => listener !== updateData);
    };
  }, []);

  return { 
    isAssociatePartner, 
    associatePartner, 
    isLoading, 
    error
  };
}
