
import React from 'react';
import { DayOfWeek } from '../types';

interface DaySelectorProps {
  currentDay: DayOfWeek;
  onSelect: (day: DayOfWeek) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({ currentDay, onSelect }) => {
  const days = Object.values(DayOfWeek);

  return (
    <div className="flex flex-wrap gap-3 mb-2 animate-in fade-in slide-in-from-right-4 duration-700">
      {days.map((day) => (
        <button
          key={day}
          onClick={() => onSelect(day)}
          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border ${
            currentDay === day
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-900/40 transform scale-105'
              : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700 hover:text-slate-300'
          }`}
        >
          {day}
        </button>
      ))}
    </div>
  );
};

export default DaySelector;
