# 多图类型能力调研：流程图、状态转换图、结构层次图、盒图、PAD、Jackson 图

> 调研时间：2026-10-19
> 调研范围：GitHub 仓库、npm 包、标准与教材资料、商业/在线工具
> 代码基线：当前 `src/` 约 5.2k 行，React 18 + TypeScript + Vite + React Flow 12 + ELK.js
> 项目许可证：AGPL-3.0

## 0. 结论摘要

这 6 张图不是 6 个独立功能，而是 **3 个技术族**。按族建设，代码量和维护成本会低一个数量级。

| 族 | 图类型 | 共同本质 | 推荐渲染 | 推荐布局 |
| --- | --- | --- | --- | --- |
| 图族 | 流程图、状态转换图 | 有向图：节点 + 带标签的边 | React Flow（复用现有画布） | ELK layered / stress |
| 树族 | 结构层次图 | 有序树 + 带语义的调用边 | React Flow（复用现有画布） | ELK mrtree |
| 结构化族 | 盒图（N-S 图）、PAD 图、Jackson 图 | 同一份「结构化程序 AST」的三种投影 | 自研 SVG | 各自确定性布局算法 |

四个关键判断：

1. **不要为 6 张图建 6 套编辑器。** 建 1 个文档壳 + 3 套渲染内核，每张图只写「模型 → 视图」的适配层。
2. **盒图 / PAD / Jackson 不要建在 React Flow 上。** 它们是嵌套矩形、主干树、括号树，不是自由拖拽的节点图。用 React Flow 会不断和框架的绝对定位、父子尺寸、连线模型对抗；自研 SVG 反而更短、更稳、导出更清晰。
3. **开源可复用度极不均衡。** 流程图、状态图有大量成熟参考；盒图有 4–5 个可借鉴实现（含 MIT）；**PAD 和 Jackson 几乎空白**，必须自研。这既是风险，也是本项目最实在的差异化。
4. **输入方式应延续项目「文本 → 图」的基因。** 盒图/PAD/Jackson 用伪代码，结构图用缩进大纲，状态图用状态转移表。比让学生从空白画布拖图形更符合课程作业场景，也让自动布局有确定输入。

推荐落地顺序：

```
P0 文档壳与布局抽象
 → P1 流程图 → P2 状态图 → P3 结构层次图
 → P4 伪代码 DSL + 盒图 → P5 PAD → P6 Jackson
 → P7 一源多图联动与导出
```

---

## 1. 调研方法与口径

- GitHub 数据通过本地 `gh` CLI 检索，star 数与更新时间均为 **2026-10-19 快照**，会持续变化。
- 检索关键词覆盖中英文：`nassi-shneiderman`、`structogram`、`PAD diagram`、`problem analysis diagram`、`jackson structured programming`、`structure chart`、`flowchart editor react`、`state machine diagram editor`、`pseudocode to flowchart`。
- 许可证判断以「能否被 AGPL-3.0 项目使用」为准：MIT / Apache-2.0 / ISC / BSD / EPL-2.0 均可；GPL-3.0 与 AGPL-3.0 可组合，但会带来 Copyleft 义务。
- 本次结论以**借鉴设计与交互**为主，不直接复制第三方代码。

---

## 2. 六类图的规范与建模要点

### 2.1 总览

| 图类型 | 起源 / 标准 | 核心元素 | 结构约束 | 课程场景 |
| --- | --- | --- | --- | --- |
| 流程图 | GB/T 1526-1989（等同采用 ISO 5807:1985） | 起止、处理、判断、输入输出、预定义处理、连接符、流线 | 有向图，可有环 | 详细设计、算法说明 |
| 状态转换图 | UML 2.5.1 状态机 | 状态、初态、终态、转移（事件 `[守卫]` / 动作） | 有向图，允许自环与复合状态 | 系统分析、嵌入式/协议设计 |
| 结构层次图 | 结构化设计（Yourdon / Constantine） | 模块、调用、条件/循环调用、数据耦合、控制耦合 | 有序树，兄弟顺序有语义 | 概要设计、模块划分 |
| 盒图（N-S 图） | Nassi & Shneiderman，1972 提出 / 1973 发表；DIN 66261 | 顺序、选择、多分支、当型循环、直到型循环、调用 | 严格嵌套，无箭头、无 goto | 详细设计、结构化编程 |
| PAD 图 | 日立，1973 | 顺序、选择、多分支、WHILE、UNTIL、def、调用 | 二维树，深度决定列，顺序决定行 | 详细设计、算法表达 |
| Jackson 图 | M. A. Jackson，1975（JSP） | 顺序（seq）、选择（select）、迭代（iter）、可选（opt） | 有序树，三种结构组合 | 面向数据结构的设计 |

### 2.2 流程图

**规范要点**

- 起止：圆角矩形；处理：矩形；判断：菱形；输入输出：平行四边形；预定义处理/子程序：双边竖线矩形；文档：波浪底边；连接符：圆；流线：带箭头实线。
- 结构化流程图只使用三种控制结构：顺序、选择、循环（当型 / 直到型）。
- 课程作业里经常出现非结构化跳转，因此**不能只做结构化生成，必须允许自由连线**。

**建模影响**

```ts
type FlowNodeKind =
  | 'start' | 'end' | 'process' | 'decision'
  | 'io' | 'subroutine' | 'document' | 'connector';

type FlowNode = { id: string; kind: FlowNodeKind; text: string };
type FlowEdge = { id: string; source: string; target: string; label?: string };
```

- 判断节点的出边通常带 `是/否` 或 `Y/N` 标签，边标签是必需品，不是装饰。
- 连接符用于跨页/跨区跳转，第一版可以只渲染、不做跨图校验。

### 2.3 状态转换图

**规范要点**

- 状态：圆角矩形；初始伪状态：实心圆；终止状态：同心圆（牛眼）。
- 转移：带箭头实线，标签格式 `事件 [守卫] / 动作`。
- 课程级只需要：简单状态 + 初态 + 终态 + 转移；复合状态、正交区域、entry/exit 动作可作为进阶。
- 自转移（self-transition）必须支持，很多作业里都有「重试」这类自环。

**建模影响**

```ts
type StateNode = {
  id: string;
  name: string;
  kind: 'simple' | 'initial' | 'final';
  entry?: string;
  exit?: string;
};

type Transition = {
  id: string;
  source: string;
  target: string;
  event?: string;
  guard?: string;
  action?: string;
};
```

- 状态图天然有环，**ELK layered 不是默认最优解**。ELK 的 `stress` 算法对带环小图更友好，建议默认 stress、可选 layered。
- 自环需要自定义边（React Flow 默认边不画自环）。

### 2.4 结构层次图

**规范要点**

- 模块：矩形，写模块名。
- 调用：从调用模块指向被调用模块的箭头；部分教材在调用线尾部加实心圆点。
- 条件调用：调用线尾部菱形；循环调用：调用线尾部弧形箭头。
- 数据耦合：带空心圆的小箭头，沿调用线标注参数/数据；控制耦合：带实心圆的小箭头，标注标志/控制信息。
- 它是**有序树**：同一父模块下，子模块从左到右的顺序就是执行/阅读顺序。这一点和普通图布局不同，**兄弟排序是编辑能力，不是布局细节**。
- 「层次图」可以理解为关闭耦合信息显示的简化模式，两者共用一套模型。

**建模影响**

```ts
type ModuleNode = {
  id: string;
  name: string;
  children: ModuleNode[];        // 有序
  callType: 'sequence' | 'conditional' | 'loop';
  couples?: Array<{ kind: 'data' | 'control'; label: string }>;
};
```

### 2.5 盒图（N-S 图 / structogram）

**规范要点**

- 顺序：矩形自上而下堆叠。
- 选择：顶部条件横条，下方竖线分成左右两栏（IF-THEN 只有单栏）。
- 多分支：条件横条 + N 栏。
- 当型循环（WHILE）：条件条 + 右侧缩进的循环体 + 侧边回边。
- 直到型循环（UNTIL）：循环体 + 底部条件条。
- 调用：矩形内写调用名，可加 `CALL` 前缀。
- 没有箭头、没有连接线、没有 goto；嵌套关系就是作用域。

**布局本质**

自底向上计算尺寸，是纯函数，非常适合单元测试：

```
w(statement) = max(MIN_W, textWidth + 2P)
h(statement) = max(ROW_H, textHeight + 2P)

w(sequence) = max(w(child))
h(sequence) = Σ h(child)

w(if)   = max(MIN_W, condWidth + 2P, w(then) + w(else) + DIVIDER)
h(if)   = HEADER_H + max(h(then), h(else))

w(loop) = max(condWidth + 2P, w(body) + INDENT)
h(loop) = HEADER_H + h(body)
```

### 2.6 PAD 图

**规范要点**

- 最左边一条竖线是程序主线，即第一层控制结构。
- 每增加一层嵌套，就向右增加一条竖线；**竖线条数 = 嵌套深度**。
- 执行顺序：从左上端开始，自上而下、从左到右；遇到判断/循环就进入右侧下一层。
- 选择：条件框右侧分上下两路；多分支：右侧多路；循环：条件框 + 右侧循环体 + 回边。
- `def` 框表示子程序定义。

**布局本质**

- x 坐标由**深度**决定：`x = depth * COL_W`。
- y 坐标由**兄弟顺序**决定：按先序/中序遍历累加高度。
- 这是一个「深度 → 列、顺序 → 行」的二维树，不需要通用图布局引擎。

### 2.7 Jackson 图

**规范要点**

- 三种结构：顺序（seq）、选择（select）、迭代（iter），另有可选（opt）和基本操作。
- 迭代：被重复的子框右上角标 `*`。
- 选择：每个候选子框右上角标 `°`（也有教材把圆圈画在父框右上角，需在设置里留一个符号风格开关）。
- 父框在上、子框在下，用横线连接；兄弟从左到右排列。
- JSP 方法里有两类图：数据结构图（DSD）和程序结构图（PSD），符号相同。产品上可以统一叫「Jackson 结构图」，用「数据结构 / 程序结构」切换语义说明。

**布局本质**

经典 tidy tree：子树宽度求和、父节点居中、层高固定，不需要 ELK。

---

## 3. 开源生态与工具盘点

### 3.1 GitHub 重点仓库

| 仓库 | 图类型 | ★ | 语言 | 许可 | 最近更新 | 可借鉴点 | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [mermaid-js/mermaid](https://github.com/mermaid-js/mermaid) | 流程图、状态图 | 90.7k | TS | MIT | 2026-10-18 | 语法、导出生态 | 只作导出格式 |
| [xyflow/xyflow](https://github.com/xyflow/xyflow) | 通用画布 | 38.7k | TS | MIT | 2026-10-16 | 节点/边绑定、子流程、自定义节点 | 继续作为图族底座 |
| [jgraph/drawio](https://github.com/jgraph/drawio) | 通用绘图 | 8.9k | JS | Apache-2.0 | 2026-10-18 | 图形库、连接点、对齐吸附 | 只参考交互 |
| [Bogdan-Lyashenko/js-code-to-svg-flowchart](https://github.com/Bogdan-Lyashenko/js-code-to-svg-flowchart) | 代码→流程图 | 7.1k | JS | MIT | 2023-10-02 | AST → FlowTree → SVG 三段式 | 结构化族的最佳架构参照 |
| [tone-row/flowchart-fun](https://github.com/tone-row/flowchart-fun) | 文本→流程图 | 3.4k | TS | MIT | 2026-10-16 | 文本语法、dagre 布局 | 流程图输入设计参考 |
| [reaviz/reaflow](https://github.com/reaviz/reaflow) | 流程图 | 2.5k | TS | Apache-2.0 | 2025-06-04 | ELK 集成、节点交互 | 备选，不替换 React Flow |
| [statelyai/xstate](https://github.com/statelyai/xstate) | 状态机 | 30.3k | TS | MIT | 2026-10-18 | 状态机语义、SCXML 生态 | 模型参考 |
| [statelyai/xstate-viz](https://github.com/statelyai/xstate-viz) | 状态图 | 453 | TS | — | 2023-11-03 | 状态图可视化 | 只读可视化参考 |
| [fesch/Structorizer.Desktop](https://github.com/fesch/Structorizer.Desktop) | 盒图 | 77 | Java | GPL-3.0 | 2026-10-04 | NS 图 + 代码互转 + 单步调试 | 交互与功能参照，不复制代码 |
| [openpatch/struktolab](https://github.com/openpatch/struktolab) | 盒图 | 22 | JS | MIT | 2026-10-03 | 伪代码 ⇄ 图双向同步、代码生成 | 最值得研究的盒图实现 |
| [nigjo/structogramview](https://github.com/nigjo/structogramview) | 盒图 | 23 | JS | Apache-2.0 | 2025-08-15 | `StructCode` 行式 DSL、树视图 | DSL 设计参考 |
| [kekru/struktogrammeditor](https://github.com/kekru/struktogrammeditor) | 盒图 | 27 | Java | MIT | 2022-11-13 | 桌面端编辑器结构 | 交互参考 |
| [juliangoetze/strukto-io](https://github.com/juliangoetze/strukto-io) | 盒图 | 11 | Vue | MIT | 2025-04-22 | 拖拽编辑、导出 | 交互参考 |
| [charyan/nsdmaker](https://github.com/charyan/nsdmaker) | 盒图 | 7 | JS | AGPL-3.0 | 2023-03-15 | Web 端 NS 编辑器 | 交互参考 |
| [okuisatoshi/pad-diagram-drawing](https://github.com/okuisatoshi/pad-diagram-drawing) | PAD | 1 | HTML | — | 2025-10-10 | 唯一的公开 PAD 绘图实验 | 说明生态空白 |
| [brudgers/racket-jackson-diagrams](https://github.com/brudgers/racket-jackson-diagrams) | Jackson | 0 | Racket | GPL-3.0 | 2017-03-28 | JSP 图数据结构 | 仅作符号参考 |
| [suesslt/Affine](https://github.com/suesslt/Affine) | Jackson | 0 | Swift | — | 2026-03-10 | JSP 树显示 | 仅作符号参考 |
| [debater-coder/structure_chart_editor](https://github.com/debater-coder/structure_chart_editor) | 结构图 | 0 | Rust | — | 2025-11-14 | 教学用结构图工具 | 说明生态空白 |
| [cdfmlr/pyflowchart](https://github.com/cdfmlr/pyflowchart) | 代码→流程图 | 417 | Python | MIT | 2026-03-12 | Python AST → 流程图 | 生成逻辑参考 |

### 3.2 逐类结论

**流程图：成熟，但缺「课程级中文编辑器」**

- Mermaid、draw.io、flowchart-fun、js2flowchart 覆盖了语法、布局、代码生成三条路。
- 但没有一个能同时做到：中文符号规范、可编辑画布、自动排版、课程报告导出。
- 结论：**复用 React Flow + ELK，自建节点形状与中文模板**；Mermaid 只做导出。

**状态转换图：模型成熟，编辑器要自建**

- XState 证明了状态机模型和 SCXML 生态，xstate-viz 是只读可视化。
- 开源可编辑的状态图编辑器普遍是实验项目（star 多为个位数）。
- 结论：**自建轻量状态图编辑器**，模型对齐 UML 子集，后期可加 SCXML 导出。

**结构层次图：几乎没有成熟开源实现**

- GitHub 上叫 `structure chart` 的仓库基本是 0★ 的教学作业或空壳。
- 商业工具（Visio、亿图、Visual Paradigm）有模板，但不可编程生成。
- 结论：**必须自研**。好消息是模型简单（有序树 + 边语义），布局可用 ELK mrtree。

**盒图：有可借鉴实现，但没有可直接集成的**

- Structorizer（GPL-3.0，77★）功能最完整：NS 图编辑、代码导入导出、单步执行、运行时分析。
- StruktoLab（MIT，22★）最现代：Web Components、伪代码与图双向同步、生成 Python/Java/JS。
- structogramview（Apache-2.0，23★）的 `StructCode` 行式 DSL 很适合做中文伪代码的语法参照。
- 但它们的模型、UI、技术栈都与本项目不一致，直接集成会撕裂产品体验。
- 结论：**借鉴模型和交互，自研渲染器**。

**PAD 图：生态空白**

- GitHub 公开检索只找到 1★ 的绘图实验；没有成熟的 Web 编辑器或生成库。
- 日本有 `pad2ps` 一类桌面/命令行工具，但无现代 Web 实现。
- 结论：**完全自研**。布局规则明确（深度→列、顺序→行），实现风险可控，但**没有现成视觉基线，必须用教材图逐张对照验收**。

**Jackson 图：生态接近空白**

- GitHub 只有 Racket 库和 Swift 实验项目；成熟实现是商业工具 Jackson Workbench。
- 结论：**完全自研**。三种结构 + 两个角标（`*`、`°`）符号简单，难点在「数据结构 → 程序结构」的教学表达，而不是绘图。

### 3.3 npm 包评估

| 包 | 版本 | 许可 | 月下载 | 能力 | 结论 |
| --- | --- | --- | --- | --- | --- |
| `struktolab` | 0.6.1 | MIT | 274 | Web Components 形式的盒图编辑器/渲染器，伪代码双向同步 | 借鉴，不集成（模型/UI 不统一，300KB） |
| `@eurydos/structogram-component` | 1.0.4 | GPL-3.0 | 37 | React + MUI5 盒图组件 | 不采用（会引入 MUI/Emotion，且组件能力有限） |
| `structogram` | 1.2.0 | ISC | 38 | 纯数据对象，无渲染 | 可参考数据结构 |
| `d3-hierarchy` | — | ISC | 很大 | 树布局 | 可用，但默认等宽节点，需 `d3-flextree` 补足 |
| `elkjs` | 0.11.1 | EPL-2.0 | 很大 | layered / mrtree / stress | 已在使用，继续 |

结论：**没有一个包能覆盖 6 类图，也没有一个包值得作为核心依赖引入。** 自研适配层 + 现有 React Flow/ELK 是成本最低的路线。

### 3.4 商业与在线工具

| 工具 | 覆盖 | 形态 | 对本项目的意义 |
| --- | --- | --- | --- |
| Microsoft Visio | 流程图、NS 图（内置模具） | 桌面/商业 | 证明 NS 图有稳定需求 |
| 亿图图示（EdrawMax） | 流程图、NS 图模板（PAD 可用通用图形拼绘） | 桌面/在线/商业 | 国内课程用户的实际替代品 |
| draw.io | 流程图原生；NS/PAD 需手绘或社区模板 | 在线/开源 | 交互与图形库参考，不做底座 |
| Jackson Workbench | JSP / JSD | 桌面/商业 CASE | Jackson 图的事实标准工具 |
| Structorizer | NS 图 + 代码 | 桌面/免费 | 功能完整度参照 |
| ProcessOn | 通用流程图 | 在线/商业 | 中文用户体验参照 |

**共同缺口**：没有产品把「中文课程图 + 文本生成 + 自动布局 + 可编辑 + 多图联动」做成一条闭环。这正是本项目的空间。

---

## 4. 技术路线对比

| 方案 | 流程图 | 状态图 | 结构图 | 盒图 | PAD | Jackson | 可编辑 | 主要问题 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| React Flow + ELK | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | 好 | 嵌套盒图/主干树与节点模型不匹配 |
| 自研 SVG | 中 | 中 | 好 | 好 | 好 | 好 | 需自建选择/缩放 | 交互基础设施要自己写 |
| Mermaid 渲染 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 差 | 只读、样式受限 |
| 集成 struktolab | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | 好 | 只管盒图，技术栈割裂 |
| 嵌入 draw.io | ✅ | ✅ | 中 | 手绘 | 手绘 | 手绘 | 好 | 数据不在自己模型，无法自动生成 |
| GoJS / JointJS | ✅ | ✅ | ✅ | 中 | 中 | 中 | 好 | 商业授权/体积/学习成本 |

**决策**

1. 图族（流程图、状态图）与树族（结构图）继续用 **React Flow**，复用现有的拖拽、绑定、保存布局、图片导出。
2. 结构化族（盒图、PAD、Jackson）用 **自研 SVG**，共享同一份 AST 和文本测量工具。
3. **Mermaid 只做导出**，不做渲染底座。
4. **不引入 draw.io / GoJS / JointJS**，避免数据模型和许可风险。

---

## 5. 推荐架构

### 5.1 总体数据流

```
伪代码 ─────────┐
缩进大纲 ───────┼─→ 解析器 ─→ 领域模型 ─→ 适配器 ─→ 渲染器
状态转移表 ─────┤                │
自由连线 ───────┘                ├─ 结构化 AST ─┬─ 盒图 SVG
                                 │             ├─ PAD SVG
                                 │             ├─ Jackson SVG
                                 │             └─ 流程图适配器 → React Flow
                                 ├─ 状态机模型 ─→ React Flow
                                 └─ 模块树 ─────→ React Flow
```

### 5.2 文档模型：不要把 6 张图塞进 `ErModel`

当前 `src/domain/er-model.ts` 的 `DiagramView` 只有 `'crowFoot' | 'chen'`，`layouts` 也是按这两个键写死的。**不要把它扩成 8 个键**，否则 ER 模型会被无关字段污染。

新增一层文档模型：

```ts
// src/domain/diagram-document.ts
export type DiagramKind =
  | 'er' | 'flowchart' | 'state' | 'structure'
  | 'ns' | 'pad' | 'jackson';

export type DiagramDocument =
  | { kind: 'er'; source: string; model: ErModel }
  | { kind: 'flowchart'; source: string; model: FlowModel }
  | { kind: 'state'; source: string; model: StateMachineModel }
  | { kind: 'structure'; source: string; model: StructureModel }
  | { kind: 'structured'; source: string; model: StructuredProgram; view: 'ns' | 'pad' | 'jackson' };
```

关键点：**盒图、PAD、Jackson 是同一个文档的三个视图**，不是三个文档。切换视图不丢内容，这正是「一源多图」的基础。

### 5.3 图族：流程图、状态图、结构图

**流程图**

- 节点形状：起止、处理、判断、输入输出、子程序、文档、连接符。
- 边标签：`是/否`、`Y/N`，可编辑。
- 布局：`elk.algorithm = layered`，`direction = DOWN`（课程习惯自上而下），`edgeRouting = ORTHOGONAL`。
- 判断节点尺寸要比处理节点大（菱形需要容纳文字），适配器里按文字长度算宽高。

**状态图**

- 节点：简单状态、初始伪状态、终止状态。
- 边：`事件 [守卫] / 动作`，支持自环。
- 布局：默认 `elk.algorithm = stress`（带环图更自然），提供「分层排列」切换。
- 自环用自定义边，不能依赖 React Flow 默认边。

**结构图**

- 节点：模块矩形。
- 边：调用箭头，尾部可带实心圆；条件调用加菱形，循环调用加弧形。
- 耦合：沿调用线画带空心/实心圆的小箭头，标注数据名或控制名。
- 布局：`elk.algorithm = mrtree`，`direction = DOWN`；兄弟顺序由模型数组顺序决定，提供「左移/右移」按钮。
- 显示模式：`结构图`（含耦合）/ `层次图`（只显示模块与调用），共用模型。

### 5.4 结构化族：一份 AST，三种投影

**AST**

```ts
export type StructuredNode =
  | { id: string; kind: 'statement'; text: string }
  | { id: string; kind: 'call'; target: string; args?: string }
  | { id: string; kind: 'sequence'; children: StructuredNode[] }
  | { id: string; kind: 'if'; condition: string; then: StructuredNode[]; else?: StructuredNode[] }
  | { id: string; kind: 'case'; expression: string; branches: Array<{ label: string; body: StructuredNode[] }>; default?: StructuredNode[] }
  | { id: string; kind: 'while'; condition: string; body: StructuredNode[] }
  | { id: string; kind: 'until'; condition: string; body: StructuredNode[] }
  | { id: string; kind: 'for'; header: string; body: StructuredNode[] };
```

**三个渲染器共享**

- `measureText(text, font)`：Canvas `measureText` + 缓存；jsdom 测试环境回退到字符宽度估算（CJK ≈ 1em，ASCII ≈ 0.55em）。
- 主题常量：`PAD`、`ROW_H`、`HEADER_H`、`COL_W`、`GAP`、线宽、字号。
- 选中与命中测试：每个节点画一个透明 `rect` 作为命中区，点击后高亮并弹出节点工具条。
- 平移缩放：轻量 `transform` 容器即可（滚轮缩放 + 拖拽平移），不必引入重型库。

**盒图渲染**

- 递归函数 `layoutNs(node): { w, h }` 先算尺寸，再 `drawNs(node, x, y)` 画矩形、分隔线、文字。
- 分支用竖线分隔；循环用右侧缩进 + 回边线。
- 编辑：点击节点 → 在上方/下方插入、改为 IF/WHILE、删除、编辑文本；不做自由拖拽。

**PAD 渲染**

- 递归函数 `layoutPad(node, depth, cursor)`：`x = depth * COL_W`，`y = cursor`，返回新的 `cursor`。
- 每条分支有自己的竖线；父节点右侧引出横线到子列。
- 执行顺序箭头可选显示（教材里常省略）。

**Jackson 渲染**

- `layoutJackson(node)`：叶子宽度求和 → 父节点居中 → 层高累加。
- 兄弟用横线连接，父节点用短竖线接到横线中点。
- 迭代节点右上角 `*`，选择分支右上角 `°`；提供符号风格开关。

### 5.5 输入设计

**伪代码（盒图 / PAD / Jackson / 结构化流程图共用）**

```text
模块 成绩等级
  输入 score
  如果 score >= 90 则
    输出 "A"
  否则如果 score >= 60 则
    输出 "B"
  否则
    输出 "C"
  结束如果
结束模块

模块 求平均分
  sum = 0
  count = 0
  当 count < 10 时
    输入 x
    sum = sum + x
    count = count + 1
  结束当
  输出 sum / count
结束模块
```

语法原则：

- 行式、缩进无关（用块结束符），对初学者宽容。
- 同时接受中文关键字（`如果/否则/结束如果/当/结束当/直到/选择/情况/默认`）和英文关键字（`IF/ELSE/ENDIF/WHILE/ENDWHILE/UNTIL/CASE/ENDCASE`）。
- 解析错误带行号，复用现有 SQL 解析的错误提示模式。
- 先做「文本 → 图」单向；「图 → 文本」作为导出能力，不做实时双向同步（struktolab 的双向同步复杂度很高）。

**缩进大纲（结构图）**

```text
工资管理系统
  员工管理
    添加员工
    删除员工
  工资计算
    基本工资
    绩效工资
  报表输出
```

缩进即层级；同一父节点下的顺序就是兄弟顺序。

**状态转移表（状态图）**

| 当前状态 | 事件 | 守卫 | 动作 | 下一状态 |
| --- | --- | --- | --- | --- |
| 空闲 | 投币 | 金额足够 | 点亮可选灯 | 选择 |
| 选择 | 选择商品 | — | 出货 | 出货 |
| 出货 | 完成 | — | 找零 | 空闲 |

表格 → 图，比让学生拖节点快得多；图上的修改也能回写表格（第一版可以只做表格 → 图）。

### 5.6 交互原则

| 图类型 | 主输入 | 画布编辑 | 不做的事 |
| --- | --- | --- | --- |
| 流程图 | 伪代码 / 自由连线 | 拖拽、连线、双击改字、边上插节点 | 完整 draw.io 级图形编辑 |
| 状态图 | 转移表 / 文本 | 拖拽、连线、编辑事件/守卫/动作 | 复合状态、正交区域（第一版） |
| 结构图 | 缩进大纲 | 改名、增删子模块、兄弟排序、切换调用类型 | 自由摆放 |
| 盒图 | 伪代码 | 选中节点、插入/删除/改类型 | 拖拽嵌套盒子 |
| PAD | 伪代码 | 选中节点、插入/删除/改类型 | 拖拽 |
| Jackson | 伪代码 / 数据结构大纲 | 选中节点、插入/删除/改类型 | 拖拽 |

统一的交互语言：**左侧源码、右侧图、选中节点后出现上下文工具条**。这比给每张图发明一套拖拽手势更一致，也更适合课程用户。

### 5.7 导出

| 图类型 | Mermaid | PNG/SVG | 其他 |
| --- | --- | --- | --- |
| 流程图 | `flowchart TD` | ✅ | JSON |
| 状态图 | `stateDiagram-v2` | ✅ | SCXML（后期） |
| 结构图 | 降级为 `flowchart TD` | ✅ | Markdown 大纲 |
| 盒图 | ❌ | ✅ | 伪代码、JSON |
| PAD | ❌ | ✅ | 伪代码、JSON |
| Jackson | ❌ | ✅ | 伪代码、JSON、TikZ（后期） |

- 自研 SVG 的导出最简单：`XMLSerializer` 序列化 + 内联样式，直接下载 SVG；PNG 用 `canvas.drawImage` 把 SVG Blob 画出来。
- React Flow 图继续用现有 `html-to-image` 方案。
- 不承诺 Mermaid 覆盖所有图类型，避免为了导出而扭曲模型。

### 5.8 现有代码改造清单

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| `src/domain/er-model.ts` | 保持 | 只服务 ER，不扩展 6 个视图键 |
| `src/domain/diagram-document.ts` | 新增 | 文档联合类型与视图注册 |
| `src/components/CanvasView.tsx` | 泛型化 | 改为 `GraphCanvasView`，接受 `nodeTypes`、`edgeTypes`、`layoutSpec`，不再写死 `ErNode` |
| `src/diagram/layout.ts` | 重构 | 用 `LayoutSpec` 替代「是否有 chenAttribute」的分支；保留陈氏特例 |
| `src/diagram/react-flow-types.ts` | 扩展 | 增加流程图/状态图/结构图节点数据类型，或拆成多个类型文件 |
| `src/App.tsx` | 拆分 | 拆成 `ErWorkspace` 与 `DiagramWorkspace`，顶部加图类型切换 |
| `src/styles.css` | 扩展 | 增加图类型主题变量、SVG 画布样式 |
| `src/diagram/structured/*` | 新增 | AST 布局、盒图/PAD/Jackson 渲染 |
| `src/parsers/*` | 新增 | 伪代码、大纲、状态表解析 |
| `src/export/*` | 扩展 | Mermaid 流程图/状态图、SVG 序列化 |

`layoutSpec` 草案：

```ts
export type LayoutSpec = {
  engine: 'elk';
  algorithm: 'layered' | 'mrtree' | 'stress';
  direction?: 'RIGHT' | 'DOWN';
  nodeSpacing?: number;
  layerSpacing?: number;
  edgeRouting?: 'ORTHOGONAL' | 'SPLINES';
};
```

这样流程图、状态图、结构图只需要在适配器里给出不同的 spec，`layout.ts` 不再堆 if-else。

---

## 6. 分阶段实施计划

| 阶段 | 内容 | 主要交付 | 规模 | 验收标准 |
| --- | --- | --- | --- | --- |
| P0 | 文档壳与布局抽象 | `diagram-document.ts`、`GraphCanvasView`、`LayoutSpec`、图类型切换 | M | 现有 ER 功能不回归；测试/lint/build 通过 |
| P1 | 流程图 | 节点形状、边标签、ELK 布局、自由连线、Mermaid 导出 | L | 能画含判断/循环的流程图；自动整理不重叠；导出 SVG/PNG/Mermaid |
| P2 | 状态图 | 状态/初态/终态、转移编辑、自环、stress 布局、转移表导入 | L | 能画含 5 个状态和自环的状态图；转移表能生成图 |
| P3 | 结构层次图 | 模块树、调用/条件/循环标记、数据/控制耦合、兄弟排序 | L | 能画三层结构图；层次图模式可切换；导出 SVG/PNG |
| P4 | 伪代码 DSL + 盒图 | 解析器、AST、盒图布局与渲染、节点编辑 | L | 教材例题（排序/成绩等级）能 1:1 还原；解析错误带行号 |
| P5 | PAD 图 | 复用 AST，深度→列布局，选择/循环/多分支/def | M | 同一份伪代码切换盒图/PAD 不丢内容；布局符合教材 |
| P6 | Jackson 图 | 复用 AST，seq/select/iter 布局与角标 | M | 三种结构齐全；`*`/`°` 位置正确 |
| P7 | 联动与导出 | AST → 流程图、示例库、批量导出、模板 | M | 一份伪代码可出 4 张图；示例库覆盖 6 类图 |

**总量估算**：新增约 3.5–4.5k 行（含测试），其中结构化族约 1.5k，图族约 1.2k，解析与文档壳约 1k。

**建议节奏**：先做 P0 + P1，用最小闭环验证「文档壳 + 图类型切换 + 新画布」是否成立；成立后再并行推进 P2/P3 与 P4/P5/P6。

---

## 7. 风险与对策

| 风险 | 影响 | 对策 |
| --- | --- | --- |
| 教材符号差异（盒图分支画法、Jackson 圆圈位置、结构图调用箭头） | 学生说「和我们老师画的不一样」 | 模型保持中性；符号风格做成配置项；用 3–5 本主流教材图做验收样例 |
| 中文字宽测量不准 | 盒子文字溢出或留白过大 | Canvas `measureText` + 缓存；测试环境用字符宽度估算；留 8px 内边距 |
| 状态图自动布局效果差 | 图面混乱 | 默认手动布局 + 「自动整理」；提供 stress/layered 两种算法切换 |
| 盒图/PAD/Jackson 无成熟参考 | 视觉与交互容易跑偏 | 先做静态渲染 + 教材对照；编辑只做「选中 + 插入/删除」，不做拖拽 |
| 6 类图同时铺开 | 半成品多、回归风险大 | 严格按 P0→P7；每个阶段独立可发布 |
| 结构化族与图族两套交互 | 用户学习成本 | 统一「左源码、右图、选中出工具条」的交互语言 |
| SVG 大图性能 | 节点过多卡顿 | 单图节点数上限提示；渲染只画可见区域可作为后期优化 |
| Mermaid 导出语义丢失 | 结构图/盒图导出不完整 | 明确标注「降级导出」；优先保证 SVG/PNG |

---

## 8. 最终建议

1. **先做 P0，不要先做图。** 当前 `App.tsx`、`CanvasView.tsx`、`layout.ts` 都把 ER 假设写死了；不先抽文档模型和 `LayoutSpec`，后面每加一张图都要改一遍主流程。
2. **流程图是第一个要交付的图。** 需求最高、参考最多、能最快验证新画布；它也是结构化族「AST → 流程图」的落点。
3. **盒图/PAD/Jackson 是差异化，但要按「一份 AST、三个渲染器」做。** 不要写三套解析器和三套编辑器。
4. **PAD 和 Jackson 必须做教材对照验收。** 没有开源视觉基线，这是最容易「做出来但不像」的地方。
5. **守住「生成后可编辑」的产品原则。** 六张图都应该能改文字、增删节点、重新排版；但不需要做成 draw.io。

如果只能先做一件事：**做 P0 + 流程图**。它同时验证了文档壳、图类型切换、ELK 布局配置化和新节点体系，是后续五张图的地基。

---

## 附录：参考链接

**标准与规范**

- GB/T 1526-1989 信息处理 数据流程图、程序流程图、系统流程图、程序网络图和系统资源图的文件编制符号及约定（等同采用 ISO 5807:1985）
- ISO 5807:1985 — Documentation symbols and conventions for data, program and system flowcharts
- OMG UML 2.5.1 — StateMachines（第 14 章）
- DIN 66261 — Sinnbilder für Struktogramme nach Nassi-Shneiderman

**概念与教材资料**

- Nassi–Shneiderman diagram — https://en.wikipedia.org/wiki/Nassi%E2%80%93Shneiderman_diagram
- Jackson structured programming — https://en.wikipedia.org/wiki/Jackson_structured_programming
- Structure chart — https://en.wikipedia.org/wiki/Structure_chart
- UML state machine — https://en.wikipedia.org/wiki/UML_state_machine
- PAD（问题分析图）— https://baike.baidu.com/item/pad/10015548
- 程序流程图 vs 盒图 vs PAD 图 — https://zhuanlan.zhihu.com/p/391786395

**工具**

- Structorizer — https://structorizer.fisch.lu
- StruktoLab — https://struktolab.openpatch.org
- Jackson Workbench — http://www.jacksonworkbench.co.uk
- 亿图图示 NS 图 — https://www.edrawsoft.cn/flowchart/nsliuchengtuhfb/
- draw.io — https://github.com/jgraph/drawio
- Mermaid — https://github.com/mermaid-js/mermaid
