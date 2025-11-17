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
        
        <view class="relationship-entry" @click="goToRelationshipPage">
            <uni-tag text="诗人关系图谱" type="primary" inverted />
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
                <text>正在加载中，请稍候...</text>
            </view>
        </view>
        
        <view v-else class="loading-tip">
            <text>正在加载诗词列表...</text>
        </view>

    </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { usePoemStore } from '@/stores/poemStore';
import { onLoad } from '@dcloudio/uni-app';

// ****** 修正：手动导入 uni-ui 组件 (解决 Failed to resolve component 错误) ******
import UniSearchBar from '@dcloudio/uni-ui/lib/uni-search-bar/uni-search-bar.vue';
import UniTag from '@dcloudio/uni-ui/lib/uni-tag/uni-tag.vue';
// ************************************************************************************

// 修正：确保 Pinia Store 在顶层实例化 (解决重复创建警告)
const poemStore = usePoemStore(); 

// --- 方法 ---

// 搜索确认事件
function onSearch(e: { value: string }) {
    const query = e.value.trim();
    poemStore.loadPoems(query);
}

// 清除搜索事件
function clearSearch() {
    poemStore.loadPoems('');
}

// 跳转到详情页
function goToDetail(id: number) {
    // ****** 最终关键修正：根据 pages.json 修正跳转路径 ******
    uni.navigateTo({
        url: `/pages/poem/detail?id=${id}` // 修正后的路径
    });
}

// 跳转到关系图谱页
function goToRelationshipPage() {
    // ****** 最终关键修正：根据 pages.json 修正跳转路径 ******
    uni.navigateTo({
        url: '/pages/poet/relationship' // 修正后的路径
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
/* 样式部分保持不变 */
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

/* 关系图谱入口 */
.relationship-entry {
    margin-top: 10rpx;
    margin-bottom: 20rpx;
    display: flex;
    justify-content: flex-end;
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