import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Compass, Map, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-8 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-6 group">
              <img src="/logo/chiltan-adventures-icon-white.svg" alt="CHILTAN ADVENTURES" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
              <div className="flex flex-col">
                <span className="font-extrabold text-lg tracking-[0.12em] text-white leading-none">CHILTAN</span>
                <span className="text-[9px] font-semibold tracking-[0.35em] text-stone-300 leading-none mt-1">ADVENTURES</span>
              </div>
            </Link>
            <p className="text-sm leading-relaxed text-stone-400 mb-6">
              Discover the wild beauty of Balochistan. We provide premium adventure travel experiences focusing on unforgettable landscapes and heritage.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-stone-400 hover:text-emerald-400 transition-colors"><Map className="h-5 w-5" /></a>
              <a href="#" className="text-stone-400 hover:text-emerald-400 transition-colors"><Compass className="h-5 w-5" /></a>
              <a href="#" className="text-stone-400 hover:text-emerald-400 transition-colors"><Heart className="h-5 w-5" /></a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold uppercase tracking-wider mb-6">Quick Links</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/" className="hover:text-emerald-400 transition-colors">Home</Link></li>
              <li><Link to="/about" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
              <li><Link to="/tours" className="hover:text-emerald-400 transition-colors">Tour Packages</Link></li>
              <li><Link to="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold uppercase tracking-wider mb-6">Popular Destinations</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/tours" className="hover:text-emerald-400 transition-colors">Ziarat Valley</Link></li>
              <li><Link to="/tours" className="hover:text-emerald-400 transition-colors">Hingol National Park</Link></li>
              <li><Link to="/tours" className="hover:text-emerald-400 transition-colors">Kund Malir Beach</Link></li>
              <li><Link to="/tours" className="hover:text-emerald-400 transition-colors">Chiltan Mountains</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold uppercase tracking-wider mb-6">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>123 Adventure Avenue, Quetta, Balochistan, Pakistan</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>+92 300 1234567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>info@chiltanadventures.com</span>
              </li>
            </ul>
          </div>

        </div>
        
        <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-stone-500">
          <p>© 2026 Chiltan Adventures. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/admin/login" className="hover:text-stone-300 transition-colors">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
