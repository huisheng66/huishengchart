# Changelog

## [Unreleased] — 2026-06-26

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
