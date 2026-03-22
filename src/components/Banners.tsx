import { useState } from 'react';

export function MethodologyBanner({ type }: { type: 'monthly' | 'half-year' }) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (type === 'monthly') {
    return (
      <div className="bg-[#E8F4FD] border-l-4 border-primary rounded-r-2xl overflow-hidden transition-all duration-300">
        <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-6 py-4 text-left">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">book</span>
            <span className="font-bold text-primary">📘 月志方法论 (六步复盘法)</span>
          </div>
          <span className={`material-symbols-outlined text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
        </button>
        {isOpen && (
          <div className="px-6 pb-6 pt-0 text-sm text-primary/80 leading-relaxed border-t border-primary/10">
            <p className="font-semibold mb-3 mt-4 text-primary">月志复盘六步法核心原则：</p>
            <div className="space-y-3">
              <div><span className="font-bold text-primary">1. 回顾目标：</span>制定适配的阶段性成长目标，使用SMART原则，聚焦1-2个主要目标。</div>
              <div><span className="font-bold text-primary">2. 评估结果：</span>以主要目标的实际完成情况为主，进行多维度环评（客观、主观、他人评价）。</div>
              <div><span className="font-bold text-primary">3. 分析原因（正向）：</span>主客观相统一，尽可能用理性中立视角分析，积极引入他人视角。</div>
              <div><span className="font-bold text-primary">4. 分析原因（负向）：</span>尽量深入找到本质原因，全面评估，不妄自菲薄。</div>
              <div><span className="font-bold text-primary">5. 重来演练：</span>重点是下次做类似的事该怎么做，排除无法改变的因素干扰，不做“最美幻想”。</div>
              <div><span className="font-bold text-primary">6. 下月规划：</span>根据完成情况调整下月目标（达成则继续/提升，达不成则调整或降低预期）。</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#E8F4FD] border-l-4 border-primary rounded-r-2xl overflow-hidden transition-all duration-300">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-6 py-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xl">📘</span>
          <span className="font-bold text-primary">半年复盘方法论</span>
        </div>
        <span className={`material-symbols-outlined text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StepCard step="1" title="回顾目标" desc="当初想找到的实践机会和平台是怎样的？对自己的能力成长有什么期待？" />
            <StepCard step="2" title="确认结果" desc="评估获得的实践机会是否真的适合，能力成长是否符合预期（主客观评估）。" />
            <StepCard step="3" title="评估得失(低于预期)" desc="哪些地方低于预期？为什么？（机会选择、能力成长方面的原因）" />
            <StepCard step="4" title="评估得失(超预期)" desc="哪些地方超预期？为什么？尊重客观原因，更重视主观能动性。" />
            <StepCard step="5" title="如何再来一次" desc="明确哪个环节出问题要调整（目标制定、平台选择、具体执行）。" />
            <StepCard step="6" title="未来规划及调整" desc="基于当前能力水平和实践积累，正推或反推下一步目标，持续坚持学习-实践-交流-总结。" />
          </div>
        </div>
      )}
    </div>
  );
}

function StepCard({ step, title, desc }: { step: string, title: string, desc?: string }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-primary/10 shadow-sm flex flex-col h-full">
      <p className="text-xs font-bold text-primary/60 mb-1">STEP {step}</p>
      <p className="text-sm font-bold text-slate-800 mb-2">{title}</p>
      {desc && <p className="text-xs text-slate-500 leading-relaxed mt-auto">{desc}</p>}
    </div>
  );
}

export function ErrorsBanner({ type }: { type: 'monthly' | 'half-year' }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-[#FFF8E1] border-l-4 border-[#ff9800] rounded-r-2xl overflow-hidden transition-all duration-300">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between px-6 py-4 text-left">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <span className="font-bold text-[#9a6c00]">典型错误与注意事项</span>
        </div>
        <span className={`material-symbols-outlined text-[#ff9800] transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-0 text-sm text-[#5f4100]/80 border-t border-[#ff9800]/10">
          {type === 'monthly' ? (
            <ul className="space-y-4 pt-4">
              <li className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5">❌</span><span className="font-bold text-[#9a6c00]">目标问题：</span>缺乏清晰成长目标（把手段当目的），缺乏评估标准，目标太多缺乏重点。</div>
                <div className="flex items-start gap-2 text-[#5f4100] pl-6"><span className="text-green-600 font-bold">✅ 正确做法：</span>做好取舍，锚定核心目标的复盘，其他事务自然进展。</div>
              </li>
              <li className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5">❌</span><span className="font-bold text-[#9a6c00]">评估问题：</span>没有围绕主要目标评估，搞各种灵活“加分”/偏离“减分”，一切以主观判断为主。</div>
                <div className="flex items-start gap-2 text-[#5f4100] pl-6"><span className="text-green-600 font-bold">✅ 正确做法：</span>以主要目标的实际完成情况为主，客观评价优先。</div>
              </li>
              <li className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5">❌</span><span className="font-bold text-[#9a6c00]">归因问题：</span>过度外部归因（错不在我），过度内部归因（都是我的错），归因停留在表面。</div>
                <div className="flex items-start gap-2 text-[#5f4100] pl-6"><span className="text-green-600 font-bold">✅ 正确做法：</span>持辩证唯物主义态度，接受客观环境影响，多发挥主观能动性，挖掘根本原因。</div>
              </li>
              <li className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2"><span className="text-red-500 mt-0.5">❌</span><span className="font-bold text-[#9a6c00]">演练与规划：</span>变成“最美幻想”甩锅逃避；60分不满足死磕极致，或达不成目标就逃避。</div>
                <div className="flex items-start gap-2 text-[#5f4100] pl-6"><span className="text-green-600 font-bold">✅ 正确做法：</span>找到哪里需要调整，积累经验服务于未来；根据实际情况合理调整下月预期。</div>
              </li>
            </ul>
          ) : (
            <div className="space-y-5 pt-4">
              <div>
                <p className="font-bold text-[#9a6c00] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">target</span> 1. 目标制定的问题</p>
                <ul className="space-y-1.5 pl-6 list-disc marker:text-[#ff9800]/50">
                  <li>依然在内卷学历GPA和用心投身实践之间摇摆，没有紧扣“能力成长”和“实践平台选择”这两个主线任务。</li>
                  <li>制定的目标过高，超出实际能力，或缺乏必要信息导致盲目努力。</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[#9a6c00] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">explore</span> 2. 实践平台选择的问题</p>
                <ul className="space-y-1.5 pl-6 list-disc marker:text-[#ff9800]/50">
                  <li>眼高手低，一直找不到匹配当下能力和需要的平台。</li>
                  <li>缺乏必要的应聘计划（沟通表达、信息收集等通用能力）。</li>
                  <li>过于意气用事，单纯基于个人体验和喜好来选择实践机会，忽视了能力成长和履历积累。</li>
                </ul>
              </div>
              <div>
                <p className="font-bold text-[#9a6c00] mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">directions_run</span> 3. 具体执行的问题</p>
                <ul className="space-y-1.5 pl-6 list-disc marker:text-[#ff9800]/50">
                  <li>把工作当作业，做完就完事，没有确保全力投入。</li>
                  <li>缺乏积极学习相关知识方法，不寻求有经验人的指导（成长受限）。</li>
                  <li>不重视与同事上级的关系，没有努力维持良好的关系。</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
