<template>
  <view class="container">
    <view class="header">
      <text class="title">诗人关系图谱 (D3 Canvas 兼容版)</text>
    </view>
    
    <canvas 
      id="relationshipCanvas" 
      canvas-id="relationshipCanvas" 
      class="relationship-canvas" 
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      disable-scroll="true" 
      draggable="false" 
      
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    ></canvas>

    <view v-if="loading" class="loading-overlay">
      <text class="loading-text">正在加载并计算图谱...</text>
    </view>
    
    <view v-if="!loading && nodes.length === 0" class="error-text">
      <text>未能加载数据。请检查后端服务是否启动，并确认 IP 地址配置正确。</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import * as d3 from 'd3'; 
import { fetchRelationshipData } from '@/api/poem'; // 假设 API 函数已导入

// --- 配置常量 ---
// 🚨 注意：请确认此 IP 地址是否正确。如果 H5 仍使用 localhost，但小程序必须使用 IP。
const API_BASE_URL = 'http://192.168.126.134:3000/api'; 
const NODE_RADIUS = 12;
const FONT_SIZE = 10;
const SIMULATION_DURATION = 1500; // 模拟时间

// --- 状态数据 ---
const canvasWidth = ref(375);
const canvasHeight = ref(400); 
const ctx = ref(null);
const loading = ref(true);

const nodes = ref([]);
const links = ref([]);

let simulation = null;
let transform = d3.zoomIdentity; 

// 交互状态
let draggingNode = null; 
let lastPinchDistance = 0;
let lastCenter = { x: 0, y: 0 };
let panning = false;


// --- 颜色工具函数 (优化颜色分组) ---
const getColor = (group) => {
  if (group && group.includes('唐')) return '#4e79a7'; // 唐：蓝
  if (group && group.includes('宋')) return '#f28e2b'; // 宋：橙
  if (group && group.includes('元')) return '#59a14f'; // 元：绿
  if (group && group.includes('明')) return '#af7aa1'; // 明：紫
  // 默认颜色（柔和色）
  return '#76b7b2'; 
};

// --- 绘图函数 (优化文字和描边) ---
const renderCanvas = () => {
  if (!ctx.value) return;
  const context = ctx.value;
  
  context.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  
  // 核心：应用 D3 的 transform 状态（平移和缩放）
  context.save();
  context.translate(canvasWidth.value / 2, canvasHeight.value / 2);
  context.translate(transform.x, transform.y);
  context.scale(transform.k, transform.k);
  
  // 1. 绘制连线和关系文本
  links.value.forEach(link => {
    if (link.source && link.target && link.source.x !== undefined) {
      const { x: x1, y: y1 } = link.source;
      const { x: x2, y: y2 } = link.target;
      
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = '#999999';
      context.lineWidth = 1 / transform.k; 
      context.stroke();

      // 绘制关系文本
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      context.fillStyle = '#333';
      context.setFontSize(FONT_SIZE / transform.k); 
      context.setTextAlign('center');
      context.setTextBaseline('middle');
      context.fillText(link.relation, midX, midY - (5 / transform.k));
    }
  });
  
  // 2. 绘制节点
  nodes.value.forEach(node => {
    if (node.x !== undefined && node.y !== undefined) {
      
      // --- 节点本身 ---
      context.beginPath();
      context.fillStyle = getColor(node.group);
      context.arc(node.x, node.y, NODE_RADIUS / transform.k, 0, 2 * Math.PI); 
      context.fill();
      
      // 🌟 优化：添加描边，提升清晰度
      context.strokeStyle = '#666'; 
      context.lineWidth = 0.5 / transform.k; 
      context.stroke();
      
      // --- 诗人姓名 (移到圆圈外部) ---
      context.fillStyle = '#333'; 
      context.setFontSize(FONT_SIZE / transform.k); 
      context.setTextAlign('left'); 
      context.setTextBaseline('middle'); 
      
      // 🌟 优化：将文字位置移到圆圈外部 (右侧)
      const textOffsetX = (NODE_RADIUS + 3) / transform.k; 
      context.fillText(node.id, node.x + textOffsetX, node.y); 
    }
  });

  context.restore();
  context.draw(false); 
};


// ----------------------------------------------------------------------------------
// --- D3 力模拟和数据加载 (优化布局参数) ---
// ----------------------------------------------------------------------------------

const initSimulation = () => {
    if (simulation) simulation.stop();
    if (nodes.value.length === 0) { loading.value = false; return; }
    
    simulation = d3.forceSimulation(nodes.value)
        // 🌟 优化：增加 link distance 到 120
        .force('link', d3.forceLink(links.value).id(d => d.id).distance(120)) 
        // 🌟 优化：增强排斥力，防止拥挤
        .force('charge', d3.forceManyBody().strength(-400)) 
        .force('center', d3.forceCenter(0, 0)) 
        // 🌟 关键优化：添加碰撞检测，防止节点重叠
        .force('collide', d3.forceCollide().radius(NODE_RADIUS * 1.5).strength(0.8)); 

    setTimeout(() => { if(simulation) simulation.stop(); renderCanvas(); }, SIMULATION_DURATION); 

    simulation.alpha(1).restart(); 
    loading.value = false;
};


const fetchRelationships = async () => {
    loading.value = true;
    try {
        const res = await uni.request({
            url: `${API_BASE_URL}/relationships`,
            method: 'GET',
        });
        
        const result = res.data;
        if (res.statusCode === 200 && result && result.data) {
            nodes.value = result.data.nodes || [];
            links.value = result.data.links || [];
            initSimulation();
        } else {
            console.error('❌ 获取关系图谱数据失败:', result ? result.message : '返回数据结构错误');
            nodes.value = []; loading.value = false;
        }

    } catch (err) {
        console.error('❌ 网络请求失败，请检查 IP 地址和后端服务状态:', err);
        loading.value = false; nodes.value = []; 
        uni.showToast({ title: '加载图谱失败，请检查网络和IP', icon: 'none' });
    }
};


// ----------------------------------------------------------------------------------
// ** D3 交互事件处理 (基于 Canvas 原生事件) **
// ----------------------------------------------------------------------------------

const findNodeByPoint = (x, y) => {
    if (!simulation) return null;
    
    const d3_x = (x - canvasWidth.value / 2 - transform.x) / transform.k;
    const d3_y = (y - canvasHeight.value / 2 - transform.y) / transform.k;
    const searchRadius = NODE_RADIUS / transform.k; 
    
    return simulation.find(d3_x, d3_y, searchRadius);
};

const handleTouchStart = (event) => {
    event.preventDefault(); 
    
    if (event.touches.length === 1) {
        const touch = event.touches[0];
        draggingNode = findNodeByPoint(touch.x, touch.y);
        
        if (draggingNode) {
            if (simulation) simulation.alphaTarget(0.3).restart();
            draggingNode.fx = draggingNode.x;
            draggingNode.fy = draggingNode.y;
        } else {
            panning = true;
            lastCenter = { x: touch.x, y: touch.y };
        }
        
    } else if (event.touches.length === 2) {
        panning = false;
        draggingNode = null;
        const [t1, t2] = event.touches;
        lastPinchDistance = Math.hypot(t2.x - t1.x, t2.y - t1.y);
    }
};

const handleTouchMove = (event) => {
    event.preventDefault(); 
    
    if (draggingNode) {
        const touch = event.touches[0];
        draggingNode.fx = (touch.x - canvasWidth.value / 2 - transform.x) / transform.k;
        draggingNode.fy = (touch.y - canvasHeight.value / 2 - transform.y) / transform.k;
        renderCanvas();
        
    } else if (event.touches.length === 1 && panning) {
        const touch = event.touches[0];
        const dx = touch.x - lastCenter.x;
        const dy = touch.y - lastCenter.y;

        transform = transform.translate(dx, dy);
        lastCenter = { x: touch.x, y: touch.y };
        renderCanvas();

    } else if (event.touches.length === 2) {
        const [t1, t2] = event.touches;
        const newPinchDistance = Math.hypot(t2.x - t1.x, t2.y - t1.y);
        const scaleFactor = newPinchDistance / lastPinchDistance;

        let newK = transform.k * scaleFactor;
        
        if (newK < 0.5) newK = 0.5;
        if (newK > 4) newK = 4;
        
        const center_x = (t1.x + t2.x) / 2;
        const center_y = (t1.y + t2.y) / 2;
        
        // 使用 D3.zoomIdentity 进行复杂的缩放和平移计算
        transform = d3.zoomIdentity
            .translate(center_x, center_y) 
            .scale(newK)                   
            .translate(transform.x / transform.k * newK - center_x, transform.y / transform.k * newK - center_y); 

        lastPinchDistance = newPinchDistance;
        renderCanvas();
    }
};

const handleTouchEnd = (event) => {
    event.preventDefault(); 
    
    panning = false;
    lastPinchDistance = 0;

    if (draggingNode) {
        if (simulation) simulation.alphaTarget(0);
        draggingNode.fx = null;
        draggingNode.fy = null;
        draggingNode = null;
    }
};


// --- 生命周期钩子 ---
onMounted(async () => {
    uni.getSystemInfo({
        success: (res) => {
            canvasWidth.value = res.windowWidth; 
            canvasHeight.value = res.windowHeight - 80; 
        }
    });

    await nextTick();
    
    // 获取 Canvas 2D 绘图上下文
    ctx.value = uni.createCanvasContext('relationshipCanvas'); 

    // 开始加载数据和模拟
    fetchRelationships();
});
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f0f4f7; 
  padding: 10px;
}
.header {
  padding: 10px 0;
  text-align: center;
  background-color: #ffffff;
  border-radius: 8px;
  margin-bottom: 10px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}
.title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}
.relationship-canvas {
  flex-grow: 1; 
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.loading-overlay {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 10;
}
.loading-text, .error-text {
    font-size: 14px;
    color: #666;
    text-align: center;
    padding: 20px;
}
.error-text {
    color: #e15759;
    font-weight: bold;
}
</style>