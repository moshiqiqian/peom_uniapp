// uniapp/src/api/ai.ts

// ------------------------------------------------------------------
// ⚠️ 注意：请确保这里的 BASE_URL 与您的 Node.js 服务器地址一致
// ------------------------------------------------------------------
const BASE_URL = 'http://localhost:3000'; 

/**
 * 调用后端 API 获取 AI 推荐的诗词名称
 * @param prompt 用户输入的意境或主题
 * @returns 诗词名称数组
 */
export async function getAIRecommendations(prompt: string): Promise<string[]> {
    if (!prompt.trim()) {
        return [];
    }
    
    try {
        const res = await uni.request({
            url: `${BASE_URL}/api/ai/recommendations`,
            method: 'POST',
            data: {
                prompt: prompt.trim()
            },
            header: {
                'Content-Type': 'application/json'
            }
        });

        const serverResponse = res.data as { code: number, message: string, data: string[] };

        if (serverResponse.code === 200 && Array.isArray(serverResponse.data)) {
            if (serverResponse.data.length === 0) {
                 uni.showToast({ title: 'AI未生成有效推荐', icon: 'none' });
            }
            return serverResponse.data;
        } else {
            console.error('AI API 错误:', serverResponse.message);
            uni.showToast({ title: serverResponse.message || '获取推荐失败', icon: 'none' });
            return [];
        }

    } catch (error) {
        console.error('AI 推荐网络请求失败:', error);
        uni.showToast({ title: '网络连接错误或代理问题', icon: 'none' });
        return [];
    }
}