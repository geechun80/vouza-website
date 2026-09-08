import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SubscriptionManagement from '@/components/SubscriptionManagement.jsx';
import pb from '@/lib/pocketbaseClient.js';
import apiServerClient from '@/lib/apiServerClient.js';
import { TrendingUp, Bot } from 'lucide-react';

const DashboardPage = () => {
  const { currentUser } = useAuth();
  const [characters, setCharacters] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [charactersData, subscriptionsData] = await Promise.all([
        pb.collection('ai_characters').getFullList({ $autoCancel: false }),
        pb.collection('subscriptions').getFullList({
          filter: `user_id = "${currentUser.id}"`,
          $autoCancel: false
        })
      ]);
      setCharacters(charactersData);
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const isSubscribed = (characterId) => {
    return subscriptions.some(
      sub => sub.character_id === characterId && sub.status !== 'cancelled'
    );
  };

  const handleSubscribe = async (character) => {
    setSubscribing(character.id);
    try {
      const response = await apiServerClient.fetch('/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      const data = await response.json();
      
      toast('Subscription created successfully');
      await fetchData();
    } catch (error) {
      console.error('Subscription error:', error);
      toast('Failed to create subscription');
    } finally {
      setSubscribing(null);
    }
  };

  const totalMonthlyCost = subscriptions
    .filter(sub => sub.status === 'active')
    .reduce((sum, sub) => sum + sub.monthly_cost, 0);

  const getCharacterById = (id) => characters.find(c => c.id === id);

  return (
    <>
      <Helmet>
        <title>Dashboard - Vouza</title>
        <meta name="description" content="Manage your Vouza AI assistant subscriptions and view your billing information." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-12">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-balance" style={{letterSpacing: '-0.02em'}}>
              Welcome to your Vouza Dashboard
            </h1>
            <p className="text-muted-foreground mb-4">Signed in as {currentUser?.email}</p>
            <div className="inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-lg shadow-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Total monthly cost: <strong className="text-foreground text-base ml-1">${totalMonthlyCost.toFixed(2)}</strong></span>
            </div>
          </div>

          <section className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">Your active Vouza assistants</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-20 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : subscriptions.filter(sub => sub.status !== 'cancelled').length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscriptions
                  .filter(sub => sub.status !== 'cancelled')
                  .map((subscription) => (
                    <SubscriptionManagement
                      key={subscription.id}
                      subscription={subscription}
                      character={getCharacterById(subscription.character_id)}
                      onUpdate={fetchData}
                    />
                  ))}
              </div>
            ) : (
              <Card className="bg-card border-dashed">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-2">No active assistants yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Browse available Vouza AI assistants below to start automating your workflows.</p>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6">Browse Vouza AI assistants</h2>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-12 w-32" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters.map((character) => (
                  <Card key={character.id} className="flex flex-col h-full hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle>{character.name}</CardTitle>
                      <CardDescription>{character.role_type}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{character.description}</p>
                      <div className="text-3xl font-bold">${character.monthly_price.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                    </CardContent>
                    <CardFooter className="mt-auto pt-6 border-t border-border/50">
                      <Button
                        className="w-full"
                        onClick={() => handleSubscribe(character)}
                        disabled={isSubscribed(character.id) || subscribing === character.id}
                      >
                        {subscribing === character.id
                          ? 'Subscribing...'
                          : isSubscribed(character.id)
                          ? 'Already subscribed'
                          : 'Subscribe to Vouza'}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default DashboardPage;