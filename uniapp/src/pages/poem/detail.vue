<template>

    <view class="container">

        <view v-if="poemDetail" class="poem-display">

            <text class="title">{{ poemDetail.title }}</text>

            

            <text class="meta">{{ poemDetail.dynasty }} · {{ poemDetail.poet }}</text>

            

            <view class="content-block">

                <text 

                    v-for="(line, index) in poemLines" 

                    :key="index" 

                    class="line"

                >

                    {{ line }}

                </text>

            </view>

        </view>

        <view v-else-if="loading" class="loading-tip">正在加载诗词详情...</view>

        <view v-else class="error-tip">诗词加载失败或不存在。</view>

        

        <UniSection title="用户评论" type="line"></UniSection>



        <view class="comment-list">

            <view v-if="commentLoading" class="loading-tip">评论加载中...</view>

            <view v-else-if="comments.length === 0" class="empty-comment">

                暂无评论，快来抢沙发吧！

            </view>

                        <CommentItem 

                v-else

                v-for="comment in comments" 

                :key="comment.id" 

                :comment="comment" 

                @reply="replyTo"

            />

        </view>



        <UniSection :title="replyingToName ? `回复 @${replyingToName}` : '发表评论'" type="line"></UniSection>

        <view class="comment-form">

            <input 

                type="text" 

                v-model="newComment.username" 

                placeholder="您的昵称（可选）" 

                class="input-field" 

            />

            <textarea 

                v-model="newComment.content" 

                placeholder="输入您的评论内容..." 

                auto-height 

                class="textarea-field" 

            />

            

            <button 

                type="submit" 

                :loading="isSubmitting" 

                @click="submitComment"

                class="submit-btn"

            >

                提交评论

            </button>

            

            <button 

                v-if="replyingToName" 

                @click="cancelReply" 

                type="button" 

                size="mini" 

                class="cancel-reply-btn"

            >

                取消回复

            </button>

        </view>

    </view>

</template>



<script setup lang="ts">

import { ref, computed } from 'vue';

import { onLoad } from '@dcloudio/uni-app';



// 导入 UniSection

import UniSection from '@dcloudio/uni-ui/lib/uni-section/uni-section.vue'; 

// 🌟 核心修改 1：导入递归评论组件

import CommentItem from '@/components/CommentItem.vue'; 



import { 

    fetchPoemDetail, 

    fetchPoemComments, 

    submitNewComment 

} from '@/api/poem';



// --- 接口定义 ---

interface PoemDetail {

    id: number;

    title: string;

    content: string;

    poet: string;      

    dynasty: string;

}



// 🌟 核心修改 2：新的嵌套评论接口 (与后端返回的结构一致)

interface CommentWithReplies {

    id: number;

    poemID: number;

    content: string;

    username: string;

    createdAt: string;

    parentID: number | null;

    parentUsername: string | null; // 后端 JOIN 来的被回复者姓名

    replies: CommentWithReplies[]; // 嵌套回复

}





// --- 状态 ---

const poemID = ref<number | null>(null);

const poemDetail = ref<PoemDetail | null>(null);

// 🌟 核心修改 3：更新 comments 的类型

const comments = ref<CommentWithReplies[]>([]); 

const loading = ref(false);

const commentLoading = ref(false);

const isSubmitting = ref(false);



const newComment = ref({

    username: '',

    content: '',

    parentID: null as number | null,

});

const replyingToName = ref('');



// --- 核心修改：计算属性用于诗句分行 ---

const poemLines = computed(() => {

    const content = poemDetail.value?.content;

    if (content && typeof content === 'string') {

        return content.trim().split('\n').filter(line => line.trim() !== '');

    }

    return [];

});





// --- 生命周期钩子 ---

onLoad((options) => {

    const id = Number(options?.id);

    if (id) {

        poemID.value = id;

        loadPoemData(id);

    } else {

        uni.showToast({ title: '缺少诗词ID', icon: 'none' });

    }

});



// --- 方法 ---



async function loadPoemData(id: number) {

    loading.value = true;

    commentLoading.value = true;

    try {

        const [detailRes, commentsRes] = await Promise.all([

            fetchPoemDetail(id),

            fetchPoemComments(id)

        ]);

        

        // 假设后端返回结构是 { data: T }

        poemDetail.value = (detailRes.data as { data: PoemDetail }).data;

        // 🌟 关键：这里获取的是后端已转换好的树形结构

        comments.value = (commentsRes.data as { data: CommentWithReplies[] }).data || [];



    } catch (error) {

        console.error('加载数据失败:', error);

        uni.showToast({ title: '加载失败，请检查网络和后端服务', icon: 'error' });

    } finally {

        loading.value = false;

        commentLoading.value = false;

    }

}



// 🌟 核心修改 4：格式化时间函数

function formatTime(isoTime: string): string {

    if (!isoTime) return '未知时间';

    const date = new Date(isoTime);

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

}



// 🌟 核心修改 5：replyTo 函数的参数类型与 CommentWithReplies 一致

function replyTo(comment: CommentWithReplies) {

    newComment.value.parentID = comment.id;

    replyingToName.value = comment.username;

    // 自动滚动到评论框

    uni.pageScrollTo({

        selector: '.comment-form',

        duration: 300,

    });

}



function cancelReply() {

    newComment.value.parentID = null;

    replyingToName.value = '';

}



async function submitComment() {

    if (!poemID.value) {

        uni.showToast({ title: '无法获取诗词ID', icon: 'error' });

        return;

    }

    

    if (!newComment.value.content.trim()) {

        uni.showToast({ title: '评论内容不能为空', icon: 'none' });

        return;

    }



    isSubmitting.value = true;

    const payload = {

        poemID: poemID.value,

        content: newComment.value.content.trim(),

        username: newComment.value.username || '匿名用户',

        parentID: newComment.value.parentID,

    };



    try {

        await submitNewComment(payload);

        uni.showToast({ title: '评论提交成功！', icon: 'success' });

        

        newComment.value.content = '';

        newComment.value.username = '';

        cancelReply(); 

        

        // 重新加载数据以显示新评论

        await loadPoemData(poemID.value); 



    } catch (error) {

        console.error('提交评论失败:', error);

        uni.showToast({ title: '提交失败，请重试', icon: 'error' });

    } finally {

        isSubmitting.value = false;

    }

}

</script>



<style scoped>

.container { 

    padding: 20rpx; 

    background-color: #f7f3ed;

    min-height: 100vh;

}

.poem-display { 

    padding: 30rpx; 

    background-color: #fff; 

    margin-bottom: 40rpx;

    border-radius: 12rpx;

    box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);

}

.title { 

    font-size: 48rpx; 

    font-weight: bold; 

    display: block; 

    text-align: center; 

    margin-bottom: 10rpx; 

}

.meta { 

    font-size: 28rpx; 

    color: #666; 

    display: block; 

    text-align: center; 

    margin-bottom: 30rpx; 

    padding-bottom: 15rpx;

    border-bottom: 1rpx dashed #e0d9d3;

}

/* 诗句样式 */

.content-block {

    padding: 30rpx 0;

    text-align: center; 

}

.line {

    display: block; 

    font-size: 38rpx;

    line-height: 1.8;

    color: #333;

    margin-bottom: 15rpx; 

}





/* 评论列表容器样式 */

.comment-list {

    margin-top: 20rpx;

    margin-bottom: 40rpx;

}

/* 之前的 .comment-item, .comment-header, .username, .reply-btn 等样式已移至 CommentItem.vue */





/* 表单样式 */

.comment-form {

    padding: 20rpx 0;

}

.input-field, .textarea-field {

    border: 1rpx solid #ddd;

    padding: 15rpx;

    margin-bottom: 15rpx;

    border-radius: 8rpx;

    background-color: #fff;

    font-size: 32rpx;

}

.textarea-field {

    min-height: 150rpx;

}



/* 提交按钮样式 */

.submit-btn {

    background-color: #007aff; 

    color: #fff;

    border-radius: 10rpx;

    font-size: 32rpx;

    margin-bottom: 15rpx;

}



.cancel-reply-btn {

    margin-top: 20rpx;

    background-color: #f0f0f0;

    color: #666;

    border: 1rpx solid #ccc;

}



/* 提示信息样式 */

.loading-tip, .error-tip, .empty-comment {

    text-align: center;

    padding: 40rpx 20rpx;

    color: #888;

    font-size: 30rpx;

}

.error-tip {

    color: #e63737;

    font-weight: bold;

}

</style>