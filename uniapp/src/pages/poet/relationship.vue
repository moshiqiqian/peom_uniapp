<template>

    <view class="relationship-container">

        <view class="status-box" v-if="loading || error">

            <text v-if="loading" class="status-text loading">正在计算并绘制诗人关系图谱...</text>

            <view v-if="error" class="status-error">

                <text>加载失败：{{ error }}</text>

                <button @click="loadRelationshipData" type="button" size="mini">重试</button>

            </view>

        </view>



        <canvas 

            v-if="!loading && !error"

            canvas-id="poetRelationshipCanvas" 

            :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"

            class="relationship-canvas">

        </canvas>

    </view>

</template>



<script setup lang="ts">

import { ref, onUnmounted, nextTick, getCurrentInstance } from 'vue';

import { onLoad } from '@dcloudio/uni-app';



// 导入后端接口定义的类型

interface GraphNode { id: string; group: string; }

interface GraphLink { source: string; target: string; relation: string; value: number; }

interface RelationshipData { nodes: GraphNode[]; links: GraphLink[]; }



// --- 配置常量 ---

const API_BASE_URL = 'http://localhost:3000/api'; 

const POET_NODE_RADIUS = 15;

const LINK_LINE_COLOR = '#b3c4d5';

const RELATION_TEXT_COLOR = '#34495e';



// --- 布局参数 (快速稳定居中) ---

const ALPHA_DECAY = 0.02;     // 衰减适中

const STRENGTH_LINK = 1.0;    // 连接力

const STRENGTH_CHARGE = -450; // 斥力强度：合理强值

const STRENGTH_CENTER = 0.06; // 向心力强度：恢复到足以居中的水平

const FRICTION = 0.98;        // 摩擦/阻尼：**极大值**，使布局 3 秒内迅速稳定！



// --- 响应式状态 ---

const loading = ref(true);

const error = ref<string | null>(null);

const canvasWidth = ref(375);

const canvasHeight = ref(500);

const nodes = ref<PoetNode[]>([]);

const links = ref<GraphLink[]>([]);

let ctx: UniApp.CanvasContext | null = null;

let simulationTimer: any = null;





// --- 扩展类型定义 ---

interface PoetNode extends GraphNode {

    x: number;

    y: number;

    vx: number; 

    vy: number; 

    color: string; 

}

interface UniAppResponse {

    data: { code: number; message: string; data: RelationshipData; };

    statusCode: number; errMsg: string;

}



// 颜色映射：根据朝代分组

const DYNASTY_COLORS: { [key: string]: string } = {

    '唐': '#3498db', 

    '宋': '#2ecc71', 

    '清': '#9b59b6', 

    '元': '#e74c3c', 

    '明': '#f1c40f', 

    '其他': '#95a5a6' 

};





// --- 生命周期和数据加载 ---



onLoad(() => {

    const systemInfo = uni.getSystemInfoSync();

    canvasWidth.value = systemInfo.windowWidth;

    canvasHeight.value = systemInfo.windowHeight; 

    loadRelationshipData();

});



onUnmounted(() => {

    clearInterval(simulationTimer);

});



async function loadRelationshipData() {

    loading.value = true;

    error.value = null;

    

    try {

        const response: UniAppResponse = await new Promise((resolve, reject) => {

            uni.request({

                url: `${API_BASE_URL}/relationships`,

                method: 'GET',

                success: (res) => {
                    // 兼容类型转换
                    resolve({
                        data: res.data as {
                            code: number;
                            message: string;
                            data: RelationshipData;
                        },
                        statusCode: res.statusCode,
                        errMsg: res.errMsg ?? ''
                    });
                },

                fail: reject

            });
        });



        if (response.statusCode === 200 && response.data.code === 200) {

            const data = response.data.data;

            

            const centerX = canvasWidth.value / 2;

            const centerY = canvasHeight.value / 2;

            

            const initializedNodes: PoetNode[] = data.nodes.map((node) => ({

                ...node,

                // 初始位置稍微集中在中心

                x: centerX + (Math.random() - 0.5) * 50,

                y: centerY + (Math.random() - 0.5) * 50,

                vx: 0,

                vy: 0,

                color: DYNASTY_COLORS[node.group] || DYNASTY_COLORS['其他']

            }));

            

            nodes.value = initializedNodes;

            links.value = data.links;

            

            nextTick(() => {

                initCanvas(); 

                startSimulation(); // 启动短暂的计算

            });

        } else {

            error.value = `请求失败: ${response.data.message || '未知错误'}`;

        }

    } catch (e) {

        error.value = `网络错误或服务器无响应: ${(e as any).errMsg || (e as Error).message}`;

    } finally {

        loading.value = false;

    }

}



/** 初始化 Canvas 上下文 */

function initCanvas() {

    // #ifdef MP

    const vm = getCurrentInstance()?.proxy as any;
    ctx = uni.createCanvasContext('poetRelationshipCanvas', vm);

    // #endif

    

    // #ifndef MP

    ctx = uni.createCanvasContext('poetRelationshipCanvas');

    // #endif

}





// --- 布局模拟 (Force-Directed Layout) ---



function startSimulation() {

    clearInterval(simulationTimer);

    (nodes.value as any).alpha = 1; 

    

    // *** 核心：仅运行 3 秒 (60 FPS * 3 = 180 帧) ***

    const totalTicks = 60 * 3; 

    let tickCount = 0;



    simulationTimer = setInterval(() => {

        tick();

        tickCount++;

        // 运行到帧数限制后停止

        if (tickCount >= totalTicks) {

             clearInterval(simulationTimer);

             simulationTimer = null;

        }

    }, 1000 / 60); 

}



function tick() {

    if (!nodes.value.length || !ctx) return;



    let alpha = (nodes.value as any).alpha;

    if (alpha < 0.001) {

        alpha = 0;

    }

    (nodes.value as any).alpha -= ALPHA_DECAY;



    // 1. Link Force (连接力)

    links.value.forEach(link => {

        const sourceNode = nodes.value.find(n => n.id === link.source)!;

        const targetNode = nodes.value.find(n => n.id === link.target)!;

        const dx = targetNode.x - sourceNode.x;

        const dy = targetNode.y - sourceNode.y;

        const distance = Math.sqrt(dx * dx + dy * dy);

        

        // 理想距离

        const idealDistance = 120 - link.value * 10; 

        

        const strength = STRENGTH_LINK * alpha * (distance - idealDistance) / distance;



        if (distance > 0) {

            const forceX = dx * strength;

            const forceY = dy * strength;

            sourceNode.vx += forceX;

            sourceNode.vy += forceY;

            targetNode.vx -= forceX;

            targetNode.vy -= forceY;

        }

    });



    // 2. Charge Force (斥力) & Center Force (向心力) & Position Update

    const centerX = canvasWidth.value / 2;

    const centerY = canvasHeight.value / 2;

    const boundaryPadding = POET_NODE_RADIUS * 2; 



    nodes.value.forEach(nodeA => {

        // 斥力计算

        for (let i = 0; i < nodes.value.length; i++) {

            const nodeB = nodes.value[i];

            if (nodeA === nodeB) continue;



            const dx = nodeB.x - nodeA.x;

            const dy = nodeB.y - nodeA.y;

            const distanceSq = dx * dx + dy * dy;

            

            // 斥力

            const strength = STRENGTH_CHARGE * alpha / (distanceSq || 1); 

            

            const forceX = dx * strength;

            const forceY = dy * strength;



            nodeA.vx -= forceX;

            nodeA.vy -= forceY;

        }



        // 向心力（居中）

        nodeA.vx += (centerX - nodeA.x) * STRENGTH_CENTER * alpha;

        nodeA.vy += (centerY - nodeA.y) * STRENGTH_CENTER * alpha;

        

        // 速度衰减 (摩擦力)，极高的 FRICTION 意味着快速稳定

        nodeA.vx *= FRICTION; 

        nodeA.vy *= FRICTION;

        

        // 位置更新

        nodeA.x += nodeA.vx;

        nodeA.y += nodeA.vy;

        

        // 软性边界惩罚

        if (nodeA.x < boundaryPadding || nodeA.x > canvasWidth.value - boundaryPadding) {

            nodeA.vx = -nodeA.vx * 0.5; 

            nodeA.x = Math.max(boundaryPadding, Math.min(canvasWidth.value - boundaryPadding, nodeA.x));

        }

        if (nodeA.y < boundaryPadding || nodeA.y > canvasHeight.value - boundaryPadding) {

            nodeA.vy = -nodeA.vy * 0.5; 

            nodeA.y = Math.max(boundaryPadding, Math.min(canvasHeight.value - boundaryPadding, nodeA.y));

        }

    });



    drawCanvas();

}





// --- 绘制 ---



function drawCanvas() {

    if (!ctx) return;

    

    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

    

    // 1. 绘制边 (Links)

    links.value.forEach(link => {

        const sourceNode = nodes.value.find(n => n.id === link.source)!;

        const targetNode = nodes.value.find(n => n.id === link.target)!;

        

        // 绘制连线

        ctx!.beginPath();

        ctx!.setStrokeStyle(LINK_LINE_COLOR);

        ctx!.setLineWidth(0.5 + link.value * 0.3);

        ctx!.setLineCap('round');

        ctx!.setGlobalAlpha(0.6); 

        ctx!.moveTo(sourceNode.x, sourceNode.y);

        ctx!.lineTo(targetNode.x, targetNode.y);

        ctx!.stroke();

        

        // 绘制关系文字

        ctx!.setGlobalAlpha(1.0); 

        const midX = (sourceNode.x + targetNode.x) / 2;

        const midY = (sourceNode.y + targetNode.y) / 2;

        

        ctx!.setFontSize(10);

        ctx!.setTextAlign('center');

        ctx!.setTextBaseline('middle');

        

        // 绘制文字背景：纯白色矩形

        ctx!.save();

        ctx!.setFillStyle('rgba(255, 255, 255, 1)'); 

        const textMetrics = ctx!.measureText(link.relation);

        const textWidth = textMetrics.width || (link.relation.length * 10);

        ctx!.fillRect(midX - textWidth / 2 - 3, midY - 8, textWidth + 6, 16);

        ctx!.restore();

        

        // 绘制文字

        ctx!.setFillStyle(RELATION_TEXT_COLOR); 

        ctx!.fillText(link.relation, midX, midY); 

    });



    // 2. 绘制节点 (Nodes)

    nodes.value.forEach(node => {

        // 节点圆形

        ctx!.beginPath();

        ctx!.arc(node.x, node.y, POET_NODE_RADIUS, 0, 2 * Math.PI);

        ctx!.setFillStyle(node.color); 

        ctx!.fill();

        

        // 节点边框

        ctx!.setStrokeStyle('#ffffff'); 

        ctx!.setLineWidth(1.5);

        ctx!.stroke();



        // 节点文字 (诗人姓名)

        ctx!.setFillStyle('#ffffff'); 

        ctx!.setFontSize(10);

        ctx!.setTextAlign('center');

        ctx!.setTextBaseline('middle');

        

        const poetName = node.id.length > 3 ? node.id.substring(0, 3) : node.id;

        ctx!.fillText(poetName, node.x, node.y); 

    });



    ctx!.draw();

}



</script>



<style scoped>

.relationship-container {

    width: 100vw;

    height: 100vh;

    display: flex;

    flex-direction: column;

    align-items: center;

    justify-content: center; 

    background-color: #f0f2f5; 

}



.status-box {

    text-align: center;

    padding: 20px;

}



.relationship-canvas {

    width: 100%;

    height: 100%;

    background-color: #ffffff; 

    border-radius: 8px;

    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08); 

}

</style>