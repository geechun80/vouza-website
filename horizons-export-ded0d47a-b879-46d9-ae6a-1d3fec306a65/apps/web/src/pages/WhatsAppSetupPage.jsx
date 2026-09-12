import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import apiServerClient from '@/lib/apiServerClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

  return (
    <>
      <Helmet>
        <title>Connect your WhatsApp number</title>
        <meta name="description" content="Connect your WhatsApp Business number to your Vouza AI Agent." />
      </Helmet>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Connect your WhatsApp number</CardTitle>
            <CardDescription>One step before your AI Agent goes live</CardDescription>
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
            ) : status?.whatsappNumber ? (
              <div className="space-y-6">
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
                <p className="text-xs text-muted-foreground text-center">
                  You'll log into the Facebook account that manages your business and confirm access — Vouza
                  never sees your other Facebook/Business data.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the WhatsApp number your AI Agent should use, so we can recognize it once you've
                  connected it with Meta.
                </p>
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
          </CardContent>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default WhatsAppSetupPage;
