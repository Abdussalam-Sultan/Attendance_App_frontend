import React, { useEffect, useState } from 'react';
import { User, Attendance, Branch, Shift, Activity } from '../types';
import { motion } from 'motion/react';
import { Users, CheckCircle2, Calendar, Clock, MapPin, ChevronRight, Activity as ActivityIcon, ArrowUpRight, ArrowDownRight, WifiOff, CloudUpload } from 'lucide-react';
import { cn, formatDate, formatTime } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useOffline } from '../context/useOffline.ts';
import { CustomSelect } from './CustomSelect';

export function Dashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const { user } = useAuth();
  const { isOnline, pendingCount, sync, smartFetch } = useOffline();
  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    totalBranches: 0,
    shiftsToday: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(isManager ? user?.branch_id || '0' : '0');
  const [staff, setStaff] = useState<User[]>([]);
  const [todayAssignment, setTodayAssignment] = useState<any>(null);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const token = localStorage.getItem('auth_token');
        
        // Fetch branches
        const branchesRes = await smartFetch('/api/branches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (branchesRes.ok) {
          const data = await branchesRes.json();
          const branchList = data.data || [];
          setBranches(branchList);
          if (isManager && user?.branch_id) {
            setSelectedBranchId(user.branch_id.toString());
          }
        }

        // Fetch staff for activity mapping
        const staffRes = await smartFetch('/api/admin/all-staff', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (staffRes.ok) {
          const data = await staffRes.json();
          setStaff(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    }
    fetchInitialData();
  }, [isAdmin, isManager, user?.branch_id]);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const body: any = {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        };
        
        if (selectedBranchId !== '0') {
          body.branch_id = parseInt(selectedBranchId);
        }

        const [summaryRes, attendanceRes] = await Promise.all([
          smartFetch('/api/reports/summary', {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          }),
          smartFetch(isAdmin ? '/api/attendance' : '/api/attendance/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (summaryRes.ok) {
          const result = await summaryRes.json();
          const s = result.data || {};
          setStats({
            totalStaff: s.totalStaff ?? 0,
            presentToday: s.presentToday ?? 0,
            totalBranches: s.totalBranches ?? 0,
            shiftsToday: s.shiftsToday ?? 0
          });
        }

        if (attendanceRes.ok) {
          const result = await attendanceRes.json();
          const records = result.data || [];
          
          // Map attendance records to activities
          const activities: Activity[] = records
            .filter((record: any) => {
              if (isManager) return record.branch_id?.toString() === user?.branch_id?.toString();
              return true;
            })
            .slice(0, 5)
            .map((record: any) => {
              const staffMember = staff.find(s => s.id.toString() === record.staff_id.toString());
              const branch = branches.find(b => b.id.toString() === record.branch_id.toString());
              const isClockIn = record.status === 'CLOCKED_IN' || record.status === 'LATE';
              
              return {
                id: record.id,
                title: isClockIn ? 'Clock In' : 'Clock Out',
                message: `${staffMember?.name || 'Staff'} ${isClockIn ? 'clocked in' : 'clocked out'} at ${branch?.name || 'Branch'}`,
                icon: isClockIn ? '🕒' : '✅',
                createdAt: record.clock_in_time || record.clock_out_time || record.attendance_date
              };
            });
          setRecentActivities(activities);
        }

        // Fetch My Assignment if Staff
        if (!isAdmin && !isManager) {
          const today = new Date().toISOString().split('T')[0];
          const assignmentsRes = await smartFetch('/api/shift-assignments/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (assignmentsRes.ok) {
            const result = await assignmentsRes.json();
            const assignments = result.data || [];
            const found = assignments.find((a: any) => a.date === today && a.status === 'SCHEDULED');
            setTodayAssignment(found);
          }
        }

        // If All Branches, fetch breakdown
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    if (!isAdmin || branches.length > 0 || staff.length > 0) {
      fetchDashboardData();
    }
  }, [selectedBranchId, staff, branches.length]);

  const selectedBranchName = selectedBranchId === '0' ? 'All Branches' : branches.find(b => b.id.toString() === selectedBranchId)?.name || 'Branch';

  const statCards = [
    { label: 'Total Staff', value: stats.totalStaff, icon: Users, change: selectedBranchName, type: 'neutral' },
    { label: 'Present Today', value: stats.presentToday, icon: CheckCircle2, change: 'Clocked in', type: 'up', featured: true },
    { label: 'Active Branches', value: stats.totalBranches, icon: MapPin, change: 'Locations', type: 'neutral', hide: selectedBranchId !== '0' },
    { label: 'Shifts Today', value: stats.shiftsToday, icon: Calendar, change: 'Scheduled', type: 'neutral' },
  ].filter(card => !card.hide);

  if (loading && stats.totalStaff === 0) {
    return (
      <div className="p-8 flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-[#8a8070] font-medium animate-pulse">Loading dashboard summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8">
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
                ? "Offline Mode. Viewing cached data." 
                : `${pendingCount} item${pendingCount === 1 ? '' : 's'} waiting to sync.`}
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-syne dark:text-white">Welcome back, {user?.name}</h1>
          <p className="text-sm text-[#8a8070] dark:text-white/40">
            {selectedBranchId === '0' 
              ? "Here's what's happening at your restaurant today."
              : `Viewing status for ${selectedBranchName}.`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <CustomSelect
              label="Branch"
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              options={[
                { value: '0', label: 'All Branches' },
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
              className="w-full sm:w-auto [&>div]:rounded-2xl"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {(!isManager && !isAdmin) && todayAssignment && (
          <div className="col-span-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-600 rounded-[28px] p-6 text-white shadow-xl shadow-orange-600/20 flex flex-col sm:flex-row sm:items-center justify-between gap-6 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Clock className="w-32 h-32 -mr-8 -mt-8" />
              </div>
              
              <div className="flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Your Assigned Shift Today</p>
                  </div>
                  <h4 className="text-2xl font-bold font-syne tracking-tight">{todayAssignment.shift?.name}</h4>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 relative z-10">
                <div className="flex items-center gap-4">
                   <div className="h-10 w-[1px] bg-white/20 hidden sm:block" />
                   <div>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1 text-center sm:text-left">Working Hours</p>
                      <div className="flex items-center gap-2">
                        <span className="font-syne font-bold text-lg">{todayAssignment.shift?.start_time} - {todayAssignment.shift?.end_time}</span>
                      </div>
                   </div>
                </div>

                <button 
                  onClick={() => onNavigate?.('attendance')}
                  className="bg-white text-orange-600 px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl hover:scale-[1.02] transform transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Go to Attendance
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={cn(
              "p-6 rounded-[20px] border shadow-sm transition-all",
              stat.featured 
                ? "bg-orange-600 border-orange-600 text-white" 
                : "bg-white dark:bg-[#1a1a1a] border-[#e5e0d5] dark:border-white/10 text-[#1a1a1a] dark:text-white"
            )}
          >
            <div className="flex justify-between items-start mb-4">
              <span className={cn("text-xs font-bold uppercase tracking-wider opacity-70")}>{stat.label}</span>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                stat.featured ? "bg-white/20" : "bg-[#f7f5f0] dark:bg-white/5"
              )}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-4xl font-bold font-syne mb-2 tracking-tight">{stat.value}</div>
            <div className={cn(
              "text-xs flex items-center gap-1 font-medium",
              stat.featured ? "text-white/70" : "text-[#8a8070] dark:text-white/40"
            )}>
              {stat.type === 'up' && <ArrowUpRight className="w-3 h-3" />}
              {stat.type === 'down' && <ArrowDownRight className="w-3 h-3" />}
              {stat.change}
            </div>
          </motion.div>
        ))}
      </div>

      {selectedBranchId === '0' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold font-syne dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-600" />
              Branches Overview
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {branches.map((branch) => (
              <motion.div
                key={branch.id}
                whileHover={{ y: -4 }}
                  onClick={() => setSelectedBranchId(branch.id)}
                  className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] p-6 shadow-sm cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold dark:text-white group-hover:text-orange-600 transition-colors">{branch.name}</h4>
                      <p className="text-xs text-[#8a8070] dark:text-white/40">{branch.address || 'No address'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#8a8070] group-hover:translate-x-1 transition-all" />
                  </div>
                  <div className="flex justify-between items-end mt-4 pt-4 border-t border-[#e5e0d5] dark:border-white/10">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-[#8a8070] mb-1">Status</p>
                      <p className="text-sm font-bold text-orange-600">Active</p>
                    </div>
                  </div>
                </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10 flex justify-between items-center">
            <h3 className="font-bold font-syne dark:text-white flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-orange-600" />
              Recent Activity
            </h3>
            <button className="text-xs font-bold text-orange-600 hover:underline">View All</button>
          </div>
          <div className="p-6 space-y-6">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity, i) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#f7f5f0] dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{activity.icon || '📋'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold dark:text-white truncate">{activity.title}</p>
                    <p className="text-xs text-[#8a8070] dark:text-white/40 mt-0.5">{activity.message}</p>
                  </div>
                  <div className="text-[10px] text-[#b5ad9f] dark:text-white/20 font-bold uppercase whitespace-nowrap">
                    {formatTime(activity.createdAt)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <p className="font-bold font-syne dark:text-white">No recent activity</p>
                <p className="text-sm text-[#8a8070] dark:text-white/40">Activity will appear here as staff use the system</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10">
              <h3 className="font-bold font-syne dark:text-white">Quick Summary</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {[
                  { label: 'Total Branches', value: stats.totalBranches, hide: selectedBranchId !== '0' },
                  { label: 'Total Staff', value: stats.totalStaff },
                  { label: 'Present Today', value: stats.presentToday },
                  { label: 'Absent Today', value: stats.totalStaff - stats.presentToday },
                  { label: 'Shifts Scheduled', value: stats.shiftsToday },
                ].filter(item => !item.hide).map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-[#e5e0d5] dark:border-white/10 last:border-0">
                    <span className="text-sm text-[#8a8070] dark:text-white/40 font-medium">{item.label}</span>
                    <span className="text-lg font-bold font-syne dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-orange-600 rounded-[24px] p-6 text-white shadow-lg shadow-orange-600/20">
            <h3 className="font-bold font-syne mb-2">Quick Actions</h3>
            <p className="text-xs text-white/70 mb-6">Common tasks you might want to perform.</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onNavigate?.('attendance')}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                Clock In
              </button>
              <button 
                onClick={() => onNavigate?.('staff')}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Staff List
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
