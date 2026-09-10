import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Check } from 'lucide-react';
import { MARKETS, PLANS, SETUP_FEE } from '@/lib/plans.js';

const PricingPage = () => {
  const { isAuthenticated } = useAuth();
  const [market, setMarket] = useState('sg');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const activeMarket = MARKETS.find((m) => m.id === market);

  return (
    <>
      <Helmet>
        <title>Pricing Plans from Vouza</title>
        <meta name="description" content="Choose the right WhatsApp AI Agent plan for your business — flexible pricing for Singapore and Malaysia." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance" style={{ letterSpacing: '-0.02em' }}>
              Pricing Plans from Vouza
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              WhatsApp AI Agents, priced per Agent per month. Each subscription covers one WhatsApp number — add as many Agents as your business needs.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-12">
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              {MARKETS.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={market === m.id ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMarket(m.id)}
                >
                  {m.label} ({m.currency})
                </Button>
              ))}
            </div>
            <div className="inline-flex rounded-lg border border-border bg-card p-1">
              <Button
                type="button"
                variant={billingInterval === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingInterval('monthly')}
              >
                Monthly
              </Button>
              <Button
                type="button"
                variant={billingInterval === 'annual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setBillingInterval('annual')}
              >
                Annual <span className="ml-1 text-xs opacity-80">(Save 10%)</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan) => (
              <Card key={plan.id} className="flex flex-col h-full transition-all duration-200 hover:shadow-lg border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {plan.recommended && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Recommended</Badge>
                    )}
                  </div>
                  <CardDescription className="leading-relaxed">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-8 pb-8 border-b border-border/50">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">
                        {activeMarket?.currency} {(billingInterval === 'annual' ? plan.annualPrice[market] : plan.price[market]).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        {billingInterval === 'annual' ? '/Agent/year' : '/Agent/month'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      + {activeMarket?.currency} {SETUP_FEE[market].toFixed(2)} one-time setup fee on your first Agent
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-foreground/80 leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="mt-auto pt-6">
                  {isAuthenticated ? (
                    <Button asChild className="w-full">
                      <Link to="/dashboard">Subscribe to Vouza</Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full">
                      <Link to="/signup">Get started with Vouza</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-10">
            Not sure which plan fits your workflow?{' '}
            <a href="mailto:hello@vouza.ai" className="underline underline-offset-4">Talk to us before subscribing</a>{' '}
            and we'll recommend the right Agent package for you.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PricingPage;
