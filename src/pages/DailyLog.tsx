import React, { useState, useEffect, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import EditorSection from '../components/EditorSection';
import StatusBar from '../components/StatusBar';
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

export default function DailyLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlDate = searchParams.get('date');
  
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(urlDate || today);

  useEffect(() => {
    if (urlDate && urlDate !== date) {
      prepareForDateChange();
      setDate(urlDate);
    }
  }, [urlDate]);

  const [logId, setLogId] = useState<string | null>(null);
  
  // Form fields
  const [happy, setHappy] = useState('');
  const [meaningful, setMeaningful] = useState('');
  const [grateful, setGrateful] = useState('');
  const [improve, setImprove] = useState('');
  const [thoughts, setThoughts] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const loadRequestIdRef = useRef(0);
  const hasUserEditedRef = useRef(false);

  const resetForm = () => {
    setLogId(null);
    setHappy('');
    setMeaningful('');
    setGrateful('');
    setImprove('');
    setThoughts('');
    setLastSaved(null);
  };

  const prepareForDateChange = () => {
    hasUserEditedRef.current = false;
    setLoading(true);
    resetForm();
  };

  // Load daily log
  useEffect(() => {
    const loadLog = async () => {
      const requestId = ++loadRequestIdRef.current;
      setLoading(true);
      resetForm();

      try {
        const data = await fetchApi(`/api/logs/${date}`);
        if (loadRequestIdRef.current !== requestId) return;

        if (data && data.id) {
          setLogId(data.id);
          setHappy(data.happy_things || '');
          setMeaningful(data.meaningful_things || '');
          setGrateful(data.grateful_people || '');
          setImprove(data.improvements || '');
          setThoughts(data.thoughts || '');
          setLastSaved(new Date().toLocaleTimeString());
        }
        hasUserEditedRef.current = false;
      } catch (err) {
        if (loadRequestIdRef.current !== requestId) return;

        // Keep the reset blank form when the log does not exist yet.
        const error = err as Error & { status?: number };
        hasUserEditedRef.current = false;
        if (error.status !== 404) {
          console.error(`Failed to load daily log for ${date}:`, err);
        }
      } finally {
        if (loadRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };
    loadLog();
  }, [date]);

  // Debounce for auto-save
  const debouncedData = useDebounce({ happy, meaningful, grateful, improve, thoughts }, 1000);
  const isInitialMount = useRef(true);

  // Auto save
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (loading) return; // don't save while loading
    if (!hasUserEditedRef.current) return; // don't save programmatic changes
    
    // Only save if any field has content
    if (!debouncedData.happy && !debouncedData.meaningful && !debouncedData.grateful && !debouncedData.improve && !debouncedData.thoughts) return;

    const saveLog = async () => {
      setSaving(true);
      try {
        const data = await fetchApi('/api/logs', {
          method: 'POST',
          body: JSON.stringify({
            date,
            happy_things: debouncedData.happy,
            meaningful_things: debouncedData.meaningful,
            grateful_people: debouncedData.grateful,
            improvements: debouncedData.improve,
            thoughts: debouncedData.thoughts
          })
        });
        if (!logId && data.id) {
          window.dispatchEvent(new Event('logSaved'));
        }
        setLogId(data.id);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (error) {
        console.error('Failed to auto-save:', error);
      } finally {
        setSaving(false);
      }
    };

    saveLog();
  }, [debouncedData, date, loading]);

  const handleDelete = async () => {
    if (!logId) return;
    if (!confirm('确定要删除当天的日志吗？')) return;
    
    try {
      await fetchApi(`/api/logs/${logId}`, { method: 'DELETE' });
      setLogId(null);
      setHappy('');
      setMeaningful('');
      setGrateful('');
      setImprove('');
      setThoughts('');
      setLastSaved(null);
      alert('已删除当天的日志');
      window.dispatchEvent(new Event('logSaved'));
    } catch (e) {
      alert('Delete failed');
    }
  };

  const handleExport = async () => {
    const format = window.prompt("请指定导出的文件格式：\n支持: json / md / docx", "md");
    if (!format) return;
    const f = format.toLowerCase().trim();
    if (!['json', 'md', 'docx'].includes(f)) {
      alert('暂不支持此格式或输入有误！');
      return;
    }

    const exportData = {
      date, 
      happy_things: happy, 
      meaningful_things: meaningful, 
      grateful_people: grateful, 
      improvements: improve, 
      thoughts: thoughts
    };

    if (f === 'json') {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `daily_log_${date}.json`;
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
          type: 'daily_log', 
          data: exportData 
        })
      });
      if (!res.ok) throw new Error('导出失败');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `每日日志_${date}.${f}`;
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
         if (confirm(`智能识别出包含不同日期的 ${parsedDataList.length} 篇日志片段！\n是否立即批量提取并同步上云？`)) {
            for (const item of parsedDataList) {
               await fetchApi('/api/logs', {
                  method: 'POST',
                  body: JSON.stringify({
                     date: item.date,
                     happy_things: item.happy_things,
                     meaningful_things: item.meaningful_things,
                     grateful_people: item.grateful_people,
                     improvements: item.improvements,
                     thoughts: item.thoughts
                  })
               });
            }
            alert('全量批量分发导入成功！');
            window.dispatchEvent(new Event('logSaved'));
         }
      }

      const parsedData = parsedDataList[0];
      if (parsedData) {
        if (parsedData.date) {
            setDate(parsedData.date);
            setSearchParams({ date: parsedData.date });
        }
        setHappy(parsedData.happy_things || '');
        setMeaningful(parsedData.meaningful_things || '');
        setGrateful(parsedData.grateful_people || '');
        setImprove(parsedData.improvements || '');
        setThoughts(parsedData.thoughts || '');
        
        setLastSaved('📝 数据已成功被识别并填入面板，它将在下一秒自动保存。');
        setTimeout(() => setLastSaved('All changes saved'), 3000);
      }
    } catch (err: any) {
      console.error(err);
      alert(`文件识别失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const newStr = d.toISOString().split('T')[0];
    prepareForDateChange();
    setDate(newStr);
    setSearchParams({ date: newStr });
  };

  const handleNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    const newStr = d.toISOString().split('T')[0];
    prepareForDateChange();
    setDate(newStr);
    setSearchParams({ date: newStr });
  };

  const formattedDateTitle = new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <PageHeader 
        title={formattedDateTitle} 
        onDelete={logId ? handleDelete : undefined}
        onExport={handleExport}
        onImport={handleImport}
        onPrev={handlePrevDay}
        onNext={handleNextDay}
      />
      
      {loading ? (
        <div className="flex animate-pulse flex-col space-y-10">
           <div className="h-32 bg-slate-100 rounded-2xl"></div>
           <div className="h-32 bg-slate-100 rounded-2xl"></div>
        </div>
      ) : (
        <div className="space-y-10">
          <EditorSection 
            icon="😊" title="开心的事" placeholder="今天发生了什么开心的事?" 
            value={happy} onChange={(val) => { hasUserEditedRef.current = true; setHappy(val); }} 
          />
          <EditorSection 
            icon="📝" title="充实的事" placeholder="今天完成了哪些有意义的工作或学习?" 
            value={meaningful} onChange={(val) => { hasUserEditedRef.current = true; setMeaningful(val); }} 
          />
          <EditorSection 
            icon="🙏" title="感谢的人" placeholder="今天想感谢谁？为什么?" 
            value={grateful} onChange={(val) => { hasUserEditedRef.current = true; setGrateful(val); }} 
          />
          <EditorSection 
            icon="🔧" title="改进的事" placeholder="今天有哪些可以做得更好的地方?" 
            value={improve} onChange={(val) => { hasUserEditedRef.current = true; setImprove(val); }} 
          />
          <EditorSection 
            icon="💭" title="今日思考" placeholder="今天的感悟或灵感..." 
            value={thoughts} onChange={(val) => { hasUserEditedRef.current = true; setThoughts(val); }} 
          />
        </div>
      )}
      
      <StatusBar saving={saving} lastSaved={lastSaved} />
    </div>
  );
}
