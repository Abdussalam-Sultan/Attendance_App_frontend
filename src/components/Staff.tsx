import React, { useEffect, useState, useMemo } from 'react';
import { User, UserRole, UserStatus, Branch } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Shield, MoreVertical, Check, X, UserPlus, ArrowLeft, Phone, Mail, UserCircle, Briefcase, Trash2, MapPin, WifiOff, CloudUpload } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/useOffline';
import { ConfirmModal } from './ConfirmModal';
import { CustomSelect } from './CustomSelect';
import { CustomCheckbox } from './CustomCheckbox';

export function Staff() {
  const { user: currentUser } = useAuth();
  const { isOnline, pendingCount, sync, smartFetch } = useOffline();
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const canManageStaff = isAdmin || isManager;

  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'all' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'details'>('list');
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(isManager ? currentUser?.branch_id || '0' : '0');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [showBulkApproveModal, setShowBulkApproveModal] = useState(false);
  const [forceSameBranch, setForceSameBranch] = useState(false);
  
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
    email: '',
    phoneNumber: '',
    gender: 'male',
    role: 'staff' as UserRole,
    branch_id: currentUser?.branch_id || '',
    status: 'active' as UserStatus
  });

  const [error, setLocalError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetchStaff();
    fetchBranches();
  }, []);

  async function fetchBranches() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch('/api/branches', {
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

  async function fetchStaff() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch('/api/admin/all-staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const result = await response.json();
        const rawStaff = result.data || result.staff || [];
        const normalizedStaff = rawStaff.map((s: any) => ({
          ...s,
          profilePicture: s.photo_url || s.profile_picture || s.profilePicture || null
        }));
        setStaff(normalizedStaff);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setLocalError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch('/api/admin/create-staff', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ 
          name: '', 
          email: '', 
          phoneNumber: '', 
          gender: 'male',
          role: 'staff', 
          branch_id: currentUser?.branch_id || '', 
          status: 'active' 
        });
        fetchStaff();
      } else {
        setLocalError(data.message || 'Failed to create staff member');
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      setLocalError('Connection error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleApproveStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!showApproveModal) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch('/api/admin/status', {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          staff_id: showApproveModal.id, 
          status: 'active',
          role: formData.role,
          branch_id: formData.branch_id
        }),
      });
      
      if (response.ok) {
        setShowApproveModal(null);
        fetchStaff();
      }
    } catch (error) {
      console.error('Error approving staff:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkApprove(e: React.FormEvent) {
    e.preventDefault();
    if (selectedStaffIds.length === 0) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const promises = selectedStaffIds.map(id => {
        const member = staff.find(s => s.id === id);
        // Use registration branch unless forced to a new one
        const finalBranchId = forceSameBranch ? formData.branch_id : (member?.branch_id || formData.branch_id);
        
        return smartFetch('/api/admin/status', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            staff_id: id, 
            status: 'active',
            role: formData.role,
            branch_id: finalBranchId
          }),
        });
      });

      const results = await Promise.all(promises);
      const failed = results.filter(r => !r.ok);
      
      if (failed.length > 0) {
        setLocalError(`Failed to approve ${failed.length} members. Please try again.`);
      } else {
        setShowBulkApproveModal(false);
        setSelectedStaffIds([]);
        fetchStaff();
      }
    } catch (error) {
      console.error('Error during bulk approval:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(staffMember: User) {
    const newStatus = staffMember.status === 'active' ? 'inactive' : 'active';
    setConfirmConfig({
      isOpen: true,
      title: `${newStatus === 'active' ? 'Activate' : 'Deactivate'} Staff`,
      message: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${staffMember.name}?`,
      variant: newStatus === 'active' ? 'info' : 'warning',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await smartFetch('/api/admin/status', {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ staff_id: staffMember.id, status: newStatus }),
          });

          if (response.ok) {
            setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, status: newStatus } : s));
            if (selectedStaff?.id === staffMember.id) {
              setSelectedStaff(prev => prev ? { ...prev, status: newStatus } : null);
            }
          }
        } catch (error) {
          console.error('Error updating status:', error);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }

  async function promoteToManager(staffMember: User) {
    setConfirmConfig({
      isOpen: true,
      title: 'Promote to Manager',
      message: `Are you sure you want to promote ${staffMember.name} to Manager? This will grant them management permissions for their branch.`,
      variant: 'info',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await smartFetch('/api/admin/staff-to-manager', {
            method: 'PATCH',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ staff_id: staffMember.id }),
          });

          if (response.ok) {
            setStaff(prev => prev.map(s => s.id === staffMember.id ? { ...s, role: 'manager' } : s));
            if (selectedStaff?.id === staffMember.id) {
              setSelectedStaff(prev => prev ? { ...prev, role: 'manager' } : null);
            }
          }
        } catch (error) {
          console.error('Error promoting staff:', error);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }

  async function deleteStaff(staffMember: User) {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Staff Member',
      message: `Are you sure you want to permanently delete ${staffMember.name}? This action cannot be undone and will remove all their records.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await smartFetch('/api/admin/staff', {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ staff_id: staffMember.id }),
          });

          if (response.ok) {
            setStaff(prev => prev.filter(s => s.id !== staffMember.id));
            if (selectedStaff?.id === staffMember.id) {
              setViewMode('list');
              setSelectedStaff(null);
            }
          }
        } catch (error) {
          console.error('Error deleting staff:', error);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }

  const filteredStaff = useMemo(() => {
    return staff.filter(s => {
      const searchLower = search.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(searchLower) || 
                           s.email.toLowerCase().includes(searchLower);
      
      if (isManager) {
        if (s.branch_id?.toString() !== currentUser?.branch_id?.toString()) return false;
      } else if (isAdmin) {
        if (selectedBranchId !== '0' && s.branch_id?.toString() !== selectedBranchId.toString()) return false;
      }

      if (view === 'pending') {
        return matchesSearch && s.status === 'pending';
      }
      
      return matchesSearch && s.status !== 'pending';
    });
  }, [staff, search, isManager, isAdmin, currentUser?.branch_id, selectedBranchId, view]);

  if (!canManageStaff) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold font-syne dark:text-white">Access Denied</h3>
          <p className="text-[#8a8070] dark:text-white/40">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 min-h-screen relative" onClick={() => setActiveMenuId(null)}>
      {!isOnline || pendingCount > 0 ? (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={cn(
            "p-3 rounded-2xl flex items-center justify-between gap-4 border text-xs font-bold uppercase tracking-wider mb-6",
            !isOnline ? "bg-red-50 border-red-100 text-red-600" : "bg-blue-50 border-blue-100 text-blue-600"
          )}
        >
          <div className="flex items-center gap-3">
            <WifiOff className="w-4 h-4" />
            <p>
              {!isOnline 
                ? "Offline Mode. Changes will sync later." 
                : `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending.`}
            </p>
          </div>
          {isOnline && pendingCount > 0 && (
            <button 
              onClick={sync}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              Sync Now
            </button>
          )}
        </motion.div>
      ) : null}
      {viewMode === 'details' && selectedStaff ? (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          {/* Back Navigation & Page Actions */}
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => {
                setViewMode('list');
                setSelectedStaff(null);
              }}
              className="group flex items-center gap-2 text-[#8a8070] hover:text-orange-600 transition-all font-bold text-sm"
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 flex items-center justify-center shadow-sm group-hover:border-orange-600/30 group-hover:shadow-md transition-all">
                <ArrowLeft className="w-4 h-4" />
              </div>
              Back to Directory
            </button>
            
            <div className="flex gap-3">
              {isAdmin && selectedStaff.role !== 'admin' && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteStaff(selectedStaff);
                  }}
                  className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-xl text-xs font-bold uppercase border border-red-100 dark:border-red-900/20 hover:bg-red-100 transition-all"
                >
                  Terminate
                </button>
              )}
            </div>
          </div>

          {/* Unified Profile Header */}
          <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[32px] overflow-hidden shadow-sm">
            <div className="h-32 bg-orange-600/5 dark:bg-orange-600/10 relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50 dark:to-[#1a1a1a]/50" />
            </div>
            <div className="px-8 pb-8 -mt-16 relative z-10 flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-[40px] bg-white dark:bg-[#222] p-2 shadow-xl ring-1 ring-black/5 mb-4">
                <div className="w-full h-full rounded-[32px] bg-orange-600 text-white flex items-center justify-center text-4xl font-bold font-syne overflow-hidden">
                  {selectedStaff.profilePicture ? (
                    <img 
                      src={selectedStaff.profilePicture} 
                      alt={selectedStaff.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserCircle className="w-16 h-16 opacity-60" />
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <h2 className="text-3xl font-bold font-syne dark:text-white">{selectedStaff.name}</h2>
                  <div className="flex gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                      selectedStaff.role === 'admin' ? "bg-orange-100 border-orange-200 text-orange-700" :
                      selectedStaff.role === 'manager' ? "bg-blue-100 border-blue-200 text-blue-700" :
                      "bg-gray-100 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-white/10 dark:text-gray-400"
                    )}>
                      {selectedStaff.role}
                    </span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                      selectedStaff.status === 'active' ? "bg-green-100 border-green-200 text-green-700" : "bg-red-100 border-red-200 text-red-700"
                    )}>
                      {selectedStaff.status}
                    </span>
                  </div>
                </div>
                
                <p className="text-[#8a8070] dark:text-white/40 text-sm font-medium flex items-center justify-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {branches.find(b => b.id.toString() === selectedStaff.branch_id?.toString())?.name || 'Unassigned Branch'}
                  <span className="opacity-30">•</span>
                  Joined {selectedStaff.createdAt ? formatDate(selectedStaff.createdAt) : 'Recently'}
                </p>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-3 w-full max-w-sm">
                {canManageStaff && selectedStaff.role !== 'admin' && selectedStaff.status !== 'pending' && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStatus(selectedStaff);
                    }}
                    className={cn(
                      "flex-1 px-8 py-3.5 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg",
                      selectedStaff.status === 'active' 
                        ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20" 
                        : "bg-green-600 hover:bg-green-700 text-white shadow-green-600/20"
                    )}
                  >
                    {selectedStaff.status === 'active' ? "Deactivate User" : "Activate User"}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-1">
            {/* Primary Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[32px] p-8 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest text-orange-600 mb-8">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#f7f5f0] dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] mb-1">Email Connection</label>
                      <p className="text-lg font-bold dark:text-white break-all">{selectedStaff.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#f7f5f0] dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] mb-1">Direct Contact</label>
                      <p className="text-lg font-bold dark:text-white">{selectedStaff.phoneNumber || selectedStaff.phone || 'Not Provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#f7f5f0] dark:bg-white/5 flex items-center justify-center shrink-0">
                      <UserCircle className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] mb-1">Gender Identification</label>
                      <p className="text-lg font-bold dark:text-white capitalize">{selectedStaff.gender || 'Not Provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#f7f5f0] dark:bg-white/5 flex items-center justify-center shrink-0">
                      <Shield className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] mb-1">Internal Reference ID</label>
                      <p className="text-xs font-mono font-bold dark:text-white opacity-60">{selectedStaff.id}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Summary Placeholder */}
              <div className="bg-[#1a1a1a] dark:bg-white/[0.02] border border-transparent dark:border-white/5 rounded-[32px] p-8 text-white">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-60">System Summary</h3>
                  <div className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold">LIFETIME VALUES</div>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs opacity-40 uppercase tracking-tighter">Total Shifts</p>
                    <p className="text-4xl font-syne font-bold">0</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs opacity-40 uppercase tracking-tighter">On-Time %</p>
                    <p className="text-4xl font-syne font-bold">0%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs opacity-40 uppercase tracking-tighter">Avg. Hours</p>
                    <p className="text-4xl font-syne font-bold">0.0</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Details */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[32px] p-8 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#8a8070] mb-6">Employment</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-600/10 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f]">Work Location</p>
                    </div>
                    <p className="text-base font-bold dark:text-white ml-11">
                      {branches.find(b => b.id.toString() === selectedStaff.branch_id?.toString())?.address || 'Location data unavailable'}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-[#e5e0d5] dark:border-white/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-600/10 flex items-center justify-center">
                        <Check className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f]">Access Level</p>
                    </div>
                    <div className="ml-11">
                      <p className="text-sm font-bold dark:text-white mb-1">
                        {selectedStaff.role === 'manager' ? "Branch Manager" : selectedStaff.role === 'admin' ? "Global Administrator" : "Standard Staff Member"}
                      </p>
                      <p className="text-xs text-[#8a8070] dark:text-white/40 leading-relaxed">
                        {selectedStaff.role === 'manager' 
                          ? "Authorized to manage shifts, staff attendance, and reports within their assigned branch." 
                          : selectedStaff.role === 'admin'
                          ? "Full system control across all branches and administrative modules."
                          : "Access restricted to personal dashboard and branch attendance clock-in."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedStaff.role === 'staff' && isAdmin && (
                <div className="p-6 bg-blue-600/5 dark:bg-blue-600/10 border border-blue-600/20 rounded-[28px]">
                  <h4 className="text-sm font-bold dark:text-white mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Promotion Available
                  </h4>
                  <p className="text-xs text-[#8a8070] dark:text-white/40 mb-4 leading-relaxed">
                    This staff member is currently on a standard role. You can promote them to Manager for this branch.
                  </p>
                  <button 
                    onClick={() => promoteToManager(selectedStaff)}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-md shadow-blue-600/20"
                  >
                    Promote to Manager
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a8070]" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-orange-600 transition-all dark:text-white shadow-sm"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 p-1.5 rounded-2xl shadow-sm overflow-x-auto no-scrollbar">
                <button
                  onClick={() => {
                    setView('all');
                    setSelectedStaffIds([]);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                    view === 'all' ? "bg-orange-600 text-white shadow-sm" : "text-[#8a8070] hover:bg-gray-50 dark:hover:bg-white/5"
                  )}
                >
                  All Staff
                </button>
                <button
                  onClick={() => {
                    setView('pending');
                    setSelectedStaffIds([]);
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all relative whitespace-nowrap",
                    view === 'pending' ? "bg-orange-600 text-white shadow-sm" : "text-[#8a8070] hover:bg-gray-50 dark:hover:bg-white/5"
                  )}
                >
                  Pending
                  {staff.some(s => {
                    if (s.status !== 'pending') return false;
                    if (isManager) return s.branch_id?.toString() === currentUser?.branch_id?.toString();
                    return true;
                  }) && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#1a1a1a]" />
                  )}
                </button>
              </div>

              {isAdmin && view === 'all' && (
                <CustomSelect
                  label="Branch"
                  value={selectedBranchId}
                  onChange={setSelectedBranchId}
                  options={[
                    { value: '0', label: 'All' },
                    ...branches.map(b => ({ value: b.id, label: b.name }))
                  ]}
                  className="w-full lg:w-auto [&>div]:rounded-2xl"
                  bgClassName="bg-[#f7f5f0] dark:bg-white/5"
                />
              )}
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {canManageStaff && view === 'pending' && selectedStaffIds.length > 0 && (
                <button 
                  onClick={() => {
                    setFormData(prev => ({ ...prev, role: 'staff', branch_id: currentUser?.branch_id || '' }));
                    setShowBulkApproveModal(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-lg shadow-green-600/10"
                >
                  <Check className="w-4 h-4" />
                  Approve ({selectedStaffIds.length})
                </button>
              )}
              {canManageStaff && (
                <button 
                  onClick={() => {
                    setFormData(prev => ({ ...prev, branch_id: currentUser?.branch_id || '' }));
                    setShowCreateModal(true);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#1a1a1a] dark:bg-white dark:text-[#1a1a1a] text-white px-4 py-2.5 rounded-2xl font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all shadow-lg"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Staff
                </button>
              )}
            </div>
          </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] shadow-sm">
        <div className="overflow-x-auto scrollbar-hide rounded-[24px] min-h-[450px]">
          <table className={cn("w-full text-left border-collapse", filteredStaff.length > 0 && "min-w-[650px] lg:min-w-full")}>
            <thead>
              <tr className="border-b border-[#e5e0d5] dark:border-white/10">
                {view === 'pending' && (
                  <th className="pl-4 sm:pl-6 py-4 w-10">
                    <CustomCheckbox
                      checked={filteredStaff.length > 0 && selectedStaffIds.length === filteredStaff.length}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedStaffIds(filteredStaff.map(s => s.id));
                        } else {
                          setSelectedStaffIds([]);
                        }
                      }}
                    />
                  </th>
                )}
                <th className={cn("px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40", view === 'pending' && "pl-2")}>Staff Name</th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Role</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Status</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e0d5] dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
                      <p className="text-xs text-[#8a8070] dark:text-white/40">Loading staff list...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="max-w-[200px] mx-auto space-y-2">
                      <p className="text-sm font-medium text-[#8a8070] dark:text-white/60">No staff members found</p>
                      <p className="text-[10px] text-[#8a8070]/60 dark:text-white/30 uppercase tracking-widest">Try adjusting your filters or search terms</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr 
                    key={member.id} 
                    className={cn(
                      "hover:bg-[#f7f5f0] dark:hover:bg-white/5 transition-colors group cursor-pointer",
                      selectedStaffIds.includes(member.id) && "bg-orange-50 dark:bg-orange-900/10"
                    )}
                    onClick={() => {
                      setSelectedStaff(member);
                      setViewMode('details');
                    }}
                  >
                    {view === 'pending' && (
                      <td className="pl-4 sm:pl-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <CustomCheckbox
                          checked={selectedStaffIds.includes(member.id)}
                          onChange={(checked) => {
                            setSelectedStaffIds(prev => 
                              checked 
                                ? [...prev, member.id]
                                : prev.filter(id => id !== member.id)
                            );
                          }}
                        />
                      </td>
                    )}
                    <td className={cn("px-4 sm:px-6 py-4", view === 'pending' && "pl-2")}>
                      <div className="flex items-center gap-3">
                        <div className="hidden sm:flex w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-orange-600/10 text-orange-600 items-center justify-center font-bold font-syne group-hover:bg-orange-600 group-hover:text-white transition-all text-xs sm:text-base overflow-hidden">
                          {member.profilePicture ? (
                            <img src={member.profilePicture} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <UserCircle className="w-5 h-5 opacity-60" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold dark:text-white truncate max-w-[150px] sm:max-w-none">{member.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-[#8a8070] dark:text-white/40 uppercase tracking-wider truncate max-w-[100px] sm:max-w-none">
                              {branches.find(b => b.id.toString() === member.branch_id?.toString())?.name || 'Unassigned'}
                            </p>
                            <span className="sm:hidden text-[10px] font-bold text-orange-600 uppercase tracking-widest">• {member.role}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 sm:px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                        member.role === 'admin' ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        member.role === 'manager' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      )}>
                        {member.role === 'admin' && <Shield className="w-3 h-3" />}
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-center sm:text-left">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        member.status === 'active' ? "text-green-600 bg-green-50 dark:bg-green-900/20" : "text-red-600 bg-red-50 dark:bg-red-900/20"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", member.status === 'active' ? "bg-green-600" : "bg-red-600")} />
                        <span className="hidden sm:inline">{member.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1 sm:gap-2 relative">
                        {canManageStaff && member.status === 'pending' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowApproveModal(member);
                              setFormData({
                                name: member.name,
                                email: member.email,
                                phoneNumber: member.phoneNumber || '',
                                gender: member.gender || 'male',
                                role: 'staff',
                                branch_id: member.branch_id || '',
                                status: 'active'
                              });
                            }}
                            className="p-1.5 sm:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Approve & Assign"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {isAdmin && member.role === 'staff' && member.status === 'active' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              promoteToManager(member);
                            }}
                            className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Promote to Manager"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === member.id ? null : member.id);
                          }}
                          className={cn(
                            "p-1.5 sm:p-2 rounded-lg transition-all",
                            activeMenuId === member.id ? "bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a]" : "text-[#8a8070] hover:bg-gray-100"
                          )}
                          title="Quick Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        <AnimatePresence>
                          {activeMenuId === member.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute right-0 top-10 w-48 bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-xl shadow-xl z-50 p-1 divide-y divide-[#e5e0d5] dark:divide-white/10"
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setSelectedStaff(member);
                                    setViewMode('details');
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#8a8070] hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-all"
                                >
                                  <UserCircle className="w-3.5 h-3.5" />
                                  View Details
                                </button>
                                <button
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#8a8070] opacity-50 cursor-not-allowed rounded-lg transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <Briefcase className="w-3.5 h-3.5" />
                                  Edit Info
                                </button>
                              </div>
                              <div className="py-1">
                                {canManageStaff && member.role !== 'admin' && member.status !== 'pending' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleStatus(member);
                                      setActiveMenuId(null);
                                    }}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all",
                                      member.status === 'active' ? "text-orange-600 hover:bg-orange-50" : "text-green-600 hover:bg-green-50"
                                    )}
                                  >
                                    {member.status === 'active' ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                    {member.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </button>
                                )}
                                {isAdmin && member.role !== 'admin' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteStaff(member);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Staff
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

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
        {showApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[24px] shadow-2xl"
            >
              <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
                <h3 className="font-bold font-syne dark:text-white">Approve Registration</h3>
                <button onClick={() => setShowApproveModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              
              <form onSubmit={handleApproveStaff} className="p-6 space-y-4">
                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/20">
                  <p className="text-sm font-bold dark:text-white">{showApproveModal.name}</p>
                  <p className="text-xs text-[#8a8070] dark:text-white/40">{showApproveModal.email}</p>
                  {showApproveModal.phoneNumber && <p className="text-[10px] text-[#8a8070] dark:text-white/40">{showApproveModal.phoneNumber}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CustomSelect
                      label="Assign Role"
                      variant="standard"
                      value={formData.role}
                      onChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                      options={[
                        { value: 'staff', label: 'Staff' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'admin', label: 'Admin' }
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Assign Branch"
                      variant="standard"
                      disabled={isManager}
                      value={formData.branch_id}
                      onChange={(v) => setFormData({ ...formData, branch_id: v })}
                      options={[
                        { value: '', label: 'Select branch' },
                        ...branches.map(b => ({ value: b.id, label: b.name }))
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(null)}
                    className="flex-1 px-4 py-2.5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Approving...' : 'Approve User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showBulkApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[24px] shadow-2xl"
            >
              <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
                <h3 className="font-bold font-syne dark:text-white text-green-600">Bulk Approve ({selectedStaffIds.length} members)</h3>
                <button onClick={() => setShowBulkApproveModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              
              <form onSubmit={handleBulkApprove} className="p-6 space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900/20">
                  <p className="text-sm font-bold dark:text-white">Batch Approval</p>
                  <p className="text-xs text-[#8a8070] dark:text-white/40">Approving {selectedStaffIds.length} staff member{selectedStaffIds.length === 1 ? '' : 's'}. Choose the role to assign to this group.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <CustomSelect
                      label="Assign Role (Group)"
                      variant="standard"
                      value={formData.role}
                      onChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                      options={[
                        { value: 'staff', label: 'Staff (Standard)' },
                        { value: 'manager', label: 'Manager (Branch Admin)' }
                      ]}
                      className="w-full"
                    />
                  </div>

                  <div className="p-4 bg-[#f7f5f0] dark:bg-white/5 rounded-2xl border border-[#e5e0d5] dark:border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold dark:text-white">Preserve Registration Branches</p>
                        <p className="text-[10px] text-[#8a8070] dark:text-white/40">Users will stay in the branches they selected</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForceSameBranch(!forceSameBranch)}
                        className={cn(
                          "w-12 h-6 rounded-full transition-all relative",
                          !forceSameBranch ? "bg-green-600" : "bg-gray-200 dark:bg-white/10"
                        )}
                      >
                        <div className={cn(
                          "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                          !forceSameBranch ? "left-7" : "left-1"
                        )} />
                      </button>
                    </div>

                    {forceSameBranch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-4 border-t border-[#e5e0d5] dark:border-white/10"
                      >
                        <CustomSelect
                          label="Force All to Single Branch"
                          variant="standard"
                          disabled={isManager}
                          value={formData.branch_id}
                          onChange={(v) => setFormData({ ...formData, branch_id: v })}
                          options={[
                            { value: '', label: 'Select Target Branch' },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                          ]}
                          className="w-full"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkApproveModal(false)}
                    className="flex-1 px-4 py-3 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? 'Processing...' : (
                      <>
                        <Check className="w-4 h-4" />
                        Approve All
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[24px] shadow-2xl"
            >
              <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
                <h3 className="font-bold font-syne dark:text-white">Add New Staff</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              
              <form onSubmit={handleCreateStaff} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] rounded-xl font-bold flex items-center gap-2">
                    <X className="w-3.5 h-3.5" />
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Full Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Email Address</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                    placeholder="+1 234..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CustomSelect
                      label="Gender"
                      variant="standard"
                      value={formData.gender}
                      onChange={(v) => setFormData({ ...formData, gender: v })}
                      options={[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                        { value: 'other', label: 'Other' }
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Status"
                      variant="standard"
                      value={formData.status}
                      onChange={(v) => setFormData({ ...formData, status: v as UserStatus })}
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' }
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <CustomSelect
                      label="Role"
                      variant="standard"
                      value={formData.role}
                      onChange={(v) => setFormData({ ...formData, role: v as UserRole })}
                      options={[
                        { value: 'staff', label: 'Staff' },
                        { value: 'manager', label: 'Manager' },
                        { value: 'admin', label: 'Admin' }
                      ]}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <CustomSelect
                      label="Branch"
                      variant="standard"
                      disabled={isManager}
                      value={formData.branch_id}
                      onChange={(v) => setFormData({ ...formData, branch_id: v })}
                      options={[
                        { value: '', label: 'Select branch' },
                        ...branches.map(b => ({ value: b.id, label: b.name }))
                      ]}
                      className="w-full"
                    />
                  </div>
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
                    {isSaving ? 'Saving...' : 'Create Staff'}
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
