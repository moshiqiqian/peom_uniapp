import express from 'express'; 

import mysql from 'mysql2/promise'; 

import cors from 'cors'; 

import bodyParser from 'body-parser'; 



// 使用命名空间导入，并提取所需类型

import * as mysqlTypes from 'mysql2';

type RowDataPacket = mysqlTypes.RowDataPacket;

type ResultSetHeader = mysqlTypes.ResultSetHeader;



// --- 1. 配置常量 ---

const PORT = 3000; 



const dbConfig = {

    host: 'localhost',      

    user: 'root',           

    password: '',           

    // 确保数据库名称与您的 SQL 脚本保持一致

    database: 'resource_db1', 

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0

};



// 全局数据库连接池

let pool: mysql.Pool; 

const app = express();



// --- 2. TypeScript 接口定义 (与前端保持一致) ---

interface PoemResult {

    id: number;

    title: string;

    content: string;

    poet: string;      // 对应 SQL 中的 t.name AS poet

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

    id: string;     // 节点唯一标识，对应 poet.name

    group: string;  // 分组信息，对应 poet.dynasty

}



interface GraphLink {

    source: string;     // 源节点ID，对应 poet_relationship.poetA_name

    target: string;     // 目标节点ID，对应 poet_relationship.poetB_name

    relation: string; // 关系描述

    value: number;  // 关系强度

}



interface RelationshipData {

    nodes: GraphNode[];

    links: GraphLink[];

}





// --- 3. 中间件配置 ---

app.use(cors({

    origin: '*',

    methods: ['GET', 'POST', 'PUT', 'DELETE'],

    allowedHeaders: ['Content-Type', 'Authorization']

}));

app.use(bodyParser.json());

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





// 🌟 核心修改：GET /api/poems/:poemID/comments: 获取某个古诗的评论（返回树形结构，并按时间倒序）

app.get('/api/poems/:poemID/comments', async (req: express.Request, res: express.Response) => {

    const poemID = parseInt(req.params.poemID);

    

    if (isNaN(poemID)) {

        return res.status(400).json({ code: 400, message: '古诗ID无效。' });

    }



    // 1. SQL 查询：添加 JOIN 获取 parentUsername，并按时间升序排列 (保证父评论在子评论之前，利于构建树)

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

        

        // 2. 核心：将扁平列表转换为树形结构

        const map = new Map<number, CommentWithReplies>();

        const rootComments: CommentWithReplies[] = [];



        commentList.forEach(comment => {

            const commentWithReplies: CommentWithReplies = { 

                ...(comment as CommentResult & { parentUsername: string | null }), 

                replies: [] 

            };

            

            map.set(comment.id, commentWithReplies);



            if (comment.parentID === null) {

                // 主评论

                rootComments.push(commentWithReplies);

            } else {

                // 回复评论：添加到父评论的 replies 数组中

                const parentComment = map.get(comment.parentID);

                if (parentComment) {

                    parentComment.replies.push(commentWithReplies);

                } else {

                    // 如果父评论不存在，作为根评论（孤儿评论）

                    rootComments.push(commentWithReplies); 

                }

            }

        });



        // 🌟 关键修正：对根评论进行倒序排列，使最新的主评论显示在最前面

        rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());



        res.status(200).json({ 

            code: 200, 

            message: '评论加载成功！',

            data: rootComments // 返回嵌套结构 (已排序)

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

        });



    } catch (error) {

        console.error('❌ 启动服务器失败 (可能是数据库连接失败):', error);

        process.exit(1); 

    }

}



initializeServer();