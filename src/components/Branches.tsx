import React, { useEffect, useState } from 'react';
import { Branch } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Plus, X, Trash2, Home } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';

export function Branches() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'danger'
  });

  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  async function fetchBranches() {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Geocode the address
      let lat = null;
      let lng = null;
      try {
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}&limit=1`);
        const geoData = await geoResponse.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(geoData[0].lat);
          lng = parseFloat(geoData[0].lon);
        }
      } catch (err) {
        console.error('Geocoding failed:', err);
      }

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          lat,
          lng
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', address: '' });
        fetchBranches();
      }
    } catch (error) {
      console.error('Error creating branch:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function updateBranchLocation(id: string, lat: number, lng: number) {
    setIsUpdating(id);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/branches/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lat, lng }),
      });
      if (response.ok) {
        fetchBranches();
      }
    } catch (error) {
      console.error('Error updating branch location:', error);
    } finally {
      setIsUpdating(null);
    }
  }

  async function setBranchToCurrentLocation(id: string) {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported');
      return;
    }
    
    setIsUpdating(id);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateBranchLocation(id, position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        alert('Could not get current location');
        setIsUpdating(null);
      }
    );
  }

  async function geocodeBranchAddress(id: string, address: string) {
    setIsUpdating(id);
    try {
      const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
      const geoData = await geoResponse.json();
      if (geoData && geoData.length > 0) {
        const lat = parseFloat(geoData[0].lat);
        const lng = parseFloat(geoData[0].lon);
        updateBranchLocation(id, lat, lng);
      } else {
        alert('Could not find coordinates for this address');
        setIsUpdating(null);
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
      setIsUpdating(null);
    }
  }

  async function handleDeleteBranch(id: string) {
    const branch = branches.find(b => b.id.toString() === id.toString());
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Branch',
      message: `Are you sure you want to delete ${branch?.name || 'this branch'}? This will remove all associated shifts and records.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await fetch(`/api/branches/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setBranches(prev => prev.filter(b => b.id.toString() !== id.toString()));
          }
        } catch (error) {
          console.error('Error deleting branch:', error);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <p className="text-sm text-[#8a8070] dark:text-white/40">Manage all restaurant branches and locations</p>
        {isAdmin && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Branch
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-8 h-8 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : branches.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px]">
            <div className="text-4xl mb-4">🏠</div>
            <p className="font-bold font-syne dark:text-white">No branches yet</p>
            <p className="text-sm text-[#8a8070] dark:text-white/40">Add your first branch to get started</p>
          </div>
        ) : (
          branches.map((branch) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] p-6 shadow-sm flex flex-col gap-6"
            >
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-orange-600/10 text-orange-600 flex items-center justify-center">
                  <Home className="w-6 h-6" />
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider dark:bg-green-900/20 dark:text-green-400">
                  Active
                </span>
              </div>
              
              <div>
                <h3 className="text-lg font-bold font-syne dark:text-white mb-1">{branch.name}</h3>
                <div className="space-y-2 mt-4">
                  <div className="flex items-start gap-3 text-sm text-[#8a8070] dark:text-white/60">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-1">
                      <span>{branch.address || 'No address set'}</span>
                      {branch.lat && branch.lng && (
                        <span className="text-[10px] font-mono opacity-60">
                          {branch.lat.toFixed(4)}, {branch.lng.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-auto pt-6 border-t border-[#e5e0d5] dark:border-white/10 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button className="flex-1 text-xs font-bold text-[#1a1a1a] dark:text-white bg-[#f7f5f0] dark:bg-white/5 hover:bg-[#e5e0d5] dark:hover:bg-white/10 py-2.5 rounded-xl transition-all">
                    View Details
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => handleDeleteBranch(branch.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {isAdmin && !branch.lat && (
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => geocodeBranchAddress(branch.id, branch.address)}
                      disabled={isUpdating === branch.id}
                      className="text-[10px] font-bold bg-orange-600/10 text-orange-600 py-2 rounded-lg hover:bg-orange-600/20 transition-all disabled:opacity-50"
                    >
                      {isUpdating === branch.id ? 'Fixing...' : 'Fix via Address'}
                    </button>
                    <button 
                      onClick={() => setBranchToCurrentLocation(branch.id)}
                      disabled={isUpdating === branch.id}
                      className="text-[10px] font-bold bg-blue-600/10 text-blue-600 py-2 rounded-lg hover:bg-blue-600/20 transition-all disabled:opacity-50"
                    >
                      {isUpdating === branch.id ? 'Fixing...' : 'Use My GPS'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        variant={confirmConfig.variant}
        isLoading={confirmConfig.isLoading}
      />

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
                <h3 className="font-bold font-syne dark:text-white">New Branch</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              
              <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Branch Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                    placeholder="e.g. Lekki Branch"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Physical Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white min-h-[100px]"
                    placeholder="Full address of the location"
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2.5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
