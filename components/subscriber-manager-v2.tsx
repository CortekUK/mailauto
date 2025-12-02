'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, UserPlus, Upload, Pencil, Trash2, Search, Users, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { CSVUpload } from '@/components/csv-upload';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Validation schema - essential fields for subscriber management
const subscriberSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  labels: z.string().optional(),
});

type SubscriberFormData = z.infer<typeof subscriberSchema>;

// Supabase contact interface
interface Contact {
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
  labels: string | null;
  status: string;
  source: string | null;
  created_at: string;
  updated_at: string;
}

// SheetDB format interface (for API calls)
interface Subscriber {
  'First Name': string;
  'Last Name': string;
  'Email 1': string;
  'Phone 1'?: string;
  'Company'?: string;
  'Address 1 - City'?: string;
  'Address 1 - State/Region'?: string;
  'Address 1 - Country'?: string;
  'Labels'?: string;
  'Email subscriber status'?: string;
}

export function SubscriberManagerV2() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRealtime, setIsRealtime] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SubscriberFormData>({
    resolver: zodResolver(subscriberSchema),
  });

  // Fetch contacts from Supabase
  const fetchContacts = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('An error occurred while loading subscribers');
      setContacts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  // Set up real-time subscription
  useEffect(() => {
    // Fetch initial data
    fetchContacts();

    // Subscribe to real-time changes
    const channel: RealtimeChannel = supabase
      .channel('contacts-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contacts' },
        (payload) => {
          console.log('📥 New contact:', payload.new);
          setContacts((prev) => [payload.new as Contact, ...prev]);
          toast.success(`New subscriber: ${(payload.new as Contact).email}`);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contacts' },
        (payload) => {
          console.log('📝 Contact updated:', payload.new);
          setContacts((prev) =>
            prev.map((c) => (c.id === (payload.new as Contact).id ? (payload.new as Contact) : c))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'contacts' },
        (payload) => {
          console.log('🗑️ Contact deleted:', payload.old);
          setContacts((prev) => prev.filter((c) => c.id !== (payload.old as Contact).id));
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime status:', status);
        setIsRealtime(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchContacts, supabase]);

  const onSubmit = async (data: SubscriberFormData) => {
    setIsSubmitting(true);

    try {
      // Check if email already exists in Supabase
      const normalizedEmail = data.email.toLowerCase().trim();
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id, email')
        .eq('email', normalizedEmail)
        .single();

      if (existingContact) {
        toast.error(`A subscriber with email "${data.email}" already exists`);
        setIsSubmitting(false);
        return;
      }

      // Write to SheetDB (which will also sync to Supabase)
      const response = await fetch('/api/sheetdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            'First Name': data.firstName,
            'Last Name': data.lastName || '',
            'Email 1': data.email,
            'Phone 1': data.phone || '',
            'Company': data.company || '',
            'Address 1 - City': data.city || '',
            'Address 1 - State/Region': data.state || '',
            'Address 1 - Country': data.country || '',
            'Labels': data.labels || '',
            'Email subscriber status': 'subscribed',
            'Created At (UTC+0)': new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Subscriber added successfully!');
        reset();
        setIsAddDialogOpen(false);
        // Always refresh to ensure UI is in sync
        await fetchContacts(false);
      } else {
        toast.error(result.error || 'Failed to add subscriber');
      }
    } catch (error) {
      console.error('Error adding subscriber:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setValue('firstName', contact.first_name || '');
    setValue('lastName', contact.last_name || '');
    setValue('email', contact.email || '');
    setValue('phone', contact.phone || '');
    setValue('company', contact.company || '');
    setValue('city', contact.city || '');
    setValue('state', contact.state || '');
    setValue('country', contact.country || '');
    setValue('labels', contact.labels || '');
  };

  const handleEditSubmit = async (data: SubscriberFormData) => {
    if (!editingContact) return;

    setIsSubmitting(true);

    try {
      // Update in SheetDB (which will also sync to Supabase)
      const response = await fetch('/api/sheetdb', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnName: 'Email 1',
          columnValue: editingContact.email,
          data: {
            'First Name': data.firstName,
            'Last Name': data.lastName || '',
            'Email 1': data.email,
            'Phone 1': data.phone || '',
            'Company': data.company || '',
            'Address 1 - City': data.city || '',
            'Address 1 - State/Region': data.state || '',
            'Address 1 - Country': data.country || '',
            'Labels': data.labels || '',
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Subscriber updated successfully!');
        setEditingContact(null);
        reset();
        // Always refresh to ensure UI is in sync
        await fetchContacts(false);
      } else {
        toast.error(result.error || 'Failed to update subscriber');
      }
    } catch (error) {
      console.error('Error updating subscriber:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (contact: Contact) => {
    setDeletingContact(contact);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContact) return;

    setIsDeleting(true);

    try {
      // Delete from SheetDB (which will also delete from Supabase)
      const response = await fetch('/api/sheetdb', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnName: 'Email 1',
          columnValue: deletingContact.email,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Subscriber deleted successfully!');
        setDeletingContact(null);
        // Always refresh to ensure UI is in sync
        await fetchContacts(false);
      } else {
        toast.error(result.error || 'Failed to delete subscriber');
      }
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (!trimmedQuery) return true; // Show all if no search query

    const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.toLowerCase();
    const displayName = (contact.name || '').toLowerCase();
    const email = (contact.email || '').toLowerCase();
    const company = (contact.company || '').toLowerCase();
    const firstName = (contact.first_name || '').toLowerCase();
    const lastName = (contact.last_name || '').toLowerCase();

    return (
      fullName.includes(trimmedQuery) ||
      displayName.includes(trimmedQuery) ||
      email.includes(trimmedQuery) ||
      company.includes(trimmedQuery) ||
      firstName.includes(trimmedQuery) ||
      lastName.includes(trimmedQuery)
    );
  });

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{contacts.length}</div>
                <div className="text-sm text-muted-foreground">Total Subscribers</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isRealtime ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchContacts(false)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Subscribers</CardTitle>
              <CardDescription>
                Manage your subscriber list {isRealtime && '• Updates in real-time'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Subscriber
              </Button>
              <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search subscribers by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No subscribers found.</p>
              {searchQuery && <p className="text-sm mt-1">Try adjusting your search.</p>}
              {!searchQuery && <p className="text-sm mt-1">Add your first subscriber to get started!</p>}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="hidden md:table-cell">Phone</TableHead>
                      <TableHead className="hidden lg:table-cell">Company</TableHead>
                      <TableHead className="hidden lg:table-cell">Location</TableHead>
                      <TableHead className="hidden lg:table-cell">Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => {
                      const fullName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.name || 'Unknown';
                      const location = [contact.city, contact.country]
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">{fullName}</TableCell>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell className="hidden md:table-cell">{contact.phone || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell">{contact.company || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell">{location || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {(() => {
                              const source = (contact.source || 'manual').toLowerCase()
                              if (source === 'wix-form' || source === 'wix') {
                                return (
                                  <Badge className="text-xs bg-gradient-to-r from-[#5C6BC0] to-[#7C4DFF] text-white border-0">
                                    Wix Form
                                  </Badge>
                                )
                              } else if (source === 'sheetdb' || source === 'sheet-db') {
                                return (
                                  <Badge className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                                    Sheet DB
                                  </Badge>
                                )
                              } else if (source === 'manual') {
                                return (
                                  <Badge className="text-xs bg-gradient-to-r from-slate-500 to-slate-600 text-white border-0">
                                    Manual
                                  </Badge>
                                )
                              } else {
                                return (
                                  <Badge variant="secondary" className="text-xs">
                                    {source.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                  </Badge>
                                )
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(contact)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick(contact)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Subscriber Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Subscriber</DialogTitle>
            <DialogDescription>
              Enter the subscriber's information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-firstName">First Name</Label>
                <Input
                  id="add-firstName"
                  placeholder="John"
                  {...register('firstName')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-lastName">Last Name</Label>
                <Input
                  id="add-lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="john@example.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  placeholder="+1 234 567 890"
                  {...register('phone')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-company">Company</Label>
                <Input
                  id="add-company"
                  placeholder="Company name"
                  {...register('company')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add-city">City</Label>
                <Input
                  id="add-city"
                  placeholder="New York"
                  {...register('city')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-state">State/Region</Label>
                <Input
                  id="add-state"
                  placeholder="NY"
                  {...register('state')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-country">Country</Label>
                <Input
                  id="add-country"
                  placeholder="USA"
                  {...register('country')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-labels">Labels</Label>
              <Input
                id="add-labels"
                placeholder="customer, vip, newsletter"
                {...register('labels')}
                disabled={isSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Subscriber'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk Upload Subscribers</DialogTitle>
            <DialogDescription>
              Upload a CSV file to add multiple subscribers at once
            </DialogDescription>
          </DialogHeader>
          <CSVUpload
            onUploadComplete={() => {
              setIsBulkDialogOpen(false);
              // Trigger a full sync after bulk upload
              fetch('/api/sync/sheetdb-to-supabase', { method: 'POST' })
                .then(() => fetchContacts(false))
                .catch(console.error);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
            <DialogDescription>
              Update the subscriber's information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  placeholder="John"
                  {...register('firstName')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="john@example.com"
                {...register('email')}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  placeholder="+1 234 567 890"
                  {...register('phone')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company</Label>
                <Input
                  id="edit-company"
                  placeholder="Company name"
                  {...register('company')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  placeholder="New York"
                  {...register('city')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-state">State/Region</Label>
                <Input
                  id="edit-state"
                  placeholder="NY"
                  {...register('state')}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-country">Country</Label>
                <Input
                  id="edit-country"
                  placeholder="USA"
                  {...register('country')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-labels">Labels</Label>
              <Input
                id="edit-labels"
                placeholder="customer, vip, newsletter"
                {...register('labels')}
                disabled={isSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingContact(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Subscriber'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscriber</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subscriber? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingContact && (
            <div className="py-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="font-medium">
                  {`${deletingContact.first_name || ''} ${deletingContact.last_name || ''}`.trim() || deletingContact.name || 'Unknown'}
                </div>
                <div className="text-sm text-muted-foreground">{deletingContact.email}</div>
                {deletingContact.company && (
                  <div className="text-xs text-muted-foreground mt-1">{deletingContact.company}</div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingContact(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Subscriber'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
