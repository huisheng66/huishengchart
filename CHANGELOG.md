# Changelog

## [Unreleased] — 2026-10-19

### Added
- 布局持久化：节点拖拽结束后把位置写回 `ErModel.layouts`，切换视图或确认推断关系后按已保存位置恢复
- `src/diagram/layout-store.ts`：布局合并、收集、完整性判断和图签名工具
- `src/diagram/chen-anchors.ts`：矩形、椭圆、菱形的边界交点计算，连线端点不再依赖固定句柄
- 陈氏图「自动整理」接入 ELK：实体和关系菱形分层布局，属性按连线挂回父节点后环绕放置，重叠时沿父节点径向外推
- `DiagramModel` 类型：图适配器只依赖 `tables` / `relations` / `inferredRelations`
- `src/diagram/layout-store.test.ts`（6 个用例）、`src/components/CanvasView.test.tsx`（3 个用例）、`src/diagram/chen-anchors.test.ts`（5 个用例）
- 解析器新增 3 个推断边界用例：目标表缺失、单列主键回退、复合主键跳过
- 适配器、Mermaid、关系报告的 rejected 关系过滤测试

### Changed
- 推断关系目标列优先取 `id`，没有时回退到单列主键；目标表不存在或只有复合主键时不再生成推断关系
- 「自动整理」对所有视图统一运行 ELK，并把整理结果写回 `layouts`，不再退化成「恢复初始布局」
- 陈氏图自动整理改为教材式「枢纽—辐条」布局：度数最高的实体在左，其余实体在右列按交叉数排序，关系菱形落在连线中点，属性朝图外扇形展开；超过 7 个实体时退回 ELK `stress`
- 语义分区布局按连线交叉数优化列内顺序，先排核心实体再排参与者，消除示例 SQL 中间的交叉
- 陈氏图连线改为「先定位置、再算端点」：实体和属性按中心连线与边界的交点连接，关系菱形仍连四角；实体/属性使用不可见锚点 handle 满足 React Flow 的边创建要求
- 学术类 schema 的关系名改为动词：教师—学生「教导」、教师—课程「教授」、学生—课程「选修」、学生—专业「属于」、教师—专业「任教」、课程—专业「开设」，不再回退到列注释名词
- App 的图构建 memo 只依赖图内容切片，布局回写不再触发 Chen 图重建
- Mermaid、关系报告和 DeepSeek 适配器统一通过 `activeRelations` 读取关系

### Fixed
- 被拒绝的推断关系仍然显示在两种 ER 图和导出结果中
- 推断关系指向不存在的表，产生悬空边和 (0,0) 处的孤立关系节点
- 切换标签页、接受推断关系后用户拖拽的节点位置丢失
- 陈氏图属性按节点 id 前缀分组，导致关联实体（关系菱形）的属性挂错父节点
- `applyChenElkLayout` 此前不可达，陈氏图「自动整理」实际只是重置位置
- 关系菱形中的四字名称被裁切：字号改为 13px、宽度限制 32px，按 2+2 换行
- 自动整理后属性与实体/关系菱形重叠：改为环形槽位搜索，并避开核心连线
- 自动整理后陈氏图呈环形散点、属性围一圈的问题：改为教材式枢纽布局，属性按实体朝外成扇形
- 陈氏图所有连线固定连在实体上下左右中点的问题
- 关系连线与菱形顶点之间留有空隙：React Flow 默认句柄约 5px，连线停在句柄外缘；菱形句柄改为 1px 内联样式后贴合顶点
- 自动整理后关系连错菱形顶点：连接点沿用了初始布局的句柄方向，导致「教导」连上下、「属于」连左右；改为按当前实体主轴实时选择顶点，水平连左右、垂直连上下，同一对实体使用同一个主轴

## [0.1.0] — 2026-06-26

### Added
- SQL 解析器支持 MySQL `#` 行注释风格
- 外键约束解析 ON DELETE / ON UPDATE 动作（CASCADE / SET NULL / NO ACTION / RESTRICT / SET DEFAULT）
- 关系报告中展示外键的 ON DELETE / ON UPDATE 信息
- 解析错误信息附带近似行号
- 画布工具栏「全部接受」/「全部拒绝」推断关系按钮
- 示例 SQL 增加 student.teacher_id 师生关系
- `src/domain/display-labels.test.ts` — 12 个单元测试
- `src/diagram/chen-ticketing.test.ts` — 4 个单元测试
- `src/diagram/geometry-utils.test.ts` — 15 个单元测试

### Changed
- 陈氏关系菱形从 `rotate(45deg)` 改为 `clip-path` 绘制，连线对齐四角
- 关系连线锁定对角方向（水平左↔右 / 垂直上↔下），源/目标实体各占一角
- 等距情况（|dx| = |dy|）优先垂直轴
- 水平/垂直轴对角方向修正——源在右侧连右角、源在上方连上角
- 边基数标签透明悬浮 + 沿连线垂直方向偏移 16px
- **基数标签从中文改为英文**：`一/多` → `1/N`，`多对一 (N:1)` → `N:1`

### Refactored
- 提取 `src/diagram/geometry-utils.ts`，消除三处重复几何代码（~140 行）
- `chen-types.ts` 的 `Point` / `Rect` 类型改为从 `geometry-utils` 重导出

### Removed
- 未使用的 `node-sql-parser` 依赖

### Fixed
- 修复 `chen-adapter.ts` 缺失 `ErEdge`、`AssociativeRelationship` 类型导入
- 修复 `chen-types.ts` `Point` / `Rect` 类型导入方式导致构建失败
