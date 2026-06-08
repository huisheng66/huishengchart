export function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Huisheng Chart</h1>
          <p>面向课程作业的在线图表生成与编辑工具</p>
        </div>
      </header>

      <section className="workspace">
        <aside className="sql-pane">
          <h2>MySQL 建表 SQL</h2>
          <textarea aria-label="SQL input" spellCheck={false} />
          <button type="button">生成</button>
        </aside>

        <section className="result-pane" aria-label="diagram result">
          <h2>图表预览</h2>
          <div className="empty-state">粘贴 SQL 后生成可编辑 ER 图。</div>
        </section>
      </section>
    </main>
  );
}
