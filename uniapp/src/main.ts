import { createSSRApp } from "vue";
import { createPinia } from 'pinia';
import App from "./App.vue";

export function createApp() {
    const app = createSSRApp(App);
    
    // 确保这里只注册了 Pinia
    const pinia = createPinia();
    app.use(pinia);
    
    return {
        app,
    };
}