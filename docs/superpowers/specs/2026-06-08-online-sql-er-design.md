# 在线图表工具 MVP 设计：MySQL SQL 到可编辑 ER 图

## 背景与目标

本项目第一版做一个面向大学数据库/软件工程课程的在线图表生成与编辑工具。MVP 聚焦一个高价值闭环：用户粘贴 MySQL 建表 SQL，系统生成可自由编辑的 ER 图、陈氏 ER 图、数据字典、Mermaid 源码和中文课程报告说明。

第一版不追求覆盖所有图类型。先把 SQL 到 ER 图这条路径做扎实，后续再扩展流程图、UML、树状图、算法图等图类型。

## MVP 范围

必须支持：

- MySQL `CREATE TABLE` SQL 输入。
- 表、字段、字段类型、主键、外键、唯一键、字段注释、表注释解析。
- 真实外键关系和 AI 推断关系分开展示。
- Crow's Foot ER 图视图。
- 陈氏 ER 图视图。
- 两种 ER 图都支持自由编辑。
- 节点与边绑定：拖动节点时连线必须自动跟随。
- 自动排版：生成后避免节点框重叠，尽量减少线重叠和线穿节点。
- 数据字典生成。
- Mermaid ER 源码导出。
- PNG/SVG 图片导出。
- AI 生成中文表关系说明、设计说明、课程报告文字。

明确不做：

- 第一版不做完整 draw.io 级别通用图形编辑器。
- 第一版不做多人协作。
- 第一版不做账号、云端项目管理和历史版本。
- 第一版不把 AI 推断关系直接当作真实外键。

## 用户流程

1. 用户打开工作台。
2. 在左侧粘贴 MySQL 建表 SQL。
3. 点击生成。
4. 系统解析 SQL，得到统一 ER 模型。
5. 系统自动布局并展示 Crow's Foot ER 图。
6. 用户可切换到陈氏 ER 图。
7. 用户可拖动节点、编辑字段/属性、调整关系、修改基数、连接或重连边。
8. 用户可点击自动整理，重新进行防重叠布局。
9. 用户可查看数据字典、Mermaid 源码和 AI 课程报告说明。
10. 用户导出图片、源码或文档内容。

## 主界面

主界面采用左右分栏：

- 左侧：MySQL SQL 输入区、解析按钮、解析状态、错误列表。
- 右侧：图表与产物标签页。

右侧标签页：

- Crow's Foot
- 陈氏 ER 图
- 数据字典
- Mermaid 源码
- 报告说明

画布工具栏：

- 放大/缩小
- 适应画布
- 自动整理
- 检查重叠
- 导出 PNG
- 导出 SVG

## 架构

架构分为五层：

1. SQL 输入层
2. MySQL 解析层
3. 统一 ER 模型层
4. 图渲染与编辑层
5. AI 说明与推断层

数据流：

```text
MySQL SQL
  -> SQL Parser
  -> Normalized ER Model
  -> Layout Engine
  -> React Flow Canvas
  -> Exporters / AI Report / Data Dictionary
```

AI 不参与核心 SQL 解析。核心图生成必须在 AI 不可用时仍可工作。

## 统一 ER 模型

统一 ER 模型是系统核心，不绑定任何具体渲染器。

核心结构：

```ts
type ErModel = {
  tables: TableModel[];
  relations: RelationModel[];
  inferredRelations: InferredRelationModel[];
  layouts: {
    crowFoot?: DiagramLayout;
    chen?: DiagramLayout;
  };
};

type TableModel = {
  id: string;
  name: string;
  displayName?: string;
  comment?: string;
  columns: ColumnModel[];
  primaryKey: string[];
  uniqueKeys: string[][];
};

type ColumnModel = {
  id: string;
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  comment?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
};

type RelationModel = {
  id: string;
  sourceTableId: string;
  sourceColumnIds: string[];
  targetTableId: string;
  targetColumnIds: string[];
  cardinality: "one-to-one" | "one-to-many" | "many-to-many";
  source: "foreign-key";
};

type InferredRelationModel = Omit<RelationModel, "source"> & {
  source: "ai-inferred" | "rule-inferred";
  confidence: number;
  reason: string;
  status: "pending" | "accepted" | "rejected";
};
```

## SQL 解析

第一版优先支持 MySQL 常见建表 SQL：

- 反引号表名和字段名。
- 行内主键。
- 表级主键。
- 表级外键。
- 单字段和复合字段外键。
- `UNIQUE KEY`。
- `COMMENT` 字段注释和表注释。
- `ENGINE`、`CHARSET`、`COLLATE` 等表选项可识别但不作为图模型核心。

解析失败时必须提供可操作错误：

- 错误位置。
- 错误原因。
- 建议修复方式。
- 尽可能保留已成功解析的表。

## AI 能力

AI 负责增强，不负责核心正确性。

AI 生成内容：

- 中文数据表说明。
- 表关系说明。
- 数据库设计理由。
- 课程报告段落。
- 缺失外键候选关系。

关系推断规则：

- 字段名如 `user_id`、`student_id`、`major_id` 可作为候选。
- 表名、字段注释和主键名称共同参与判断。
- 推断关系默认进入 `inferredRelations`，在画布中用虚线和待确认标识展示。
- 用户确认后，关系才进入正式图。

AI 失败时：

- 图生成、编辑、数据字典和 Mermaid 源码仍可使用。
- 报告说明区域展示可重试状态。

## Crow's Foot ER 图

Crow's Foot 视图面向数据库物理结构。

节点：

- 一个表对应一个表节点。
- 节点展示表名、字段名、类型、PK/FK/UK 标记。

边：

- 外键对应一条边。
- 真实外键使用实线。
- 推断关系使用虚线。
- 边连接到表节点 handle，不保存裸坐标。

导出：

- Mermaid ER 源码。
- PNG。
- SVG。

## 陈氏 ER 图

陈氏 ER 图面向课程教材和概念模型。

节点：

- 实体：矩形。
- 属性：椭圆。
- 关系：菱形。

边：

- 实体到关系。
- 实体到属性。
- 基数标注在实体到关系的连线上，如 `1`、`N`、`M`。

生成规则：

- SQL 表默认生成实体。
- 字段默认生成属性。
- 主键属性用下划线或醒目标识。
- 外键关系生成菱形关系节点。
- 外键字段是否同时展示为属性由视图设置控制，默认展示但标记为 FK。

陈氏图不能依赖 Mermaid 渲染。它由 React Flow 自定义节点和自定义边渲染。

## 自由编辑与绑定

生成后的图必须是可编辑结构，不是静态 SVG。

必须支持：

- 拖动节点。
- 新增节点。
- 删除节点。
- 重命名节点。
- 编辑字段或属性。
- 新增关系。
- 删除关系。
- 修改关系基数。
- 连接边。
- 重连边。
- 撤销/重做。

边绑定规则：

- 每条边必须保存 `sourceNodeId`、`sourceHandle`、`targetNodeId`、`targetHandle`。
- 节点移动时边必须跟随。
- 删除节点时关联边必须同步删除或提示处理。
- 重连边后必须更新底层关系模型。
- 不允许产生悬空边。

## 自动排版与重叠控制

自动排版是 MVP 必须能力。

布局策略：

- 使用 React Flow 承载交互画布。
- 使用 ELK.js 生成初始布局和重新整理布局。
- Crow's Foot 视图优先使用层级布局。
- 陈氏 ER 图优先将实体、关系、属性分层或环绕布局。

节点重叠规则：

- 初始生成后不得出现节点框重叠。
- 点击自动整理后不得出现节点框重叠。
- 用户手动拖动时允许临时靠近，但松手后必须执行碰撞检测。
- 如果出现碰撞，系统提示并提供自动整理。

边线规则：

- 优先使用正交或分段边。
- 边线不得穿过节点主体。
- 线和线尽量保持间距。
- 对复杂图，不能承诺完全无线交叉，但必须提供重新整理和重叠检查。

校验器需要检测：

- 节点重叠。
- 边穿过节点。
- 悬空边。
- 重复关系。
- 无效基数。
- 推断关系未确认。

## 导出

第一版支持：

- PNG 图片。
- SVG 图片。
- Mermaid ER 源码。
- Markdown 数据字典。
- Markdown 报告说明。

导出要求：

- 导出图片必须使用当前画布布局。
- 真实关系和推断关系在导出中保持视觉区分。
- 陈氏图导出必须保留实体、属性、关系、基数标注。

## 错误处理

SQL 错误：

- 展示错误位置和说明。
- 尽可能保留部分解析结果。
- 提供 AI 修复建议入口，但不自动覆盖用户输入。

AI 错误：

- 不阻断图生成。
- 报告说明和推断关系区域展示失败状态。
- 允许重试。

布局错误：

- 自动布局失败时保留当前节点位置。
- 展示错误提示。
- 允许切换简化布局。

导出错误：

- 展示失败原因。
- 保持用户编辑状态不丢失。

## 测试范围

单元测试：

- MySQL SQL 解析。
- ER 模型归一化。
- 外键关系生成。
- 推断关系状态流转。
- Mermaid 源码生成。
- 陈氏图节点/边生成。
- 节点碰撞检测。
- 边穿节点检测。

集成测试：

- 粘贴 SQL 后生成 Crow's Foot 图。
- 粘贴 SQL 后生成陈氏 ER 图。
- 拖动节点后边跟随。
- 重连边后模型更新。
- 自动整理后节点不重叠。
- 真实外键和推断关系分开显示。
- AI 失败时基础功能可用。

端到端测试：

- 完整 SQL 到导出 PNG。
- 完整 SQL 到导出 SVG。
- 完整 SQL 到 Mermaid 源码。
- 完整 SQL 到数据字典。
- 完整 SQL 到报告说明。

## 技术选择

前端：

- React
- TypeScript
- React Flow
- ELK.js
- Monaco Editor 或 CodeMirror

解析与模型：

- MySQL SQL Parser 组件。
- ER Normalizer。
- Diagram Model Adapter。

AI：

- 独立 `AiService` 接口。
- 支持无 AI 的降级模式。
- 支持 mock provider 便于开发和测试。

## 参考依据

- MySQL 官方外键约束文档：外键适合映射成父表/子表关系。
- Mermaid ER 文档：适合作为 Crow's Foot ER 源码导出格式。
- React Flow 文档：支持自定义节点、边、交互、布局集成和图片导出场景。
- React Flow 布局文档：React Flow 官方建议使用外部布局库，ELK 支持节点布局和边路由。
- 本项目参考仓库清单与 review：`docs/reference-repositories.md` 和 `docs/reference-review.md`。实施计划应优先参考 ChartDB 的 SQL 导入与图片导出、xyflow 的节点/边交互、erd-editor 的关系端点建模和自动摆放思路。

## 验收标准

MVP 完成时必须满足：

- 粘贴包含 3 张以上表和 2 条以上外键的 MySQL SQL，可以生成两种 ER 图。
- Crow's Foot 图和陈氏 ER 图都可以编辑。
- 拖动任意节点时相关边线实时跟随。
- 自动整理后节点框不重叠。
- 自动整理后边线不穿过节点。
- 真实外键和推断关系视觉区分清楚。
- AI 不可用时仍能解析 SQL、生成图、编辑图、导出图和源码。
- 能导出 PNG、SVG、Mermaid 源码、Markdown 数据字典。
