// resource-backend/server.ts



import express from 'express'; 

import mysql from 'mysql2/promise'; 

import cors from 'cors'; 

import bodyParser from 'body-parser'; 



// 引入 Axios (用于 API 调用)

import axios from 'axios'; 



// 🌟 引入 SOCKS 代理模块

import { SocksProxyAgent } from 'socks-proxy-agent'; 



// 使用命名空间导入，并提取所需类型

import * as mysqlTypes from 'mysql2';

type RowDataPacket = mysqlTypes.RowDataPacket;

type ResultSetHeader = mysqlTypes.ResultSetHeader;

type Pool = mysql.Pool; 



// --- 1. 配置常量 ---

const PORT = 3000; 



// 密钥和代理配置

const GEMINI_API_KEY = 'AIzaSyBJQa_Dq7DWef4xfLfmgPDRH8uDsDyIWTg'; 

// 🌟 关键：使用 SOCKS5 协议，并使用您之前确认的 7897 端口

const SOCKS_PROXY_URL = 'socks5://127.0.0.1:7897'; 

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";



// 代理 Agent 初始化

const agent = new SocksProxyAgent(SOCKS_PROXY_URL);

console.log(`✅ SOCKS 代理 Agent 已创建: ${SOCKS_PROXY_URL}`);





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

let pool: Pool; 

const app = express();

app.use(bodyParser.json()); 





// --- 数据库连接初始化 ---

try {

    pool = mysql.createPool(dbConfig);

    console.log("✅ MySQL 连接池已创建.");

} catch (error) {

    console.error("❌ 创建 MySQL 连接池失败:", error as any);

    process.exit(1); 

}



// --- 辅助函数：通过诗名查找诗词详情 **(已修改)** ---

/**

 * 通过诗名在数据库中精确查找诗词详情。

 * @param title 诗词标题

 * @returns 找到的诗词详情或 null

 */

async function findPoemByTitle(title: string): Promise<PoemResult | null> {

    // 确保输入被清理掉前后空格

    const cleanedTitle = title.trim();



    // 🌟 修正：使用 TRIM(p.title) 确保数据库中的诗名也清理掉空格，然后使用 = 进行精确匹配

    const sql = `

        SELECT 

            p.id, p.title, p.content, 

            t.name AS poet, 

            t.dynasty 

        FROM poem p

        JOIN poet t ON p.poetID = t.id

        WHERE TRIM(p.title) = ?

    `;



    try {

        const [rows] = await pool.execute(sql, [cleanedTitle]);

        const poemDetail = (rows as PoemResult[])[0];

        return poemDetail || null;

    } catch (error) {

        console.error('数据库查询诗词详情失败:', error as any);

        return null;

    }

}





// --- 辅助函数：调用 Gemini API (保持不变) ---

async function callGeminiApi(systemInstruction: string, userPrompt: string): Promise<string> {

    if (!GEMINI_API_KEY) {

        console.error("Gemini API Key is missing.");

        return "无法调用AI服务：缺少API Key";

    }



    const payload = {

        contents: [

            {

                role: "user",

                parts: [

                    {

                        text: `${systemInstruction}\n\n${userPrompt}` 

                    }

                ]

            }

        ],

    };



    let lastError: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {

        try {

            const response = await axios.post(

                `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,

                payload,

                { 

                    headers: { 'Content-Type': 'application/json' },

                    timeout: 30000, 

                    httpAgent: agent, 

                    httpsAgent: agent,

                }

            );



            const resultText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

            

            if (resultText) {

                return resultText; 

            }

            return "";



        } catch (error) {

            lastError = error;

            

            console.error(`❌ Gemini API调用失败 (尝试 ${attempt + 1}/3):`);

            if (axios.isAxiosError(error)) {

                if (error.response) {

                    console.error(`   -> 响应状态 ${error.response.status}: ${JSON.stringify(error.response.data)}`);

                }

                console.error(`   -> ${error.code || 'AxiosError'} ${error.message}`);

            } else {

                console.error(`   -> 底层网络错误: ${(error as any).message} (检查 SOCKS 代理 ${SOCKS_PROXY_URL} 是否运行)`);

            }



            if (attempt === 2) break;

            const delay = Math.pow(2, attempt) * 1000;

            await new Promise(resolve => setTimeout(resolve, delay));

        }

    }

    

    console.error("Gemini API调用失败，重试后仍然失败:", lastError as any);

    return "AI服务调用失败，请检查API Key、代理设置和网络连接。";

}

// --- 辅助函数 END ---





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





// --- 4. 路由定义 ---





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

        console.error('获取诗词列表失败:', error as any);

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

        console.error('获取诗词详情失败:', error as any);

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

        console.error('获取评论失败:', error as any);

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

        console.error('新增评论失败:', error as any);

        res.status(500).json({ code: 500, message: '服务器错误，评论添加失败。' });

    }

});





// POST /api/ai/recommendations: 获取 AI 推荐的诗词名称 (已修改查询逻辑)

app.post('/api/ai/recommendations', async (req: express.Request, res: express.Response) => {

    

    const { prompt } = req.body; 



    if (!prompt) {

        return res.status(400).json({ code: 400, message: '提示词不能为空。' });

    }

    

    // --- 🌟 逻辑 1: 尝试精确匹配诗名 ---

    const poemDetail = await findPoemByTitle(prompt);

    

    if (poemDetail) {

        console.log(`🔍 识别到诗名: "${prompt.trim()}"，返回详情。`);

        // 匹配成功，返回该诗词的详情

        return res.json({

            code: 200,

            message: `成功获取诗词详情: 《${poemDetail.title}》`,

            type: 'detail', // 标识返回的是详情

            data: {

                title: poemDetail.title,

                poet: poemDetail.poet,

                dynasty: poemDetail.dynasty,

                content: poemDetail.content

            }

        });

    }

    

    console.log(`❌ 未匹配到精确诗名: "${prompt.trim()}"，转为 AI 推荐。`);



    // --- 逻辑 2: 如果不是诗名，进行 AI 推荐 ---

    

    const systemInstruction = `

        你是一位专业的中国古诗词鉴赏家。你的任务是根据用户提供的主题或意境，推荐5首主题或意境相似的古诗词的名称。请以清晰的、每行一个诗名的列表格式返回，不要包含作者或其他解释。

    `;

    

    const userPrompt = `用户主题: ${prompt}`;



    const recommendedDramasString = await callGeminiApi(systemInstruction, userPrompt);

    

    if (recommendedDramasString.includes("AI服务调用失败")) {

        return res.status(500).json({ code: 500, message: recommendedDramasString });

    }

    

    const recommendedDramas = recommendedDramasString.split('\n')

        .map(line => line.replace(/^-|^\*|^\d+\.|\s/g, '').trim()) 

        .filter(name => name.length > 0);





    res.json({

        code: 200,

        message: 'AI 推荐成功',

        type: 'recommendation', // 标识返回的是推荐列表

        data: recommendedDramas 

    });

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

        console.error('获取关系图谱数据失败:', error as any);

        res.status(500).json({ code: 500, message: '服务器错误，获取图谱失败。' });

    }

});





// ----------------------------------------------------

// --- 6. 启动流程 ---

// ----------------------------------------------------



async function initializeServer() {

    try {

        await pool.query('SELECT 1 + 1 AS solution');

        console.log('✅ MySQL 数据库连接成功！');



        app.listen(PORT, () => {

            console.log(`🚀 服务器已启动: http://localhost:${PORT}`);

            console.log(`✨ AI 推荐接口 (支持诗名和意境查询): POST http://localhost:${PORT}/api/ai/recommendations`);

            console.log(`⚠️ 请确保您的 SOCKS 代理 (${SOCKS_PROXY_URL}) 正在运行！`);

        });



    } catch (error) {

        console.error('❌ 启动服务器失败 (可能是数据库连接失败):', error as any);

        process.exit(1); 

    }

}



initializeServer();