# 参考开源仓库清单

本文件记录在线图表工具实施计划中可参考的开源项目。外部仓库只用于本地阅读和设计借鉴，不提交到本项目。

本地外部仓库目录：`.reference-repos/`，已在 `.gitignore` 中忽略。

## 重点参考

| 仓库 | 用途 | 关注点 |
| --- | --- | --- |
| [xyflow/xyflow](https://github.com/xyflow/xyflow) | 画布交互基础 | React Flow 节点/边模型、handles、拖拽、重连、自定义节点、导出图片 |
| [drawdb-io/drawdb](https://github.com/drawdb-io/drawdb) | 在线数据库图编辑器 | 数据库表节点设计、字段编辑、关系编辑、SQL 生成和导入导出体验 |
| [chartdb/chartdb](https://github.com/chartdb/chartdb) | 数据库图产品体验 | 从数据库结构生成图、自动布局、现代 UI、关系可视化 |
| [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid) | 文本图导出生态 | Mermaid ER 语法生成、流程图/UML 后续扩展方向 |
| [dineug/erd-editor](https://github.com/dineug/erd-editor) | ERD 编辑器实现 | ERD 数据模型、编辑器状态管理、表和关系交互 |
| [holistics/dbml](https://github.com/holistics/dbml) | 数据库建模语言 | schema AST、DBML/SQL 转换、数据库结构文档表达 |
| [eralchemy/eralchemy](https://github.com/eralchemy/eralchemy) | Schema 到 ER 图生成 | 从数据库 schema 生成关系图的转换思路 |

## 次级参考

| 仓库 | 用途 | 关注点 |
| --- | --- | --- |
| [eclipse-elk/elk](https://github.com/eclipse-elk/elk) | 自动布局理论和实现 | ELK 布局参数、正交边路由、节点间距、边间距 |
| [plantuml/plantuml](https://github.com/plantuml/plantuml) | UML 文本图生态 | 后续类图、时序图、用例图导出 |
| [schemaspy/schemaspy](https://github.com/schemaspy/schemaspy) | 数据库文档生成 | 数据字典、表关系说明、数据库文档组织 |
| [reaviz/reaflow](https://github.com/reaviz/reaflow) | 备选流程图引擎 | ELK 集成和流程图编辑体验 |

## 当前判断

- 画布能力以 React Flow 为主，不直接采用完整 ERD 编辑器项目。
- 自动排版采用 ELK.js，而不是手写布局算法。
- Mermaid 作为导出格式和后续多图类型语法参考，不作为陈氏 ER 图渲染器。
- drawdb、chartdb、erd-editor 主要用于参考产品体验和数据模型，不直接复制架构。
- 陈氏 ER 图成熟开源实现较少，应作为本项目差异化能力重点设计。

