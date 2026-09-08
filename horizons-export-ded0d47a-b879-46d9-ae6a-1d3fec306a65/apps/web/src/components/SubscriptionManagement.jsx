import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { Pause, Play, Trash2 } from 'lucide-react';

const SubscriptionManagement = ({ subscription, character, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    setLoading(true);
    try {
      const response = await apiServerClient.fetch('/stripe/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // The API already updates the PocketBase record's status; a direct
      // write here would also now be rejected (subscriptions.updateRule is
      // superuser-only as of the billing-collection lockdown migration).
      toast('Subscription cancelled successfully');
      onUpdate();
    } catch (error) {
      toast('Failed to cancel subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePause = async () => {
    setLoading(true);
    try {
      const newPaused = subscription.status !== 'paused';

      const response = await apiServerClient.fetch('/stripe/pause-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: subscription.stripe_subscription_id,
          paused: newPaused
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update subscription');
      }

      toast(`Subscription ${newPaused ? 'paused' : 'resumed'}`);
      onUpdate();
    } catch (error) {
      toast('Failed to update subscription');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    const variants = {
      active: 'default',
      paused: 'secondary',
      cancelled: 'destructive'
    };
    return (
      <Badge variant={variants[subscription.status] || 'default'}>
        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{character?.name || 'AI Assistant'}</CardTitle>
            <CardDescription>{character?.role_type}</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly cost</span>
            <span className="font-semibold">${subscription.monthly_cost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Next billing</span>
            <span>{new Date(subscription.next_billing_date).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        {subscription.status !== 'cancelled' && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePause}
              disabled={loading}
              className="flex-1"
            >
              {subscription.status === 'paused' ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={loading} className="flex-1">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel subscription</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this subscription? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Cancel subscription</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default SubscriptionManagement;