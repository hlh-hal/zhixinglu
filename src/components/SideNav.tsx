import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchApi } from '../lib/api';

interface DailyData {
  year: number;
  months: {
    month: number;
    days: number[];
  }[];
}

export default function SideNav({ path }: { path: string }) {
  if (path.startsWith('/daily')) {
    return <DailySideNav />;
  }
  if (path.startsWith('/monthly')) {
    return <MonthlySideNav />;
  }
  if (path.startsWith('/half-year')) {
    return <HalfYearSideNav />;
  }
  if (path.startsWith('/community')) {
    return <CommunitySideNav />;
  }
  return <DailySideNav />;
}

function useLogDates() {
  const [data, setData] = useState<DailyData[]>([]);

  useEffect(() => {
    async function loadDates() {
      try {
        const dates: string[] = await fetchApi('/api/logs?fields=date');
        const grouped: Record<number, Record<number, Set<number>>> = {};

        dates.forEach(d => {
          const [y, m, day] = d.split('-').map(Number);
          if (!grouped[y]) grouped[y] = {};
          if (!grouped[y][m]) grouped[y][m] = new Set();
          grouped[y][m].add(day);
        });

        const result: DailyData[] = Object.keys(grouped).map(yStr => {
          const year = parseInt(yStr);
          const months = Object.keys(grouped[year]).map(mStr => {
            const month = parseInt(mStr);
            const days = Array.from(grouped[year][month]).sort((a,b) => a - b);
            return { month, days };
          }).sort((a,b) => a.month - b.month);
          return { year, months };
        }).sort((a,b) => b.year - a.year);

        setData(result);
      } catch (err) {
        console.error('Failed to load log dates:', err);
      }
    }
    loadDates();

    window.addEventListener('logSaved', loadDates);
    return () => window.removeEventListener('logSaved', loadDates);
  }, []);

  return data;
}

function useMonthlyReviewDates() {
  const [data, setData] = useState<{year: number, months: number[]}[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const reviews: {year: number, month: number}[] = await fetchApi('/api/reviews/monthly?summary=true');
        const grouped: Record<number, number[]> = {};
        reviews.forEach(r => {
          if (!grouped[r.year]) grouped[r.year] = [];
          if (!grouped[r.year].includes(r.month)) grouped[r.year].push(r.month);
        });
        const result = Object.keys(grouped).map(y => ({
          year: parseInt(y),
          months: grouped[parseInt(y)].sort((a,b) => a - b)
        })).sort((a,b) => b.year - a.year);
        setData(result);
      } catch (e) {}
    }
    load();
    window.addEventListener('logSaved', load);
    return () => window.removeEventListener('logSaved', load);
  }, []);
  return data;
}

function useHalfYearReviewDates() {
  const [data, setData] = useState<{year: number, halves: number[]}[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const reviews: {year: number, half: number}[] = await fetchApi('/api/reviews/half-year?summary=true');
        const grouped: Record<number, number[]> = {};
        reviews.forEach(r => {
          if (!grouped[r.year]) grouped[r.year] = [];
          if (!grouped[r.year].includes(r.half)) grouped[r.year].push(r.half);
        });
        const result = Object.keys(grouped).map(y => ({
          year: parseInt(y),
          halves: grouped[parseInt(y)].sort((a,b) => a - b)
        })).sort((a,b) => a.year - b.year);
        setData(result);
      } catch (e) {}
    }
    load();
    window.addEventListener('logSaved', load);
    return () => window.removeEventListener('logSaved', load);
  }, []);
  return data;
}

function DailySideNav() {
  const DAILY_DATA = useLogDates();
  const currentYear = new Date().getFullYear();
  const currentMonth = `${currentYear}-${new Date().getMonth() + 1}`;
  
  const [expandedYears, setExpandedYears] = useState<number[]>([currentYear]);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([currentMonth]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  const toggleMonth = (year: number, month: number) => {
    const key = `${year}-${month}`;
    setExpandedMonths(prev => 
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-50 flex flex-col p-4 overflow-y-auto z-40 border-r border-slate-100">
      <div className="px-4 py-4 mb-2">
        <h3 className="font-headline text-lg font-bold text-slate-800">日志目录</h3>
        <p className="text-[10px] font-headline font-semibold uppercase tracking-widest text-slate-400 mt-1">Digital Scholar Sanctuary</p>
      </div>
      <div className="space-y-1">
        {DAILY_DATA.length === 0 && <div className="px-4 text-sm text-slate-400">暂无日志</div>}
        {DAILY_DATA.map(({ year, months }) => {
          const isYearExpanded = expandedYears.includes(year);
          return (
            <div key={year} className="space-y-1">
              <div 
                onClick={() => toggleYear(year)}
                className={`flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer transition-all ${
                  isYearExpanded 
                    ? 'text-primary bg-white shadow-sm border border-slate-100/50' 
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] transition-transform ${isYearExpanded ? 'rotate-90' : ''}`}>
                  chevron_right
                </span>
                <span className="material-symbols-outlined text-[18px]" style={isYearExpanded ? {fontVariationSettings: "'FILL' 1"} : {}}>
                  calendar_today
                </span>
                <span className={`text-sm ${isYearExpanded ? 'font-bold' : 'font-medium'}`}>{year}年</span>
              </div>
              
              {isYearExpanded && (
                <div className="pl-8 space-y-1 mt-1">
                  {months.map(({ month, days }) => {
                    const monthKey = `${year}-${month}`;
                    const isMonthExpanded = expandedMonths.includes(monthKey);
                    return (
                      <div key={monthKey} className="space-y-1">
                        <div 
                          onClick={() => toggleMonth(year, month)}
                          className={`flex items-center gap-3 px-3 py-1.5 cursor-pointer transition-colors ${
                            isMonthExpanded ? 'text-primary font-medium' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <span className={`material-symbols-outlined text-[16px] transition-transform ${isMonthExpanded ? 'rotate-90' : ''}`}>
                            chevron_right
                          </span>
                          <span className={`text-sm ${isMonthExpanded ? 'font-bold' : ''}`}>
                            {month.toString().padStart(2, '0')}月
                          </span>
                        </div>
                        
                        {isMonthExpanded && (
                          <div className="pl-6 grid grid-cols-1 gap-0.5">
                            {days.map(day => {
                              const dateKey = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                              const isSelected = selectedDate === dateKey;
                              return (
                                <Link 
                                  to={`/daily?date=${dateKey}`}
                                  key={dateKey}
                                  onClick={() => setSelectedDate(dateKey)}
                                  className={`block text-xs py-1.5 px-3 rounded-lg cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'text-primary font-semibold bg-white shadow-sm border border-slate-100/50' 
                                      : 'text-slate-500 hover:bg-white'
                                  }`}
                                >
                                  {day.toString().padStart(2, '0')}日
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function MonthlySideNav() {
  const REVIEWS = useMonthlyReviewDates();
  const currentYear = new Date().getFullYear();
  const [expandedYears, setExpandedYears] = useState<number[]>([currentYear]);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedMonth = searchParams.get('month');

  const toggleYear = (year: number) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-50 flex flex-col p-4 overflow-y-auto z-40 border-r border-slate-100">
      <div className="px-4 py-4 mb-2">
        <h3 className="font-headline text-lg font-bold text-slate-800">月志目录</h3>
        <p className="text-[10px] font-headline font-semibold uppercase tracking-widest text-slate-400 mt-1">Digital Scholar Sanctuary</p>
      </div>
      <div className="space-y-2">
        {REVIEWS.length === 0 && <div className="px-4 text-xs text-slate-400">暂无已存复盘</div>}
        {REVIEWS.map(({ year, months }) => {
          const isYearExpanded = expandedYears.includes(year);
          return (
            <div key={year} className="space-y-1">
              <div 
                onClick={() => toggleYear(year)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer group transition-all ${
                  isYearExpanded ? 'text-primary bg-primary/5' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={isYearExpanded ? {fontVariationSettings: "'FILL' 1"} : {}}>
                  calendar_today
                </span>
                <span className={`text-sm tracking-tight ${isYearExpanded ? 'font-bold' : 'font-medium'}`}>{year}年</span>
                <span className={`material-symbols-outlined text-sm ml-auto transition-transform ${isYearExpanded ? 'text-primary/40' : 'text-slate-400 -rotate-90'}`}>
                  expand_more
                </span>
              </div>
              
              {isYearExpanded && (
                <div className="pl-10 space-y-0.5">
                  {months.map((month) => {
                    const monthKey = `${year}-${month}`;
                    const isSelected = selectedMonth === monthKey;
                    return (
                      <Link 
                        to={`/monthly?month=${monthKey}`}
                        key={monthKey}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all cursor-pointer ${
                          isSelected 
                            ? 'text-primary bg-white shadow-sm border border-slate-100/50' 
                            : 'text-slate-500 hover:text-primary hover:bg-white'
                        }`}
                      >
                        <span className={`text-sm ${isSelected ? 'font-bold' : 'font-medium'}`}>
                          {month.toString().padStart(2, '0')}月
                        </span>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary ml-auto"></div>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function HalfYearSideNav() {
  const REVIEWS = useHalfYearReviewDates();
  const currentYear = new Date().getFullYear();
  const [expandedYears, setExpandedYears] = useState<number[]>([currentYear]);
  
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const selectedHalf = searchParams.get('half');

  const toggleYear = (year: number) => {
    setExpandedYears(prev => 
      prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
    );
  };

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-50 flex flex-col p-4 overflow-y-auto z-40 border-r border-slate-100">
      <div className="px-4 py-4 mb-2">
        <h3 className="font-headline text-lg font-bold text-slate-800">已存复盘</h3>
        <p className="text-[10px] font-headline font-semibold uppercase tracking-widest text-slate-400 mt-1">The Editorialist's Journey</p>
      </div>
      <div className="flex flex-col space-y-1 mb-8 px-2">
        {REVIEWS.length === 0 && <div className="px-4 text-xs text-slate-400">暂无已存复盘</div>}
        {REVIEWS.map(({ year, halves }) => {
          const isYearExpanded = expandedYears.includes(year);
          return (
            <div key={year}>
              <div 
                onClick={() => toggleYear(year)}
                className={`flex items-center group cursor-pointer py-2 px-2 rounded-lg transition-colors ${
                  isYearExpanded ? 'bg-white shadow-sm border border-slate-100/50' : 'hover:bg-slate-100'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                  isYearExpanded ? 'text-primary rotate-90' : 'text-slate-400 group-hover:text-slate-600'
                }`}>
                  chevron_right
                </span>
                <span className={`material-symbols-outlined text-[20px] ml-2 ${
                  isYearExpanded ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'
                }`} style={isYearExpanded ? {fontVariationSettings: "'FILL' 1"} : {fontVariationSettings: "'FILL' 0"}}>
                  calendar_month
                </span>
                <span className={`ml-2 text-sm ${
                  isYearExpanded ? 'font-bold text-primary' : 'font-medium text-slate-600 group-hover:text-slate-900'
                }`}>
                  {year}年
                </span>
              </div>
              
              {isYearExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-4">
                  {halves.map(half => {
                    const halfKey = `${year}-${half}`;
                    const isSelected = selectedHalf === halfKey;
                    const label = half === 1 ? '上半年' : '下半年';
                    
                    return (
                      <Link 
                        to={`/half-year?half=${halfKey}`}
                        key={halfKey}
                        className={`flex items-center py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/50 border-l-2 border-primary' 
                            : 'hover:bg-slate-100'
                        }`}
                      >
                        <span className={`text-sm ${
                          isSelected ? 'font-bold text-primary' : 'font-medium text-slate-500'
                        }`}>
                          {label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function CommunitySideNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-slate-50 flex flex-col p-4 overflow-y-auto z-40 border-r border-slate-100">
      <div className="px-4 py-4 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>explore</span>
          </div>
          <h2 className="text-lg font-bold text-slate-800">社区探索</h2>
        </div>
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-2">Discovery</p>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        <Link to="/community/challenges" className={`flex items-center gap-3 px-4 py-3 rounded-r-xl transition-all ${path.includes('/challenges') ? 'text-primary bg-white border-l-2 border-primary shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}>
          <span className="material-symbols-outlined" style={path.includes('/challenges') ? {fontVariationSettings: "'FILL' 1"} : {}}>emoji_events</span>
          <span className="text-sm">挑战打卡</span>
        </Link>
        <Link to="/community/friends" className={`flex items-center gap-3 px-4 py-3 rounded-r-xl transition-all ${path.includes('/friends') ? 'text-primary bg-white border-l-2 border-primary shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}>
          <span className="material-symbols-outlined" style={path.includes('/friends') ? {fontVariationSettings: "'FILL' 1"} : {}}>group</span>
          <span className="text-sm">好友互动</span>
        </Link>
        <Link to="/community/achievements" className={`flex items-center gap-3 px-4 py-3 rounded-r-xl transition-all ${path.includes('/achievements') ? 'text-primary bg-white border-l-2 border-primary shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}>
          <span className="material-symbols-outlined" style={path.includes('/achievements') ? {fontVariationSettings: "'FILL' 1"} : {}}>workspace_premium</span>
          <span className="text-sm">成就勋章</span>
        </Link>
        <Link to="/community/leaderboard" className={`flex items-center gap-3 px-4 py-3 rounded-r-xl transition-all ${path.includes('/leaderboard') ? 'text-primary bg-white border-l-2 border-primary shadow-sm font-bold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium'}`}>
          <span className="material-symbols-outlined" style={path.includes('/leaderboard') ? {fontVariationSettings: "'FILL' 1"} : {}}>leaderboard</span>
          <span className="text-sm">排行榜</span>
        </Link>
      </nav>
    </aside>
  );
}
