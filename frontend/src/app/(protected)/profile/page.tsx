'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LogOut, Mail, Building, Shield, Edit2, Check, X, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, getErrorMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const { role } = useRole();
  const qc = useQueryClient();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data: { name: string }) => usersApi.updateMe(data),
    onSuccess: () => {
      toast.success('Profile updated');
      setEditingName(false);
      refreshUser(); // update name in header/sidebar immediately
      qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const passwordMutation = useMutation({
    mutationFn: () => usersApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handlePasswordSubmit = () => {
    if (!currentPassword || !newPassword) return toast.error('Fill in all password fields');
    if (newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    passwordMutation.mutate();
  };

  if (!user) return null;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-r from-blue-600/20 to-purple-600/20 pointer-events-none" />

        <div className="relative flex flex-col items-center">
          <div className="w-24 h-24 bg-linear-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-xl ring-4 ring-slate-900 z-10">
            <span className="text-3xl font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </span>
          </div>

          {editingName ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && nameInput.trim()) updateMutation.mutate({ name: nameInput.trim() }); if (e.key === 'Escape') setEditingName(false); }}
                className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xl font-bold text-center focus:outline-none focus:border-purple-500/50"
              />
              <button className="text-emerald-400 hover:text-emerald-300" disabled={updateMutation.isPending} onClick={() => nameInput.trim() && updateMutation.mutate({ name: nameInput.trim() })}>
                <Check size={18} />
              </button>
              <button className="text-slate-500 hover:text-slate-300" onClick={() => setEditingName(false)}>
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-white">{user.name}</h1>
              <button
                className="p-1 text-slate-600 hover:text-slate-400 transition-colors"
                title="Edit name"
                onClick={() => { setNameInput(user.name); setEditingName(true); }}
              >
                <Edit2 size={14} />
              </button>
            </div>
          )}

          <div className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            {role?.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Email Address</p>
              <p className="text-slate-200 font-medium">{user.email}</p>
            </div>
            {user.emailVerified && (
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Verified</span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Building size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Department</p>
              <p className="text-slate-200 font-medium">
                {user.department?.name || <span className="text-slate-500 italic text-sm">No department assigned</span>}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4 hover:bg-white/10 transition-colors">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Shield size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-400 uppercase tracking-wider">Account Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-slate-200 font-medium">{user.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
          {/* Change Password Section */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5">
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="flex items-center gap-3 w-full text-left"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Lock size={20} />
              </div>
              <div className="flex-1">
                <p className="text-slate-200 font-medium">Change Password</p>
                <p className="text-xs text-slate-500">Update your account password</p>
              </div>
            </button>

            {showPasswordForm && (
              <div className="mt-4 space-y-3 pt-4 border-t border-white/5">
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showCurrentPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    placeholder="New password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2 pr-10 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handlePasswordSubmit(); }}
                  className="w-full bg-slate-800/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowPasswordForm(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePasswordSubmit}
                    disabled={passwordMutation.isPending}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-colors"
                  >
                    {passwordMutation.isPending ? 'Changing…' : 'Change Password'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:scale-105 transition-all font-medium group w-full justify-center sm:w-auto"
            >
              <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
              Sign Out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
