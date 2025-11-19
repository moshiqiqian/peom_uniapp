<template>

    <view class="container">

        <uni-search-bar 

            @confirm="onSearch" 

            placeholder="搜索诗人、朝代、诗名..." 

            @clear="clearSearch"

            @cancel="clearSearch"

            :value="poemStore.searchQuery" 

        /> 

        

        <view v-if="poemStore.searchQuery" class="search-status-bar">

            <text class="status-text">当前筛选: "{{ poemStore.searchQuery }}"</text>

            <button @click="clearSearch" class="clear-btn" size="mini">清除</button>

        </view>

        

        <view class="functional-entries">

            <view class="relationship-entry" @click="goToRelationshipPage">

                <uni-tag text="诗人关系图谱" type="primary" inverted />

            </view>

            <view class="ai-entry" @click="showAIModal = true">

                <uni-tag text="AI 诗词推荐" type="warning" inverted />

            </view>

        </view>



        <view v-if="!poemStore.loading" class="poem-list">

            <view 

                v-for="poem in poemStore.poems" 

                :key="poem.id" 

                class="card" 

                @click="goToDetail(poem.id)"

            >

                <text class="title">{{ poem.title }}</text>

                

                <text class="meta">{{ poem.dynasty }} · {{ poem.poet }}</text>

                

                <text class="content">

                    {{ poem.content 

                        ? (poem.content.length > 50 

                            ? poem.content.substring(0, 50).trim() + '...' 

                            : poem.content.trim()) 

                        : '（内容缺失，点击查看详情）' 

                    }}

                </text>

            </view>

            

            <view v-if="poemStore.poems.length === 0 && poemStore.searchQuery" class="empty-tip">

                <text>暂无匹配的诗词，请尝试其他关键词。</text>

            </view>

             <view v-else-if="poemStore.poems.length === 0" class="empty-tip">

                <text>暂无诗词数据或正在加载中...</text>

            </view>

        </view>

        

        <view v-else class="loading-tip">

            <text>正在加载诗词列表...</text>

        </view>



        <AIRecommendationModal 

            v-if="showAIModal" 

            @close="showAIModal = false" 

        />



    </view>

</template>



<script setup lang="ts">

import { ref, onMounted } from 'vue';

import { usePoemStore } from '@/stores/poemStore';

import { onLoad } from '@dcloudio/uni-app';



// 导入 uni-ui 组件

import UniSearchBar from '@dcloudio/uni-ui/lib/uni-search-bar/uni-search-bar.vue';

import UniTag from '@dcloudio/uni-ui/lib/uni-tag/uni-tag.vue';



// 🌟 引入 AI 推荐组件 (需确保路径正确)

import AIRecommendationModal from '@/components/AIRecommendationModal.vue';



const poemStore = usePoemStore(); 



// 🌟 新增状态：控制 AI 模态窗口的显示

const showAIModal = ref(false); 





// --- 方法 ---



function onSearch(e: { value: string }) {

    const query = e.value.trim();

    poemStore.loadPoems(query);

}



function clearSearch() {

    poemStore.loadPoems('');

}



function goToDetail(id: number) {

    uni.navigateTo({

        url: `/pages/poem/detail?id=${id}` 

    });

}



function goToRelationshipPage() {

    uni.navigateTo({

        url: '/pages/poet/relationship' 

    });

}





// --- 生命周期 ---

onLoad(() => {

    if (poemStore.poems.length === 0 || poemStore.searchQuery) {

        poemStore.loadPoems(poemStore.searchQuery);

    }

});

</script>



<style scoped>

/* 样式部分只修改了 functional-entries 容器 */

.container {

    padding: 20rpx;

    background-color: #f0f4f7;

    min-height: 100vh;

}

.search-status-bar {

    display: flex;

    align-items: center;

    justify-content: space-between;

    padding: 10rpx 0;

    font-size: 28rpx;

    color: #666;

    margin-bottom: 10rpx;

}

.status-text {

    flex: 1;

    white-space: nowrap;

    overflow: hidden;

    text-overflow: ellipsis;

}

.clear-btn {

    margin-left: 20rpx;

    background-color: #e6e6e6;

    color: #333;

    border: none;

    font-size: 24rpx;

    padding: 0 15rpx;

    height: 50rpx;

    line-height: 50rpx;

}



/* 🌟 修改点 3：将关系图谱和 AI 推荐入口放在同一个容器内 */

.functional-entries {

    display: flex;

    justify-content: flex-end;

    gap: 20rpx; /* 标签之间的间距 */

    margin-top: 10rpx;

    margin-bottom: 20rpx;

}



/* 关系图谱入口 */

.relationship-entry {

    display: flex;

}



/* AI 推荐入口 */

.ai-entry {

    display: flex;

}



/* 诗词列表 */

.poem-list {

    margin-top: 20rpx;

}



/* 诗词卡片样式 */

.card {

    background-color: #fff;

    padding: 30rpx;

    margin-bottom: 25rpx;

    border-radius: 12rpx;

    box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.08); 

    border-left: 6rpx solid #b45b3e;

    cursor: pointer;

}

.title {

    font-size: 38rpx;

    font-weight: bold;

    color: #333;

    display: block;

    margin-bottom: 5rpx;

}

.meta {

    font-size: 26rpx;

    color: #b45b3e;

    display: block;

    margin-bottom: 15rpx;

    padding-bottom: 10rpx;

    border-bottom: 1rpx dashed #f0f0f0;

}

.content {

    font-size: 30rpx;

    color: #666;

    display: block;

    line-height: 1.6;

    white-space: nowrap;

    overflow: hidden;

    text-overflow: ellipsis; 

}



/* 提示信息 */

.loading-tip, .empty-tip {

    text-align: center;

    padding: 60rpx;

    color: #888;

    font-size: 30rpx;

}

</style>