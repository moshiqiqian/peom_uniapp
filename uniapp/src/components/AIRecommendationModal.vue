<template>
    <view class="ai-modal-overlay" @click="$emit('close')">
        <view class="ai-modal-content" @click.stop>
            <text class="modal-title">AI 诗词推荐</text>
            <text class="modal-subtitle">输入意境或主题 (如：思念故乡)</text>
            
            <textarea
                v-model="AIprompt"
                placeholder="输入您的提示词..."
                maxlength="50"
                :disabled="isAILoading"
                class="modal-textarea"
            />

            <button 
                class="modal-button" 
                :loading="isAILoading" 
                :disabled="!AIprompt.trim() || isAILoading"
                @click="handleRecommendation"
            >
                {{ isAILoading ? 'AI 正在思考...' : '开始推荐' }}
            </button>

            <view v-if="AIrecommendations.length > 0" class="modal-result-area">
                <text class="result-header">推荐结果：</text>
                <view 
                    v-for="(name, index) in AIrecommendations" 
                    :key="index" 
                    class="result-item"
                >
                    <text class="index-badge">{{ index + 1 }}</text>
                    <text class="poem-name">{{ name }}</text>
                </view>
            </view>

            <button class="modal-close-button" @click="$emit('close')">关闭</button>

        </view>
    </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// 导入我们刚才创建的 API 函数
import { getAIRecommendations } from '@/api/ai';

// 声明组件可以发出的事件
defineEmits(['close']);

// --- 状态管理 ---
const AIprompt = ref('');
const AIrecommendations = ref<string[]>([]);
const isAILoading = ref(false);

// --- 方法 ---
async function handleRecommendation() {
    if (!AIprompt.value.trim() || isAILoading.value) return;

    isAILoading.value = true;
    AIrecommendations.value = [];

    // 调用 API 服务
    const results = await getAIRecommendations(AIprompt.value);
    
    AIrecommendations.value = results;
    isAILoading.value = false;
}
</script>

<style scoped lang="scss">
/* 注意：这部分样式是必须的，否则 Modal 无法正常显示为 overlay。
   您可以根据需要调整颜色和布局。
*/
.ai-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000; /* 确保 Modal 位于最上层 */
    display: flex;
    align-items: center;
    justify-content: center;
}

.ai-modal-content {
    background-color: #fff;
    border-radius: 20rpx;
    padding: 40rpx;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.3);
}

.modal-title {
    display: block;
    font-size: 38rpx;
    font-weight: bold;
    text-align: center;
    margin-bottom: 10rpx;
}

.modal-subtitle {
    display: block;
    font-size: 28rpx;
    color: #999;
    text-align: center;
    margin-bottom: 30rpx;
}

.modal-textarea {
    width: 100%;
    min-height: 180rpx;
    padding: 20rpx;
    box-sizing: border-box;
    border: 1rpx solid #e0e0e0;
    border-radius: 10rpx;
    font-size: 30rpx;
    margin-bottom: 30rpx;
}

.modal-button {
    background-color: #f90;
    color: #fff;
    border-radius: 50rpx;
    font-size: 32rpx;
    padding: 20rpx 0;
    margin-bottom: 30rpx;
}

.modal-result-area {
    margin-top: 20rpx;
    padding: 20rpx 0;
    border-top: 1rpx solid #eee;
}

.result-header {
    display: block;
    font-size: 30rpx;
    font-weight: bold;
    color: #409eff;
    margin-bottom: 15rpx;
}

.result-item {
    display: flex;
    align-items: center;
    padding: 10rpx 0;
}

.index-badge {
    background-color: #409eff;
    color: #fff;
    font-size: 24rpx;
    border-radius: 50%;
    width: 45rpx;
    height: 45rpx;
    text-align: center;
    line-height: 45rpx;
    margin-right: 20rpx;
    flex-shrink: 0;
}

.poem-name {
    font-size: 30rpx;
    color: #333;
}

.modal-close-button {
    background-color: #f0f0f0;
    color: #666;
    border-radius: 50rpx;
    font-size: 30rpx;
    margin-top: 30rpx;
}
</style>