import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import apiServerClient from '@/lib/apiServerClient.js';
import { Pause, Play, Trash2 } from 'lucide-react';

const PLAN_LABELS = {
  basic: 'Basic',
  advanced: 'Advanced',
  premium: 'Premium'
};

const SubscriptionManagement = ({ subscription, onUpdate }) => {
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

      // The record stays active until Stripe finalizes the cancellation at
      // period end and the webhook flips it; a direct write here would also be
      // rejected (subscriptions.updateRule is superuser-only as of the
      // billing-collection lockdown migration).
      toast('Subscription will end at the close of your current billing period');
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
      past_due: 'destructive',
      cancelled: 'destructive'
    };
    const label = subscription.status === 'past_due'
      ? 'Past due'
      : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);
    return (
      <Badge variant={variants[subscription.status] || 'default'}>
        {label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>WhatsApp AI — {PLAN_LABELS[subscription.plan] || 'Agent'}</CardTitle>
            <CardDescription>
              {subscription.whatsapp_connected ? 'WhatsApp number connected' : 'WhatsApp number not connected yet'}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            {/* Label says "Cost", not "Monthly cost": monthly_cost holds the
                actual per-session charge, which is an annual amount for
                annual subscriptions — the /month or /year suffix below is
                what disambiguates it for the customer. */}
            <span className="text-muted-foreground">Cost</span>
            <span className="font-semibold">
              {subscription.currency?.toUpperCase()} {subscription.monthly_cost.toFixed(2)}
              <span className="text-muted-foreground font-normal">
                {subscription.billing_interval === 'annual' ? '/year' : '/month'}
              </span>
            </span>
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
                    Your Agent stays active until the end of the current billing period, then stops. No partial refund is issued for the remainder of the period.
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