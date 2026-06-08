# 参考仓库 Review 结论

本次 review 基于 `.reference-repos/` 下的浅克隆源码。外部仓库仅用于设计和实现参考，不作为本项目源码依赖直接提交。

## 总体结论

实施计划应采用：

- `@xyflow/react` 作为可编辑画布基础。
- `elkjs` 作为自动布局和正交边路由基础。
- `node-sql-parser` 作为第一版 MySQL DDL 解析基础，但需要自建归一化层。
- `html-to-image` 作为 PNG/SVG 导出基础。
- 自建统一 ER 模型、Crow's Foot 适配器、陈氏 ER 适配器和 Mermaid 导出器。

不建议直接采用某个完整 ERD 编辑器作为基础。现有项目要么不支持陈氏 ER 图，要么交互模型与本项目课程场景不一致，直接移植成本高。

## 逐仓库结论

### xyflow/xyflow

本地路径：`.reference-repos/xyflow`

可采纳：

- 使用 React Flow 的 `nodes`/`edges` 作为画布状态。
- 使用 `source`、`target`、`sourceHandle`、`targetHandle` 实现节点和边绑定。
- 使用自定义节点实现表节点、陈氏实体节点、属性椭圆节点、关系菱形节点。
- 使用自定义边实现 Crow's Foot 标记、虚线推断关系、陈氏基数标注。
- 使用 `fitView`、`Controls`、选择状态、重连事件作为基础交互。

重点参考文件：

- `.reference-repos/xyflow/examples/react/src/examples/FloatingEdges/utils.ts`
- `.reference-repos/xyflow/examples/react/src/examples/FloatingEdges/FloatingEdge.tsx`
- `.reference-repos/xyflow/examples/react/src/examples/Layouting/index.tsx`

计划影响：

- 第一阶段就把边建成绑定关系，不做裸 SVG 线。
- Crow's Foot 可参考 Floating Edge 的节点边界交点计算。
- 自动布局结果写回 React Flow 节点位置后调用 `fitView`。

### drawdb-io/drawdb

本地路径：`.reference-repos/drawdb`

可采纳：

- 数据库图编辑器的产品结构：表、字段、索引、关系、导出、导入、撤销重做。
- `html-to-image` 导出 PNG/SVG 的基本方式。
- DBML 导入/导出作为后续扩展参考。
- Mermaid ER 导出思路。

重点参考文件：

- `.reference-repos/drawdb/src/utils/importSQL/mysql.js`
- `.reference-repos/drawdb/src/utils/exportSQL/mysql.js`
- `.reference-repos/drawdb/src/utils/exportAs/mermaid.js`
- `.reference-repos/drawdb/src/components/EditorHeader/ControlPanel.jsx`

不要直接照搬：

- MySQL 导入中，外键处理依赖目标表已存在。`endTable = tables.find(...)` 找不到时直接返回，表顺序变化时容易漏关系。
- Mermaid 导出没有输出 `PK/FK/UK` 标记，不满足我们的课程作业需求。
- 项目使用自建 canvas/DOM 编辑方式，不符合我们选定的 React Flow 路线。

计划影响：

- 借鉴字段、索引、关系编辑体验。
- 借鉴导出菜单设计和本地持久化思路。
- SQL 解析不要直接复用 drawdb 的导入实现。

### chartdb/chartdb

本地路径：`.reference-repos/chartdb`

可采纳：

- DDL 导入模块结构清晰，适合参考。
- MySQL 导入使用 pending foreign keys，解决外键引用表尚未解析的问题。
- SQL 导入测试覆盖了 MySQL、PostgreSQL、MariaDB、SQL Server、SQLite 的外键场景，可借鉴测试组织方式。
- React Flow 图片导出处理了 viewport、marker definitions、edge path 样式、背景和缩放，值得重点参考。

重点参考文件：

- `.reference-repos/chartdb/src/lib/data/sql-import/index.ts`
- `.reference-repos/chartdb/src/lib/data/sql-import/common.ts`
- `.reference-repos/chartdb/src/lib/data/sql-import/dialect-importers/mysql/mysql.ts`
- `.reference-repos/chartdb/src/lib/data/sql-import/__tests__/sql-import.test.ts`
- `.reference-repos/chartdb/src/context/export-image-context/export-image-provider.tsx`

计划影响：

- 第一版 SQL parser 模块采用“解析结果 -> 归一化模型”的两段式结构。
- MySQL DDL 导入必须支持 pending foreign keys 和 ALTER TABLE 外键。
- 导出图片时要先取消节点选中，复制 marker defs，内联 edge stroke 样式，处理 viewport transform。
- 测试用例从一开始覆盖表顺序、ALTER 外键、复合外键、注释、默认值、类型参数。

### dineug/erd-editor

本地路径：`.reference-repos/erd-editor`

可采纳：

- ERD schema 将关系端点保存为 tableId、columnIds、坐标和方向，说明“关系端点数据化”是必要的。
- 自动摆放使用 d3 force simulation 和 `forceCollide` 避免表重叠，可作为备用布局策略。
- Crow's Foot 关系符号分解成可组合 SVG 片段，适合参考我们自定义边的符号实现。

重点参考文件：

- `.reference-repos/erd-editor/packages/erd-editor-schema/src/v3/schema/relationship.entity.ts`
- `.reference-repos/erd-editor/packages/erd-editor/src/components/erd/automatic-table-placement/createAutomaticTablePlacement.ts`
- `.reference-repos/erd-editor/packages/erd-editor/src/components/erd/canvas/canvas-svg/relationship/Relationship.template.ts`

计划影响：

- 关系模型需要保存端点、字段集合和方向信息。
- 自动整理主路线用 ELK，必要时增加 d3 force collision 作为后处理，专门解决节点碰撞。
- Crow's Foot 标记不要依赖图片，使用 SVG path/line/circle 组合绘制。

### mermaid-js/mermaid

本地路径：`.reference-repos/mermaid`

可采纳：

- Mermaid ER 语法作为 Crow's Foot 文本导出目标。
- ER parser 支持 `PK/FK/UK` 字段标记。
- Mermaid 可作为后续流程图、时序图、类图导出生态。

重点参考文件：

- `.reference-repos/mermaid/packages/mermaid/src/diagrams/er/parser/erDiagram.jison`
- `.reference-repos/mermaid/packages/mermaid/src/diagrams/er/erTypes.ts`
- `.reference-repos/mermaid/packages/mermaid/src/diagrams/er/erDb.ts`

计划影响：

- Mermaid 导出器要输出字段类型、字段名和 `PK/FK/UK`。
- 推断关系导出时应使用虚线关系或注释区分，不混同真实外键。
- Mermaid 不用于陈氏 ER 图渲染。

### holistics/dbml

本地路径：`.reference-repos/dbml`

可采纳：

- DBML 适合作为后续数据库模型中间格式和导出格式。
- DBML 生态包含 parser、CLI、SQL 转 DBML、DBML 转 SQL，后续可考虑支持。
- Monaco DBML 补全和诊断可作为后续源码编辑体验参考。

计划影响：

- MVP 不引入 DBML 作为内部唯一模型，避免第一版复杂化。
- 可以在第二阶段增加 DBML 导入/导出。
- 数据字典和关系表达可以借鉴 DBML 的 `Table`、`Ref`、`Note` 结构。

### eralchemy/eralchemy

本地路径：`.reference-repos/eralchemy`

可采纳：

- 作为 schema 到 ER 图生成的后端思路参考。
- 可借鉴测试样例和关系提取思路。

不作为主线：

- Python/Graphviz 路线不适合当前在线可编辑画布。
- 输出图更偏静态生成，不满足自由编辑、节点边绑定和陈氏图需求。

## 实施计划中的明确决策

### 1. SQL 导入

采用 `node-sql-parser` 解析 MySQL DDL，参考 ChartDB 的两段式导入：

1. 第一遍解析所有表和字段，建立 table map。
2. 第二遍解析外键、索引、ALTER TABLE 和 pending foreign keys。
3. 归一化到本项目 `ErModel`。

不要采用 drawdb 的单遍外键解析，因为它会受表顺序影响。

### 2. 画布模型

采用 React Flow：

- Crow's Foot 表节点：一个表一个节点。
- 陈氏实体节点：一个表一个实体矩形。
- 陈氏属性节点：字段生成属性椭圆。
- 陈氏关系节点：外键或推断关系生成菱形。
- 所有边使用 `source/target/sourceHandle/targetHandle` 绑定。

### 3. 自动布局

采用 ELK.js 为主：

- 生成初始布局。
- 自动整理。
- 正交边路由。
- 节点间距和边间距控制。

补充碰撞检测：

- 自建节点矩形碰撞检测。
- 自建边穿节点检测。
- 必要时借鉴 erd-editor 的 d3 `forceCollide` 做后处理。

### 4. 图片导出

采用 `html-to-image`，参考 ChartDB：

- 导出前清除节点选中状态。
- 导出 `.react-flow__viewport`。
- 复制 SVG marker definitions。
- 内联边线 stroke 样式。
- 处理 viewport transform、背景、透明背景和 pixel ratio。

### 5. Mermaid 导出

自建 Mermaid ER 导出器：

- 输出 `erDiagram`。
- 输出真实关系和推断关系。
- 输出字段类型、字段名、`PK/FK/UK`。
- 不依赖 drawdb 的简化版 Mermaid 导出。

### 6. 陈氏 ER 图

自建 Chen renderer：

- 实体：矩形节点。
- 属性：椭圆节点。
- 关系：菱形节点。
- 基数：边标签。
- 主键：属性节点下划线或 key 标记。

现有参考仓库没有成熟可直接采用的陈氏 ER 图实现，这是本项目的差异化点。

