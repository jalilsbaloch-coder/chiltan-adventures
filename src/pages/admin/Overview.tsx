import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Map, Image, Users, MessageSquare, ArrowLeft, Globe } from 'lucide-react';
import { fetchWithAuth } from '../../lib/auth';

export default function Overview() {
  const [stats, setStats] = useState({ packages: 0, gallery: 0, team: 0, messages: 0 });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [pkgRes, galRes, teamRes, msgRes] = await Promise.all([
          fetchWithAuth('/api/packages'),
          fetchWithAuth('/api/gallery'),
          fetchWithAuth('/api/team'),
          fetchWithAuth('/api/messages')
        ]);
        
        const [packages, gallery, team, messages] = await Promise.all([
          pkgRes.json(), galRes.json(), teamRes.json(), msgRes.json()
        ]);

        setStats({
          packages: packages.length || 0,
          gallery: gallery.length || 0,
          team: team.length || 0,
          messages: messages.length || 0
        });
      } catch (error) {
        console.error('Failed to load stats');
      }
    };
    loadStats();
  }, []);

  const statCards = [
    { name: 'Total Tour Packages', value: stats.packages, icon: Map, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Gallery Images', value: stats.gallery, icon: Image, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Team Members', value: stats.team, icon: Users, color: 'text-amber-600', bg: 'bg-amber-100' },
    { name: 'Total Inquiries', value: stats.messages, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Dashboard Overview</h2>
          <p className="text-sm text-stone-500 mt-1">Live metrics and management control center.</p>
        </div>
        
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-all shadow-sm group self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 text-emerald-400 group-hover:text-white" />
          <span>← Back to Website</span>
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4">
              <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center shrink-0`}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <div className="text-stone-500 text-sm font-medium">{stat.name}</div>
                <div className="text-3xl font-bold text-stone-900">{stat.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 bg-white rounded-3xl shadow-sm border border-stone-100 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="text-center md:text-left">
          <h3 className="text-lg font-bold text-stone-900 mb-1">Welcome to Chiltan Adventures Admin</h3>
          <p className="text-stone-500 text-sm">Manage tour packages, photo gallery, team roster, and client inquiries in real-time.</p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-stone-800 text-sm font-bold transition-all shadow-sm shrink-0"
        >
          <Globe className="h-4 w-4 text-emerald-600" />
          <span>Open Public Website</span>
        </Link>
      </div>
    </div>
  );
}
