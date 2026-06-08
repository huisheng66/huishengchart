import { useMemo, useState } from 'react';
import { CanvasView } from './components/CanvasView';
import { toChenFlow } from './diagram/chen-adapter';
import { toCrowFootFlow } from './diagram/crow-foot-adapter';
import { sampleSql } from './domain/sample-sql';
import type { ErModel } from './domain/er-model';
import { exportDataDictionaryMarkdown, exportRelationshipReportMarkdown } from './export/markdown';
import { exportMermaidEr } from './export/mermaid';
import { parseMySqlSafely } from './sql/parser-result';

type Tab = 'crowFoot' | 'chen' | 'mermaid' | 'dictionary' | 'report';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'crowFoot', label: "Crow's Foot" },
  { id: 'chen', label: '陈氏 ER 图' },
  { id: 'mermaid', label: 'Mermaid' },
  { id: 'dictionary', label: '数据字典' },
  { id: 'report', label: '关系报告' },
];

export function App() {
  const [sql, setSql] = useState(sampleSql);
  const [model, setModel] = useState<ErModel | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('crowFoot');
  const [parseError, setParseError] = useState('');

  const crowFootGraph = useMemo(() => (model ? toCrowFootFlow(model) : null), [model]);
  const chenGraph = useMemo(() => (model ? toChenFlow(model) : null), [model]);

  function generate() {
    const result = parseMySqlSafely(sql);
    if (result.ok) {
      setModel(result.model);
      setActiveTab('crowFoot');
      setParseError('');
    } else {
      setParseError(result.error.message);
    }
  }

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
          <textarea aria-label="SQL input" spellCheck={false} value={sql} onChange={(event) => setSql(event.target.value)} />
          {parseError ? (
            <div className="parse-error" role="alert">
              {parseError}
            </div>
          ) : null}
          <button type="button" onClick={generate}>
            生成
          </button>
        </aside>

        <section className="result-pane" aria-label="diagram result">
          <h2>图表预览</h2>
          {!model || !crowFootGraph || !chenGraph ? (
            <div className="empty-state">粘贴 SQL 后生成可编辑 ER 图。</div>
          ) : (
            <>
              <div className="tabs" role="tablist" aria-label="diagram views">
                {tabs.map((tab) => (
                  <button
                    aria-selected={activeTab === tab.id}
                    className={activeTab === tab.id ? 'tab tab--active' : 'tab'}
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    role="tab"
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <section className="tab-panel" role="tabpanel">
                {activeTab === 'crowFoot' ? <CanvasView graph={crowFootGraph} /> : null}
                {activeTab === 'chen' ? <CanvasView graph={chenGraph} /> : null}
                {activeTab === 'mermaid' ? <pre className="artifact">{exportMermaidEr(model)}</pre> : null}
                {activeTab === 'dictionary' ? <pre className="artifact">{exportDataDictionaryMarkdown(model)}</pre> : null}
                {activeTab === 'report' ? <pre className="artifact">{exportRelationshipReportMarkdown(model)}</pre> : null}
              </section>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
