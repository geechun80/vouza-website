import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { Check } from 'lucide-react';

const PricingPage = () => {
  const { isAuthenticated } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const records = await pb.collection('ai_characters').getFullList({
          sort: 'monthly_price',
          $autoCancel: false
        });
        setCharacters(records);
      } catch (error) {
        console.error('Failed to fetch characters:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const parseFeatures = (featuresString) => {
    if (!featuresString) return [];
    return featuresString.split('\n').filter(f => f.trim());
  };

  return (
    <>
      <Helmet>
        <title>Pricing Plans from Vouza</title>
        <meta name="description" content="Choose the perfect Vouza AI assistant for your business needs. Flexible pricing for every role." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-balance" style={{letterSpacing: '-0.02em'}}>
              Pricing Plans from Vouza
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Choose the intelligent AI assistants that fit your business needs. Pay only for what you use with Vouza's transparent pricing.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-12 w-32 mb-4" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {characters.map((character) => (
                <Card key={character.id} className="flex flex-col h-full transition-all duration-200 hover:shadow-lg border-border/50">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-xl">{character.name}</CardTitle>
                      <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">{character.role_type}</Badge>
                    </div>
                    <CardDescription className="leading-relaxed">{character.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-8 pb-8 border-b border-border/50">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">${character.monthly_price.toFixed(2)}</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>
                    {character.features && (
                      <ul className="space-y-3">
                        {parseFeatures(character.features).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm">
                            <Check className="w-5 h-5 text-primary flex-shrink-0" />
                            <span className="text-foreground/80 leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
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
          )}

          {!loading && characters.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No Vouza AI assistants available at the moment.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PricingPage;