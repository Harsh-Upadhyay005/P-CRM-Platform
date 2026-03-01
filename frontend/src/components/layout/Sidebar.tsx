'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useRole } from '@/hooks/useRole';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Building2, 
  BarChart2, 
  Bell, 
  History, 
  ShieldCheck,
  UserCircle,
  PlusSquare,
  LogOut,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {
  const pathname = usePathname();
  const { role, isSuperAdmin, isAdmin, isDeptHead, isCallOperator } = useRole();
  const { logout } = useAuth();
  
  const sidebarRef = useRef<HTMLElement>(null);
  const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

  // GSAP Entry Animation
  useEffect(() => {
    if (!sidebarRef.current) return;
    
    const tl = gsap.timeline();
    
    // Slide in sidebar
    tl.fromTo(
      sidebarRef.current,
      { x: -280, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
    );
    
    // Header animate in
    tl.fromTo(
      sidebarRef.current.querySelector('.brand-header'),
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.5)' },
      "-=0.3"
    );

    // Stagger links
    tl.fromTo(
      linksRef.current,
      { x: -20, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' },
      "-=0.2"
    );
    
    // Footer animate in
    tl.fromTo(
      sidebarRef.current.querySelector('.sidebar-footer'),
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' },
      "-=0.2"
    );
    
  }, []);

  // isAnyUser: true for every authenticated role (CALL_OPERATOR rank is the lowest)
  const isAnyUser = !!role;

  const links = [
    { label: 'Dashboard',      href: '/dashboard',       icon: LayoutDashboard, show: isAnyUser },
    { label: 'Complaints',     href: '/complaints',      icon: FileText,        show: isAnyUser },
    // File Complaint: Call Operators (primary use) + Admins/SuperAdmin who may need to log manually
    { label: 'File Complaint', href: '/complaints/new',  icon: PlusSquare,      show: isCallOperator || isAdmin },
    { label: 'Users',          href: '/users',           icon: Users,           show: isDeptHead },
    { label: 'Departments',    href: '/departments',     icon: Building2,       show: isAnyUser },
    { label: 'Analytics',      href: '/analytics',       icon: BarChart2,       show: isDeptHead },
    { label: 'Notifications',  href: '/notifications',   icon: Bell,            show: isAnyUser },
    { label: 'Audit Logs',     href: '/audit-logs',      icon: History,         show: isAdmin },
    { label: 'Tenants',        href: '/tenants',         icon: ShieldCheck,     show: isSuperAdmin },
    { label: 'Profile',        href: '/profile',         icon: UserCircle,      show: isAnyUser },
  ];

  return (
    <aside ref={sidebarRef} className="fixed left-0 top-0 h-full w-64 bg-slate-900/90 backdrop-blur-xl border-r border-[#FF9933]/20 text-white z-50 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.4)]">
      {/* Tricolor accent line */}
      <div className="absolute top-0 right-0 bottom-0 w-1" style={{ background: 'linear-gradient(180deg, #FF9933 0%, #FFFFFF 50%, #138808 100%)', opacity: 0.8 }} />

      <div className="brand-header p-6 border-b border-[#138808]/20 relative overflow-hidden">
        {/* Subtle glow behind logo */}
        <div className="absolute -top-10 -left-10 w-24 h-24 bg-[#FF9933]/20 blur-2xl rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          {/* Static Ashoka Chakra Icon instead of full component, for cleaner side logo */}
          <div className="relative w-8 h-8 flex items-center justify-center rounded-full border-[1.5px] border-[#000080]">
            <div className="absolute inset-0 rounded-full border-[1px] border-dashed border-[#000080]/50 animate-[spin_10s_linear_infinite]"></div>
            <div className="w-1 h-1 bg-[#000080] rounded-full"></div>
            {Array.from({ length: 24 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute w-[0.5px] h-3 bg-[#000080]/60 origin-bottom" 
                style={{ 
                  bottom: '50%',
                  transform: `rotate(${i * 15}deg)`,
                }} 
              />
            ))}
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(135deg, #FF9933 10%, #FFFFFF 50%, #138808 90%)' }}>
              P-CRM
            </h1>
            <p className="text-[9px] text-[#FFFFFF]/70 uppercase tracking-widest font-mono flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#138808] animate-pulse" />
              {role?.replace('_', ' ') || 'GUEST'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1.5 custom-scrollbar relative">
        {/* Faint watermark in background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none grayscale">
          <div className="w-48 h-48 rounded-full border-8 border-current flex items-center justify-center">
            <div className="text-9xl">❋</div>
          </div>
        </div>

        {links.map((link, i) => {
          if (!link.show) return null;
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              ref={(el) => { linksRef.current[i] = el; }}
              className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group relative overflow-hidden",
                isActive 
                  ? "text-white shadow-lg shadow-[#FF9933]/10 font-bold border border-[#FF9933]/20 bg-slate-800/80"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/40"
              )}
            >
              {/* Active Background Glow */}
              {isActive && (
                <div className="absolute inset-0 bg-linear-to-r from-[#FF9933]/15 via-transparent to-transparent pointer-events-none" />
              )}
              {/* Hover highlight line */}
              <div className={clsx(
                "absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-md transition-all duration-300",
                isActive ? "h-full bg-linear-to-b from-[#FF9933] to-[#138808]" : "h-0 bg-white/20 group-hover:h-1/2 group-hover:bg-[#138808]/50"
              )} />
              
              <link.icon 
                size={18} 
                className={clsx(
                  "transition-all duration-300 transform",
                  isActive ? "text-[#FF9933] scale-110 drop-shadow-[0_0_8px_rgba(255,153,51,0.5)]" : "text-slate-500 group-hover:text-[#FFFFFF] group-hover:scale-110"
                )} 
              />
              <span className="relative z-10 tracking-wide text-sm">{link.label}</span>

              {/* Active dot indicator right */}
              {isActive && (
                <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[#138808] shadow-[0_0_8px_#138808]" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer p-4 border-t border-[#FF9933]/20 bg-slate-900/80 relative overflow-hidden">
         {/* Footer Bottom Glow */}
         <div className="absolute bottom-[-20px] right-[-20px] w-24 h-24 bg-[#138808]/20 blur-2xl rounded-full pointer-events-none" />
         <button 
           onClick={() => logout()}
           className="relative w-full flex items-center justify-center gap-2 px-4 py-3 text-xs font-bold text-slate-300 bg-slate-800/50 hover:text-white hover:bg-red-500/20 hover:border-red-500/40 border border-white/5 rounded-lg transition-all duration-300 group tracking-widest uppercase overflow-hidden"
         >
           <div className="absolute inset-0 w-0 bg-red-500/10 transition-all duration-300 group-hover:w-full" />
           <LogOut size={16} className="group-hover:-translate-x-1 transition-transform relative z-10" />
           <span className="relative z-10">Secure Log Out</span>
         </button>
      </div>
    </aside>
  );
}
