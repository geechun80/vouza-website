import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img 
                src="https://horizons-cdn.hostinger.com/ded0d47a-b879-46d9-ae6a-1d3fec306a65/db328f14825b42004d6763db94b92ea4.jpg" 
                alt="Vouza Logo" 
                className="h-10 w-auto object-contain rounded-md mix-blend-multiply dark:mix-blend-normal"
              />
            </div>
            <p className="text-sm leading-relaxed max-w-md opacity-80">
              Empowering SMEs with intelligent AI assistants from Vouza. Handle customer service, HR, marketing, sales, and warehouse operations seamlessly. Scale your team without the overhead.
            </p>
          </div>

          <div>
            <span className="font-semibold text-sm tracking-wide uppercase mb-4 block">Vouza Links</span>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm opacity-80 hover:opacity-100 transition-opacity">Home</Link></li>
              <li><Link to="/pricing" className="text-sm opacity-80 hover:opacity-100 transition-opacity">Pricing</Link></li>
              <li><Link to="/dashboard" className="text-sm opacity-80 hover:opacity-100 transition-opacity">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <span className="font-semibold text-sm tracking-wide uppercase mb-4 block">Contact Vouza</span>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm opacity-80">
                <Mail className="w-4 h-4" />
                <span>hello@vouza.com</span>
              </li>
              <li className="flex items-center gap-2 text-sm opacity-80">
                <MapPin className="w-4 h-4" />
                <span>Global HQ</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/50 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm opacity-70">© 2026 Vouza. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-sm opacity-70 hover:opacity-100 transition-opacity">Privacy Policy</Link>
            <Link to="/terms" className="text-sm opacity-70 hover:opacity-100 transition-opacity">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;