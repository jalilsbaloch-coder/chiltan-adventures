import React, { useEffect } from 'react';
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Image as ImageIcon, 
  Users, 
  MessageSquare, 
  LogOut,
  ExternalLink,
  ArrowLeft,
  Globe
} from 'lucide-react';
import { getAuth, clearAuth } from '../../lib/auth';

// We will import actual admin views here later
// For now, inline simple components
import Overview from './Overview';
import PackagesManager from './PackagesManager';
import GalleryManager from './GalleryManager';
import TeamManager from './TeamManager';
import MessagesManager from './MessagesManager';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = getAuth();

  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    clearAuth();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Tour Packages', path: '/admin/packages', icon: MapIcon },
    { name: 'Gallery', path: '/admin/gallery', icon: ImageIcon },
    { name: 'Team Members', path: '/admin/team', icon: Users },
    { name: 'Messages', path: '/admin/messages', icon: MessageSquare },
  ];

  const isActive = (path: string) => {
    if (path === '/admin/dashboard' && location.pathname === '/admin/dashboard') return true;
    if (path !== '/admin/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-stone-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-stone-800">
          <img src="/logo/chiltan-adventures-icon-white.svg" alt="CHILTAN ADVENTURES" className="h-9 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg text-white uppercase tracking-[0.12em] leading-none">CHILTAN</span>
            <span className="text-[9px] font-semibold tracking-[0.3em] text-stone-300 leading-none mt-1">ADMIN</span>
          </div>
        </div>
        
        <div className="p-6">
          <div className="text-xs uppercase tracking-widest text-stone-500 font-semibold mb-4">Menu</div>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive(item.path) 
                      ? 'bg-emerald-600/20 text-emerald-400 font-semibold shadow-sm' 
                      : 'hover:bg-stone-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}

            {/* Divider */}
            <div className="pt-3 pb-1">
              <div className="border-t border-stone-800" />
            </div>

            {/* View Website Sidebar Link */}
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-stone-300 hover:bg-stone-800 hover:text-emerald-400 font-medium group"
              title="Return to public website"
            >
              <Globe className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>View Website</span>
            </Link>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-stone-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium text-white">{user.name}</div>
              <div className="text-xs text-stone-500 capitalize">{user.role}</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors text-sm font-medium"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-stone-200 h-16 flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-bold text-stone-800">Chiltan Adventures Management</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 text-stone-700 text-sm font-semibold transition-all shadow-sm group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 text-stone-500 group-hover:text-emerald-600" />
              <span>Back to Website</span>
            </Link>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          <Routes>
            <Route path="dashboard" element={<Overview />} />
            <Route path="packages" element={<PackagesManager />} />
            <Route path="gallery" element={<GalleryManager />} />
            <Route path="team" element={<TeamManager />} />
            <Route path="messages" element={<MessagesManager />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
