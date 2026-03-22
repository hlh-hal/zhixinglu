import React from 'react';

export default function EditorSection({ 
  icon, 
  title, 
  subtitle, 
  placeholder, 
  value,
  defaultValue,
  onChange 
}: { 
  icon: string, 
  title: string, 
  subtitle?: string, 
  placeholder: string, 
  value?: string, 
  defaultValue?: string,
  onChange?: (val: string) => void 
}) {
  return (
    <section className="group flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-xl shadow-inner shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="font-headline text-lg font-bold text-on-surface">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <textarea 
        className="w-full h-32 p-5 bg-white border border-slate-100 shadow-sm rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all duration-300 resize-none font-body text-on-surface placeholder:text-slate-400" 
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => onChange && onChange(e.target.value)}
      ></textarea>
    </section>
  );
}
