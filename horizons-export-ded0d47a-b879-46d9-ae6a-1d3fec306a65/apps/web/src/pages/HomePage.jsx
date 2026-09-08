import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { motion } from 'framer-motion';
import { DollarSign, Clock, Settings, Headphones, Users, TrendingUp, ShoppingCart, Package } from 'lucide-react';

const HomePage = () => {
  const benefits = [
    {
      icon: DollarSign,
      title: 'Cost-effective scaling',
      description: 'Reduce operational costs significantly compared to traditional hiring while maintaining high quality output with Vouza.'
    },
    {
      icon: Clock,
      title: '24/7 availability',
      description: 'Vouza AI assistants work around the clock without breaks, ensuring your business never sleeps.'
    },
    {
      icon: Settings,
      title: 'Customizable roles',
      description: 'Tailor each Vouza assistant to your specific business needs, brand voice, and internal workflows.'
    }
  ];

  const assistants = [
    {
      icon: Headphones,
      name: 'Customer Service Assistant',
      description: 'Handle customer inquiries, support tickets, and live chat with intelligent, brand-aligned responses.',
      color: 'text-blue-500'
    },
    {
      icon: Users,
      name: 'HR Assistant',
      description: 'Manage recruitment, onboarding, employee queries, and HR documentation effortlessly.',
      color: 'text-green-500'
    },
    {
      icon: TrendingUp,
      name: 'Digital Marketing Assistant',
      description: 'Create content, manage social media, analyze campaigns, and optimize your SEO strategy.',
      color: 'text-purple-500'
    },
    {
      icon: ShoppingCart,
      name: 'Sales Manager',
      description: 'Track leads, manage pipelines, automate follow-ups, and generate actionable sales reports.',
      color: 'text-orange-500'
    },
    {
      icon: Package,
      name: 'Warehouse Assistant',
      description: 'Monitor inventory, process orders, coordinate logistics, and track shipments in real-time.',
      color: 'text-cyan-500'
    }
  ];

  return (
    <>
      <Helmet>
        <title>Vouza - AI Assistant Solutions for SMEs</title>
        <meta name="description" content="Empower your business with intelligent AI assistants from Vouza. Transform your SME with solutions for customer service, HR, marketing, sales, and warehouse operations." />
      </Helmet>
      <Header />
      <main>
        <section className="relative min-h-[90dvh] flex items-center justify-center overflow-hidden bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="max-w-2xl"
              >
                <div className="mb-8 inline-block">
                  <img 
                    src="https://horizons-cdn.hostinger.com/ded0d47a-b879-46d9-ae6a-1d3fec306a65/db328f14825b42004d6763db94b92ea4.jpg" 
                    alt="Vouza Logo" 
                    className="h-16 w-auto object-contain rounded-xl shadow-sm"
                  />
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance leading-tight" style={{letterSpacing: '-0.02em'}}>
                  Vouza: AI Assistant Solutions for SMEs
                </h1>
                <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                  Empower your business with intelligent AI assistants from Vouza. Scale your operations across customer service, HR, marketing, sales, and logistics without the traditional overhead.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild className="text-lg px-8">
                    <Link to="/signup">Start with Vouza</Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="text-lg px-8">
                    <Link to="/pricing">View Pricing</Link>
                  </Button>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl relative">
                  <img
                    src="https://images.unsplash.com/photo-1677442136019-21780ecad995"
                    alt="AI technology visualization"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance" style={{letterSpacing: '-0.02em'}}>
                Why choose Vouza?
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Transform your operations with intelligent automation designed specifically for growing businesses.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full transition-all duration-200 hover:shadow-lg border-border/50 bg-secondary/20">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                        <benefit.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{benefit.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance" style={{letterSpacing: '-0.02em'}}>
                Meet your Vouza AI team
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Specialized assistants equipped with industry knowledge for every business function.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {assistants.map((assistant, index) => (
                <motion.div
                  key={assistant.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full bg-card transition-all duration-200 hover:shadow-md border-border/50">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                          <assistant.icon className={`w-6 h-6 ${assistant.color}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg mb-2">{assistant.name}</CardTitle>
                          <CardDescription className="leading-relaxed">{assistant.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              viewport={{ once: true }}
              className="text-center mt-12"
            >
              <Button size="lg" asChild>
                <Link to="/pricing">View all Vouza assistants</Link>
              </Button>
            </motion.div>
          </div>
        </section>

        <section className="py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-balance" style={{letterSpacing: '-0.02em'}}>
                Ready to transform your business with Vouza?
              </h2>
              <p className="text-xl mb-8 leading-relaxed opacity-90">
                Join thousands of SMEs scaling their operations with our intelligent AI workforce.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild className="text-lg px-8 text-primary">
                  <Link to="/signup">Get Started with Vouza</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default HomePage;