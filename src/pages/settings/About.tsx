export default function About() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface font-headline tracking-tight">关于</h1>
        <p className="text-on-surface-variant mt-2 text-lg">版本信息与法律条款</p>
      </header>

      <div className="space-y-8">
        {/* SECTION 1: 应用信息 */}
        <section className="bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-outline-variant/10">
          <div className="flex items-start gap-8">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <span className="text-on-primary font-headline font-extrabold text-2xl tracking-tighter">知行</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-headline text-2xl font-bold text-on-surface">知行录</h2>
                <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-xs font-semibold">v1.0.0</span>
              </div>
              <p className="text-primary font-medium mb-4">记录行动，沉淀成长</p>
              <p className="text-on-surface-variant text-sm leading-relaxed max-w-2xl">
                知行录是一款专注于深度思考与高效执行的数字化笔记工具。我们主张“知行合一”，通过精巧的界面设计与流畅的交互逻辑，协助学者与创作者在喧嚣的数字时代建立一座私密的思想圣殿。
              </p>
              <div className="mt-6 pt-6 border-t border-surface-container-low flex gap-8">
                <div>
                  <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">Build Date</p>
                  <p className="text-on-surface font-headline font-semibold">2026.03.21</p>
                </div>
                <div>
                  <p className="text-on-surface-variant text-[10px] uppercase tracking-widest font-bold">Platform</p>
                  <p className="text-on-surface font-headline font-semibold">Web Professional</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: 帮助与支持 */}
        <section className="bg-surface-container-lowest rounded-xl shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-outline-variant/10 overflow-hidden">
          <div className="px-8 py-4 bg-surface-container-low/50">
            <h3 className="font-headline text-sm font-bold text-on-surface-variant uppercase tracking-wider">帮助与支持</h3>
          </div>
          <div className="divide-y divide-surface-container">
            <HelpLink icon="help_center" text="帮助中心" />
            <HelpLink icon="auto_stories" text="使用指南" />
            <HelpLink icon="quiz" text="常见问题" />
            <HelpLink icon="mail" text="联系我们" />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SECTION 3: 法律与协议 */}
          <section className="bg-surface-container-lowest rounded-xl shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-outline-variant/10 overflow-hidden">
            <div className="px-8 py-4 bg-surface-container-low/50">
              <h3 className="font-headline text-sm font-bold text-on-surface-variant uppercase tracking-wider">法律与协议</h3>
            </div>
            <div className="divide-y divide-surface-container">
              <LegalLink text="用户协议" />
              <LegalLink text="隐私政策" />
              <LegalLink text="数据导入导出说明" />
            </div>
          </section>

          {/* SECTION 4: 反馈 */}
          <section className="bg-surface-container-lowest rounded-xl shadow-[0px_20px_40px_rgba(26,28,28,0.06)] border border-outline-variant/10 p-8 flex flex-col justify-between">
            <div>
              <h3 className="font-headline text-sm font-bold text-on-surface-variant uppercase tracking-wider mb-6">反馈</h3>
              <div className="space-y-3">
                <button className="w-full bg-primary text-on-primary py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-sm" style={{fontVariationSettings: "'FILL' 1"}}>feedback</span>
                  提交反馈
                </button>
                <button className="w-full bg-secondary-container text-on-secondary-container py-3 px-6 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-secondary-container/80 transition-all">
                  <span className="material-symbols-outlined text-sm">groups</span>
                  加入用户交流群
                </button>
              </div>
            </div>
            <p className="text-on-surface-variant text-[11px] mt-6 opacity-60 text-center">
              您的反馈是我们不断进化的动力。预计回复时间：24小时内。
            </p>
          </section>
        </div>

        {/* SECTION 5: 页脚信息 */}
        <footer className="pt-12 pb-8 flex flex-col items-center gap-4">
          <div className="flex gap-6">
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">public</span></a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">alternate_email</span></a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">share</span></a>
          </div>
          <p className="text-on-surface-variant text-xs font-medium opacity-50 tracking-wide">
            Copyright © 2026 知行录 - All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}

function HelpLink({ icon, text }: { icon: string, text: string }) {
  return (
    <button className="w-full flex items-center justify-between px-8 py-5 hover:bg-surface-container-low transition-colors group">
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <span className="font-medium">{text}</span>
      </div>
      <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
    </button>
  );
}

function LegalLink({ text }: { text: string }) {
  return (
    <button className="w-full flex items-center justify-between px-8 py-4 hover:bg-surface-container-low transition-colors">
      <span className="text-sm font-medium">{text}</span>
      <span className="material-symbols-outlined text-outline-variant text-sm">open_in_new</span>
    </button>
  );
}
