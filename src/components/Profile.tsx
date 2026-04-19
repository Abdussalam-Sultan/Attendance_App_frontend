import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { UserCircle, Mail, Shield, MapPin, Calendar, LogOut, Phone, Camera, Loader2, Sun, Moon } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

export function Profile() {
  const { user, logout, login, isDarkMode, setIsDarkMode } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  React.useEffect(() => {
    async function fetchBranches() {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/branches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setBranches(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    }
    fetchBranches();
  }, []);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/users/me/photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        // Handle photo URL in response - prioritizing photo_url from backend
        const photoUrl = data.photo_url || data.photoUrl || 
                         data.data?.photo_url || data.data?.profilePicture || data.data?.profile_picture;
        if (photoUrl) {
          // Update the user context with the new photo URL
          const updatedUser = { ...user, profilePicture: photoUrl };
          // We assume login function can update local state in context
          await login(token || '', updatedUser);
        }
      } else {
        setUploadError(data.message || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setUploadError('Connection error. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const assignedBranch = branches.find(b => b.id.toString() === user.branch_id?.toString());

  const infoItems = [
    { label: 'Full Name', value: user.name, icon: UserCircle },
    { label: 'Email Address', value: user.email, icon: Mail },
    { label: 'Phone Number', value: user.phoneNumber || user.phone || 'Not provided', icon: Phone },
    { label: 'System Role', value: user.role, icon: Shield, badge: true },
    { label: 'Assigned Branch', value: assignedBranch?.name || user.branch_id || 'Global Admin', icon: MapPin },
    { label: 'Member Since', value: formatDate(user.createdAt), icon: Calendar },
  ];

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto space-y-8">
      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[32px] p-6 sm:p-8 shadow-sm text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-orange-600/5 dark:bg-orange-600/10" />
        
        <div className="relative z-10">
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="w-24 h-24 rounded-[24px] bg-orange-600 text-white flex items-center justify-center text-3xl font-bold font-syne shadow-xl shadow-orange-600/20 overflow-hidden group transition-all">
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle className={cn("w-12 h-12 opacity-60 transition-transform group-hover:scale-110", isUploading && "animate-pulse")} />
              )}
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <h2 className="text-2xl font-bold font-syne dark:text-white mb-1">{user.name}</h2>
          <p className="text-[#8a8070] dark:text-white/40 text-sm mb-4">{user.email}</p>
          
          {uploadError && (
            <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-4 animate-pulse uppercase tracking-wider">{uploadError}</p>
          )}
          
          <div className="flex justify-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              user.role === 'admin' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            )}>
              {user.role}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
              {user.status}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10">
          <h3 className="font-bold font-syne dark:text-white">Account Information</h3>
        </div>
        <div className="divide-y divide-[#e5e0d5] dark:divide-white/10">
          {infoItems.map((item) => (
            <div key={item.label} className="p-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#f7f5f0] dark:bg-white/5 flex items-center justify-center text-[#8a8070] dark:text-white/40">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#b5ad9f] dark:text-white/20 mb-0.5">{item.label}</p>
                <p className="text-sm font-bold dark:text-white">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[32px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10">
          <h3 className="font-bold font-syne dark:text-white">Preferences</h3>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#f7f5f0] dark:bg-white/5 flex items-center justify-center text-[#8a8070] dark:text-white/40">
              {isDarkMode ? <Moon className="w-5 h-5 text-orange-600" /> : <Sun className="w-5 h-5 text-orange-600" />}
            </div>
            <div>
              <p className="text-sm font-bold dark:text-white">Appearance</p>
              <p className="text-xs text-[#8a8070] dark:text-white/40">Currently in {isDarkMode ? 'Dark' : 'Light'} Mode</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="w-16 h-8 rounded-full bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 relative p-1 transition-colors hover:border-orange-600/50"
          >
            <motion.div
              initial={false}
              animate={{ x: isDarkMode ? 32 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-lg"
            >
              {isDarkMode ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
            </motion.div>
          </button>
        </div>
      </div>

      <button 
        onClick={logout}
        className="w-full flex items-center justify-center gap-3 bg-red-50 dark:bg-red-900/10 text-red-600 hover:bg-red-100 transition-all py-4 px-6 rounded-[24px] font-bold text-sm"
      >
        <LogOut className="w-5 h-5" />
        Sign Out from Dashboard
      </button>
    </div>
  );
}
