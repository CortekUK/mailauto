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
import { Loader2, UserPlus, Upload, Pencil, Trash2, Search, Users, RefreshCw } from 'lucide-react';
import { CSVUpload } from '@/components/csv-upload';

// Validation schema
const subscriberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

type SubscriberFormData = z.infer<typeof subscriberSchema>;

interface Subscriber {
  name: string;
  email: string;
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
  const [isSyncing, setIsSyncing] = useState(false);

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
            name: data.name,
            email: data.email,
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
    setValue('name', subscriber.name);
    setValue('email', subscriber.email);
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
          columnName: 'email',
          columnValue: editingSubscriber.email,
          data: {
            name: data.name,
            email: data.email,
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
          columnName: 'email',
          columnValue: deletingSubscriber.email,
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

  const handleSyncToSupabase = async () => {
    setIsSyncing(true);
    toast.loading('Syncing subscribers to Supabase...', { id: 'sync' });

    try {
      const response = await fetch('/api/sync/sheetdb-to-supabase', {
        method: 'POST'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          `Synced ${result.stats.synced} subscribers (${result.stats.new} new, ${result.stats.updated} updated)`,
          { id: 'sync' }
        );
      } else {
        toast.error(result.error || 'Sync failed', { id: 'sync' });
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync subscribers', { id: 'sync' });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredSubscribers = subscribers.filter(
    (subscriber) =>
      subscriber.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscriber.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
              <Button
                variant="outline"
                onClick={handleSyncToSupabase}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync to Supabase
              </Button>
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
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscribers.map((subscriber, index) => (
                      <TableRow key={subscriber.email || index}>
                        <TableCell className="font-medium">{subscriber.name}</TableCell>
                        <TableCell>{subscriber.email}</TableCell>
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
                    ))}
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
              Enter the subscriber's name and email address
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                placeholder="John Doe"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
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
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="John Doe"
                {...register('name')}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
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
                <div className="font-medium">{deletingSubscriber.name}</div>
                <div className="text-sm text-muted-foreground">{deletingSubscriber.email}</div>
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
