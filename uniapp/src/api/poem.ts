// src/api/poem.ts

// 确保后端 Express 服务运行在 http://localhost:3000
const API_BASE_URL = 'http://localhost:3000/api';

// --- 1. 获取古诗词列表 (支持搜索) ---
export const fetchPoemList = (query = '') => {
    let url = `${API_BASE_URL}/poems`;
    if (query) {
        url += `?search=${encodeURIComponent(query)}`;
    }
    // 使用 uni.request 发送 GET 请求
    return uni.request({ url, method: 'GET' });
};

// --- 2. 获取诗词详情 ---
export const fetchPoemDetail = (id: number) => {
    // ****** 修正：URL 路径改为 /poems (复数) 以匹配后端路由 ******
    return uni.request({
        url: `${API_BASE_URL}/poems/${id}`, 
        method: 'GET'
    });
};
// --- 3. 获取评论列表 ---
export const fetchPoemComments = (poemID: number) => {
    // 使用 uni.request 发送 GET 请求
    return uni.request({
        url:`${API_BASE_URL}/poems/${poemID}/comments`,
        method: 'GET'
    });
};

// --- 4. 提交新评论或回复 ---
// payload 结构: { poemID: number, content: string, username?: string, parentID?: number | null }
export const submitNewComment = (payload: object) => {
    // 使用 uni.request 发送 POST 请求
    return uni.request({
        url: `${API_BASE_URL}/comments`,
        method: 'POST',
        data: payload,
        header: { 'Content-Type': 'application/json' } // 明确告知后端数据格式
    });
};

// --- 5. 获取诗人关系图谱数据 ---
export const fetchRelationshipData = () => {
    // 使用 uni.request 发送 GET 请求
    return uni.request({
        url: `${API_BASE_URL}/relationships`,
        method: 'GET'
    });
};