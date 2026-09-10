import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

// PocketBase rejects anything shorter server-side; checking here too so the
// user finds out before a round trip.
const MIN_PASSWORD_LENGTH = 8;

const PasswordResetConfirmPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { confirmPasswordReset } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD_LENGTH) {
      toast(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (password !== passwordConfirm) {
      toast('The two passwords do not match');
      return;
    }

    setLoading(true);
    const result = await confirmPasswordReset(token, password, passwordConfirm);
    setLoading(false);

    if (result.success) {
      setDone(true);
      toast('Password updated — you can sign in now');
      // Give the confirmation a moment to be read before moving on.
      setTimeout(() => navigate('/login'), 2500);
      return;
    }

    // A bad/expired token comes back as a field error on `token`; PocketBase's
    // top-level message for it is too vague to act on.
    const fields = result.fieldErrors || {};
    if (fields.token) {
      setExpired(true);
      toast('This reset link has expired or was already used');
    } else if (fields.password?.message) {
      toast(fields.password.message);
    } else {
      toast(result.error || 'Could not update your password');
    }
  };

  return (
    <>
      <Helmet>
        <title>Choose a new Vouza password</title>
        <meta name="description" content="Set a new password for your Vouza account." />
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
            <CardTitle className="text-2xl">
              {done ? 'Password updated' : expired ? 'This link has expired' : 'Choose a new password'}
            </CardTitle>
            <CardDescription>
              {done
                ? 'Taking you to the sign-in page…'
                : expired
                ? 'Reset links can only be used once, and expire a short while after they are sent.'
                : 'Enter a new password for your Vouza account.'}
            </CardDescription>
          </CardHeader>

          {expired ? (
            <CardFooter className="flex flex-col gap-3 pt-6">
              <Button asChild className="w-full">
                <Link to="/reset-password">Send me a new link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </CardFooter>
          ) : !done ? (
            <>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">New password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      className="text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passwordConfirm">Confirm new password</Label>
                    <Input
                      id="passwordConfirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Type it again"
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      className="text-foreground"
                    />
                  </div>
                  <Button type="submit" className="w-full mt-2" disabled={loading || !token}>
                    {loading ? 'Updating…' : 'Update password'}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-border pt-6">
                <p className="text-sm text-muted-foreground">
                  Link expired?{' '}
                  <Link to="/reset-password" className="text-primary hover:underline font-medium">
                    Request a new one
                  </Link>
                </p>
              </CardFooter>
            </>
          ) : (
            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button asChild className="w-full">
                <Link to="/login">Go to sign in</Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default PasswordResetConfirmPage;
