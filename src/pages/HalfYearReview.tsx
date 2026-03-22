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

export default function HalfYearReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlHalf = searchParams.get('half');

  const currentYear = new Date().getFullYear();
  const currentHalf = (new Date().getMonth() + 1) <= 6 ? 1 : 2;
  const initialYear = urlHalf ? parseInt(urlHalf.split('-')[0], 10) : currentYear;
  const initHalf = urlHalf ? parseInt(urlHalf.split('-')[1], 10) : currentHalf;
  
  const [year, setYear] = useState(initialYear);
  const [half, setHalf] = useState(initHalf);

  useEffect(() => {
    if (urlHalf) {
      const [y, h] = urlHalf.split('-');
      if (y && h) {
        const parsedYear = parseInt(y, 10);
        const parsedHalf = parseInt(h, 10);
        if (parsedYear !== year || parsedHalf !== half) {
          prepareForHalfChange();
          setYear(parsedYear);
          setHalf(parsedHalf);
        }
      }
    }
  }, [urlHalf]);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const [target, setTarget] = useState('');
  const [result, setResult] = useState('');
  const [negative, setNegative] = useState('');
  const [positive, setPositive] = useState('');
  const [adjust, setAdjust] = useState('');
  const [future, setFuture] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const hasUserEditedRef = useRef(false);

  const resetForm = () => {
    setReviewId(null);
    setTarget('');
    setResult('');
    setNegative('');
    setPositive('');
    setAdjust('');
    setFuture('');
    setLastSaved(null);
  };

  const prepareForHalfChange = () => {
    hasUserEditedRef.current = false;
    setLoading(true);
    resetForm();
  };

  useEffect(() => {
    const loadReview = async () => {
      const requestId = ++loadRequestIdRef.current;
      setLoading(true);
      resetForm();
      try {
        const params = new URLSearchParams({ half: half.toString(), year: year.toString() });
        const res = await fetchApi(`/api/reviews/half-year?${params.toString()}`);
        if (loadRequestIdRef.current !== requestId) return;
        const data = Array.isArray(res) ? res[0] : null;
        
        if (data && data.id) {
          setReviewId(data.id);
          setTarget(data.goals_review || '');
          setResult(data.results_confirmation || '');
          setNegative(data.below_expectations_analysis || '');
          setPositive(data.above_expectations_analysis || '');
          setAdjust(data.how_to_replay || '');
          setFuture(data.future_plan || '');
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
  }, [year, half]);

  const debouncedData = useDebounce({ target, result, negative, positive, adjust, future }, 1000);
  const isInitialMount = useRef(true);

  // Auto save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (loading) return;
    if (!hasUserEditedRef.current) return;

    if (!debouncedData.target && !debouncedData.result && !debouncedData.negative && !debouncedData.positive && !debouncedData.adjust && !debouncedData.future) return;

    const saveReview = async () => {
      setSaving(true);
      try {
        const data = await fetchApi('/api/reviews/half-year', {
          method: 'POST',
          body: JSON.stringify({
            half,
            year,
            goals_review: debouncedData.target,
            results_confirmation: debouncedData.result,
            below_expectations_analysis: debouncedData.negative,
            above_expectations_analysis: debouncedData.positive,
            how_to_replay: debouncedData.adjust,
            future_plan: debouncedData.future
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
  }, [debouncedData, year, half, loading]);

  const handleExport = async () => {
    const format = window.prompt("请指定导出的文件格式：\n支持: json / md / docx", "md");
    if (!format) return;
    const f = format.toLowerCase().trim();
    if (!['json', 'md', 'docx'].includes(f)) {
      alert('暂不支持此格式或输入有误！');
      return;
    }

    const exportData = {
      year, half, content: [target, result, negative, positive, adjust, future].join('\n\n')
    };

    if (f === 'json') {
      const dataStr = JSON.stringify({ year, half, target_review: target, result_eval: result, negative_analysis: negative, positive_analysis: positive, adjust_plan: adjust, future_plan: future }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `half_year_review_${year}_H${half}.json`;
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
          type: 'half_year_review', 
          data: exportData 
        })
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `半年复盘_${year}_H${half}.${f}`;
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
         if (confirm(`智能识别出包含不同半年的 ${parsedDataList.length} 篇复盘内容！\n是否立即覆盖提取并同步上云？`)) {
            for (const item of parsedDataList) {
               // heuristics: fallback year to current year, half to 1
               const [y, m] = item.date.split('-'); 
               const targetHalf = parseInt(m, 10) <= 6 ? 1 : 2;
               await fetchApi('/api/reviews/half-year', {
                  method: 'POST',
                  body: JSON.stringify({
                     year: parseInt(y, 10),
                     half: targetHalf,
                     goals_review: item.happy_things,
                     results_confirmation: item.meaningful_things,
                     below_expectations_analysis: item.improvements,
                     above_expectations_analysis: item.grateful_people,
                     how_to_replay: '', 
                     future_plan: item.thoughts
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
            const targetHalf = parseInt(m, 10) <= 6 ? 1 : 2;
            setYear(parseInt(y, 10));
            setHalf(targetHalf);
            setSearchParams({ half: `${y}-${targetHalf}` });
        }

        const content = [
          parsedData.happy_things || '',
          parsedData.meaningful_things || '',
          parsedData.grateful_people || '',
          parsedData.improvements || '',
          parsedData.thoughts || ''
        ].filter(Boolean).join('\n');

        const parts = content ? content.split('\n') : [];
        setTarget(parts[0] || (parsedData.happy_things || ''));
        setResult(parts[1] || (parsedData.meaningful_things || ''));
        setNegative(parts[2] || (parsedData.improvements || ''));
        setPositive(parts[3] || (parsedData.grateful_people || ''));
        setAdjust(parts[4] || '');
        setFuture(parts.slice(5).join('\n') || (parsedData.thoughts || ''));
        
        setLastSaved('📝 第一篇数据已成功被识别并填入面板...');
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
    if (!confirm('确定要清空当期的复盘吗？')) return;
    try {
      await fetchApi(`/api/reviews/half-year/${reviewId}`, { method: 'DELETE' });
      hasUserEditedRef.current = false;
      resetForm();
      window.dispatchEvent(new Event('logSaved'));
      alert('已清除半年期复盘内容');
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handlePrevHalf = () => {
    let newH = half === 1 ? 2 : 1;
    let newY = half === 1 ? year - 1 : year;
    prepareForHalfChange();
    setHalf(newH);
    setYear(newY);
    setSearchParams({ half: `${newY}-${newH}` });
  };

  const handleNextHalf = () => {
    let newH = half === 2 ? 1 : 2;
    let newY = half === 2 ? year + 1 : year;
    prepareForHalfChange();
    setHalf(newH);
    setYear(newY);
    setSearchParams({ half: `${newY}-${newH}` });
  };

  const formattedTitle = `${year}年 ${half === 1 ? '上半年' : '下半年'}`;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <PageHeader 
        title={formattedTitle} 
        onDelete={reviewId ? handleDelete : undefined}
        onExport={handleExport}
        onImport={handleImport}
        onPrev={handlePrevHalf}
        onNext={handleNextHalf}
      />
      <div className="space-y-4 mb-10">
        <MethodologyBanner type="half-year" />
        <ErrorsBanner type="half-year" />
      </div>

      {loading ? (
        <div className="flex animate-pulse flex-col space-y-10">
           <div className="h-32 bg-slate-100 rounded-2xl"></div>
           <div className="h-32 bg-slate-100 rounded-2xl"></div>
        </div>
      ) : (
        <div className="space-y-10">
          <EditorSection icon="📌" title="回顾目标" subtitle="当初想找到的实践机会和平台是怎样的？对自己的能力成长有什么期待？" placeholder="输入您的半年目标回顾..." value={target} onChange={(value) => { hasUserEditedRef.current = true; setTarget(value); }} />
          <EditorSection icon="📊" title="确认结果" subtitle="评估获得的实践机会是否真的适合，能力成长是否符合预期（主客观评估）。" placeholder="输入实际完成情况..." value={result} onChange={(value) => { hasUserEditedRef.current = true; setResult(value); }} />
          <EditorSection icon="❌" title="评估得失（低于预期）" subtitle="哪些地方低于预期？为什么？（机会选择、能力成长方面的原因）" placeholder="分析低于预期的原因..." value={negative} onChange={(value) => { hasUserEditedRef.current = true; setNegative(value); }} />
          <EditorSection icon="✅" title="评估得失（超预期）" subtitle="哪些地方超预期？为什么？尊重客观原因，更重视主观能动性。" placeholder="总结成功的经验..." value={positive} onChange={(value) => { hasUserEditedRef.current = true; setPositive(value); }} />
          <EditorSection icon="🔄" title="如何再来一次" subtitle="明确哪个环节出问题要调整（目标制定、平台选择、具体执行）。" placeholder="如果重来一次，你会如何改进..." value={adjust} onChange={(value) => { hasUserEditedRef.current = true; setAdjust(value); }} />
          <EditorSection icon="📅" title="未来规划及调整" subtitle="基于当前能力水平和实践积累，正推或反推下一步目标，持续坚持学习-实践-交流-总结。" placeholder="开启下一个阶段的宏伟蓝图..." value={future} onChange={(value) => { hasUserEditedRef.current = true; setFuture(value); }} />
        </div>
      )}
      
      <StatusBar saving={saving} lastSaved={lastSaved} />
    </div>
  );
}
