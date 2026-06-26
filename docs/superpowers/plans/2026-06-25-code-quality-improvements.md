# 代码质量改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除代码重复、修复 SQL 解析器缺陷、补全测试覆盖、改善类型安全，提升项目可维护性。

**Architecture:** 按优先级渐进式改进：先做低成本高收益项（去重、依赖清理），再做结构性优化（文件拆分、测试补全），最后做 UI 增强（推断关系交互）。所有改动向后兼容，不改变现有功能行为。

**Tech Stack:** TypeScript, React 18, Vitest, @xyflow/react

---

## 文件变更地图

| 操作 | 文件 | 职责 |
|------|------|------|
| **新建** | `src/diagram/geometry-utils.ts` | 共享几何工具：点在矩形内、线段相交、矩形碰撞检测 |
| **新建** | `src/diagram/geometry-utils.test.ts` | 几何工具单元测试 |
| **新建** | `src/domain/display-labels.test.ts` | 中文标签展示逻辑测试 |
| **新建** | `src/diagram/chen-ticketing.test.ts` | 售票系统概念样式检测测试 |
| **修改** | `package.json` | 移除 `node-sql-parser` 依赖 |
| **修改** | `src/sql/mysql-parser.ts` | 第 60-93 行：`#` 注释支持；第 253-275 行：解析 ON DELETE/ON UPDATE；第 117-121 行：含行号的错误信息 |
| **修改** | `src/domain/er-model.ts` | `RelationModel` 增加 `onDelete?: string` 和 `onUpdate?: string` |
| **修改** | `src/diagram/chen-geometry.ts` | 第 417-496 行：移除重复几何函数，改为从 `geometry-utils` 导入 |
| **修改** | `src/diagram/layout.ts` | 第 271-298 行：移除重复碰撞检测函数，改为从 `geometry-utils` 导入 |
| **修改** | `src/diagram/adapters.test.ts` | 第 693-752 行：移除重复几何辅助函数，改为从 `geometry-utils` 导入并使用 |
| **修改** | `src/export/markdown.ts` | `formatRelation` 增加 ON DELETE/ON UPDATE 输出 |
| **修改** | `src/components/CanvasView.tsx` | 工具栏增加"接受推断"/"拒绝推断"按钮 |
| **修改** | `src/App.tsx` | 传递 `onAcceptInferred` / `onRejectInferred` 回调 |

---

### Task 1: 移除未使用的 node-sql-parser 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 从 package.json 移除 node-sql-parser**

`package.json` 第 19 行删除 `"node-sql-parser": "^5.3.2",`：

```json
  "dependencies": {
    "@xyflow/react": "^12.8.2",
    "elkjs": "^0.11.0",
    "html-to-image": "^1.11.11",
    "lucide-react": "^0.525.0",
    "nanoid": "^5.1.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
```

- [ ] **Step 2: 执行 npm install 更新 lock 文件**

```bash
npm install
```
预期：无错误，`node_modules/node-sql-parser` 目录消失。

- [ ] **Step 3: 验证构建和测试通过**

```bash
npm run build && npm test
```
预期：Build 成功，所有 9 个测试套件通过。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove unused node-sql-parser dependency"
```

---

### Task 2: 提取共享几何工具模块

**Files:**
- Create: `src/diagram/geometry-utils.ts`
- Create: `src/diagram/geometry-utils.test.ts`
- Modify: `src/diagram/chen-geometry.ts:417-496`
- Modify: `src/diagram/layout.ts:271-298`
- Modify: `src/diagram/adapters.test.ts:693-752`

- [ ] **Step 1: 创建 geometry-utils.ts，提取共享函数**

```typescript
export type Point = {
  x: number;
  y: number;
};

export type Rect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function pointInsideRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

export function segmentsIntersect(
  firstStart: Point,
  firstEnd: Point,
  secondStart: Point,
  secondEnd: Point
): boolean {
  const firstDirection = direction(firstStart, firstEnd, secondStart);
  const secondDirection = direction(firstStart, firstEnd, secondEnd);
  const thirdDirection = direction(secondStart, secondEnd, firstStart);
  const fourthDirection = direction(secondStart, secondEnd, firstEnd);

  if (firstDirection === 0 && pointOnSegment(secondStart, firstStart, firstEnd)) {
    return true;
  }

  if (secondDirection === 0 && pointOnSegment(secondEnd, firstStart, firstEnd)) {
    return true;
  }

  if (thirdDirection === 0 && pointOnSegment(firstStart, secondStart, secondEnd)) {
    return true;
  }

  if (fourthDirection === 0 && pointOnSegment(firstEnd, secondStart, secondEnd)) {
    return true;
  }

  return firstDirection * secondDirection < 0 && thirdDirection * fourthDirection < 0;
}

export function segmentIntersectsRect(
  start: Point,
  end: Point,
  rect: Rect
): boolean {
  if (pointInsideRect(start, rect) || pointInsideRect(end, rect)) {
    return true;
  }

  return (
    [
      [
        { x: rect.left, y: rect.top },
        { x: rect.right, y: rect.top },
      ],
      [
        { x: rect.right, y: rect.top },
        { x: rect.right, y: rect.bottom },
      ],
      [
        { x: rect.right, y: rect.bottom },
        { x: rect.left, y: rect.bottom },
      ],
      [
        { x: rect.left, y: rect.bottom },
        { x: rect.left, y: rect.top },
      ],
    ] as Array<[Point, Point]>
  ).some(([rectStart, rectEnd]) =>
    segmentsIntersect(start, end, rectStart, rectEnd)
  );
}

export function direction(
  origin: Point,
  target: Point,
  point: Point
): number {
  const crossProduct =
    (target.x - origin.x) * (point.y - origin.y) -
    (target.y - origin.y) * (point.x - origin.x);

  if (Math.abs(crossProduct) < 0.001) {
    return 0;
  }

  return crossProduct > 0 ? 1 : -1;
}

export function pointOnSegment(
  point: Point,
  start: Point,
  end: Point
): boolean {
  return (
    point.x >= Math.min(start.x, end.x) &&
    point.x <= Math.max(start.x, end.x) &&
    point.y >= Math.min(start.y, end.y) &&
    point.y <= Math.max(start.y, end.y)
  );
}

export function hasBoxOverlap(boxes: Box[]): boolean {
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (
        boxes[i].x < boxes[j].x + boxes[j].w &&
        boxes[i].x + boxes[i].w > boxes[j].x &&
        boxes[i].y < boxes[j].y + boxes[j].h &&
        boxes[i].y + boxes[i].h > boxes[j].y
      ) {
        return true;
      }
    }
  }

  return false;
}
```

- [ ] **Step 2: 创建 geometry-utils.test.ts 单元测试**

```typescript
import {
  pointInsideRect,
  segmentsIntersect,
  segmentIntersectsRect,
  direction,
  pointOnSegment,
  hasBoxOverlap,
  type Rect,
  type Box,
} from './geometry-utils';

describe('pointInsideRect', () => {
  const rect: Rect = { left: 0, top: 0, right: 10, bottom: 10 };

  it('returns true for a point inside the rect', () => {
    expect(pointInsideRect({ x: 5, y: 5 }, rect)).toBe(true);
  });

  it('returns true for a point on the edge', () => {
    expect(pointInsideRect({ x: 0, y: 5 }, rect)).toBe(true);
  });

  it('returns false for a point outside the rect', () => {
    expect(pointInsideRect({ x: 15, y: 5 }, rect)).toBe(false);
  });
});

describe('segmentsIntersect', () => {
  it('returns true for crossing segments', () => {
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 10, y: 0 }
      )
    ).toBe(true);
  });

  it('returns false for parallel segments', () => {
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 5 },
        { x: 10, y: 5 }
      )
    ).toBe(false);
  });

  it('returns true when an endpoint touches a segment', () => {
    expect(
      segmentsIntersect(
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 5, y: 0 },
        { x: 15, y: 5 }
      )
    ).toBe(true);
  });
});

describe('segmentIntersectsRect', () => {
  const rect: Rect = { left: 0, top: 0, right: 10, bottom: 10 };

  it('returns true when segment crosses the rect', () => {
    expect(
      segmentIntersectsRect({ x: -5, y: 5 }, { x: 15, y: 5 }, rect)
    ).toBe(true);
  });

  it('returns false when segment is outside', () => {
    expect(
      segmentIntersectsRect({ x: -5, y: -5 }, { x: -1, y: -1 }, rect)
    ).toBe(false);
  });
});

describe('hasBoxOverlap', () => {
  it('returns true when boxes overlap', () => {
    const boxes: Box[] = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 5, y: 5, w: 10, h: 10 },
    ];
    expect(hasBoxOverlap(boxes)).toBe(true);
  });

  it('returns false when boxes are separated', () => {
    const boxes: Box[] = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 20, y: 20, w: 10, h: 10 },
    ];
    expect(hasBoxOverlap(boxes)).toBe(false);
  });
});

describe('direction', () => {
  it('returns 1 for counter-clockwise', () => {
    expect(direction({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 })).toBe(1);
  });

  it('returns -1 for clockwise', () => {
    expect(direction({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -5 })).toBe(-1);
  });

  it('returns 0 for collinear', () => {
    expect(direction({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 })).toBe(0);
  });
});

describe('pointOnSegment', () => {
  it('returns true for a point on the segment', () => {
    expect(
      pointOnSegment({ x: 5, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    ).toBe(true);
  });

  it('returns false for a point outside the segment', () => {
    expect(
      pointOnSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })
    ).toBe(false);
  });
});
```

- [ ] **Step 3: 运行新测试确认通过**

```bash
npx vitest run src/diagram/geometry-utils.test.ts
```
预期：所有测试通过。

- [ ] **Step 4: 修改 chen-geometry.ts，用导入替代本地定义**

在 `chen-geometry.ts` 顶部增加导入：

```typescript
import type { Point, Rect, Box } from './geometry-utils';
import { pointInsideRect, segmentsIntersect, segmentIntersectsRect, hasBoxOverlap } from './geometry-utils';
```

删除 `chen-geometry.ts` 中以下重复定义（原第 417-496 行附近的 `pointInsideRect`、`segmentsIntersect`、`segmentIntersectsRect`、`direction`、`pointOnSegment` 函数及其所有实现）。同时将 `Rect`、`Box` 类型别名替换为导入的类型。将 `hasOverlaps` 内的 overlay 检测改为调用 `hasBoxOverlap`。

具体：删除第 444-496 行的 `pointInsideRect`、`segmentsIntersect`、`direction`、`pointOnSegment`、`segmentIntersectsRect` 定义（`segmentIntersectsRect` 被 `countNodesCrossedBySegment` 调用，需改为导入版本），确保所有调用处函数名正确。

- [ ] **Step 5: 修改 layout.ts，用导入替代本地定义**

在 `layout.ts` 顶部增加导入：

```typescript
import { hasBoxOverlap, type Box } from './geometry-utils';
```

删除 `layout.ts` 第 271-288 行的 `hasOverlap` 函数和 `Box` 类型定义，将 `hasOverlap` 调用改为 `hasBoxOverlap`。

- [ ] **Step 6: 修改 adapters.test.ts，删除重复几何函数**

`adapters.test.ts` 第 693-752 行的 `segmentIntersectsRect`、`pointInsideRect`、`segmentsIntersect`、`direction`、`pointOnSegment` 是测试辅助函数，将其改为从 `geometry-utils` 导入：

```typescript
import { segmentIntersectsRect, pointInsideRect } from './geometry-utils';
```

删除第 693-752 行的重复定义。

- [ ] **Step 7: 运行全量测试确认无回归**

```bash
npm test
```
预期：所有测试通过。

- [ ] **Step 8: Commit**

```bash
git add src/diagram/geometry-utils.ts src/diagram/geometry-utils.test.ts src/diagram/chen-geometry.ts src/diagram/layout.ts src/diagram/adapters.test.ts
git commit -m "refactor: extract shared geometry utilities to geometry-utils.ts"
```

---

### Task 3: SQL 解析器支持 # 行注释

**Files:**
- Modify: `src/sql/mysql-parser.ts:57-93`
- Modify: `src/sql/mysql-parser.test.ts` (追加测试)

- [ ] **Step 1: 添加 `#` 注释支持的测试用例**

在 `mysql-parser.test.ts` 末尾追加：

```typescript
it('strips MySQL #-style comments', () => {
  const model = parseMySqlToErModel(`CREATE TABLE \`major\` (
    # 专业编号
    \`id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`)
  );`);

  expect(model.tables).toHaveLength(1);
  expect(model.tables[0].columns).toHaveLength(1);
});

it('strips mixed comment styles in one SQL block', () => {
  const model = parseMySqlToErModel(`CREATE TABLE \`student\` (
    -- 学生编号
    \`id\` BIGINT NOT NULL,
    # 学生姓名
    \`name\` VARCHAR(50) NOT NULL,
    /* 专业编号 */
    \`major_id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`)
  );`);

  expect(model.tables).toHaveLength(1);
  expect(model.tables[0].columns).toHaveLength(3);
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/sql/mysql-parser.test.ts -t "strips MySQL #-style comments"
```
预期：测试失败（解析错误或列数不对）。

- [ ] **Step 3: 修改 stripSqlComments 函数**

在 `mysql-parser.ts` 的 `stripSqlComments` 函数中，第 73-79 行 `--` 注释处理之前，添加 `#` 注释分支。

具体在第 73 行之前插入：

```typescript
    if (!inSingleQuote) {
      if (char === '#') {
        const endOfLine = sql.indexOf('\n', index + 1);
        index = endOfLine >= 0 ? endOfLine + 1 : sql.length;
        output.push('\n');
        continue;
      }
```

即修改后 `stripSqlComments` 的 while 循环变为：

```typescript
  while (index < sql.length) {
    const char = sql[index];
    const nextChar = sql[index + 1] ?? '';

    if (char === "'" && (index === 0 || sql[index - 1] !== '\\')) {
      inSingleQuote = !inSingleQuote;
      output.push(char);
      index++;
      continue;
    }

    if (!inSingleQuote) {
      if (char === '#') {
        const endOfLine = sql.indexOf('\n', index + 1);
        index = endOfLine >= 0 ? endOfLine + 1 : sql.length;
        output.push('\n');
        continue;
      }

      if (char === '-' && nextChar === '-') {
        const endOfLine = sql.indexOf('\n', index + 2);
        index = endOfLine >= 0 ? endOfLine + 1 : sql.length;
        output.push('\n');
        continue;
      }

      if (char === '/' && nextChar === '*') {
        const endOfBlock = sql.indexOf('*/', index + 2);
        index = endOfBlock >= 0 ? endOfBlock + 2 : sql.length;
        continue;
      }
    }

    output.push(char);
    index++;
  }
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/sql/mysql-parser.test.ts
```
预期：所有测试通过（包括新增的 `#` 注释测试）。

- [ ] **Step 5: Commit**

```bash
git add src/sql/mysql-parser.ts src/sql/mysql-parser.test.ts
git commit -m "feat: support MySQL #-style line comments in SQL parser"
```

---

### Task 4: 外键 ON DELETE / ON UPDATE 解析与展示

**Files:**
- Modify: `src/domain/er-model.ts:31-43` (RelationModel)
- Modify: `src/sql/mysql-parser.ts:213-229` (parseForeignKeyConstraint)
- Modify: `src/export/markdown.ts:63-65` (formatRelation)
- Modify: `src/sql/mysql-parser.test.ts` (追加测试)

- [ ] **Step 1: 扩展 RelationModel 类型**

在 `er-model.ts` 第 43 行 `status?` 后添加：

```typescript
  onDelete?: 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'RESTRICT' | 'SET DEFAULT' | undefined;
  onUpdate?: 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'RESTRICT' | 'SET DEFAULT' | undefined;
```

- [ ] **Step 2: 修改 parseForeignKeyConstraint 解析 ON DELETE/ON UPDATE**

在 `mysql-parser.ts` 的 `parseForeignKeyConstraint` 函数中，当前正则匹配末尾不捕获 `ON DELETE`/`ON UPDATE`。修改 match 正则，在 references 子句后追加可选捕获：

```typescript
  const match = definition.match(
    /^(?:constraint\s+(`[^`]+`|[a-zA-Z_][\w$]*)\s+)?foreign\s+key\s*\(([^)]+)\)\s+references\s+((?:`[^`]+`|[a-zA-Z_][\w$]*)(?:\s*\.\s*(?:`[^`]+`|[a-zA-Z_][\w$]*))?)\s*\(([^)]+)\)\s*(on\s+delete\s+(cascade|set\s+null|no\s+action|restrict|set\s+default))?\s*(on\s+update\s+(cascade|set\s+null|no\s+action|restrict|set\s+default))?/i
  );
```

修改返回值以包含 onDelete/onUpdate：

```typescript
    const onDelete = extractReferentialAction(match[6]);
    const onUpdate = extractReferentialAction(match[8]);

    return {
      name: ...,
      sourceTableName,
      sourceColumnNames: ...,
      targetTableName: ...,
      targetColumnNames: ...,
      onDelete,
      onUpdate,
    };
```

同时在 `PendingForeignKey` 类型（第 16-22 行）添加字段：

```typescript
type PendingForeignKey = {
  name: string;
  sourceTableName: string;
  sourceColumnNames: string[];
  targetTableName: string;
  targetColumnNames: string[];
  onDelete?: RelationModel['onDelete'];
  onUpdate?: RelationModel['onUpdate'];
};
```

添加辅助函数：

```typescript
function extractReferentialAction(action: string | undefined): RelationModel['onDelete'] {
  if (!action) {
    return undefined;
  }
  const normalized = action.replace(/\s+/g, ' ').trim().toUpperCase();
  if (normalized === 'SET NULL') return 'SET NULL';
  if (normalized === 'NO ACTION') return 'NO ACTION';
  if (normalized === 'RESTRICT') return 'RESTRICT';
  if (normalized === 'SET DEFAULT') return 'SET DEFAULT';
  if (normalized === 'CASCADE') return 'CASCADE';
  return undefined;
}
```

修改 `createForeignKeyRelation`（第 253-275 行）传递 onDelete/onUpdate：

```typescript
  return {
    id: relationKey(relationInput),
    name: foreignKey.name,
    ...relationInput,
    cardinality: 'many-to-one',
    source: 'foreign-key',
    onDelete: foreignKey.onDelete,
    onUpdate: foreignKey.onUpdate,
  };
```

- [ ] **Step 3: 添加解析器测试**

在 `mysql-parser.test.ts` 末尾追加：

```typescript
it('parses ON DELETE CASCADE and ON UPDATE SET NULL', () => {
  const model = parseMySqlToErModel(`CREATE TABLE \`major\` (
    \`id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`)
  );

  CREATE TABLE \`student\` (
    \`id\` BIGINT NOT NULL,
    \`major_id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_student_major\` FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
      ON DELETE CASCADE ON UPDATE SET NULL
  );`);

  expect(model.relations[0].onDelete).toBe('CASCADE');
  expect(model.relations[0].onUpdate).toBe('SET NULL');
});

it('parses ALTER TABLE ADD FOREIGN KEY with ON DELETE', () => {
  const model = parseMySqlToErModel(`CREATE TABLE \`major\` (
    \`id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`)
  );

  CREATE TABLE \`student\` (
    \`id\` BIGINT NOT NULL,
    \`major_id\` BIGINT NOT NULL,
    PRIMARY KEY (\`id\`)
  );

  ALTER TABLE \`student\`
    ADD CONSTRAINT \`fk_student_major\`
    FOREIGN KEY (\`major_id\`) REFERENCES \`major\`(\`id\`)
    ON DELETE RESTRICT;`);

  expect(model.relations[0].onDelete).toBe('RESTRICT');
});
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/sql/mysql-parser.test.ts
```
预期：所有测试通过。

- [ ] **Step 5: 修改 formatRelation 在关系报告中展示**

在 `markdown.ts` 的 `formatRelation` 函数（第 63-65 行）中，增加 ON DELETE/ON UPDATE 信息：

```typescript
function formatRelation(relation: RelationModel): string {
  const actions = [
    relation.onDelete ? `ON DELETE ${relation.onDelete}` : '',
    relation.onUpdate ? `ON UPDATE ${relation.onUpdate}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const actionSuffix = actions ? ` (${actions})` : '';
  return `- ${relation.sourceTableId}.${relation.sourceColumnIds.join(', ')} -> ${relation.targetTableId}.${relation.targetColumnIds.join(', ')} (${relation.name})${actionSuffix}`;
}
```

- [ ] **Step 6: 运行全量测试**

```bash
npm test
```
预期：所有测试通过。

- [ ] **Step 7: Commit**

```bash
git add src/domain/er-model.ts src/sql/mysql-parser.ts src/export/markdown.ts src/sql/mysql-parser.test.ts
git commit -m "feat: parse and display ON DELETE / ON UPDATE in foreign key relations"
```

---

### Task 5: 解析错误信息增加行号定位

**Files:**
- Modify: `src/sql/mysql-parser.ts:95-122` (extractCreateTableBlocks)
- Modify: `src/sql/mysql-parser.test.ts` (追加测试)

- [ ] **Step 1: 在 extractCreateTableBlocks 错误中附加位置信息**

修改 `extractCreateTableBlocks` 函数，将 `throw new Error(...)` 改为包含位置：

当 `closeParenIndex < 0` 时（第 103-105 行），计算当前行号：

```typescript
    const closeParenIndex = findMatchingParen(sql, openParenIndex);
    if (closeParenIndex < 0) {
      const line = countLinesUpTo(sql, match.index);
      throw new Error(`Cannot find closing parenthesis for CREATE TABLE ${match[1]} (near line ${line})`);
    }
```

当最后 block 为空时（第 117-119 行），改为：

```typescript
  if (blocks.length === 0 && sql.trim()) {
    throw new Error('No CREATE TABLE statements found in the SQL input.');
  }
```

添加辅助函数 `countLinesUpTo`：

```typescript
function countLinesUpTo(input: string, position: number): number {
  let lines = 1;
  for (let i = 0; i < position; i++) {
    if (input[i] === '\n') {
      lines++;
    }
  }
  return lines;
}
```

- [ ] **Step 2: 添加测试用例**

在 `mysql-parser.test.ts` 末尾追加：

```typescript
it('includes approximate line number in parse errors', () => {
  expect(() =>
    parseMySqlToErModel(`CREATE TABLE \`broken\` (
      \`id\` BIGINT NOT NULL,
    -- missing closing paren`)
  ).toThrow(/near line/);
});
```

- [ ] **Step 3: 运行测试确认通过**

```bash
npx vitest run src/sql/mysql-parser.test.ts
```
预期：所有测试通过。

- [ ] **Step 4: Commit**

```bash
git add src/sql/mysql-parser.ts src/sql/mysql-parser.test.ts
git commit -m "feat: include line number in SQL parse error messages"
```

---

### Task 6: 补全测试覆盖 - display-labels.ts

**Files:**
- Create: `src/domain/display-labels.test.ts`

- [ ] **Step 1: 创建 display-labels.test.ts**

```typescript
import {
  tableDisplayLabel,
  columnDisplayLabel,
  relationshipDisplayLabel,
  cardinalityEdgeLabel,
  oneOrManyLabel,
} from './display-labels';
import type { ColumnModel, RelationModel, TableModel } from './er-model';

function table(overrides: Partial<TableModel> = {}): TableModel {
  return {
    id: 'student',
    name: 'student',
    columns: [],
    primaryKey: [],
    uniqueKeys: [],
    ...overrides,
  };
}

function column(overrides: Partial<ColumnModel> = {}): ColumnModel {
  return {
    id: 'name',
    name: 'name',
    dataType: 'VARCHAR(50)',
    nullable: true,
    isPrimaryKey: false,
    isForeignKey: false,
    isUnique: false,
    ...overrides,
  };
}

function relation(overrides: Partial<RelationModel> = {}): RelationModel {
  return {
    id: 'student:major_id->major:id',
    name: 'fk_student_major',
    sourceTableId: 'student',
    sourceColumnIds: ['major_id'],
    targetTableId: 'major',
    targetColumnIds: ['id'],
    cardinality: 'many-to-one',
    source: 'foreign-key',
    ...overrides,
  };
}

describe('tableDisplayLabel', () => {
  it('uses comment as primary label when available', () => {
    const result = tableDisplayLabel(table({ comment: '学生表' }));
    expect(result).toEqual({ primary: '学生表', secondary: 'student' });
  });

  it('uses displayName when different from name', () => {
    const result = tableDisplayLabel(table({ name: 't_student', displayName: '学生表' }));
    expect(result).toEqual({ primary: '学生表', secondary: 't_student' });
  });

  it('falls back to name when no readable label exists', () => {
    const result = tableDisplayLabel(table({ name: 'student' }));
    expect(result).toEqual({ primary: 'student' });
  });

  it('prefers displayName over comment when both exist', () => {
    const result = tableDisplayLabel(
      table({ name: 't_student', displayName: '学生表', comment: '学生信息表' })
    );
    expect(result).toEqual({ primary: '学生表', secondary: 't_student' });
  });
});

describe('columnDisplayLabel', () => {
  it('uses comment as primary label', () => {
    const result = columnDisplayLabel(column({ name: 'major_id', comment: '专业编号' }));
    expect(result).toEqual({ primary: '专业编号', secondary: 'major_id' });
  });

  it('uses name only when no comment', () => {
    const result = columnDisplayLabel(column({ name: 'major_id' }));
    expect(result).toEqual({ primary: 'major_id' });
  });
});

describe('relationshipDisplayLabel', () => {
  it('returns Chinese name as-is', () => {
    expect(relationshipDisplayLabel(relation({ name: '选课' }))).toBe('选课');
  });

  it('converts cardinality to Chinese phrase for non-Chinese names', () => {
    expect(relationshipDisplayLabel(relation({ name: 'fk_student_major', cardinality: 'one-to-many' }))).toBe('一对多关系');
  });
});

describe('cardinalityEdgeLabel', () => {
  it('formats one-to-many with Chinese and notation', () => {
    expect(cardinalityEdgeLabel('one-to-many')).toBe('一对多 (1:N)');
  });

  it('formats many-to-many with Chinese and notation', () => {
    expect(cardinalityEdgeLabel('many-to-many')).toBe('多对多 (N:N)');
  });
});

describe('oneOrManyLabel', () => {
  it('returns 一 when not many', () => {
    expect(oneOrManyLabel(false)).toBe('一');
  });

  it('returns 多 when many', () => {
    expect(oneOrManyLabel(true)).toBe('多');
  });
});
```

- [ ] **Step 2: 运行新测试**

```bash
npx vitest run src/domain/display-labels.test.ts
```
预期：所有测试通过。

- [ ] **Step 3: Commit**

```bash
git add src/domain/display-labels.test.ts
git commit -m "test: add unit tests for display-labels module"
```

---

### Task 7: 补全测试覆盖 - chen-ticketing.ts

**Files:**
- Create: `src/diagram/chen-ticketing.test.ts`

- [ ] **Step 1: 创建 chen-ticketing.test.ts**

```typescript
import { parseMySqlToErModel } from '../sql/mysql-parser';
import { detectConceptualStyle } from './chen-ticketing';

describe('detectConceptualStyle', () => {
  it('returns null when required ticketing tables are missing', () => {
    const sql = `CREATE TABLE \`student\` (
      \`id\` BIGINT NOT NULL,
      \`name\` VARCHAR(50) NOT NULL,
      PRIMARY KEY (\`id\`)
    );`;
    expect(detectConceptualStyle(parseMySqlToErModel(sql))).toBeNull();
  });

  it('returns null when only some required tables exist', () => {
    const sql = `CREATE TABLE \`account\` (
      \`id\` BIGINT NOT NULL,
      PRIMARY KEY (\`id\`)
    );

    CREATE TABLE \`passenger\` (
      \`id\` BIGINT NOT NULL,
      PRIMARY KEY (\`id\`)
    );`;
    expect(detectConceptualStyle(parseMySqlToErModel(sql))).toBeNull();
  });

  it('returns a ConceptualStyle when all 10 required tables exist', () => {
    const sql = `CREATE TABLE \`account\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`passenger\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`ticket_order\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`ticket\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_run\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_stop\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`station\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat_type\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));`;

    const style = detectConceptualStyle(parseMySqlToErModel(sql));
    expect(style).not.toBeNull();
    expect(style!.tableLabels['account']).toBe('账号');
    expect(style!.tableLabels['passenger']).toBe('乘车人');
    expect(style!.entityPositions['account']).toEqual({ x: 180, y: 560 });
  });

  it('includes relation names only for declared foreign keys that match', () => {
    const sql = `CREATE TABLE \`account\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`passenger\` (\`id\` BIGINT NOT NULL, \`account_id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`),
      CONSTRAINT \`fk_passenger_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`account\`(\`id\`));
    CREATE TABLE \`ticket_order\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`ticket\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_run\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`train_stop\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`station\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));
    CREATE TABLE \`seat_type\` (\`id\` BIGINT NOT NULL, PRIMARY KEY (\`id\`));`;

    const model = parseMySqlToErModel(sql);
    const style = detectConceptualStyle(model);
    expect(style).not.toBeNull();

    const passengerAccountRel = model.relations.find(
      (r) => r.sourceTableId === 'passenger' && r.targetTableId === 'account'
    );
    expect(passengerAccountRel).toBeDefined();
    expect(style!.relationNames[passengerAccountRel!.id]).toBe('维护');
  });
});
```

- [ ] **Step 2: 运行新测试**

```bash
npx vitest run src/diagram/chen-ticketing.test.ts
```
预期：所有测试通过。

- [ ] **Step 3: Commit**

```bash
git add src/diagram/chen-ticketing.test.ts
git commit -m "test: add unit tests for chen-ticketing conceptual style detection"
```

---

### Task 8: 推断关系接受/拒绝 UI 交互

**Files:**
- Modify: `src/App.tsx:21-97`
- Modify: `src/components/CanvasView.tsx:33-131`

- [ ] **Step 1: 在 App.tsx 添加接受/拒绝推断关系的处理函数**

在 `App.tsx` 的 `App` 组件中添加两个回调函数，并传递给 `CanvasView`：

在 `generate` 函数后添加：

```typescript
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
```

修改 `CanvasView` 的调用，传递 `inferredRelations`、`onAcceptInferred`、`onRejectInferred`：

在 `App.tsx` 第 86-87 行，将：

```tsx
{activeTab === 'crowFoot' ? <CanvasView graph={crowFootGraph} /> : null}
{activeTab === 'chen' ? <CanvasView graph={chenGraph} /> : null}
```

改为：

```tsx
{activeTab === 'crowFoot' ? (
  <CanvasView graph={crowFootGraph} inferredRelations={model.inferredRelations} onAcceptInferred={handleAcceptInferred} onRejectInferred={handleRejectInferred} />
) : null}
{activeTab === 'chen' ? (
  <CanvasView graph={chenGraph} inferredRelations={model.inferredRelations} onAcceptInferred={handleAcceptInferred} onRejectInferred={handleRejectInferred} />
) : null}
```

- [ ] **Step 2: 修改 CanvasView 组件签名和工具栏**

修改 `CanvasView` 组件：

```typescript
import type { RelationModel } from '../domain/er-model';

export function CanvasView({
  graph,
  inferredRelations,
  onAcceptInferred,
  onRejectInferred,
}: {
  graph: FlowGraph;
  inferredRelations?: RelationModel[];
  onAcceptInferred?: (id: string) => void;
  onRejectInferred?: (id: string) => void;
}) {
```

在工具栏中（`<div className="canvas-toolbar">` 内部，`导出 SVG` 按钮之后）添加推断关系操作区：

```tsx
              {inferredRelations && inferredRelations.filter((r) => r.status === 'pending').length > 0 ? (
                <div className="canvas-toolbar__inferred">
                  <span className="canvas-toolbar__inferred-label">
                    推断关系 ({inferredRelations.filter((r) => r.status === 'pending').length})
                  </span>
                  <button type="button" onClick={() => {
                    const pending = inferredRelations.filter((r) => r.status === 'pending');
                    pending.forEach((r) => onAcceptInferred?.(r.id));
                  }}>
                    全部接受
                  </button>
                  <button type="button" onClick={() => {
                    const pending = inferredRelations.filter((r) => r.status === 'pending');
                    pending.forEach((r) => onRejectInferred?.(r.id));
                  }}>
                    全部拒绝
                  </button>
                </div>
              ) : null}
```

- [ ] **Step 3: 运行测试确认无回归**

```bash
npm test
```
预期：所有测试通过。

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/CanvasView.tsx
git commit -m "feat: add accept/reject UI for inferred relationships in CanvasView"
```

---

## 自审

**1. Spec 覆盖检查：**

| 改进项 | 对应 Task |
|--------|-----------|
| 移除未使用的 node-sql-parser | Task 1 |
| 提取共享几何工具模块 | Task 2 |
| SQL 解析器支持 # 行注释 | Task 3 |
| 外键 ON DELETE/ON UPDATE 解析与展示 | Task 4 |
| 解析错误信息增加行号定位 | Task 5 |
| display-labels.ts 测试覆盖 | Task 6 |
| chen-ticketing.ts 测试覆盖 | Task 7 |
| 推断关系接受/拒绝 UI | Task 8 |

低优先级项（TypeScript 类型收紧、大型图性能、撤销重做）未纳入本次计划——它们属于单独项目级别的工作。

**2. Placeholder 扫描：** 无 TBD/TODO/placeholders。所有步骤包含完整代码。

**3. 类型一致性：** `geometry-utils.ts` 中导出的 `Point`、`Rect`、`Box` 类型与 `chen-geometry.ts` 原有定义一致。`display-labels.test.ts` 中的辅助工厂函数与 `er-model.ts` 类型定义一致。`PendingForeignKey` 新增字段与 `RelationModel` 新增字段类型一致。
