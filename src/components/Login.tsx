import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Branch } from '../types';
import { CustomSelect } from './CustomSelect';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export function Login() {
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState('male');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | string[]>('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isRegistering) {
      fetchBranches();
    }
  }, [isRegistering]);

  async function fetchBranches() {
    try {
      const response = await fetch('/api/branches/public');
      if (response.ok) {
        const data = await response.json();
        const branchList = data.data || [];
        setBranches(branchList);
        if (branchList.length > 0) {
          setBranchId(branchList[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegistering && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering 
        ? { name, email, password, confirmPassword, gender, branch_id: parseInt(branchId), phoneNumber } 
        : { email, password };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.Success) {
        const token = isRegistering ? (data.token || data.data?.token) : data.data.token;
        const userData = isRegistering ? data.data : data.data;
        
        if (token) {
          await login(token, userData);
        } else if (isRegistering) {
          setError(data.message || 'Registration successful. Please check your email.');
          setIsRegistering(false);
        }
      } else {
        if (data.data && Array.isArray(data.data)) {
          setError(data.data);
        } else {
          setError(data.message || 'Authentication failed');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f5f0] dark:bg-[#121212] relative overflow-hidden p-4 transition-colors duration-200">
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] rounded-full bg-orange-500/5 pointer-events-none" />
      <div className="absolute bottom-[-150px] left-[-100px] w-[400px] h-[400px] rounded-full bg-black/5 dark:bg-white/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#1a1a1a] border border-[#e5e0d5] dark:border-white/10 rounded-[32px] p-6 sm:p-8 md:p-12 w-full max-w-[480px] shadow-2xl relative z-10 transition-colors duration-200"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">C</div>
          <h1 className="text-2xl font-bold font-syne dark:text-white">Chek<span className="text-orange-600">out</span></h1>
        </div>
        
        <h2 className="text-3xl font-bold font-syne mb-2 dark:text-white">{isRegistering ? 'Create Account' : 'Welcome Back'}</h2>
        <p className="text-[#8a8070] dark:text-white/40 text-sm mb-8">
          {isRegistering ? 'Register to manage your restaurant' : 'Access your restaurant management dashboard'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
            {Array.isArray(error) ? (
              <ul className="list-disc list-inside space-y-1">
                {error.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            ) : (
              error
            )}
          </div>
        )}
        
        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {isRegistering && (
            <>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">Full Name</label>
                <input 
                  required
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 transition-all dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">Gender</label>
                  <CustomSelect
                    variant="standard"
                    value={gender}
                    onChange={setGender}
                    options={[
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' }
                    ]}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">Phone Number</label>
                  <input 
                    required
                    type="tel"
                    placeholder="+1 234..."
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 transition-all dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">Select Branch</label>
                <CustomSelect
                  variant="standard"
                  value={branchId}
                  onChange={setBranchId}
                  options={branches.length > 0 
                    ? branches.map(b => ({ value: b.id, label: b.name }))
                    : [{ value: '', label: 'Loading branches...' }]
                  }
                  className="w-full"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">Email Address</label>
            <input 
              required
              type="email"
              placeholder="admin@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 transition-all dark:text-white"
            />
          </div>
          <div className={cn("grid gap-4", isRegistering ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">Password</label>
              <input 
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 transition-all dark:text-white"
              />
            </div>
            {isRegistering && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#b5ad9f] dark:text-white/40 mb-1.5 ml-1">Confirm</label>
                <input 
                  required
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f7f5f0] dark:bg-white/5 border border-[#e5e0d5] dark:border-white/10 rounded-xl text-sm focus:outline-none focus:border-orange-600 transition-all dark:text-white"
                />
              </div>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-[#e5e0d5] dark:border-white/10 text-center">
          <button 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-xs font-bold text-orange-600 hover:underline"
          >
            {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
