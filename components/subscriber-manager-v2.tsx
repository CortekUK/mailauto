'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Loader2, UserPlus, Upload, Pencil, Trash2, Search, Users } from 'lucide-react';
import { CSVUpload } from '@/components/csv-upload';

// Validation schema - essential fields for subscriber management
const subscriberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
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
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
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

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sheetdb');
      const result = await response.json();

      if (response.ok && result.success) {
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
        await fetchSubscribers();
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
    setValue('labels', subscriber['Labels'] || '');
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
        setEditingSubscriber(null);
        reset();
        await fetchSubscribers();
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
        await fetchSubscribers();
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

  const filteredSubscribers = subscribers.filter(
    (subscriber) => {
      const searchLower = searchQuery.toLowerCase();
      const fullName = `${subscriber['First Name'] || ''} ${subscriber['Last Name'] || ''}`.toLowerCase();
      const email = (subscriber['Email 1'] || '').toLowerCase();
      const company = (subscriber['Company'] || '').toLowerCase();
      return fullName.includes(searchLower) || email.includes(searchLower) || company.includes(searchLower);
    }
  );

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{subscribers.length}</div>
              <div className="text-sm text-muted-foreground">Total Subscribers</div>
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
              <CardDescription>Manage your subscriber list</CardDescription>
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
          ) : filteredSubscribers.length === 0 ? (
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.map((subscriber, index) => {
                      const fullName = `${subscriber['First Name'] || ''} ${subscriber['Last Name'] || ''}`.trim() || 'Unknown';
                      const location = [subscriber['Address 1 - City'], subscriber['Address 1 - Country']]
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <TableRow key={subscriber['Email 1'] || index}>
                          <TableCell className="font-medium">{fullName}</TableCell>
                          <TableCell>{subscriber['Email 1']}</TableCell>
                          <TableCell className="hidden md:table-cell">{subscriber['Phone 1'] || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell">{subscriber['Company'] || '-'}</TableCell>
                          <TableCell className="hidden lg:table-cell">{location || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(subscriber)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick(subscriber)}
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
                <Label htmlFor="add-firstName">First Name *</Label>
                <Input
                  id="add-firstName"
                  placeholder="John"
                  {...register('firstName')}
                  disabled={isSubmitting}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500">{errors.firstName.message}</p>
                )}
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
              fetchSubscribers();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingSubscriber} onOpenChange={(open) => !open && setEditingSubscriber(null)}>
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
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="font-medium">
                  {`${deletingSubscriber['First Name'] || ''} ${deletingSubscriber['Last Name'] || ''}`.trim() || 'Unknown'}
                </div>
                <div className="text-sm text-muted-foreground">{deletingSubscriber['Email 1']}</div>
                {deletingSubscriber['Company'] && (
                  <div className="text-xs text-muted-foreground mt-1">{deletingSubscriber['Company']}</div>
                )}
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
