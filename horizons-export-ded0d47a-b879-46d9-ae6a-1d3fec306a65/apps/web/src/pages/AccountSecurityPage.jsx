import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';

const AccountSecurityPage = () => {
  const { currentUser, refreshUser } = useAuth();
  const totpEnabled = !!currentUser?.totp_enabled;

  // 'idle' | 'setup' — 'setup' means a QR code is on screen awaiting the
  // confirm code; nothing is persisted in PocketBase until that succeeds.
  const [stage, setStage] = useState('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [starting, setStarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const handleStartSetup = async () => {
    setStarting(true);
    try {
      const response = await apiServerClient.fetch('/auth/2fa/setup', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        toast(data.error || 'Could not start 2FA setup');
        return;
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setCode('');
      setStage('setup');
    } catch (error) {
      toast('Could not start 2FA setup');
    } finally {
      setStarting(false);
    }
  };

  const handleCancelSetup = () => {
    setStage('idle');
    setQrCode('');
    setSecret('');
    setCode('');
  };

  const handleConfirm = async () => {
    if (code.length !== 6) {
      return;
    }

    setConfirming(true);
    try {
      const response = await apiServerClient.fetch('/auth/2fa/confirm', {
        method: 'POST',
        body: JSON.stringify({ secret, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast(data.error || 'Incorrect code');
        return;
      }

      await refreshUser();
      handleCancelSetup();
      toast('Authenticator app connected');
    } catch (error) {
      toast('Could not confirm the code');
    } finally {
      setConfirming(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      const response = await apiServerClient.fetch('/auth/2fa/disable', { method: 'POST' });

      if (!response.ok) {
        toast('Could not disable authenticator sign-in');
        return;
      }

      await refreshUser();
      toast('Authenticator sign-in disabled');
    } catch (error) {
      toast('Could not disable authenticator sign-in');
    } finally {
      setDisabling(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Vouza Account Security</title>
        <meta name="description" content="Manage sign-in options for your Vouza account." />
      </Helmet>
      <Header />
      <main className="min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-balance" style={{ letterSpacing: '-0.02em' }}>
              Account Security
            </h1>
            <p className="text-muted-foreground">Manage how you sign in to Vouza</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Authenticator app sign-in
              </CardTitle>
              <CardDescription>
                Set up a free authenticator app (like Google Authenticator or Microsoft Authenticator) for an
                extra, optional way to sign in with a 6-digit code — alongside your password and Google
                sign-in, which always keep working too.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stage === 'idle' && (
                totpEnabled ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                      <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                      <span>Authenticator app sign-in is <strong>enabled</strong> on your account.</span>
                    </div>
                    <Button variant="outline" onClick={handleDisable} disabled={disabling} className="gap-2">
                      <ShieldOff className="w-4 h-4" />
                      {disabling ? 'Disabling...' : 'Disable'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">Not set up yet.</p>
                    <Button onClick={handleStartSetup} disabled={starting}>
                      {starting ? 'Starting...' : 'Set up authenticator app'}
                    </Button>
                  </div>
                )
              )}

              {stage === 'setup' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium mb-3">1. Scan this QR code with your authenticator app</p>
                    <div className="bg-white rounded-lg p-4 w-fit mx-auto sm:mx-0">
                      {qrCode && <img src={qrCode} alt="Authenticator app QR code" className="w-48 h-48" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Can't scan it? Enter this code manually instead:{' '}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-foreground break-all">{secret}</code>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-3">2. Enter the 6-digit code it shows</p>
                    <InputOTP maxLength={6} value={code} onChange={setCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={handleConfirm} disabled={code.length !== 6 || confirming}>
                      {confirming ? 'Confirming...' : 'Confirm'}
                    </Button>
                    <Button variant="ghost" onClick={handleCancelSetup}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default AccountSecurityPage;
