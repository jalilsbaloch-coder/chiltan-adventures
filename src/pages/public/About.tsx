import React, { useEffect, useState } from 'react';
import { TeamMember } from '../../types';

export default function About() {
  const [team, setTeam] = useState<TeamMember[]>([
    {
      id: 1,
      name: 'Jalil Ur Rehman',
      designation: 'Project Developer',
      bio: 'AI Web Development student and aspiring web developer. Chiltan Adventures is my final project for the AI Web Development course.',
      image: ''
    }
  ]);

  useEffect(() => {
    fetch('/api/team')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const filtered = data.filter(
            m => m.name === 'Jalil Ur Rehman' || !['Tariq Baloch', 'Sara Khan', 'Ahmed Ali', 'Zainab Qazi'].includes(m.name)
          );
          if (filtered.length > 0) {
            setTeam(filtered);
          }
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Header */}
      <div className="bg-stone-900 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">About Chiltan Adventures</h1>
        <p className="text-stone-400 max-w-2xl mx-auto px-4 text-base md:text-lg">
          Showcasing the natural beauty and travel destinations of Balochistan.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Scenic Landscape Banner */}
        <div className="w-full h-64 md:h-80 rounded-3xl overflow-hidden mb-16 shadow-sm border border-stone-200">
          <img 
            src="/images/bolan-pass-heritage.jpg" 
            alt="Bolan Pass Bridge and Mountain Tunnel, Balochistan" 
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.src = '/images/fallback-tour.jpg'; }}
          />
        </div>

        {/* About Section */}
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-stone-100 mb-16">
          <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-6">About the Project</h2>
          <p className="text-stone-700 text-lg leading-relaxed mb-6">
            Chiltan Adventures is my final project for the DTAN Web Development course, created to showcase the natural beauty and tourism destinations of Balochistan.
          </p>
          <div className="p-5 bg-emerald-50/80 rounded-2xl border border-emerald-100/80 text-emerald-900 font-medium text-base">
            Special thanks to DTAN for providing the training and learning opportunity.
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-3">Project Team</h2>
          </div>

          <div className="max-w-2xl mx-auto">
            {team.map((member) => (
              <div 
                key={member.id} 
                className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-stone-100 text-center hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-xl mb-5">
                  JR
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-1.5">{member.name}</h3>
                <p className="text-emerald-700 font-semibold text-sm mb-4 tracking-wide uppercase">{member.designation}</p>
                <p className="text-stone-600 text-base leading-relaxed max-w-xl mx-auto">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
