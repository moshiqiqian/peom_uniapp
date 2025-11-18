这是一个基于您项目技术栈（UniApp/Vue 3/TypeScript + Node.js/MySQL）定制的 README 模板。请根据您的实际项目名称和具体情况修改其中的占位符和连接信息。

------



#  中国古诗词鉴赏与交流平台





## 简介



这是一个跨平台的古诗词鉴赏与交流应用。前端基于 **UniApp (Vue 3/TypeScript)** 实现，支持多端部署。后端使用 **Node.js (Express) + MySQL** 架构，提供诗词数据和高性能的嵌套评论服务。





## 主要功能



- **诗词浏览与搜索**：快速查找并展示古诗词列表。
- **诗词详情展示**：清晰显示诗词的标题、朝代、作者和分行内容。
- **嵌套评论系统 (Nesting Comments)**：
  - 后端基于 SQL 和 Node.js 动态构建树形评论结构。
  - 前端使用 **递归组件** 实现无限级回复和分级缩进显示。
  - 支持用户昵称和回复目标 (`回复 @XXX`) 标识。
- **关系图谱 (待定)**：提供诗人间的关联关系可视化（根据 `server.ts` 路由推测）。



##  技术栈



| **模块**          | **技术**                    | **描述**                                     |
| ----------------- | --------------------------- | -------------------------------------------- |
| **前端 (Client)** | UniApp (Vue 3 / TypeScript) | 跨平台应用开发框架。                         |
|                   | Vue 3 Composition API       | 使用 `script setup` 提升开发效率和可维护性。 |
|                   | `uni-ui`                    | UniApp 官方 UI 组件库。                      |
| **后端 (Server)** | Node.js / Express           | 快速构建 API 服务。                          |
|                   | MySQL / `mysql2/promise`    | 数据存储与异步数据库操作。                   |



## 项目搭建与运行





### 1. 后端服务 (Node.js/Express)





#### A. 数据库配置



1. **安装 MySQL**：确保您的系统安装并运行了 MySQL 服务。

2. **创建数据库**：创建一个名为 `resource_db1` (或您自定义的名称) 的数据库。

3. **导入数据**：执行您项目的 SQL 脚本，创建 `poem`, `poet`, `comment` 等表并填充初始数据。

4. **配置连接**：在您的 `server.ts` 文件中，修改 `dbConfig` 部分，确保数据库连接信息正确：

   TypeScript

   ```
   const dbConfig = {
       host: 'localhost',      
       user: 'root',           
       password: '', // 您的 MySQL 密码
       database: 'resource_db1', 
       // ...
   };
   ```



#### B. 运行 API 服务



1. 进入后端项目目录：

   Bash

   ```
   cd backend
   ```

2. 安装依赖：

   Bash

   ```
   npm install
   ```

3. 启动服务：

   Bash

   ```
   npx ts-node server.ts 
   ```

   服务默认运行在 `http://localhost:3000`。



### 2. 前端客户端 (UniApp)



#### A. 环境准备



1. 安装 **HBuilderX** 或配置好 UniApp CLI 开发环境。
2. 启动后按照指示导入到百度开发者工具中。



#### B. 运行客户端



1. 进入前端项目目录：

   Bash

   ```
   cd uniapp
   npm install
   ```

2. 在 `manifest.json` 或您的配置中，确认 API 基地址指向后端服务：`http://localhost:3000`。

3. 通过 HBuilderX 或 UniApp CLI 运行到 H5、微信小程序或 App 模拟器。

   Bash

   ```
   npm run dev:h5
   # 或 npm run dev:mp-weixin等等
   ```



##  关键文件说明

构：

```
.
├── backend/                  # Node.js/Express 后端服务
│   ├── server.ts             # 主服务文件 (API 路由、数据库连接)
│   └── package.json          # 后端依赖
├── sql/                      # 数据库配置
│   └── schema.sql            # 数据库表结构定义文件
├── uniapp/                   # uni-app 前端项目根目录
│   └── src/                  # 源代码目录
│       ├── api/              # 封装 API 接口请求
│       ├── components/       # 公共组件 (如 CommentItem.vue)
│       ├── pages/            # 页面视图文件 (.vue)
│       ├── stores/           # Pinia 状态管理模块
│       ├── main.ts           # 应用入口，初始化 Vue 和 Pinia
│       ├── pages.json        # 页面路由和窗口样式配置
└── README.md                 # 项目说明文件
```



------

