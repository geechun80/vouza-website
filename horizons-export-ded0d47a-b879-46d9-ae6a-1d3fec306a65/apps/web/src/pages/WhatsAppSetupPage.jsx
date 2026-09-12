import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import apiServerClient from '@/lib/apiServerClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { MessageCircle, CheckCircle2 } from 'lucide-react';

const WhatsAppSetupPage = () => {
  const { subscriptionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [businessForm, setBusinessForm] = useState({ name: '', description: '', keyFacts: '', tone: 'friendly' });
  const [businessSaved, setBusinessSaved] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiServerClient.fetch(`/whatsapp/status/${subscriptionId}`);
        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Could not load this Agent');
          return;
        }
        setStatus(data);
        if (data.businessInfo?.name) {
          setBusinessForm({
            name: data.businessInfo.name,
            description: data.businessInfo.description,
            keyFacts: data.businessInfo.keyFacts,
            tone: data.businessInfo.tone || 'friendly',
          });
          setBusinessSaved(true);
        }
      } catch (err) {
        setError('Could not load this Agent');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subscriptionId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiServerClient.fetch('/whatsapp/set-number', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, phone }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast(data.error || 'Could not save that number');
        return;
      }

      setStatus((prev) => ({ ...prev, whatsappNumber: phone, onboardingUrl: data.onboardingUrl }));
    } catch (err) {
      toast('Could not save that number');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    setSavingBusiness(true);

    try {
      const response = await apiServerClient.fetch('/whatsapp/set-business-info', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, ...businessForm }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast(data.error || 'Could not save your business info');
        return;
      }

      setBusinessSaved(true);
      toast('Business info saved');
    } catch (err) {
      toast('Could not save your business info');
    } finally {
      setSavingBusiness(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Connect your WhatsApp number</title>
        <meta name="description" content="Connect your WhatsApp Business number to your Vouza AI Agent." />
      </Helmet>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Connect your WhatsApp number</CardTitle>
            <CardDescription>A couple of steps before your AI Agent goes live</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
            ) : error ? (
              <p className="text-sm text-destructive text-center py-8">{error}</p>
            ) : status?.whatsappConnected ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-primary" />
                <p className="font-medium">Your WhatsApp number is connected</p>
                <p className="text-sm text-muted-foreground">Your AI Agent is live and replying on WhatsApp.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {status?.whatsappNumber ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">1. WhatsApp number</p>
                    <div className="flex items-center gap-3 text-sm bg-muted rounded-lg p-4">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <span>
                        Number saved: <strong>{status.whatsappNumber}</strong>
                      </span>
                    </div>
                    <Button asChild className="w-full">
                      <a href={status.onboardingUrl} target="_blank" rel="noopener noreferrer">
                        Continue to Meta to connect it
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      You'll log into the Facebook account that manages your business and confirm access — Vouza
                      never sees your other Facebook/Business data.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm font-medium">1. WhatsApp number</p>
                    <div className="space-y-2">
                      <Label htmlFor="phone">WhatsApp number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+6591234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="text-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        International format, starting with + and your country code.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? 'Saving...' : 'Continue'}
                    </Button>
                  </form>
                )}

                <div className="border-t border-border pt-6">
                  <form onSubmit={handleBusinessSubmit} className="space-y-4">
                    <p className="text-sm font-medium">
                      2. Tell your AI Agent about your business
                      {businessSaved && <CheckCircle2 className="inline w-4 h-4 text-primary ml-2 -mt-0.5" />}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This is what your Agent will actually know when it answers your customers — the more
                      specific, the better it can help.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="business-name">Business name</Label>
                      <Input
                        id="business-name"
                        value={businessForm.name}
                        onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                        placeholder="e.g. Leong's Bakery"
                        required
                        className="text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-description">What you offer</Label>
                      <Textarea
                        id="business-description"
                        value={businessForm.description}
                        onChange={(e) => setBusinessForm({ ...businessForm, description: e.target.value })}
                        placeholder="Products, services, opening hours, delivery areas, pricing..."
                        className="text-foreground min-h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-facts">Key facts / FAQ</Label>
                      <Textarea
                        id="business-facts"
                        value={businessForm.keyFacts}
                        onChange={(e) => setBusinessForm({ ...businessForm, keyFacts: e.target.value })}
                        placeholder={'One per line, e.g.\nWe are closed on Mondays\nMinimum order is $20\nWe accept PayNow and cash on delivery'}
                        className="text-foreground min-h-24"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-tone">Tone</Label>
                      <Select
                        value={businessForm.tone}
                        onValueChange={(value) => setBusinessForm({ ...businessForm, tone: value })}
                      >
                        <SelectTrigger id="business-tone" className="text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" variant="outline" className="w-full" disabled={savingBusiness}>
                      {savingBusiness ? 'Saving...' : businessSaved ? 'Update business info' : 'Save business info'}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default WhatsAppSetupPage;
