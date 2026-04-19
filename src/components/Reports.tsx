import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Users, MapPin, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { Branch } from '../types';
import { CustomSelect } from './CustomSelect';

export function Reports() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0]
  });
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    totalBranches: 0,
    shiftsToday: 0,
    absentToday: 0,
    lateToday: 0,
    onLeave: 0
  });
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('0'); // 0 for All Branches

  useEffect(() => {
    async function fetchBranches() {
      if (!isAdmin) return;
      try {
        const token = localStorage.getItem('auth_token');
        const response = await fetch('/api/branches', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const branchList = data.data || [];
          setBranches(branchList);
          // Default to user's branch if not admin, or All if admin
          if (!isAdmin && user?.branch_id) {
            setSelectedBranchId(user.branch_id.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    }
    fetchBranches();
  }, [isAdmin, user?.branch_id]);

  useEffect(() => {
    fetchReportData();
  }, [selectedBranchId, dateRange.from, dateRange.to]);

  async function fetchReportData() {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const body: any = {
        from: dateRange.from,
        to: dateRange.to
      };
      
      // Only add branch_id if it's not "All" (0)
      if (selectedBranchId !== '0') {
        body.branch_id = parseInt(selectedBranchId);
      }

        const response = await fetch('/api/reports/summary', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      if (response.ok) {
        const result = await response.json();
        const s = result.data || {};
        const totalStaff = s.totalStaff ?? 0;
        const presentToday = s.presentToday ?? 0;
        const totalBranches = s.totalBranches ?? 0;
        const shiftsToday = s.shiftsToday ?? 0;
        
        setStats({
          totalStaff,
          presentToday,
          totalBranches,
          shiftsToday,
          absentToday: s.absentCount ?? Math.max(0, totalStaff - presentToday),
          lateToday: s.lateCount ?? 0,
          onLeave: s.onLeave ?? 0
        });
      }
    } catch (error) {
      console.error('-------------------------------------------------------------------');
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setDateRange({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    });
    // If admin, reset branch also. If manager, keep their branch.
    if (isAdmin) {
      setSelectedBranchId('0');
    }
  }

  if (loading && branches.length === 0 && isAdmin) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-10 lg:space-y-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full lg:w-auto">
          <p className="text-sm text-[#8a8070] dark:text-white/40 max-w-[280px] leading-tight">Overview of your restaurant operations and staff performance</p>
          
          {isAdmin && (
            <CustomSelect
              label="Branch"
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              options={[
                { value: '0', label: 'All Branches' },
                ...branches.map(b => ({ value: b.id, label: b.name }))
              ]}
              className="w-full md:w-auto [&>div]:rounded-2xl"
              bgClassName="bg-[#f7f5f0]/50 dark:bg-white/5"
            />
          )}
        </div>
        <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3 bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 p-2 sm:p-2.5 rounded-2xl shadow-sm w-full lg:w-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-1 rounded-xl transition-all">
            <label className="text-[9px] sm:text-[10px] font-bold uppercase text-[#8a8070]">From</label>
            <input 
              type="date" 
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              className="text-[11px] sm:text-xs bg-transparent dark:text-white focus:outline-none font-bold"
            />
          </div>
          <div className="hidden sm:block w-[1px] h-4 bg-[#e5e0d5] dark:bg-white/10" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 px-1 rounded-xl transition-all">
            <label className="text-[9px] sm:text-[10px] font-bold uppercase text-[#8a8070]">To</label>
            <input 
              type="date" 
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              className="text-[11px] sm:text-xs bg-transparent dark:text-white focus:outline-none font-bold"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 mt-1 sm:mt-0 flex justify-end">
            <button 
              onClick={handleReset} 
              title="Reset Filters"
              className="p-2 sm:p-1.5 bg-[#f7f5f0] dark:bg-white/5 sm:bg-transparent hover:bg-orange-50 dark:hover:bg-orange-900/10 rounded-xl transition-all group"
            >
              <RotateCcw className="w-4 h-4 text-[#8a8070] group-hover:text-orange-600 transition-colors" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'orange' },
          { label: 'Present Today', value: stats.presentToday, icon: TrendingUp, color: 'green' },
          { label: 'Branches', value: stats.totalBranches, icon: MapPin, color: 'blue' },
          { label: 'Shifts Today', value: stats.shiftsToday, icon: BarChart3, color: 'purple' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] p-5 sm:p-6 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8a8070] dark:text-white/40">{s.label}</span>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                s.color === 'orange' ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20" :
                s.color === 'green' ? "bg-green-50 text-green-600 dark:bg-green-900/20" :
                s.color === 'blue' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" :
                "bg-purple-50 text-purple-600 dark:bg-purple-900/20"
              )}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold font-syne dark:text-white tracking-tight">{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#e5e0d5] dark:border-white/10">
            <h3 className="font-bold font-syne dark:text-white">Attendance Breakdown</h3>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: 'Present Today', value: stats.presentToday, color: 'bg-green-600' },
              { label: 'Absent Today', value: stats.absentToday, color: 'bg-red-600' },
              { label: 'Late Arrivals', value: stats.lateToday, color: 'bg-yellow-600' },
              { label: 'On Leave', value: stats.onLeave, color: 'bg-blue-600' },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  <span className="text-[#8a8070] dark:text-white/40">{item.label}</span>
                  <span className="dark:text-white">{item.value}</span>
                </div>
                <div className="h-2 bg-[#f7f5f0] dark:bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(Number(item.value) / Math.max(1, stats.totalStaff)) * 100}%` }}
                    className={cn("h-full rounded-full", item.color)} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[24px] p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-orange-600/10 text-orange-600 rounded-full flex items-center justify-center mb-4 sm:mb-6">
            <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold font-syne dark:text-white mb-2">Detailed Analytics</h3>
          <p className="text-xs sm:text-sm text-[#8a8070] dark:text-white/40 max-w-xs mx-auto mb-6 sm:mb-8">
            Generate custom reports and export data for payroll and performance reviews.
          </p>
          <button className="w-full sm:w-auto bg-[#1a1a1a] dark:bg-white dark:text-[#1a1a1a] text-white px-8 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all">
            Export Report (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
