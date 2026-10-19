# Global ER Conceptual Style Design

## Goal

把高铁售票陈氏 ER 图中已经验证有效的“业务主体 + 代表属性 + 关系动词 + 语义布局”能力，抽象成全局规则，让普通 SQL 也能生成更接近课程报告的概念 ER 图。

## Current Gap

当前高铁售票效果好，是因为 `chen-ticketing.ts` 写了专门的业务标签、关系名称、基数标注和手工位置。普通 SQL 只能走 `chen-adapter.ts` 的通用路径：关系名大多来自外键名，布局接近网格，关系没有优先级，密集图容易变成物理表结构堆叠。

## Design

新增一个全局概念样式构建器。它不替代售票专属样式；检测到售票 schema 时仍优先使用现有专属样式。其他 schema 进入通用样式：

- 表名先使用中文注释，缺失时用常见业务词典把 `student`、`order_item`、`payment_record` 等转成可读主体名。
- 属性只选代表性字段，默认排除外键和技术字段，如 `created_at`、`updated_by`、`version`。
- 关系名用字段角色、表角色和业务词典推导，避免直接显示 `fk_xxx`。
- 大型图按关系重要度筛选陈氏图默认关系；完整外键仍保留在 Crow's Foot、数据字典和关系报告中。
- 通用布局按主体类别放置：参与者在左侧，业务过程在中间，核心资源在右侧，字典/配置靠右，日志/消息靠下。

## DeepSeek Layer

DeepSeek 只做可选增强，不参与核心解析。新增一个独立适配器，把 `ErModel` 转成严格 JSON 提示词，调用 DeepSeek OpenAI-compatible Chat API 后校验返回内容。只有引用真实表和真实关系的建议才会被接受，未来可接入 UI 的“AI 分析关系”按钮。

## Error Handling

没有 API Key、网络失败、模型返回非法 JSON 或引用不存在的表/关系时，应用继续使用确定性全局样式。AI 结果永远不能覆盖 SQL 解析出的真实外键。

## Testing

测试重点：

- 非售票 schema 也能生成业务主体名、代表属性和业务关系名。
- 高密度 schema 会隐藏低价值技术关系。
- 通用布局能把参与者、过程、核心资源和字典放到不同语义区域。
- DeepSeek 适配器能构造正确请求，并过滤无效模型建议。
