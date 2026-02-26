'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Plus,
  FileText,
  UserPlus,
  Bell,
  BarChart2,
  X,
} from 'lucide-react';
import Link from 'next/link';

const actions = [
  { label: 'New Complaint', icon: FileText, href: '/complaints/new', color: 'bg-indigo-600 hover:bg-indigo-500' },
  { label: 'Add Staff', icon: UserPlus, href: '/users', color: 'bg-purple-600 hover:bg-purple-500' },
  { label: 'Notifications', icon: Bell, href: '/notifications', color: 'bg-amber-600 hover:bg-amber-500' },
  { label: 'Analytics', icon: BarChart2, href: '/analytics', color: 'bg-emerald-600 hover:bg-emerald-500' },
];

export function QuickActions() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2 mb-2"
          >
            {actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={action.href}>
                  <Button
                    className={`${action.color} text-white shadow-lg rounded-full px-4 h-10 gap-2 text-xs font-semibold`}
                    onClick={() => setOpen(false)}
                  >
                    <action.icon size={15} />
                    {action.label}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setOpen(!open)}
        className={`h-14 w-14 rounded-full shadow-2xl transition-all duration-300 ${
          open
            ? 'bg-red-600 hover:bg-red-500 rotate-45'
            : 'bg-linear-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400'
        }`}
        size="icon"
      >
        {open ? <X size={22} /> : <Plus size={22} />}
      </Button>
    </div>
  );
}
