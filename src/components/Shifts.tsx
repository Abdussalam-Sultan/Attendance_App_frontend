import React, { useEffect, useState } from 'react';
import { Shift, User, Branch, ShiftAssignment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, X, User as UserIcon, RefreshCw, Calendar, Users, Briefcase } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from './ConfirmModal';
import { CustomSelect } from './CustomSelect';

export function Shifts() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const isManager = currentUser?.role === 'manager';
  const canManageTemplates = isAdmin; // adminRoleMiddleware on POST / and DELETE /:id/cancel
  const canManageAssignments = isAdmin || isManager;
  const [view, setView] = useState<'shifts' | 'assignments'>('assignments');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<Shift | null>(null);
  const [assignStaffId, setAssignStaffId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(isManager ? currentUser?.branch_id || '0' : '0');

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
    branchId: '',
    name: '',
    startTime: '09:00:00',
    endTime: '17:00:00',
    graceMinutes: 15
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedBranchId]);

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

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch Shift Templates
      let shiftsUrl = isAdmin && selectedBranchId === '0' ? '/api/shifts' : `/api/shifts/branch?branch_id=${selectedBranchId !== '0' ? selectedBranchId : currentUser?.branch_id}`;
      
      const shiftsResponse = await fetch(shiftsUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (shiftsResponse.ok) {
        const data = await shiftsResponse.json();
        setShifts(data.data || []);
      }

      // Fetch Assignments (Schedule)
      let assignmentsUrl = `/api/shift-assignments?date=${selectedDate}`;
      if (selectedBranchId !== '0') {
        assignmentsUrl += `&branch_id=${selectedBranchId}`;
      } else if (isManager && currentUser?.branch_id) {
        assignmentsUrl += `&branch_id=${currentUser.branch_id}`;
      }
      
      const assignmentsResponse = await fetch(assignmentsUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (assignmentsResponse.ok) {
        const data = await assignmentsResponse.json();
        setAssignments(data.data || []);
      }

      if (canManageAssignments) {
        const staffRes = await fetch('/api/admin/all-staff', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          const allStaff = staffData.data || staffData.staff || [];
          if (isManager) {
            setStaff(allStaff.filter((s: User) => s.branch_id?.toString() === currentUser?.branch_id?.toString()));
          } else {
            setStaff(allStaff);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching shifts data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitShift(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const url = editingShiftId ? `/api/shifts/${editingShiftId}` : '/api/shifts';
      const method = editingShiftId ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          branch_id: parseInt(formData.branchId),
          name: formData.name,
          start_time: formData.startTime,
          end_time: formData.endTime,
          grace_minutes: formData.graceMinutes
        }),
      });

      if (response.ok) {
        setShowCreateModal(false);
        setEditingShiftId(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving shift:', error);
    } finally {
      setIsSaving(false);
    }
  }

  function handleEditClick(shift: Shift) {
    setFormData({
      branchId: shift.branch_id.toString(),
      name: shift.name,
      startTime: shift.start_time,
      endTime: shift.end_time,
      graceMinutes: shift.grace_minutes || 0
    });
    setEditingShiftId(shift.id);
    setShowCreateModal(true);
  }

  async function deleteShiftTemplate(shiftId: string) {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Shift Template',
      message: 'Are you sure you want to delete this shift template? Existing assignments may be affected.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await fetch(`/api/shifts/${shiftId}/cancel`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setShifts(prev => prev.filter(s => s.id !== shiftId));
          }
        } catch (error) {
          console.error('Error deleting shift template:', error);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }

  async function handleAssignShift(e: React.FormEvent) {
    e.preventDefault();
    if (!showAssignModal || !assignStaffId) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/shift-assignments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_id: assignStaffId,
          shift_id: showAssignModal.id,
          branch_id: parseInt(showAssignModal.branch_id),
          date: selectedDate
        }),
      });

      if (response.ok) {
        setShowAssignModal(null);
        setAssignStaffId('');
        fetchData();
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to assign shift');
      }
    } catch (error) {
      console.error('Error assigning shift:', error);
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelAssignment(assignmentId: string) {
    setConfirmConfig({
      isOpen: true,
      title: 'Cancel Assignment',
      message: 'Are you sure you want to cancel this shift assignment?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('auth_token');
          const response = await fetch(`/api/shift-assignments/${assignmentId}/cancel`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            fetchData();
          }
        } catch (error) {
          console.error('Error cancelling assignment:', error);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  }

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 p-1.5 rounded-2xl shadow-sm">
            <button
              onClick={() => setView('assignments')}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                view === 'assignments' ? "bg-orange-600 text-white shadow-sm" : "text-[#8a8070] hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Daily Schedule
            </button>
            <button
              onClick={() => setView('shifts')}
              className={cn(
                "px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                view === 'shifts' ? "bg-orange-600 text-white shadow-sm" : "text-[#8a8070] hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              <Briefcase className="w-3.5 h-3.5" />
              Shift Templates
            </button>
          </div>

          {view === 'assignments' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 sm:flex-none px-4 py-[9px] bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-2xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
            />
          )}

          {isAdmin && (
            <CustomSelect
              label="Branch"
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              options={[
                { value: '0', label: 'All Branches' },
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
              className="flex-1 sm:flex-none [&>div]:rounded-2xl"
            />
          )}

          <button onClick={fetchData} className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition-all border border-[#e5e0d5] dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-sm">
            <RefreshCw className={cn("w-4 h-4 text-[#8a8070]", loading && "animate-spin")} />
          </button>
        </div>
        
        {canManageTemplates && view === 'shifts' && (
          <button 
            onClick={() => {
              setFormData(prev => ({ ...prev, branchId: currentUser?.branch_id || '' }));
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-8 h-8 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#8a8070]">Loading data...</p>
          </div>
        ) : view === 'shifts' ? (
          shifts.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px]">
              <div className="text-4xl mb-4">📋</div>
              <p className="font-bold font-syne dark:text-white">No shift templates created</p>
              <p className="text-sm text-[#8a8070] dark:text-white/40 uppercase tracking-widest mt-2 font-bold">Create templates to quickly assign them to staff</p>
            </div>
          ) : (
            shifts.map((shift) => (
              <motion.div
                key={shift.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-white dark:bg-[#121212] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm dark:text-white">{shift.name}</h4>
                        <p className="text-[10px] text-[#8a8070] dark:text-white/40 uppercase font-black tracking-widest mt-0.5">
                          {branches.find(b => b.id.toString() === shift.branch_id.toString())?.name || `Branch ${shift.branch_id}`}
                        </p>
                      </div>
                    </div>
                    
                    {canManageTemplates && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(shift)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-all"
                          title="Edit Template"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => deleteShiftTemplate(shift.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                          title="Delete Template"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#e5e0d5] dark:border-white/10 my-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[#8a8070] dark:text-white/30 uppercase tracking-widest">Time Slot</p>
                      <div className="flex items-center gap-1.5 text-xs font-bold dark:text-white">
                        <Clock className="w-3 h-3 text-orange-600" />
                        {shift.start_time} - {shift.end_time}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-[#8a8070] dark:text-white/30 uppercase tracking-widest">Grace Period</p>
                      <p className="text-xs font-bold dark:text-white">{shift.grace_minutes || 0} mins</p>
                    </div>
                  </div>
                  
                  {canManageAssignments && (
                    <button 
                      onClick={() => setShowAssignModal(shift)}
                      className="w-full bg-[#fcfaf7] dark:bg-white/5 hover:bg-orange-600 hover:text-white text-orange-600 text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all border border-orange-600/20 flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Assign to Staff
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )
        ) : (
          assignments.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px]">
              <div className="text-4xl mb-4">🕐</div>
              <p className="font-bold font-syne dark:text-white">Empty schedule for this date</p>
              <p className="text-sm text-[#8a8070] dark:text-white/40 uppercase tracking-widest mt-2">{formatDate(selectedDate)}</p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] p-6 shadow-sm relative overflow-hidden",
                  assignment.status === 'CANCELLED' && "opacity-60"
                )}
              >
                {assignment.status === 'CANCELLED' && (
                  <div className="absolute top-4 right-4 rotate-12 border-2 border-red-600 text-red-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                    Cancelled
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold font-syne shadow-lg shadow-orange-600/20 overflow-hidden shrink-0">
                    {assignment.staff?.profilePicture ? (
                      <img src={assignment.staff.profilePicture} className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold dark:text-white truncate">{assignment.staff?.name || 'Unknown Staff'}</p>
                    <p className="text-[10px] text-orange-600 uppercase font-black tracking-wider truncate">
                      {assignment.shift?.name || 'Unknown Shift'}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 bg-[#f7f5f0] dark:bg-white/5 p-4 rounded-2xl border border-[#e5e0d5] dark:border-white/10">
                  <div className="flex items-center gap-3 text-sm text-[#8a8070] dark:text-white/60">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-bold font-syne">{assignment.shift?.start_time} — {assignment.shift?.end_time}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#8a8070] dark:text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span>{branches.find(b => b.id.toString() === assignment.branch_id.toString())?.name || `Branch ${assignment.branch_id}`}</span>
                  </div>
                </div>
                
                {canManageAssignments && assignment.status === 'SCHEDULED' && (
                  <div className="mt-6 flex gap-2">
                    <button 
                      onClick={() => cancelAssignment(assignment.id)}
                      className="flex-1 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 py-2.5 rounded-xl transition-all uppercase tracking-widest"
                    >
                      Cancel Assignment
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )
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
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[24px] shadow-2xl"
            >
              <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
                <h3 className="font-bold font-syne dark:text-white">
                  {editingShiftId ? 'Edit Shift Template' : 'Create Shift Template'}
                </h3>
                <button onClick={() => { setShowCreateModal(false); setEditingShiftId(null); }} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              
              <form onSubmit={handleSubmitShift} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Template Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Morning Shift"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Branch"
                    variant="standard"
                    disabled={isManager}
                    value={formData.branchId}
                    onChange={(v) => setFormData({ ...formData, branchId: v })}
                    options={[
                      { value: '', label: 'Select branch' },
                      ...branches.map(b => ({ value: b.id, label: b.name }))
                    ]}
                    className="w-full"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Start Time</label>
                    <input
                      required
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">End Time</label>
                    <input
                      required
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1.5">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={formData.graceMinutes}
                    onChange={(e) => setFormData({ ...formData, graceMinutes: parseInt(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 dark:text-white"
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setEditingShiftId(null); }}
                    className="flex-1 px-4 py-2.5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isSaving ? (editingShiftId ? 'Saving...' : 'Creating...') : (editingShiftId ? 'Save Changes' : 'Create Template')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-md rounded-[24px] shadow-2xl"
            >
              <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-orange-600/10 text-orange-600 flex items-center justify-center">
                     <Users className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className="font-bold font-syne dark:text-white">Assign Staff</h3>
                     <p className="text-[10px] text-[#8a8070] dark:text-white/40 font-bold uppercase tracking-widest leading-none mt-1">
                       {showAssignModal.name} · {formatDate(selectedDate)}
                     </p>
                   </div>
                </div>
                <button onClick={() => setShowAssignModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
                  <X className="w-5 h-5 dark:text-white" />
                </button>
              </div>
              
              <form onSubmit={handleAssignShift} className="p-6 space-y-4">
                <div>
                   <CustomSelect
                    label="Staff Member"
                    variant="standard"
                    value={assignStaffId}
                    onChange={setAssignStaffId}
                    options={[
                      { value: '', label: 'Select staff' },
                      ...staff
                        .filter(s => s.status === 'active' && s.branch_id?.toString() === showAssignModal.branch_id.toString())
                        .map(s => ({ value: s.id, label: s.name }))
                    ]}
                    className="w-full"
                  />
                  <p className="mt-2 text-[10px] text-[#8a8070] dark:text-white/40 italic">Only active staff assigned to this branch are listed.</p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(null)}
                    className="flex-1 px-4 py-2.5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 dark:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !assignStaffId}
                    className="flex-1 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Assigning...' : 'Confirm Assignment'}
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
