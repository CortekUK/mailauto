'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Validation schema - updated for new SheetDB columns
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

export function AddSubscriber() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubscriberFormData>({
    resolver: zodResolver(subscriberSchema),
  });

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
        reset(); // Clear the form
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

  return (
    <Card className="w-full max-w-md">
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
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                {...register('firstName')}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register('lastName')}
                disabled={isSubmitting}
              />
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

          <div className="space-y-2">
            <Label htmlFor="labels">Labels</Label>
            <Input
              id="labels"
              placeholder="customer, vip, newsletter"
              {...register('labels')}
              disabled={isSubmitting}
            />
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
  );
}
