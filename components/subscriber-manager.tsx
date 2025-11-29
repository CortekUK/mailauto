'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, RefreshCw, UserPlus, Upload, Pencil, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { CSVUpload } from '@/components/csv-upload';

// Validation schema - updated for new SheetDB columns
const subscriberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  company: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

type SubscriberFormData = z.infer<typeof subscriberSchema>;

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
  // Computed for display
  name?: string;
  email?: string;
}

export function SubscriberManager() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSubscriber, setEditingSubscriber] = useState<Subscriber | null>(null);
  const [deletingSubscriber, setDeletingSubscriber] = useState<Subscriber | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<SubscriberFormData>({
    resolver: zodResolver(subscriberSchema),
  });

  const fetchSubscribers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch('/api/sheetdb');
      const result = await response.json();

      if (response.ok && result.success) {
        // Ensure data is an array
        const data = Array.isArray(result.data) ? result.data : [];
        setSubscribers(data);
      } else {
        toast.error('Failed to load subscribers');
        setSubscribers([]);
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast.error('An error occurred while loading subscribers');
      setSubscribers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const onSubmit = async (data: SubscriberFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/sheetdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            'First Name': data.firstName,
            'Last Name': data.lastName,
            'Email 1': data.email,
            'Phone 1': data.phone || '',
            'Company': data.company || '',
            'Address 1 - City': data.city || '',
            'Address 1 - State/Region': data.state || '',
            'Address 1 - Country': data.country || '',
            'Email subscriber status': 'subscribed',
            'Created At (UTC+0)': new Date().toISOString(),
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Subscriber added successfully!');
        reset();
        // Automatically refresh the list
        await fetchSubscribers(true);
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

  const handleEditClick = (subscriber: Subscriber) => {
    setEditingSubscriber(subscriber);
    setValue('firstName', subscriber['First Name'] || '');
    setValue('lastName', subscriber['Last Name'] || '');
    setValue('email', subscriber['Email 1'] || '');
    setValue('phone', subscriber['Phone 1'] || '');
    setValue('company', subscriber['Company'] || '');
    setValue('city', subscriber['Address 1 - City'] || '');
    setValue('state', subscriber['Address 1 - State/Region'] || '');
    setValue('country', subscriber['Address 1 - Country'] || '');
  };

  const handleEditSubmit = async (data: SubscriberFormData) => {
    if (!editingSubscriber) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/sheetdb', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnName: 'Email 1',
          columnValue: editingSubscriber['Email 1'],
          data: {
            'First Name': data.firstName,
            'Last Name': data.lastName,
            'Email 1': data.email,
            'Phone 1': data.phone || '',
            'Company': data.company || '',
            'Address 1 - City': data.city || '',
            'Address 1 - State/Region': data.state || '',
            'Address 1 - Country': data.country || '',
          },
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Subscriber updated successfully!');
        setEditingSubscriber(null);
        reset();
        await fetchSubscribers(true);
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

  const handleDeleteClick = (subscriber: Subscriber) => {
    setDeletingSubscriber(subscriber);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSubscriber) return;

    setIsDeleting(true);

    try {
      const response = await fetch('/api/sheetdb', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnName: 'Email 1',
          columnValue: deletingSubscriber['Email 1'],
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success('Subscriber deleted successfully!');
        setDeletingSubscriber(null);
        await fetchSubscribers(true);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add Subscriber Section */}
      <div className="flex flex-col">
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="single">
              <UserPlus className="h-4 w-4 mr-2" />
              Single
            </TabsTrigger>
            <TabsTrigger value="bulk">
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="mt-4">
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Add New Subscriber</CardTitle>
                <CardDescription>
                  Enter the subscriber's information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        {...register('firstName')}
                        disabled={isSubmitting}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-red-500">{errors.firstName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        {...register('lastName')}
                        disabled={isSubmitting}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-red-500">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
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
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        placeholder="+1 234 567 890"
                        {...register('phone')}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Company name"
                        {...register('company')}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="New York"
                        {...register('city')}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State/Region</Label>
                      <Input
                        id="state"
                        placeholder="NY"
                        {...register('state')}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        placeholder="USA"
                        {...register('country')}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Adding Subscriber...
                      </>
                    ) : (
                      'Add Subscriber'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="mt-4">
            <CSVUpload onUploadComplete={() => fetchSubscribers(true)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Subscribers List */}
      <div className="flex flex-col">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Subscribers</CardTitle>
                <CardDescription>
                  {loading ? (
                    'Loading...'
                  ) : (
                    <>
                      {subscribers.length} total subscriber{subscribers.length !== 1 ? 's' : ''}
                    </>
                  )}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchSubscribers(true)}
                disabled={refreshing || loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : subscribers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No subscribers yet.</p>
                <p className="text-sm mt-2">Add your first subscriber to get started!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {subscribers.map((subscriber, index) => {
                  const displayName = `${subscriber['First Name'] || ''} ${subscriber['Last Name'] || ''}`.trim() || 'Unknown';
                  const displayEmail = subscriber['Email 1'] || '';
                  const displayCompany = subscriber['Company'] || '';
                  const displayCity = subscriber['Address 1 - City'] || '';

                  return (
                    <div
                      key={displayEmail || index}
                      className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {(subscriber['First Name']?.charAt(0) || 'U').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{displayName}</div>
                        <div className="text-sm text-muted-foreground truncate">{displayEmail}</div>
                        {(displayCompany || displayCity) && (
                          <div className="text-xs text-muted-foreground truncate">
                            {[displayCompany, displayCity].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditClick(subscriber)}
                          className="h-8 w-8 p-0"
                          title="Edit subscriber"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(subscriber)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          title="Delete subscriber"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubscriber} onOpenChange={(open) => !open && setEditingSubscriber(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subscriber</DialogTitle>
            <DialogDescription>
              Update the subscriber's information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name *</Label>
                <Input
                  id="edit-firstName"
                  placeholder="John"
                  {...register('firstName')}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name *</Label>
                <Input
                  id="edit-lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                  disabled={isSubmitting}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500">{errors.lastName.message}</p>
                )}
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingSubscriber(null)}
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
      <Dialog open={!!deletingSubscriber} onOpenChange={(open) => !open && setDeletingSubscriber(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Subscriber</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this subscriber? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deletingSubscriber && (
            <div className="py-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                  {(deletingSubscriber['First Name']?.charAt(0) || 'U').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {`${deletingSubscriber['First Name'] || ''} ${deletingSubscriber['Last Name'] || ''}`.trim() || 'Unknown'}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{deletingSubscriber['Email 1']}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingSubscriber(null)}
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
