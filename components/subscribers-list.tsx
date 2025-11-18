'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface Subscriber {
  name: string;
  email: string;
  subscribed_at?: string;
  status?: string;
}

export function SubscribersList() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        setSubscribers(result.data);
      } else {
        toast.error('Failed to load subscribers');
      }
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      toast.error('An error occurred while loading subscribers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Subscribers</CardTitle>
          <CardDescription>Loading subscribers...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subscribers</CardTitle>
            <CardDescription>
              {subscribers.length} total subscriber{subscribers.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchSubscribers(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {subscribers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No subscribers yet.</p>
            <p className="text-sm mt-2">Add your first subscriber to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscribers.map((subscriber, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium">{subscriber.name}</div>
                  <div className="text-sm text-muted-foreground">{subscriber.email}</div>
                  {subscriber.subscribed_at && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Subscribed: {formatDate(subscriber.subscribed_at)}
                    </div>
                  )}
                </div>
                <Badge variant={subscriber.status === 'active' ? 'default' : 'secondary'}>
                  {subscriber.status || 'active'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
