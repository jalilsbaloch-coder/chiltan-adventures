import React, { useEffect, useState } from 'react';
import { MapPin, Clock } from 'lucide-react';
import { TourPackage } from '../../types';

export default function Tours() {
  const [tours, setTours] = useState<TourPackage[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetch('/api/packages')
      .then(res => res.json())
      .then(data => setTours(data))
      .catch(console.error);
  }, []);

  const activeTours = tours.filter(t => t.status === 'active');
  const destinations = ['All', ...Array.from(new Set(activeTours.map(t => t.destination.split(',')[0])))];

  const filteredTours = filter === 'All' 
    ? activeTours 
    : activeTours.filter(t => t.destination.includes(filter));

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="bg-stone-900 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Tour Packages</h1>
        <p className="text-stone-400 max-w-2xl mx-auto px-4">Find the perfect adventure tailored to your spirit of exploration.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Simple Filter */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center">
          {destinations.map(dest => (
            <button
              key={dest}
              onClick={() => setFilter(dest)}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                filter === dest 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-emerald-600 hover:text-emerald-600'
              }`}
            >
              {dest}
            </button>
          ))}
        </div>

        {/* Tours Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTours.map((tour) => (
            <div key={tour.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-stone-100 flex flex-col">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={tour.image ? tour.image : '/images/fallback-tour.jpg'} 
                  alt={tour.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/images/fallback-tour.jpg' }}
                />
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm px-4 py-1.5 rounded-full font-bold text-stone-900 shadow-sm">
                  Rs. {tour.price.toLocaleString()}
                </div>
              </div>
              <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-2 text-stone-500 text-sm mb-3">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span>{tour.destination}</span>
                  <span className="mx-2">•</span>
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>{tour.duration}</span>
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">{tour.title}</h3>
                <p className="text-stone-600 text-sm mb-6 line-clamp-3 flex-grow leading-relaxed">
                  {tour.description}
                </p>
                <button className="w-full bg-stone-100 hover:bg-stone-200 text-stone-900 font-semibold py-3 rounded-xl transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTours.length === 0 && (
          <div className="text-center py-20 text-stone-500">
            No tours found for this destination at the moment.
          </div>
        )}

      </div>
    </div>
  );
}
