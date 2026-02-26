'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRole } from '@/hooks/useRole';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  BarChart2, 
  Bell, 
  History, 
  ShieldCheck 
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {
  const pathname = usePathname();
  const { role, isSuperAdmin, isAdmin, isDeptHead, isCallOperator } = useRole();
  const { logout } = useAuth();

  const links = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: isCallOperator },
    { label: 'Complaints', href: '/complaints', icon: FileText, show: isCallOperator },
    { label: 'File Complaint', href: '/complaints/new', icon: FileText, show: isCallOperator },
    { label: 'Users', href: '/users', icon: Users, show: isDeptHead },
    { label: 'Departments', href: '/departments', icon: Building2, show: isCallOperator },
    { label: 'Analytics', href: '/analytics', icon: BarChart2, show: isDeptHead },
    { label: 'Notifications', href: '/notifications', icon: Bell, show: isCallOperator },
    { label: 'Audit Logs', href: '/audit-logs', icon: History, show: isAdmin },
    { label: 'Tenants', href: '/tenants', icon: ShieldCheck, show: isSuperAdmin },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900/90 backdrop-blur-xl border-r border-white/10 text-white z-50 flex flex-col shadow-2xl">
      <div className="p-6 border-b border-white/10">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
          P-CRM
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{role?.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {links.map((link) => {
          if (!link.show) return null;
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <link.icon size={20} className={clsx(isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white")} />
              <span className="font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
         <button 
           onClick={() => logout()}
           className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
         >
           Log Out
         </button>
      </div>
    </aside>
  );
}
