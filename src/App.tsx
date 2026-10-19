import { useCallback, useMemo, useState } from 'react';
import { CanvasView } from './components/CanvasView';
import { toChenFlow } from './diagram/chen-adapter';
import { toCrowFootFlow } from './diagram/crow-foot-adapter';
import { sampleSql } from './domain/sample-sql';
import type { DiagramLayout, DiagramView, ErModel } from './domain/er-model';
import { exportDataDictionaryMarkdown, exportRelationshipReportMarkdown } from './export/markdown';
import { exportMermaidEr } from './export/mermaid';
import { parseMySqlSafely } from './sql/parser-result';

type Tab = 'crowFoot' | 'chen' | 'mermaid' | 'dictionary' | 'report';

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'crowFoot', label: "鸟爪 ER 图 (Crow's Foot)" },
  { id: 'chen', label: '陈氏 ER 图' },
  { id: 'mermaid', label: 'Mermaid 源码' },
  { id: 'dictionary', label: '数据字典' },
  { id: 'report', label: '关系报告' },
];

export function App() {
  const [sql, setSql] = useState(sampleSql);
  const [model, setModel] = useState<ErModel | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('crowFoot');
  const [parseError, setParseError] = useState('');

  const tables = model?.tables;
  const relations = model?.relations;
  const inferredRelations = model?.inferredRelations;

  // 只依赖图内容切片：布局回写会更新 model.layouts，
  // 但不应该触发两个适配器重新构建整张图。
  const crowFootGraph = useMemo(
    () => (tables && relations && inferredRelations ? toCrowFootFlow({ tables, relations, inferredRelations }) : null),
    [tables, relations, inferredRelations]
  );
  const chenGraph = useMemo(
    () => (tables && relations && inferredRelations ? toChenFlow({ tables, relations, inferredRelations }) : null),
    [tables, relations, inferredRelations]
  );

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

  function handleAcceptInferred(relationId: string) {
    setModel((prev) => {
      if (!prev) return prev;
      const relation = prev.inferredRelations.find((r) => r.id === relationId);
      if (!relation) return prev;
      return {
        ...prev,
        relations: [...prev.relations, { ...relation, status: 'accepted' as const, source: 'rule-inferred' as const }],
        inferredRelations: prev.inferredRelations.filter((r) => r.id !== relationId),
      };
    });
  }

  function handleRejectInferred(relationId: string) {
    setModel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        inferredRelations: prev.inferredRelations.map((r) =>
          r.id === relationId ? { ...r, status: 'rejected' as const } : r
        ),
      };
    });
  }

  const handleLayoutChange = useCallback((view: DiagramView, layout: DiagramLayout) => {
    setModel((prev) => (prev ? { ...prev, layouts: { ...prev.layouts, [view]: layout } } : prev));
  }, []);

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
                {activeTab === 'crowFoot' ? (
                  <CanvasView
                    view="crowFoot"
                    graph={crowFootGraph}
                    savedLayout={model.layouts.crowFoot}
                    inferredRelations={model.inferredRelations}
                    onLayoutChange={handleLayoutChange}
                    onAcceptInferred={handleAcceptInferred}
                    onRejectInferred={handleRejectInferred}
                  />
                ) : null}
                {activeTab === 'chen' ? (
                  <CanvasView
                    view="chen"
                    graph={chenGraph}
                    savedLayout={model.layouts.chen}
                    inferredRelations={model.inferredRelations}
                    onLayoutChange={handleLayoutChange}
                    onAcceptInferred={handleAcceptInferred}
                    onRejectInferred={handleRejectInferred}
                  />
                ) : null}
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
