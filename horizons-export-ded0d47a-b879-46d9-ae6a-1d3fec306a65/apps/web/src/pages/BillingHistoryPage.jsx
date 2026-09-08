import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import apiServerClient from '@/lib/apiServerClient.js';
import { FileText, Download } from 'lucide-react';

const BillingHistoryPage = () => {
  const { currentUser } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await apiServerClient.fetch(`/stripe/invoices/${currentUser.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }
        const data = await response.json();
        setInvoices(data);
      } catch (error) {
        console.error('Failed to fetch invoices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [currentUser]);

  const getStatusBadge = (status) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive',
      open: 'secondary'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <>
      <Helmet>
        <title>Vouza Billing History</title>
        <meta name="description" content="View your Vouza billing history and download invoices." />
      </Helmet>
      <Header />
      <main className="min-h-screen bg-secondary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-balance" style={{letterSpacing: '-0.02em'}}>
              Vouza Billing History
            </h1>
            <p className="text-muted-foreground">View and download your Vouza invoices</p>
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>All your billing transactions and invoices for Vouza services</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ))}
                </div>
              ) : invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                          <TableCell>Vouza AI Assistant Subscription</TableCell>
                          <TableCell className="font-semibold">${invoice.amount.toFixed(2)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            {invoice.pdfUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-medium mb-2">No invoices yet</p>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your billing history will appear here once you have active Vouza subscriptions.</p>
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

export default BillingHistoryPage;