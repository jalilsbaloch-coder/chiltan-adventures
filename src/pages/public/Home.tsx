import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Clock, Compass, ShieldCheck, Heart, Map, Sparkles, Camera } from 'lucide-react';
import { TourPackage, GalleryImage } from '../../types';
import { normalizeImageUrl } from '../../lib/imageUrl';

export default function Home() {
  const [featuredTours, setFeaturedTours] = useState<TourPackage[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    fetch('/api/packages')
      .then(res => res.json())
      .then(data => setFeaturedTours(data.slice(0, 3)))
      .catch(console.error);

    fetch('/api/gallery?featured=true')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setGalleryImages(data.slice(0, 6));
        } else {
          // Fallback to general gallery if no featured
          fetch('/api/gallery')
            .then(r => r.json())
            .then(all => setGalleryImages(all.slice(0, 6)))
            .catch(console.error);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-balochistan.jpg" 
            alt="Makran Coastal Highway, Balochistan" 
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = '/images/fallback-tour.jpg' }}
          />
          <div className="absolute inset-0 bg-stone-900/60"></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Discover the Wild Beauty of Balochistan
          </h1>
          <p className="text-lg md:text-xl text-stone-200 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Explore breathtaking landscapes, hidden destinations and unforgettable journeys with Chiltan Adventures.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tours" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full font-semibold uppercase tracking-wide transition-colors">
              Explore Tours
            </Link>
            <Link to="/contact" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/30 text-white px-8 py-4 rounded-full font-semibold uppercase tracking-wide transition-colors">
              Plan Your Journey
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Tours */}
      <section className="py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-stone-900 mb-4">Featured Adventures</h2>
            <p className="text-stone-600 max-w-2xl mx-auto">Curated journeys designed to showcase the very best of our region's natural and cultural heritage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredTours.map((tour) => (
              <div key={tour.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-stone-100 group">
                <div className="relative h-64 overflow-hidden">
                  <img 
                    src={normalizeImageUrl(tour.image)} 
                    alt={tour.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.src = '/images/fallback-tour.jpg' }}
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold text-stone-900">
                    Rs. {tour.price.toLocaleString()}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 text-stone-500 text-sm mb-3">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>{tour.destination}</span>
                    <span className="mx-2">•</span>
                    <Clock className="h-4 w-4 text-emerald-600" />
                    <span>{tour.duration}</span>
                  </div>
                  <h3 className="text-xl font-bold text-stone-900 mb-3">{tour.title}</h3>
                  <p className="text-stone-600 text-sm mb-6 line-clamp-2 leading-relaxed">
                    {tour.description}
                  </p>
                  <Link to="/tours" className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
                    View Details <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link to="/tours" className="inline-flex items-center gap-2 border-2 border-stone-900 text-stone-900 px-8 py-3 rounded-full font-semibold hover:bg-stone-900 hover:text-white transition-colors">
              View All Packages
            </Link>
          </div>
        </div>
      </section>

      {/* Visual Stories / Gallery Showcase */}
      {galleryImages.length > 0 && (
        <section className="py-24 bg-white border-y border-stone-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
              <div>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
                  <Camera className="h-3.5 w-3.5" />
                  Visual Stories
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-stone-900 tracking-tight">
                  Landscapes of Balochistan
                </h2>
                <p className="text-stone-500 text-base mt-2 max-w-xl">
                  From high-altitude juniper valleys to dramatic ocean coastal highway formations.
                </p>
              </div>
              <Link 
                to="/tours" 
                className="mt-4 md:mt-0 inline-flex items-center gap-2 text-emerald-700 font-semibold hover:text-emerald-600 transition-colors"
              >
                <span>Explore destinations</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {galleryImages.map((img) => (
                <div 
                  key={img.id} 
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-stone-100 shadow-sm hover:shadow-xl transition-all border border-stone-100"
                >
                  <img
                    src={normalizeImageUrl(img.image)}
                    alt={img.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.src = '/images/fallback-tour.jpg' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                  
                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center pointer-events-none">
                    {img.destination ? (
                      <span className="bg-stone-900/80 backdrop-blur-sm text-stone-100 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        {img.destination}
                      </span>
                    ) : <span></span>}

                    {img.price !== null && img.price !== undefined && img.price > 0 && (
                      <span className="bg-emerald-600/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                        Rs. {img.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Bottom Text */}
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <h3 className="font-bold text-lg leading-tight mb-1 group-hover:text-emerald-300 transition-colors">
                      {img.title}
                    </h3>
                    {img.description && (
                      <p className="text-stone-300 text-xs line-clamp-2 font-light leading-relaxed">
                        {img.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Us */}
      <section className="py-24 bg-stone-900 text-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-white">Why Choose Chiltan Adventures?</h2>
            <p className="text-stone-400 max-w-2xl mx-auto">We are local experts dedicated to providing authentic, safe, and unforgettable travel experiences.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                <Map className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">Local Knowledge</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Deep understanding of hidden gems and local culture that mainstream tours miss.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                <Compass className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">Adventure-Focused</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Carefully crafted itineraries that balance thrill with natural appreciation.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">Comfortable Travel</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Premium transport and accommodation options, even in remote locations.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-white">Memorable Experiences</h3>
              <p className="text-stone-400 text-sm leading-relaxed">Committed to creating lifelong memories through exceptional service.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-24 bg-emerald-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready for Your Next Adventure?</h2>
          <p className="text-emerald-50 text-lg mb-10">Let's craft the perfect journey through the landscapes of Balochistan.</p>
          <Link to="/contact" className="bg-white text-emerald-800 hover:bg-stone-100 px-8 py-4 rounded-full font-bold uppercase tracking-wide transition-colors shadow-lg">
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}

