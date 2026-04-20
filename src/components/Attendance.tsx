import React, { useEffect, useState } from 'react';
import { Shift, Branch, User, ShiftAssignment } from '../types';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, XCircle, Calendar as CalendarIcon, RefreshCw, MapPin, ShieldCheck, ShieldAlert, UserCircle, Wifi, WifiOff, CloudUpload } from 'lucide-react';
import { cn, formatDate, formatTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/useOffline';
import { CustomSelect } from './CustomSelect';

export function Attendance() {
  const { user } = useAuth();
  const { isOnline, pendingCount, sync, smartFetch } = useOffline();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const canViewAll = isAdmin || isManager;
  const [records, setRecords] = useState<any[]>([]);
  const [assignedShift, setAssignedShift] = useState<Shift | null>(null);
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClocking, setIsClocking] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(false);
  const [viewMode, setViewMode] = useState<'me' | 'all'>(canViewAll ? 'all' : 'me');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchShifts, setBranchShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
    fetchBranches();
    if (canViewAll) fetchStaff();
    fetchBranchShifts();
  }, [user, viewMode, selectedDate]);

  async function fetchBranchShifts() {
    if (!user?.branch_id) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch(`/api/shifts/branch?branch_id=${user.branch_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const shifts = data.data || [];
        setBranchShifts(shifts);
        // If not already set by assignment and there's only one shift, auto-select it
        if (!selectedShiftId && shifts.length === 1) {
          setSelectedShiftId(shifts[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching branch shifts:', error);
    }
  }

  async function fetchStaff() {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch('/api/admin/all-staff', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const rawStaff = data.data || data.staff || [];
        const allStaff = rawStaff.map((s: any) => ({
          ...s,
          profilePicture: s.photo_url || s.profile_picture || s.profilePicture || null
        }));
        // Filter staff for managers
        if (isManager) {
          setStaff(allStaff.filter((s: User) => s.branch_id?.toString() === user?.branch_id?.toString()));
        } else {
          setStaff(allStaff);
        }
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }

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

  async function fetchData() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const today = new Date().toISOString().split('T')[0];
      const isViewingToday = selectedDate === today;
      
      let endpoint = '';
      if (canViewAll && viewMode === 'all') {
        endpoint = isViewingToday ? '/api/attendance' : `/api/attendance/date?date=${selectedDate}`;
      } else {
        endpoint = '/api/attendance/me';
      }
      
      const attendanceRes = await smartFetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch assignments for the selected date
      let assignmentsUrl = '/api/shift-assignments';
      if (!canViewAll || viewMode === 'me') {
        assignmentsUrl = '/api/shift-assignments/me';
      } else {
        assignmentsUrl += `?date=${selectedDate}`;
      }
      
      const assignmentsRes = await smartFetch(assignmentsUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        let fetchedRecords = data.data || [];
        
        // Filter records for managers
        if (isManager && viewMode === 'all') {
          fetchedRecords = fetchedRecords.filter((r: any) => r.branch_id?.toString() === user?.branch_id?.toString());
        }
        
        setRecords(fetchedRecords);
        
        const activeRecord = fetchedRecords.find((r: any) => 
          r.staff_id?.toString() === user.id?.toString() && 
          (r.status?.toUpperCase() === 'CLOCKED_IN' || r.status?.toUpperCase() === 'LATE')
        );
        setTodayRecord(activeRecord || null);
        if (activeRecord) {
          setSelectedShiftId(activeRecord.shift_id?.toString());
        }
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        const assignments: ShiftAssignment[] = data.data || [];
        
        const myAssignment = assignments.find(a => 
          a.date === today && 
          a.status === 'SCHEDULED' && 
          (canViewAll && viewMode === 'all' ? a.staff_id?.toString() === user.id?.toString() : true)
        );

        if (myAssignment) {
          setAssignedShift(myAssignment.shift || null);
          setSelectedShiftId(myAssignment.shift_id.toString());
        } else {
          setAssignedShift(null);
          // Don't wipe selectedShiftId to allow manual selection
        }
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }

  const getGeolocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
      } else {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          },
          (error) => {
            reject(new Error('Please enable location access to clock in/out'));
          }
        );
      }
    });
  };

  async function handleClockIn() {
    if (!user || !selectedShiftId) return;
    setIsClocking(true);
    setError(null);
    try {
      let coords;
      if (isTestMode) {
        // Mock coordinates for testing (Lagos coords)
        coords = { lat: 6.5244, lng: 3.3792 };
      } else {
        coords = await getGeolocation();
      }
      
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shift_id: selectedShiftId,
          branch_id: user.branch_id,
          lat: coords.lat,
          lng: coords.lng
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        fetchData();
      } else {
        setError(data.message || 'Failed to clock in');
      }
    } catch (error: any) {
      console.error('Error clocking in:', error);
      setError(error.message || 'Error clocking in');
    } finally {
      setIsClocking(false);
    }
  }

  async function handleClockOut() {
    if (!todayRecord) return;
    setIsClocking(true);
    setError(null);
    try {
      let coords;
      if (isTestMode) {
        coords = { lat: 6.5244, lng: 3.3792 };
      } else {
        coords = await getGeolocation();
      }
      
      const token = localStorage.getItem('auth_token');
      const response = await smartFetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shift_id: todayRecord.shift_id,
          lat: coords.lat,
          lng: coords.lng
        })
      });
      
      const data = await response.json();
      if (response.ok && data.success) {
        fetchData();
      } else {
        setError(data.message || 'Failed to clock out');
      }
    } catch (error: any) {
      console.error('Error clocking out:', error);
      setError(error.message || 'Error clocking out');
    } finally {
      setIsClocking(false);
    }
  }

  return (
    <div className="p-4 sm:p-8 space-y-8">
      {/* Offline Status Bar */}
      {!isOnline || pendingCount > 0 ? (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className={cn(
            "p-3 rounded-2xl flex items-center justify-between gap-4 border text-xs font-bold uppercase tracking-wider",
            !isOnline 
              ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20 text-red-600" 
              : "bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20 text-blue-600"
          )}
        >
          <div className="flex items-center gap-3">
            {!isOnline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            <p>
              {!isOnline 
                ? "You are currently offline. Actions will be saved locally." 
                : `${pendingCount} action${pendingCount === 1 ? '' : 's'} waiting to sync.`}
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

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium flex items-center gap-3"
        >
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p className="flex-1 min-w-0 break-words">{error}</p>
        </motion.div>
      )}

      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] p-5 sm:p-8 shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 lg:gap-8">
          <div className="space-y-1 w-full lg:w-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-bold font-syne dark:text-white">Daily Attendance</h3>
              <div className="flex flex-wrap gap-1.5">
                {canViewAll && (
                  <button 
                    onClick={() => setViewMode(viewMode === 'me' ? 'all' : 'me')}
                    className={cn(
                      "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all",
                      viewMode === 'all' ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-white/5 text-[#8a8070]"
                    )}
                  >
                    {viewMode === 'all' ? (isManager ? 'Branch' : 'All Staff') : 'My Records'}
                  </button>
                )}
                <button 
                  onClick={() => setIsTestMode(!isTestMode)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1",
                    isTestMode ? "bg-orange-600 text-white" : "bg-gray-100 dark:bg-white/5 text-[#8a8070]"
                  )}
                >
                  {isTestMode ? <ShieldCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                  {isTestMode ? 'Test' : 'Prod'}
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <p className="text-xs sm:text-sm text-[#8a8070] dark:text-white/40">{formatDate(new Date(selectedDate))}</p>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold dark:text-white outline-none focus:ring-1 focus:ring-orange-600 transition-all cursor-pointer"
              />
            </div>
            
            {!todayRecord && !loading && (
              <div className="mt-4 space-y-3">
                {assignedShift ? (
                  <div className="p-4 bg-orange-50 dark:bg-orange-600/10 border border-orange-100 dark:border-orange-900/20 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-1">Your Assigned Shift</p>
                    <p className="text-base font-bold dark:text-white font-syne">{assignedShift.name}</p>
                    <div className="flex items-center gap-2 text-xs text-[#8a8070] dark:text-white/60">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{assignedShift.start_time} — {assignedShift.end_time}</span>
                    </div>
                  </div>
                ) : branchShifts.length > 0 ? (
                  <div className="p-4 bg-blue-50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-900/20 rounded-2xl">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-2">Select Shift Template</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {branchShifts.map(shift => (
                        <button
                          key={shift.id}
                          onClick={() => setSelectedShiftId(shift.id.toString())}
                          className={cn(
                            "p-2.5 rounded-xl border text-left transition-all",
                            selectedShiftId === shift.id.toString()
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20"
                              : "bg-white dark:bg-white/5 border-blue-200 dark:border-white/10 text-[#8a8070] dark:text-white/60 hover:border-blue-300"
                          )}
                        >
                          <p className="text-xs font-bold">{shift.name}</p>
                          <p className="text-[10px] opacity-80">{shift.start_time} - {shift.end_time}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : !canViewAll && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <p className="text-xs text-red-600 font-bold">No shifts available for your branch today.</p>
                  </div>
                )}
              </div>
            )}
            
            {canViewAll && viewMode === 'all' && (
               <p className="text-xs text-[#8a8070] dark:text-white/40 mt-2 italic">Viewing all staff clock-ins for today</p>
            )}
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto justify-center sm:min-w-[180px]">
            {!todayRecord ? (
              <button
                onClick={handleClockIn}
                disabled={isClocking || !selectedShiftId}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-green-600 hover:bg-green-700 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className={cn("w-5 h-5 flex-shrink-0 transition-transform", isClocking && "animate-pulse")} />
                  <div className="text-left">
                    <p className="text-sm sm:text-base whitespace-nowrap leading-none mb-0.5">{isClocking ? 'Processing...' : 'Clock In'}</p>
                    {!selectedShiftId && (
                      <p className="text-[10px] opacity-70 font-normal">Select a shift first</p>
                    )}
                  </div>
                </div>
              </button>
            ) : todayRecord.status !== 'CLOCKED_OUT' ? (
              <button
                onClick={handleClockOut}
                disabled={isClocking}
                className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-700 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                <Clock className="w-5 h-5 flex-shrink-0" />
                <span className="whitespace-nowrap text-sm sm:text-base">{isClocking ? 'Processing...' : 'Clock Out'}</span>
              </button>
            ) : (
              <div className="w-full sm:w-auto flex items-center justify-center gap-2.5 bg-gray-100 dark:bg-white/5 text-[#8a8070] dark:text-white/40 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold border border-[#e5e0d5] dark:border-white/10">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="whitespace-nowrap text-sm sm:text-base">COMPLETED</span>
              </div>
            )}
          </div>
        </div>
        
        {todayRecord && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="p-3 sm:p-4 bg-[#f7f5f0] dark:bg-white/5 rounded-xl border border-[#e5e0d5] dark:border-white/10">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1 truncate">Clock In</p>
              <p className="text-base sm:text-lg font-bold font-syne dark:text-white">{todayRecord.clock_in_time ? formatTime(todayRecord.clock_in_time) : '--:--'}</p>
              {todayRecord.status === 'LATE' && <span className="text-[8px] sm:text-[10px] font-black text-red-600 uppercase tracking-widest">Late</span>}
            </div>
            <div className="p-3 sm:p-4 bg-[#f7f5f0] dark:bg-white/5 rounded-xl border border-[#e5e0d5] dark:border-white/10">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#8a8070] mb-1 truncate">Clock Out</p>
              <p className="text-base sm:text-lg font-bold font-syne dark:text-white">{todayRecord.clock_out_time ? formatTime(todayRecord.clock_out_time) : '--:--'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
          <h3 className="font-bold font-syne dark:text-white">Recent Records</h3>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all">
            <RefreshCw className={cn("w-4 h-4 text-[#8a8070]", loading && "animate-spin")} />
          </button>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className={cn("w-full text-left border-collapse", records.length > 0 && "min-w-[650px] lg:min-w-full")}>
            <thead>
              <tr className="border-b border-[#e5e0d5] dark:border-white/10">
                <th className="px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Date</th>
                {canViewAll && viewMode === 'all' && (
                  <th className="px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Staff</th>
                )}
                <th className="hidden lg:table-cell px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Branch</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Clock In</th>
                <th className="hidden sm:table-cell px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Clock Out</th>
                <th className="hidden md:table-cell px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Duration</th>
                <th className="px-4 sm:px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e0d5] dark:divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-6 h-6 border-2 border-orange-600/20 border-t-orange-600 rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-[#8a8070] dark:text-white/40">Loading records...</p>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="max-w-[200px] mx-auto space-y-2">
                      <p className="text-sm font-medium text-[#8a8070] dark:text-white/60">
                        {!isOnline ? "No offline data found" : "No attendance records found"}
                      </p>
                      <p className="text-[10px] text-[#8a8070]/60 dark:text-white/30 uppercase tracking-widest leading-relaxed">
                        {!isOnline 
                          ? "Please connect to the internet to fetch fresh records for this view." 
                          : "Select a different view or check back later"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  let duration = '--';
                  if (record.clock_in_time && record.clock_out_time) {
                    const diff = new Date(record.clock_out_time).getTime() - new Date(record.clock_in_time).getTime();
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    duration = `${hours}h ${minutes}m`;
                  }
                  
                  const staffMember = staff.find(s => s.id?.toString() === record.staff_id?.toString());
                  const branch = branches.find(b => b.id?.toString() === record.branch_id?.toString());
                  const status = record.status?.toUpperCase();
                  
                  return (
                    <tr key={record.id} className="hover:bg-[#f7f5f0] dark:hover:bg-white/5 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-[#8a8070]" />
                          <span className="text-sm font-bold dark:text-white whitespace-nowrap">{formatDate(record.attendance_date).split(',')[0]}</span>
                        </div>
                      </td>
                      {canViewAll && viewMode === 'all' && (
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="hidden sm:flex w-6 h-6 rounded-lg bg-orange-600/10 text-orange-600 items-center justify-center overflow-hidden">
                              {staffMember?.profilePicture ? (
                                <img src={staffMember.profilePicture} alt={staffMember.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <UserCircle className="w-4 h-4 opacity-60" />
                              )}
                            </div>
                            <span className="text-sm font-medium dark:text-white whitespace-nowrap">{staffMember?.name || `ID: ${record.staff_id}`}</span>
                          </div>
                        </td>
                      )}
                      <td className="hidden lg:table-cell px-4 sm:px-6 py-4">
                        <p className="text-xs text-[#8a8070] dark:text-white/40">
                          {branch?.name || `Branch ${record.branch_id}`}
                        </p>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className="text-sm font-mono text-[#8a8070] dark:text-white/60">{record.clock_in_time ? formatTime(record.clock_in_time) : '--:--'}</span>
                      </td>
                      <td className="hidden sm:table-cell px-4 sm:px-6 py-4">
                        <span className="text-sm font-mono text-[#8a8070] dark:text-white/60">{record.clock_out_time ? formatTime(record.clock_out_time) : '--:--'}</span>
                      </td>
                      <td className="hidden md:table-cell px-4 sm:px-6 py-4">
                        <span className="text-sm font-bold dark:text-white">{duration}</span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        {status === 'ABSENT' ? (
                          <span className="inline-flex items-center gap-1 text-red-600 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                            <XCircle className="w-3 h-3" /> <span className="hidden sm:inline">Absent</span>
                          </span>
                        ) : status === 'CLOCKED_IN' || status === 'LATE' ? (
                          <span className="inline-flex items-center gap-1 text-orange-600 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                            <Clock className="w-3 h-3" /> <span className="hidden sm:inline">{status === 'LATE' ? 'Late' : 'In Progress'}</span>
                            <span className="sm:hidden">{status === 'LATE' ? 'L' : 'P'}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-600 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3" /> <span className="hidden sm:inline">{status?.replace('_', ' ')}</span>
                            <span className="sm:hidden">Done</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
