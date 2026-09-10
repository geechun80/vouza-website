import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import PlanFeatures from '@/components/PlanFeatures.jsx';
import { cn } from '@/lib/utils';
import { MARKETS, PLANS, SETUP_FEE, TOPUPS } from '@/lib/plans.js';

const PricingPage = () => {
  const { isAuthenticated } = useAuth();
  const [market, setMarket] = useState('sg');
  const [billingInterval, setBillingInterval] = useState('monthly');
  const activeMarket = MARKETS.find((m) => m.id === market);
  const isAnnual = billingInterval === 'annual';

  return (
    <>
      <Helmet>
        <title>Pricing Plans from Vouza</title>
        <meta name="description" content="Choose the right WhatsApp AI Agent plan for your business — flexible pricing for Singapore and Malaysia." />
      </Helmet>
      <Header />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              WhatsApp AI Agents
            </span>
            <h1
              className="text-4xl md:text-5xl font-extrabold mb-4 text-balance gradient-text"
              style={{ letterSpacing: '-0.02em' }}
            >
              Pricing Plans from Vouza
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              WhatsApp AI Agents, priced per Agent per month. Each subscription covers one WhatsApp number — add as many Agents as your business needs.
            </p>
            <p className="mt-5 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Not sure which plan fits your workflow?{' '}
              <a href="mailto:hello@vouza.ai" className="text-primary underline underline-offset-4 hover:text-primary/80">Talk to us before subscribing</a>{' '}
              and we'll recommend the right Agent package for you.
            </p>
          </div>

          {/* aria-pressed on each option: which market/interval is selected is
              otherwise conveyed only by the gradient fill, which a screen
              reader can't see. */}
          <div className="flex flex-wrap justify-center gap-3 mb-14">
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
                variant={!isAnnual ? 'default' : 'ghost'}
                size="sm"
                aria-pressed={!isAnnual}
                className={!isAnnual ? 'text-[#01181c]' : ''}
                onClick={() => setBillingInterval('monthly')}
              >
                Monthly
              </Button>
              <Button
                type="button"
                variant={isAnnual ? 'default' : 'ghost'}
                size="sm"
                aria-pressed={isAnnual}
                className={isAnnual ? 'text-[#01181c]' : ''}
                onClick={() => setBillingInterval('annual')}
              >
                Annual <span className="ml-1 text-xs opacity-80">(Save 10%)</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  'flex flex-col h-full',
                  plan.recommended &&
                    'border-primary/40 shadow-[0_20px_60px_-15px_rgba(0,212,212,0.35)] md:-translate-y-3 hover:border-primary/50'
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    {plan.recommended && <Badge>Recommended</Badge>}
                  </div>
                  <CardDescription className="leading-relaxed">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-8 pb-8 border-b border-border">
                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-4xl font-extrabold tracking-tight">
                        {activeMarket?.currency} {(isAnnual ? plan.annualPrice[market] : plan.price[market]).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        {isAnnual ? '/WhatsApp Agent/year' : '/WhatsApp Agent/month'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      + {activeMarket?.currency} {SETUP_FEE[market].toFixed(2)} one-time implementation fee on your first Agent
                    </p>
                  </div>
                  <PlanFeatures features={plan.features} />
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

          <section className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3" style={{ letterSpacing: '-0.02em' }}>
              Recommended top-up structure
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-8 max-w-2xl mx-auto leading-relaxed">
              Need more than your monthly allowance? Top-ups add usage to your current plan — they don't change the plan itself. If you find yourself topping up often, we'll suggest moving you to a higher package instead, since it usually works out cheaper.
            </p>

            <div className="glass-effect rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left">
                      <th scope="col" className="px-5 py-4 font-semibold">Plan</th>
                      <th scope="col" className="px-5 py-4 font-semibold">Included</th>
                      <th scope="col" className="px-5 py-4 font-semibold">Recommended top-up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TOPUPS.map((row) => (
                      <tr key={row.plan} className="border-b border-border/40 last:border-0 align-top">
                        <th scope="row" className="px-5 py-4 font-semibold text-foreground text-left whitespace-nowrap">{row.plan}</th>
                        <td className="px-5 py-4 text-muted-foreground">{row.included}</td>
                        <td className="px-5 py-4">
                          {row.options ? (
                            <ul className="space-y-1">
                              {row.options.map((option) => (
                                <li key={option.label}>
                                  <span className="text-muted-foreground">{option.label}</span>
                                  <span className="mx-2 text-muted-foreground/50">·</span>
                                  <span className="font-medium text-foreground whitespace-nowrap">
                                    {activeMarket?.currency} {option.price[market].toFixed(2)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground">Custom — agreed with your account team</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              All prices exclude GST (Singapore) and SST (Malaysia), which are added at checkout where applicable.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PricingPage;
