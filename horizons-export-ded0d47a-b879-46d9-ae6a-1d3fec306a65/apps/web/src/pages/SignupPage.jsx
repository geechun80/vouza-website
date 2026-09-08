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

const SignupPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    passwordConfirm: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    const result = await signup(formData.email, formData.password, formData.passwordConfirm);
    
    if (result.success) {
      toast('Vouza account created successfully');
      navigate('/dashboard');
    } else {
      toast(result.error || 'Signup failed');
    }
    
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Create your Vouza account</title>
        <meta name="description" content="Create your Vouza account and start managing AI assistants for your business." />
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
            <CardTitle className="text-2xl">Create your Vouza account</CardTitle>
            <CardDescription>Get started with intelligent AI assistants</CardDescription>
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
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="text-foreground"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passwordConfirm">Confirm password</Label>
                <Input
                  id="passwordConfirm"
                  type="password"
                  placeholder="••••••••"
                  value={formData.passwordConfirm}
                  onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                  required
                  className="text-foreground"
                />
                {errors.passwordConfirm && (
                  <p className="text-sm text-destructive">{errors.passwordConfirm}</p>
                )}
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground">
              Already have a Vouza account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </>
  );
};

export default SignupPage;