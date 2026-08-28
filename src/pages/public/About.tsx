import React, { useEffect, useState } from 'react';
import { TeamMember } from '../../types';

export default function About() {
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetch('/api/team')
      .then(res => res.json())
      .then(data => setTeam(data))
      .catch(console.error);
  }, []);

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Header */}
      <div className="bg-stone-900 py-24 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About Chiltan Adventures</h1>
        <p className="text-stone-400 max-w-2xl mx-auto px-4">Discover the passion and people behind your next great journey.</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Mission & Vision */}
        <div className="mb-24">
          <div className="w-full h-64 md:h-96 rounded-3xl overflow-hidden mb-16">
            <img 
              src="/images/bolan-pass-heritage.jpg" 
              alt="Bolan Pass Bridge and Mountain Tunnel, Balochistan" 
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = '/images/fallback-tour.jpg' }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl font-bold text-stone-900 mb-6">Our Mission</h2>
              <p className="text-stone-600 leading-relaxed text-lg">
                To provide enjoyable, accessible, and memorable travel experiences that connect people with the extraordinary natural beauty and cultural heritage of our region. We believe in creating journeys that respect the environment and empower local communities.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-stone-900 mb-6">Our Vision</h2>
              <p className="text-stone-600 leading-relaxed text-lg">
                To be the leading sustainable tourism provider in Balochistan, encouraging responsible local tourism and helping travelers from around the world discover beautiful, untouched destinations while preserving them for future generations.
              </p>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-stone-900 mb-4">Meet Our Team</h2>
            <p className="text-stone-600 max-w-2xl mx-auto">Experienced professionals dedicated to making your adventure safe and unforgettable.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member) => (
              <div key={member.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 text-center p-6 hover:shadow-md transition-shadow">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden mb-6 border-4 border-stone-50">
                  <img 
                    src={member.image ? member.image : '/images/team/team-1.jpg'} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/images/team/team-1.jpg' }}
                  />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-1">{member.name}</h3>
                <p className="text-emerald-600 font-medium text-sm mb-4">{member.designation}</p>
                <p className="text-stone-500 text-sm leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
