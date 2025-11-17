<template>

    <view class="comment-item">

        

        <view class="comment-body" :class="{'reply-body': comment.parentID !== null}">

            <view class="comment-header">

                <text class="username">{{ comment.username || '匿名用户' }}</text>

                <text class="time">{{ formatTime(comment.createdAt) }}</text>

            </view>

            

            <view class="comment-content">

                <text v-if="comment.parentUsername" class="reply-target">

                    回复 @{{ comment.parentUsername }}: 

                </text>

                {{ comment.content }}

            </view>

            

            <button @click="$emit('reply', comment)" size="mini" class="reply-btn">回复</button>

        </view>



        <view v-if="comment.replies && comment.replies.length" class="replies-list">

            <CommentItem 

                v-for="reply in comment.replies" 

                :key="reply.id" 

                :comment="reply" 

                @reply="$emit('reply', $event)" 

            />

        </view>

    </view>

</template>



<script setup lang="ts">

import { defineProps, defineEmits } from 'vue';



// 递归组件需要 self-import

import CommentItem from './CommentItem.vue';



// --- 接口定义 ---

interface CommentWithReplies {

    id: number;

    poemID: number;

    content: string;

    username: string;

    createdAt: string;

    parentID: number | null;

    parentUsername: string | null;

    replies: CommentWithReplies[]; 

}



// 定义 Props 和 Emits

defineProps<{

    comment: CommentWithReplies

}>();



defineEmits(['reply']);



// 方法：格式化时间

function formatTime(isoTime: string): string {

    if (!isoTime) return '未知时间';

    const date = new Date(isoTime);

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

}

</script>



<style scoped>

/* 评论项的根容器 */

.comment-item { 

    /* 移除掉落所有不必要的边距，只保留底部间距 */

    margin-bottom: 10rpx;

    position: relative;

}



/* 评论主体样式 (主评论和回复的共同样式) */

.comment-body {

    padding: 20rpx; 

    border-bottom: 1rpx solid #eee; 

    background-color: #fff;

    border-radius: 8rpx;

    box-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.05);

}



/* 🌟 优化：回复评论的背景区别 */

.reply-body {

    background-color: #f7f7f7; /* 略微区分回复背景 */

}



/* 🌟 核心优化：Replies list 添加左内边距作为缩进 */

.replies-list {

    /* 整个回复块向内缩进 30rpx，解决累积问题 */

    padding-left: 30rpx; 

    margin-top: -10rpx; /* 稍微向上拉，使回复和父评论更紧凑 */

}



.comment-header { 

    display: flex; 

    justify-content: space-between; 

    align-items: center;

    margin-bottom: 10rpx; 

}

.username { 

    font-weight: bold; 

    color: #333; 

    font-size: 30rpx;

}

.time { 

    font-size: 24rpx; 

    color: #999; 

}



.reply-target {

    color: #007aff; /* 强调色 */

    font-weight: bold;

    margin-right: 10rpx;

}



.comment-content { 

    margin-bottom: 15rpx; 

    line-height: 1.6; 

    color: #555;

    font-size: 32rpx;

}

.reply-btn {

    position: absolute;

    top: 20rpx;

    right: 20rpx;

    background-color: #e6e6e6;

    color: #333;

    border: none;

    font-size: 24rpx;

    padding: 4rpx 10rpx;

}

</style>