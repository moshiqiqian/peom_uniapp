// src/stores/poemStore.ts

import { defineStore } from 'pinia';

import { fetchPoemList } from '@/api/poem'; 



// --- 接口定义（确保这些接口存在于您的文件中） ---



interface CommonResponse<T> {

    code: number;

    message: string;

    data: T; 

}



// 定义 uni.request 返回的响应对象（res）的结构

interface UniAppPoemResponse {

    data: CommonResponse<Poem[]>; 

    statusCode: number;

}



// 诗词数据接口定义

interface Poem {

    id: number;

    title: string;

    content: string;

    poet: string;      

    dynasty: string;

}



/**

 * 诗词 Store (使用 Pinia Options API)

 */

export const usePoemStore = defineStore('poem', {

    state: () => ({

        poems: [] as Poem[],

        loading: false,

        searchQuery: '',

    }),

    

    actions: {

        async loadPoems(query = '') {

            this.loading = true;

            this.searchQuery = query;

            

            try {

                // 🚨 关键修复：使用双重断言 (as unknown as T) 绕过 TypeScript 的严格检查

                const res = (await fetchPoemList(query)) as unknown as UniAppPoemResponse; // <--- 修复行

                

                const apiResponse = res.data; 



                // 检查后端返回的 code 和 data 数组

                if (apiResponse && apiResponse.code === 200 && apiResponse.data) {

                    this.poems = apiResponse.data as Poem[];

                } else {

                    this.poems = [];

                    console.error('API 返回数据结构异常:', res); 

                }

            } catch (error) {

                console.error('加载诗词列表失败:', error);

                this.poems = [];

            } finally {

                this.loading = false;

            }

        },

        

        clearPoems() {

            this.poems = [];

            this.searchQuery = '';

        }

    },

});