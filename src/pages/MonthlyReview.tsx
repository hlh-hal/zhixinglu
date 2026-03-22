import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import EditorSection from '../components/EditorSection';
import StatusBar from '../components/StatusBar';
import { MethodologyBanner, ErrorsBanner } from '../components/Banners';
import { fetchApi } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { useSearchParams } from 'react-router-dom';

// Simple debounce helper
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function MonthlyReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMonth = searchParams.get('month'); // e.g., '2026-3' or '2026-03'

  const dateStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = dateStr.substring(0, 7); // YYYY-MM
  
  let initialMonth = currentMonthStr;
  if (urlMonth && urlMonth.includes('-')) {
    const [y, m] = urlMonth.split('-');
    initialMonth = `${y}-${m.padStart(2, '0')}`;
  }

  const [month, setMonth] = useState(initialMonth);

  useEffect(() => {
    if (urlMonth && urlMonth.includes('-')) {
      const [y, m] = urlMonth.split('-');
      const formatted = `${y}-${m.padStart(2, '0')}`;
      if (formatted !== month) {
        prepareForMonthChange();
        setMonth(formatted);
      }
    }
  }, [urlMonth]);

  const [reviewId, setReviewId] = useState<string | null>(null);

  // Refactored state variables back to original 6 fields for JSX
  const [goals, setGoals] = useState('');
  const [results, setResults] = useState('');
  const [positive, setPositive] = useState('');
  const [negative, setNegative] = useState('');
  const [retry, setRetry] = useState('');
  const [nextPlan, setNextPlan] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const hasUserEditedRef = useRef(false);

  const resetForm = () => {
    setReviewId(null);
    setGoals('');
    setResults('');
    setPositive('');
    setNegative('');
    setRetry('');
    setNextPlan('');
    setLastSaved(null);
  };

  const prepareForMonthChange = () => {
    hasUserEditedRef.current = false;
    setLoading(true);
    resetForm();
  };

  // Load review
  useEffect(() => {
    const loadReview = async () => {
      const requestId = ++loadRequestIdRef.current;
      setLoading(true);
      resetForm();
      try {
        const params = new URLSearchParams({ month: month.substring(5, 7), year: month.substring(0, 4) });
        const res = await fetchApi(`/api/reviews/monthly?${params.toString()}`);
        if (loadRequestIdRef.current !== requestId) return;
        const data = Array.isArray(res) ? res[0] : null;
        if (data && data.id) {
          setReviewId(data.id);
          setGoals(data.goals_review || '');
          setResults(data.results_evaluation || '');
          setPositive(data.positive_analysis || '');
          setNegative(data.negative_analysis || '');
          setRetry(data.replay_simulation || '');
          setNextPlan(data.next_month_plan || '');
          setLastSaved(new Date().toLocaleTimeString());
        }
        hasUserEditedRef.current = false;
      } catch (err) {
        if (loadRequestIdRef.current !== requestId) return;
        hasUserEditedRef.current = false;
      } finally {
        if (loadRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };
    loadReview();
  }, [month]);

  const debouncedData = useDebounce({ goals, results, positive, negative, retry, nextPlan }, 1000);
  const isInitialMount = useRef(true);

  // Auto save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (loading) return;
    if (!hasUserEditedRef.current) return;

    if (!debouncedData.goals && !debouncedData.results && !debouncedData.positive && !debouncedData.negative && !debouncedData.retry && !debouncedData.nextPlan) return;

    const saveReview = async () => {
      setSaving(true);
      try {
        const data = await fetchApi('/api/reviews/monthly', {
          method: 'POST',
          body: JSON.stringify({
            month: parseInt(month.substring(5, 7)),
            year: parseInt(month.substring(0, 4)),
            goals_review: debouncedData.goals,
            results_evaluation: debouncedData.results,
            positive_analysis: debouncedData.positive,
            negative_analysis: debouncedData.negative,
            replay_simulation: debouncedData.retry,
            next_month_plan: debouncedData.nextPlan
          })
        });
        if (!reviewId && data.id) {
           window.dispatchEvent(new Event('logSaved'));
        }
        setReviewId(data.id);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (error) {
        console.error(error);
      } finally {
        setSaving(false);
      }
    };

    saveReview();
  }, [debouncedData, month, loading]);
  const handleExport = async () => {
    const format = window.prompt("请指定导出的文件格式：\n支持: json / md / docx", "md");
    if (!format) return;
    const f = format.toLowerCase().trim();
    if (!['json', 'md', 'docx'].includes(f)) {
      alert('暂不支持此格式或输入有误！');
      return;
    }

    const exportData = {
      month, content: [goals, results, positive, negative, retry, nextPlan].join('\n\n')
    };

    if (f === 'json') {
      const dataStr = JSON.stringify({ month, goals_review: goals, result_eval: results, positive_analysis: positive, negative_analysis: negative, retry_plan: retry, next_month_plan: nextPlan }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `monthly_review_${month}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      return;
    }

    // Call backend for MD/DOCX
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/file/export', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
          format: f, 
          type: 'monthly_review', 
          data: exportData 
        })
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `月度复盘_${month}.${f}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`导出遇到问题：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const parsedDataList = await fetchApi('/api/file/parse', {
        method: 'POST',
        body: formData
      });

      if (!Array.isArray(parsedDataList)) return;

      if (parsedDataList.length > 1) {
         if (confirm(`智能识别出包含不同月份的 ${parsedDataList.length} 篇复盘内容！\n是否立即覆盖提取并同步上云？`)) {
            for (const item of parsedDataList) {
               const [y, m] = item.date.split('-'); 
               await fetchApi('/api/reviews/monthly', {
                  method: 'POST',
                  body: JSON.stringify({
                     year: parseInt(y, 10),
                     month: parseInt(m, 10),
                     goals_review: item.happy_things,
                     results_evaluation: item.meaningful_things,
                     positive_analysis: item.grateful_people,
                     negative_analysis: item.improvements,
                     replay_simulation: '', 
                     next_month_plan: item.thoughts
                  })
               });
            }
            alert('全量批量导入成功！');
            window.dispatchEvent(new Event('logSaved'));
         }
      }

      const parsedData = parsedDataList[0];
      if (parsedData) {
        if (parsedData.date) {
            const [y, m] = parsedData.date.split('-');
            const formatted = `${y}-${m.padStart(2, '0')}`;
            setMonth(formatted);
            setSearchParams({ month: `${y}-${parseInt(m, 10)}` });
        }
        
        const content = [
          parsedData.happy_things || '',
          parsedData.meaningful_things || '',
          parsedData.grateful_people || '',
          parsedData.improvements || '',
          parsedData.thoughts || ''
        ].filter(Boolean).join('\n');

        const parts = content ? content.split('\n') : [];
        setGoals(parts[0] || (parsedData.happy_things || ''));
        setResults(parts[1] || (parsedData.meaningful_things || ''));
        setPositive(parts[2] || (parsedData.grateful_people || ''));
        setNegative(parts[3] || (parsedData.improvements || ''));
        setRetry(parts[4] || '');
        setNextPlan(parts.slice(5).join('\n') || (parsedData.thoughts || ''));
        
        setLastSaved('📝 第一篇复盘已成功识别并提取，它将稍后自动保存...');
        setTimeout(() => setLastSaved('All changes saved'), 3000);
      }
    } catch (err: any) {
      console.error(err);
      alert(`文件识别失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!reviewId) return;
    if (!confirm('确定要删除当月的复盘吗？')) return;
    try {
      await fetchApi(`/api/reviews/monthly/${reviewId}`, { method: 'DELETE' });
      hasUserEditedRef.current = false;
      resetForm();
      window.dispatchEvent(new Event('logSaved'));
      alert('已清除月度复盘内容');
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handlePrevMonth = () => {
    let y = parseInt(month.substring(0, 4));
    let m = parseInt(month.substring(5, 7));
    if (m === 1) { m = 12; y--; } else { m--; }
    const newMonthStr = `${y}-${m.toString().padStart(2, '0')}`;
    prepareForMonthChange();
    setMonth(newMonthStr);
    setSearchParams({ month: `${y}-${m}` }); // Note: SideNav uses unpadded months!
  };

  const handleNextMonth = () => {
    let y = parseInt(month.substring(0, 4));
    let m = parseInt(month.substring(5, 7));
    if (m === 12) { m = 1; y++; } else { m++; }
    const newMonthStr = `${y}-${m.toString().padStart(2, '0')}`;
    prepareForMonthChange();
    setMonth(newMonthStr);
    setSearchParams({ month: `${y}-${m}` });
  };

  const formattedTitle = `${month.substring(0, 4)}年${month.substring(5, 7)}月`;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <PageHeader 
        title={formattedTitle} 
        onDelete={reviewId ? handleDelete : undefined}
        onExport={handleExport}
        onImport={handleImport}
        onPrev={handlePrevMonth}
        onNext={handleNextMonth}
      />
      <div className="space-y-4 mb-10">
        <MethodologyBanner type="monthly" />
        <ErrorsBanner type="monthly" />
      </div>
      {loading ? (
        <div className="flex animate-pulse flex-col space-y-10">
           <div className="h-32 bg-slate-100 rounded-2xl"></div>
           <div className="h-32 bg-slate-100 rounded-2xl"></div>
        </div>
      ) : (
      <div className="space-y-10">
        <EditorSection icon="📌" title="回顾目标" subtitle="制定适配的阶段性成长目标，使用SMART原则，聚焦1-2个主要目标。" placeholder="当初的目标是什么？设定的关键指标(KPI)是什么？" value={goals} onChange={(value) => { hasUserEditedRef.current = true; setGoals(value); }} />
        <EditorSection icon="📊" title="评估结果" subtitle="以主要目标的实际完成情况为主，进行多维度环评（客观、主观、他人评价）。" placeholder="实际完成了多少？哪些超出了预期？哪些未达标？" value={results} onChange={(value) => { hasUserEditedRef.current = true; setResults(value); }} />
        <EditorSection icon="✅" title="分析原因（正向）" subtitle="主客观相统一，尽可能用理性中立视角分析，积极引入他人视角。" placeholder="成功的主要因素是什么？哪些经验可以被复用？" value={positive} onChange={(value) => { hasUserEditedRef.current = true; setPositive(value); }} />
        <EditorSection icon="❌" title="分析原因（负向）" subtitle="尽量深入找到本质原因，全面评估，不妄自菲薄。" placeholder="失误的主要原因是什么？哪些环节出现了疏漏？" value={negative} onChange={(value) => { hasUserEditedRef.current = true; setNegative(value); }} />
        <EditorSection icon="🔄" title="重来演练" subtitle="重点是下次做类似的事该怎么做，排除无法改变的因素干扰，不做“最美幻想”。" placeholder="如果时光倒流，你会如何优化决策和行动流程？" value={retry} onChange={(value) => { hasUserEditedRef.current = true; setRetry(value); }} />
        <EditorSection icon="📅" title="下月规划" subtitle="根据完成情况调整下月目标（达成则继续/提升，达不成则调整或降低预期）。" placeholder="基于本月复盘，下个月的核心目标和行动方案是什么？" value={nextPlan} onChange={(value) => { hasUserEditedRef.current = true; setNextPlan(value); }} />
      </div>
      )}
      <StatusBar saving={saving} lastSaved={lastSaved} />
    </div>
  );
}
