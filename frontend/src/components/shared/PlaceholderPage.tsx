'use client';
import React from 'react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
      <div className="w-16 h-16 border-2 border-slate-700/50 border-t-blue-500 rounded-full animate-spin mb-4 opacity-20" />
      <h2 className="text-2xl font-bold text-slate-300">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">This module is under development.</p>
    </div>
  );
}
