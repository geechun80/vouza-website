import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const GoogleIcon = (props) => (
  <svg viewBox="0 0 48 48" width="18" height="18" {...props}>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z" />
    <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.3-5.1l-6.6-5.6c-2 1.5-4.6 2.4-7.7 2.4-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.9 39.6 16.4 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.4 36.3 44 30.6 44 24c0-1.3-.1-2.7-.4-3.5z" />
  </svg>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle, loginWithTotp } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [totpCode, setTotpCode] = useState('');
  // 'password' or 'totp' — an alternative sign-in method for accounts that
  // set up an authenticator app on the Security page, not a second step
  // required after the password.
  const [mode, setMode] = useState('password');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = mode === 'password'
      ? await login(formData.email, formData.password)
      : await loginWithTotp(formData.email, totpCode);

    if (result.success) {
      toast('Login successful');
      navigate('/dashboard');
    } else {
      toast(result.error || 'Login failed');
    }

    setLoading(false);
  };

  const toggleMode = () => {
    setMode(mode === 'password' ? 'totp' : 'password');
    setTotpCode('');
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const result = await loginWithGoogle();

    if (result.success) {
      toast('Login successful');
      navigate('/dashboard');
    } else {
      toast(result.error || 'Google sign-in failed');
    }

    setGoogleLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Sign in to Vouza</title>
        <meta name="description" content="Sign in to your Vouza account to manage your AI assistants." />
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
            <CardTitle className="text-2xl">Sign in to Vouza</CardTitle>
            <CardDescription>Welcome back! Please enter your details.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="text-foreground"
                />
              </div>
              {mode === 'password' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/reset-password" className="text-sm text-primary hover:underline font-medium">
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="text-foreground"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Authenticator app code</Label>
                  <InputOTP maxLength={6} value={totpCode} onChange={setTotpCode}>
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
              )}
              <Button
                type="submit"
                className="w-full mt-2"
                disabled={loading || (mode === 'totp' && totpCode.length !== 6)}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
              <button
                type="button"
                onClick={toggleMode}
                className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {mode === 'password' ? 'Use an authenticator app code instead' : 'Use your password instead'}
              </button>
            </form>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              <GoogleIcon />
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </Button>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              Don't have a Vouza account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default LoginPage;