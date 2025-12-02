'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Contact {
  id: string;
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  status: string;
  source: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface UseRealtimeContactsOptions {
  enabled?: boolean;
}

export function useRealtimeContacts(options: UseRealtimeContactsOptions = {}) {
  const { enabled = true } = options;
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Fetch initial contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setContacts(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching contacts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled) return;

    // Fetch initial data
    fetchContacts();

    // Subscribe to real-time changes
    const channel: RealtimeChannel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contacts'
        },
        (payload) => {
          console.log('📥 New contact received:', payload.new);
          setContacts((prev) => [payload.new as Contact, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'contacts'
        },
        (payload) => {
          console.log('📝 Contact updated:', payload.new);
          setContacts((prev) =>
            prev.map((contact) =>
              contact.id === (payload.new as Contact).id
                ? (payload.new as Contact)
                : contact
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'contacts'
        },
        (payload) => {
          console.log('🗑️ Contact deleted:', payload.old);
          setContacts((prev) =>
            prev.filter((contact) => contact.id !== (payload.old as Contact).id)
          );
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔌 Unsubscribing from contacts changes');
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchContacts, supabase]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    await fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    loading,
    error,
    refresh,
  };
}
