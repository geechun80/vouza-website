import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SubscriptionManagement from '@/components/SubscriptionManagement.jsx';
import PlanFeatures from '@/components/PlanFeatures.jsx';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { TrendingUp, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MARKETS, PLANS, SETUP_FEE } from '@/lib/plans.js';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [market, setMarket] = useState('sg');
  const [billingInterval, setBillingInterval] = useState('monthly');

  const fetchData = async () => {
    setLoading(true);
    try {
      const subscriptionsData = await pb.collection('subscriptions').getFullList({
        filter: `user_id = "${currentUser.id}"`,
        $autoCancel: false
      });
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Stripe redirects back here after hosted Checkout. The subscription record
  // is written by the webhook, not by this redirect, so it may not exist yet on
  // the fetch that follows.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');

    if (checkout === 'success') {
      toast('Payment received — your Agent will appear here shortly');
    } else if (checkout === 'cancelled') {
      toast('Checkout cancelled');
    }

    if (checkout) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const response = await apiServerClient.fetch('/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, market, interval: billingInterval })
      });

      if (!response.ok) {
        throw new Error('Failed to start checkout');
      }

      const data = await response.json();

      // Full-page redirect to Stripe-hosted Checkout; nothing after this runs.
      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      toast('Failed to start checkout');
      setSubscribing(null);
    }
  };

  // Grouped by currency rather than summed flat: a customer could in principle
  // pick a different billing region for a second Agent, and SGD + MYR totals
  // are not addable into one meaningful number.
  const totalsByCurrency = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((totals, sub) => {
      const key = sub.currency || 'unknown';
      totals[key] = (totals[key] || 0) + sub.monthly_cost;
      return totals;
    }, {});

  const activeMarket = MARKETS.find(m => m.id === market);

  return (
    <>
      <Helmet>
        <title>Dashboard - Vouza</title>
        <meta name="description" content="Manage your Vouza WhatsApp AI Agent subscriptions and view your billing information." />
      </Helmet>
      <Header />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-balance" style={{letterSpacing: '-0.02em'}}>
              Welcome to your Vouza Dashboard
            </h1>
            <p className="text-muted-foreground mb-4">Signed in as {currentUser?.email}</p>
            <div className="inline-flex flex-wrap items-center gap-2 bg-card/60 backdrop-blur-sm border border-border px-4 py-2 rounded-full shadow-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">
                Total monthly cost:{' '}
                {Object.keys(totalsByCurrency).length === 0 ? (
                  <strong className="text-foreground text-base ml-1">0.00</strong>
                ) : (
                  Object.entries(totalsByCurrency).map(([currency, amount], i) => (
                    <strong key={currency} className="text-foreground text-base ml-1">
                      {i > 0 && <span className="text-muted-foreground font-normal"> + </span>}
                      {currency.toUpperCase()} {amount.toFixed(2)}
                    </strong>
                  ))
                )}
              </span>
            </div>
          </div>

          <section className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">Your active Vouza assistants</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : subscriptions.filter(sub => sub.status !== 'cancelled').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscriptions
                  .filter(sub => sub.status !== 'cancelled')
                  .map((subscription) => (
                    <SubscriptionManagement
                      key={subscription.id}
                      subscription={subscription}
                      onUpdate={fetchData}
                    />
                  ))}
              </div>
            ) : (
              <Card className="border-dashed bg-card/30">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-foreground font-medium mb-2">No active assistants yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Choose a WhatsApp AI plan below to set up your first Agent.</p>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-semibold">Add a WhatsApp AI Agent</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Each Agent covers one WhatsApp number. You can add as many as you need.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Billing region</span>
                <div className="inline-flex rounded-full border border-border bg-card/60 backdrop-blur-sm p-1" role="group" aria-label="Billing region">
                  {MARKETS.map((m) => (
                    <Button
                      key={m.id}
                      type="button"
                      variant={market === m.id ? 'default' : 'ghost'}
                      size="sm"
                      aria-pressed={market === m.id}
                      className={market === m.id ? 'text-[#01181c]' : ''}
                      onClick={() => setMarket(m.id)}
                    >
                      {m.label} ({m.currency})
                    </Button>
                  ))}
                </div>
                <div className="inline-flex rounded-full border border-border bg-card/60 backdrop-blur-sm p-1" role="group" aria-label="Billing interval">
                  <Button
                    type="button"
                    variant={billingInterval === 'monthly' ? 'default' : 'ghost'}
                    size="sm"
                    aria-pressed={billingInterval === 'monthly'}
                    className={billingInterval === 'monthly' ? 'text-[#01181c]' : ''}
                    onClick={() => setBillingInterval('monthly')}
                  >
                    Monthly
                  </Button>
                  <Button
                    type="button"
                    variant={billingInterval === 'annual' ? 'default' : 'ghost'}
                    size="sm"
                    aria-pressed={billingInterval === 'annual'}
                    className={billingInterval === 'annual' ? 'text-[#01181c]' : ''}
                    onClick={() => setBillingInterval('annual')}
                  >
                    Annual <span className="ml-1 text-xs opacity-80">(Save 10%)</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <Card
                  key={plan.id}
                  className={cn(
                    'flex flex-col h-full',
                    plan.recommended && 'border-primary/40 hover:border-primary/50'
                  )}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle>{plan.name}</CardTitle>
                      {plan.recommended && <Badge>Recommended</Badge>}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="flex items-baseline gap-1 pt-2">
                      <span className="text-3xl font-bold">
                        {activeMarket?.currency} {(billingInterval === 'annual' ? plan.annualPrice[market] : plan.price[market]).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        {billingInterval === 'annual' ? '/WhatsApp Agent/year' : '/WhatsApp Agent/month'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <PlanFeatures features={plan.features} />
                  </CardContent>
                  <CardFooter className="mt-auto pt-6 border-t border-border flex-col items-stretch gap-2">
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing !== null}
                    >
                      {subscribing === plan.id ? 'Redirecting…' : `Subscribe (${activeMarket?.currency})`}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      + {activeMarket?.currency} {SETUP_FEE[market].toFixed(2)} one-time implementation fee on your first Agent
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default DashboardPage;
