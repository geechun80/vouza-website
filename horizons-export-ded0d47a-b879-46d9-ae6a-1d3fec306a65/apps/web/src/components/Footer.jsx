import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[rgba(0,8,10,0.9)] text-foreground border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img
                src="/vouza-logo.png"
                alt="Vouza"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-sm leading-relaxed max-w-md text-muted-foreground">
              Empowering SMEs with intelligent AI assistants from Vouza. Handle customer service, HR, marketing, sales, and warehouse operations seamlessly. Scale your team without the overhead.
            </p>
          </div>

          <div>
            <span className="font-semibold text-sm tracking-wide uppercase mb-4 block text-foreground">Vouza Links</span>
            <ul className="space-y-2">
              <li><a href="https://vouza.ai" className="text-sm text-muted-foreground hover:text-primary transition-colors">Home</a></li>
              <li><Link to="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-sm tracking-wide uppercase mb-4 block text-foreground">Contact Vouza</span>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>hello@vouza.ai</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Global HQ</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Vouza. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;