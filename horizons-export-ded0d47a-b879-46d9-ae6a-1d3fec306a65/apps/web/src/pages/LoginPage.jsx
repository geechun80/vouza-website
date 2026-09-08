import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      toast('Login successful');
      navigate('/dashboard');
    } else {
      toast(result.error || 'Login failed');
    }
    
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Sign in to Vouza</title>
        <meta name="description" content="Sign in to your Vouza account to manage your AI assistants." />
      </Helmet>
      <Header />
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-secondary/30 py-12 px-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="https://horizons-cdn.hostinger.com/ded0d47a-b879-46d9-ae6a-1d3fec306a65/db328f14825b42004d6763db94b92ea4.jpg" 
                alt="Vouza Logo" 
                className="h-12 w-auto object-contain rounded-lg"
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
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
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