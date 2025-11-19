// resource-backend/server.ts



import express from 'express'; 

import mysql from 'mysql2/promise'; 

import cors from 'cors'; 

import bodyParser from 'body-parser'; 



// 引入 Gemini SDK

import { GoogleGenAI } from '@google/genai';



// 🌟 引入 SOCKS 代理模块

import { SocksProxyAgent } from 'socks-proxy-agent'; 





// 使用命名空间导入，并提取所需类型

import * as mysqlTypes from 'mysql2';

type RowDataPacket = mysqlTypes.RowDataPacket;

type ResultSetHeader = mysqlTypes.ResultSetHeader;



// --- 1. 配置常量 ---

const PORT = 3000; 



// 密钥和代理配置

const GEMINI_API_KEY = 'AIzaSyBJQa_Dq7DWef4xfLfmgPDRH8uDsDyIWTg'; 

// 🌟 关键：使用 SOCKS5 协议，并使用您之前确认的 7897 端口

const SOCKS_PROXY_URL = 'socks5://127.0.0.1:7897'; 





const dbConfig = {

    host: 'localhost',      

    user: 'root',           

    password: '',           

    database: 'resource_db1', 

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

};



// 全局数据库连接池

let pool: mysql.Pool; 

const app = express();

app.use(bodyParser.json()); // 确保在路由前解析 JSON





// 🌟 核心：初始化 Gemini 客户端，使用硬编码密钥并配置 SOCKS 代理

try {

    const proxyAgent = new SocksProxyAgent(SOCKS_PROXY_URL);

    

    // 🌟 关键：将 proxyAgent 作为 agent 属性传入

    const ai = new GoogleGenAI({

        apiKey: GEMINI_API_KEY, 

        // 强制 TypeScript 接受自定义 agent 属性

        agent: proxyAgent, 

    } as any); 

    

    (global as any).ai = ai; 

    

    console.log(`✅ Gemini 客户端已初始化，使用 SOCKS 代理: ${SOCKS_PROXY_URL}`);



} catch (error) {

    console.error('❌ 初始化 Gemini 客户端或代理失败。请检查 SOCKS 代理依赖是否安装，以及代理地址是否正确:', error);

    (global as any).ai = null; 

}





// --- 2. TypeScript 接口定义 (保持不变) ---

interface PoemResult {

    id: number;

    title: string;

    content: string;

    poet: string;      

    dynasty: string;

}



interface CommentResult {

    id: number;

    poemID: number;

    content: string;

    username: string;

    createdAt: string;

    parentID: number | null; 

}



// 嵌套评论的接口

interface CommentWithReplies extends CommentResult {

    parentUsername: string | null;

    replies: CommentWithReplies[];

}



interface NewCommentBody {

    poemID: number;

    content: string;

    username?: string; 

    parentID?: number | null; 

}



interface GraphNode {

    id: string;     

    group: string;  

}



interface GraphLink {

    source: string;     

    target: string;     

    relation: string; 

    value: number;  

}



interface RelationshipData {

    nodes: GraphNode[];

    links: GraphLink[];

}





// --- 3. 中间件配置 (保持不变) ---

app.use(cors({

    origin: '*',

    methods: ['GET', 'POST', 'PUT', 'DELETE'],

    allowedHeaders: ['Content-Type', 'Authorization']

}));

app.use(bodyParser.urlencoded({ extended: true }));





// --- 4. 路由定义 (只在底部新增 AI 路由) ---





// GET /api/poems: 获取诗词列表 (保持不变)

app.get('/api/poems', async (req: express.Request, res: express.Response) => {

    const searchQuery = req.query.search as string | undefined; 



    let sql = `

        SELECT 

            p.id, p.title, p.content, 

            t.name AS poet,      

            t.dynasty 

        FROM poem p

        JOIN poet t ON p.poetID = t.id

    `;

    const params: string[] = [];



    if (searchQuery) {

        sql += `

            WHERE p.title LIKE ? 

            OR t.name LIKE ? 

            OR p.content LIKE ?

            OR t.dynasty LIKE ?  

        `;

        const wildcardQuery = `%${searchQuery}%`;

        params.push(wildcardQuery, wildcardQuery, wildcardQuery, wildcardQuery); 

    }

    

    sql += ' LIMIT 100';



    try {

        await new Promise(resolve => setTimeout(resolve, 500));

        

        const [rows] = await pool.execute(sql, params);

        res.json({ 

            code: 200, 

            message: '诗词列表获取成功', 

            data: rows as PoemResult[] 

        });

    } catch (error) {

        console.error('获取诗词列表失败:', error);

        res.status(500).json({ code: 500, message: '服务器错误，获取列表失败。' });

    }

});





// GET /api/poems/:poemID 获取单个诗词详情 (保持不变)

app.get('/api/poems/:poemID', async (req: express.Request, res: express.Response) => {

    const poemID = req.params.poemID;

    

    const sql = `

        SELECT 

            p.id, p.title, p.content, 

            t.name AS poet, 

            t.dynasty 

        FROM poem p

        JOIN poet t ON p.poetID = t.id

        WHERE p.id = ?

    `;



    try {

        const [rows] = await pool.execute(sql, [poemID]);

        

        const poemDetail = (rows as PoemResult[])[0];



        if (poemDetail) {

            await new Promise(resolve => setTimeout(resolve, 300));



            res.json({ 

                code: 200, 

                message: '诗词详情获取成功', 

                data: poemDetail

            });

        } else {

            res.status(404).json({ code: 404, message: '找不到该诗词。' });

        }

    } catch (error) {

        console.error('获取诗词详情失败:', error);

        res.status(500).json({ code: 500, message: '服务器错误，获取详情失败。' });

    }

});





// GET /api/poems/:poemID/comments: 获取某个古诗的评论 (保持不变)

app.get('/api/poems/:poemID/comments', async (req: express.Request, res: express.Response) => {

    const poemID = parseInt(req.params.poemID);

    

    if (isNaN(poemID)) {

        return res.status(400).json({ code: 400, message: '古诗ID无效。' });

    }



    const sqlComments = `

        SELECT c.id, c.poemID, c.content, c.username, c.createdAt, c.parentID,

               p.username AS parentUsername 

        FROM comment c

        LEFT JOIN comment p ON c.parentID = p.id

        WHERE c.poemID = ?

        ORDER BY c.createdAt ASC 

    `;



    try {

        const [comments] = await pool.execute(sqlComments, [poemID]);

        

        const commentList = comments as (CommentResult & { parentUsername: string | null })[];

        

        const map = new Map<number, CommentWithReplies>();

        const rootComments: CommentWithReplies[] = [];



        commentList.forEach(comment => {

            const commentWithReplies: CommentWithReplies = { 

                ...(comment as CommentResult & { parentUsername: string | null }), 

                replies: [] 

            };

            

            map.set(comment.id, commentWithReplies);



            if (comment.parentID === null) {

                rootComments.push(commentWithReplies);

            } else {

                const parentComment = map.get(comment.parentID);

                if (parentComment) {

                    parentComment.replies.push(commentWithReplies);

                } else {

                    rootComments.push(commentWithReplies); 

                }

            }

        });



        rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());



        res.status(200).json({ 

            code: 200, 

            message: '评论加载成功！',

            data: rootComments 

        });

        

    } catch (error) {

        console.error('获取评论失败:', error);

        res.status(500).json({ code: 500, message: '服务器错误，评论加载失败。' });

    }

});





// POST /api/comments: 新增评论 (保持不变)

app.post('/api/comments', async (req: express.Request, res: express.Response) => {

    const { poemID, content, username = '匿名用户', parentID = null } = req.body as NewCommentBody;



    if (!poemID || !content) {

        return res.status(400).json({ code: 400, message: '缺少古诗ID或评论内容。' });

    }

    

    const sql = `

        INSERT INTO comment (poemID, content, username, parentID) 

        VALUES (?, ?, ?, ?)

    `;

    

    try {

        const [result] = await pool.execute(sql, [poemID, content, username, parentID]);

        

        res.status(201).json({ 

            code: 201, 

            message: '评论添加成功！',

            insertedId: (result as ResultSetHeader).insertId 

        });

        

    } catch (error) {

        console.error('新增评论失败:', error);

        res.status(500).json({ code: 500, message: '服务器错误，评论添加失败。' });

    }

});





// POST /api/ai/recommendations: 获取 AI 推荐的诗词名称 (新增功能)

app.post('/api/ai/recommendations', async (req: express.Request, res: express.Response) => {

    

    // 检查 AI 客户端是否成功初始化

    if (!(global as any).ai) {

        return res.status(503).json({ code: 503, message: 'AI 服务未就绪，请检查密钥配置或代理连接。' });

    }

    const aiClient: GoogleGenAI = (global as any).ai; 

    

    const { prompt } = req.body; 



    if (!prompt) {

        return res.status(400).json({ code: 400, message: '提示词不能为空。' });

    }

    

    // 核心：构建清晰的提示词

    const geminiPrompt = `

        你是一位专业的中国古诗词鉴赏家。

        根据用户提供的主题或意境，推荐5首主题或意境相似的古诗词的名称。

        请以清晰的、每行一个诗名的列表格式返回，不要包含作者或其他解释。

        

        用户主题: ${prompt}

    `;



    try {

        const response = await aiClient.models.generateContent({

            model: 'gemini-2.5-flash', 

            contents: geminiPrompt,

        });



        if (!response.text) {

            console.warn('Gemini API 未返回文本内容 (可能因安全设置或内容不完整)。');

            return res.status(500).json({ // 保持 500 错误码，因为调用失败

                code: 500, 

                message: 'AI 推荐失败，未生成有效结果。', 

                data: [] 

            });

        }



        const poemNamesRaw = response.text.trim();

        

        // 简单处理结果，按换行符分割成数组，并清理可能的列表符号

        const poemNames = poemNamesRaw.split('\n')

            .map(line => line.replace(/^-|^\*|^\d+\.|\s/g, '').trim()) 

            .filter(name => name.length > 0);



        res.json({

            code: 200,

            message: 'AI 推荐成功',

            data: poemNames 

        });



    } catch (error) {

        console.error('Gemini API 调用失败:', error);

        // 如果这里捕获到网络错误 (fetch failed sending request)，返回 500 错误

        res.status(500).json({ code: 500, message: 'AI 服务调用失败。' });

    }

});





// GET /api/relationships: 获取关系图谱数据 (保持不变)

app.get('/api/relationships', async (req: express.Request, res: express.Response) => {

    

    try {

        // 1. 获取所有诗人作为图谱节点

        const nodesSql = `

            SELECT 

                name AS id, 

                dynasty AS \`group\` 

            FROM poet

        `;

        const [nodeRows] = await pool.execute(nodesSql);

        const nodes = nodeRows as GraphNode[];

        

        // 2. 获取所有关系作为图谱边

        const linksSql = `

            SELECT 

                poetA_name AS source, 

                poetB_name AS target, 

                relation, 

                value 

            FROM poet_relationship

        `;

        const [linkRows] = await pool.execute(linksSql);

        const links = linkRows as GraphLink[];



        const relationshipData: RelationshipData = { nodes, links };

        

        await new Promise(resolve => setTimeout(resolve, 500));

        

        res.json({ 

            code: 200, 

            message: '关系图谱数据获取成功', 

            data: relationshipData

        });

        

    } catch (error) {

        console.error('获取关系图谱数据失败:', error);

        res.status(500).json({ code: 500, message: '服务器错误，获取图谱失败。' });

    }

});





// ----------------------------------------------------

// --- 6. 启动流程 ---

// ----------------------------------------------------



async function initializeServer() {

    try {

        pool = mysql.createPool(dbConfig);

        await pool.query('SELECT 1 + 1 AS solution');

        console.log('✅ MySQL 数据库连接成功！');



        app.listen(PORT, () => {

            console.log(`🚀 服务器已启动: http://localhost:${PORT}`);

            console.log(`✨ AI 推荐接口: POST http://localhost:${PORT}/api/ai/recommendations`);

            console.log(`⚠️ 请确保您的 SOCKS 代理 (socks5://127.0.0.1:7897) 正在运行！`);

        });



    } catch (error) {

        console.error('❌ 启动服务器失败 (可能是数据库连接失败):', error);

        process.exit(1); 

    }

}



initializeServer();