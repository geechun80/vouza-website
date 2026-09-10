import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const PasswordResetPage = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await requestPasswordReset(email);
    
    if (result.success) {
      toast('Password reset email sent');
      setEmailSent(true);
    } else {
      toast(result.error || 'Failed to send reset email');
    }
    
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Reset your Vouza password</title>
        <meta name="description" content="Reset your Vouza account password." />
      </Helmet>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <img
                src="/vouza-logo.png"
                alt="Vouza"
                className="h-14 w-auto object-contain rounded-xl"
              />
            </div>
            <CardTitle className="text-2xl">Reset your password</CardTitle>
            <CardDescription>
              {emailSent 
                ? 'Check your email for reset instructions'
                : 'Enter your email to receive a password reset link for your Vouza account'
              }
            </CardDescription>
          </CardHeader>
          {!emailSent ? (
            <>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="text-foreground"
                    />
                  </div>
                  <Button type="submit" className="w-full mt-2" disabled={loading}>
                    {loading ? 'Sending...' : 'Send reset link'}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-border pt-6">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </>
          ) : (
            <CardFooter className="flex flex-col gap-4 pt-6">
              <p className="text-sm text-center text-muted-foreground">
                We've sent a password reset link to <strong className="text-foreground">{email}</strong>. Please check your inbox and follow the instructions.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default PasswordResetPage;