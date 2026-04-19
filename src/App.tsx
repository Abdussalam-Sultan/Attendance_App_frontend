import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Calendar, 
  MapPin, 
  BarChart3, 
  UserCircle, 
  LogOut, 
  Menu, 
  X,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Staff } from './components/Staff';
import { Attendance } from './components/Attendance';
import { Shifts } from './components/Shifts';
import { Branches } from './components/Branches';
import { Reports } from './components/Reports';
import { Profile } from './components/Profile';

function Sidebar({ activePage, setActivePage, role, isOpen, onClose }: { activePage: string, setActivePage: (p: string) => void, role: string, isOpen: boolean, onClose: () => void }) {
  const { logout } = useAuth();
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'staff', label: 'Staff', icon: Users, roles: ['admin', 'manager'] },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'shifts', label: 'Shifts', icon: Calendar },
    { id: 'branches', label: 'Branches', icon: MapPin, roles: ['admin'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { id: 'profile', label: 'Profile', icon: UserCircle },
  ].filter(item => !item.roles || item.roles.includes(role));

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-64 bg-[#1a1a1a] h-screen flex flex-col flex-shrink-0 z-50 transition-transform duration-300 lg:translate-x-0 overflow-hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="absolute top-[-80px] right-[-80px] w-48 h-48 rounded-full bg-orange-600/15 pointer-events-none" />
        
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <h1 className="text-white font-bold text-xl font-syne">Chek<span className="text-orange-600">out</span></h1>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 font-bold px-3 mb-4 mt-2">Navigation</p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                activePage === item.id 
                  ? "bg-orange-600/20 text-white font-medium" 
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-colors",
                activePage === item.id ? "text-orange-600" : "text-white/40 group-hover:text-white/60"
              )} />
              <span className="text-sm">{item.label}</span>
              {activePage === item.id && (
                <motion.div layoutId="activeNav" className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-600" />
              )}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function MainContent() {
  const { user, loading, isAuthReady, isDarkMode } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Reset to dashboard when user logs in
  React.useEffect(() => {
    if (user) {
      setActivePage('dashboard');
    }
  }, [user?.id]);

  if (loading || !isAuthReady) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center bg-[#f7f5f0] dark:bg-[#121212] transition-colors duration-200", isDarkMode ? "dark" : "")}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold font-syne text-[#8a8070] dark:text-white/40 animate-pulse">Initializing Chekout...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return (
    <div className={isDarkMode ? "dark" : ""}>
      <Login />
    </div>
  );

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={setActivePage} />;
      case 'staff': return <Staff />;
      case 'attendance': return <Attendance />;
      case 'shifts': return <Shifts />;
      case 'branches': return <Branches />;
      case 'reports': return <Reports />;
      case 'profile': return <Profile />;
      default: return <Dashboard onNavigate={setActivePage} />;
    }
  };

  const pageTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    staff: 'Staff Management',
    attendance: 'Attendance Tracking',
    shifts: 'Shift Schedule',
    branches: 'Branch Management',
    reports: 'Reports & Analytics',
    profile: 'My Profile'
  };

  return (
    <div className={cn("flex h-screen overflow-hidden bg-[#f7f5f0] dark:bg-[#121212]", isDarkMode ? "dark" : "")}>
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        role={user.role} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 bg-[#f7f5f0] dark:bg-[#121212] transition-colors relative">
        <header className="h-20 bg-white dark:bg-[#1a1a1a] border-b border-[#e5e0d5] dark:border-white/10 px-4 sm:px-8 flex items-center justify-between flex-shrink-0 transition-colors z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl bg-[#f7f5f0] dark:bg-white/5 text-[#8a8070] dark:text-white/60 hover:text-orange-600 transition-all active:scale-90"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div 
              className="lg:hidden w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-orange-600/20"
              title="Chekout"
            >
              C
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold font-syne dark:text-white leading-tight">
                  {pageTitles[activePage]}
                </h2>
              </div>
              <p className="text-[10px] sm:text-xs text-[#8a8070] dark:text-white/40 font-medium">
                Chekout Admin · <span className="text-orange-600/60 dark:text-orange-400/40">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="hidden sm:block p-2.5 rounded-xl bg-[#f7f5f0] dark:bg-white/5 text-[#8a8070] dark:text-white/60 hover:text-orange-600 transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-600 rounded-full border-2 border-white dark:border-[#1a1a1a]" />
            </button>
            <div className="hidden sm:block h-8 w-[1px] bg-[#e5e0d5] dark:bg-white/10 mx-2" />
            <button 
              onClick={() => setActivePage('profile')}
              className="flex items-center gap-3 hover:bg-[#f7f5f0] dark:hover:bg-white/5 p-1.5 sm:p-2 rounded-2xl transition-all border border-transparent hover:border-[#e5e0d5] dark:hover:border-white/10 group"
            >
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold dark:text-white group-hover:text-orange-600 transition-colors uppercase tracking-tight">{user.name}</p>
                <p className="text-[10px] text-[#8a8070] dark:text-white/40 uppercase tracking-widest font-black leading-none">{user.role}</p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-bold font-syne text-sm sm:text-base overflow-hidden shadow-lg shadow-orange-600/10 group-hover:scale-105 transition-transform">
                {user.profilePicture ? (
                  <img 
                    src={user.profilePicture} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 opacity-80" />
                )}
              </div>
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full min-w-0"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <MainContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}
