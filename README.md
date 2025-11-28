# 古诗词资源库 

一个功能完整的中国古诗词学习和探索平台，集成 AI 推荐、诗人关系图谱、评论互动等功能。

##  一、核心特性

### 诗词资源库
- **诗词列表展示** - 浏览古诗词资源
- **智能搜索** - 支持按诗名、诗人、朝代、内容搜索
- **详情页面** - 查看完整诗词内容和创作背景

### AI 智能推荐
- **意境推荐** - 根据用户输入的主题或意境 AI 推荐相似诗词
- **精确查询** - 输入诗名时自动返回该诗词详情
- 基于 Google Gemini API 的高质量推荐

### 社区评论系统
- **评论互动** - 用户可发表评论和观点
- **嵌套回复** - 支持评论间的深层次讨论
- **匿名评论** - 支持匿名用户参与

### 诗人关系图谱
- **可视化展示** - Force-Directed Layout 力导向图算法
- **动态布局** - 节点自动收敛至稳定状态
- **关系标注** - 显示诗人间的具体关系

---

## 二、项目结构

```
├── uniapp/                      # uni-app 前端项目
│   ├── src/
│   │   ├── pages/
│   │   │   ├── poem/
│   │   │   │   ├── list.vue       # 诗词列表页
│   │   │   │   └── detail.vue     # 诗词详情页
│   │   │   ├── poet/
│   │   │   │   └── relationship.vue # 诗人关系图谱
│   │   │   └── index.vue          # 首页
│   │   ├── components/
│   │   │   ├── CommentItem.vue    # 递归评论组件
│   │   │   └── AIRecommendationModal.vue # AI 推荐弹窗
│   │   ├── stores/
│   │   │   └── poemStore.ts       # Pinia 状态管理
│   │   ├── api/
│   │   │   ├── poem.ts            # 诗词相关 API
│   │   │   └── ai.ts              # AI 推荐 API
│   │   └── pages.json             # 路由配置
│
├── backend/                       # Node.js + Express 后端
│   └── server.ts                  # 服务器主程序
│
└── README.md                      # 本文件
```

---

## 三、快速开始

### 前置要求
- **Node.js** >= 14.0
- **MySQL** >= 5.7
- **uni-app 开发环境**
- **SOCKS5 代理**（用于调用 Gemini API）

### 后端服务搭建

#### 数据库初始化
```sql
CREATE DATABASE resource_db1;
USE resource_db1;

-- 诗词表
CREATE TABLE poem (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(100) NOT NULL,
    content LONGTEXT NOT NULL,
    poetID INT NOT NULL,
    FOREIGN KEY (poetID) REFERENCES poet(id)
);

-- 诗人表
CREATE TABLE poet (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    dynasty VARCHAR(20) NOT NULL
);

-- 评论表
CREATE TABLE comment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    poemID INT NOT NULL,
    content TEXT NOT NULL,
    username VARCHAR(50),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parentID INT,
    FOREIGN KEY (poemID) REFERENCES poem(id),
    FOREIGN KEY (parentID) REFERENCES comment(id)
);

-- 诗人关系表
CREATE TABLE poet_relationship (
    id INT PRIMARY KEY AUTO_INCREMENT,
    poetA_name VARCHAR(50) NOT NULL,
    poetB_name VARCHAR(50) NOT NULL,
    relation VARCHAR(100),
    value INT DEFAULT 1
);
```

#### 安装依赖
```bash
cd backend
npm install express mysql2 cors body-parser axios socks-proxy-agent
```

#### 配置服务器
编辑 `server.ts`：
```typescript
// 数据库配置
const dbConfig = {
    host: 'localhost',
    user: 'root',           // 修改为您的 MySQL 用户
    password: '',           // 修改为您的密码
    database: 'resource_db1'
};

// Gemini API 配置
const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
const SOCKS_PROXY_URL = 'socks5://127.0.0.1:7897'; // 修改为您的代理地址
```

#### 启动服务器
```bash
npx ts-node server.ts
```

如无 ts-node，先安装：
```bash
npm install -g ts-node typescript
```

### 前端应用配置

#### 安装依赖
```bash
cd frontend
npm install
```

#### 运行开发服务器
```bash
npm run dev
```



---

## 四、核心技术栈

### 前端
- **uni-app** - 跨平台开发框架
- **Vue 3 + TypeScript** - 前端框架和语言
- **Pinia** - 状态管理
- **uni-ui** - 组件库
- **Canvas** - 图谱可视化

### 后端
- **Node.js + Express** - Web 服务框架
- **MySQL 2** - 数据库驱动
- **Axios** - HTTP 客户端
- **CORS** - 跨域资源共享
- **SOCKS Proxy Agent** - 代理支持

### AI 服务
- **Google Gemini 2.5 Flash** - 大语言模型

---

## 五、关键配置说明

### SOCKS 代理配置

如果需要使用 AI 推荐功能，需要配置 SOCKS5 代理：

```typescript
// server.ts 中的配置
const SOCKS_PROXY_URL = 'socks5://127.0.0.1:7897';
const agent = new SocksProxyAgent(SOCKS_PROXY_URL);
```

**常见代理工具**：
- Clash
- v2ray
- Shadowsocks

### Gemini API 密钥

获取方式：
1. 访问 [Google AI Studio](https://aistudio.google.com/app/apikey)
2. 创建新的 API 密钥
3. 替换 `server.ts` 中的 `GEMINI_API_KEY`

---

##  六、项目文件说明

| 文件                        | 用途                                     |
| --------------------------- | ---------------------------------------- |
| `poemStore.ts`              | Pinia 状态管理，管理诗词列表和搜索状态   |
| `relationship.vue`          | 诗人关系图谱核心页面，包含力导向布局算法 |
| `detail.vue`                | 诗词详情页，整合评论系统                 |
| `CommentItem.vue`           | 递归评论组件，支持深层嵌套               |
| `AIRecommendationModal.vue` | AI 推荐弹窗组件                          |
| `server.ts`                 | 后端主服务，包含所有 API 路由和业务逻辑  |

