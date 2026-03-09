(function() {
    // 下载限制核心逻辑
    const STORAGE_KEY = 'power_audio_download_stats';
    let dailyLimit = 5; // 默认值，稍后会从 config.json 同步

    // 获取今日日期字符串 (YYYY-MM-DD)
    function getTodayStr() {
        const now = new Date();
        return now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
    }

    // 获取或初始化下载统计
    function getStats() {
        const stats = localStorage.getItem(STORAGE_KEY);
        const today = getTodayStr();
        if (stats) {
            try {
                const parsed = JSON.parse(stats);
                if (parsed.date === today) {
                    return parsed;
                }
            } catch (e) {}
        }
        return { date: today, count: 0 };
    }

    // 保存统计
    function saveStats(stats) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
    }

    // 更新界面展示
    function updateUI() {
        const stats = getStats();
        const remaining = Math.max(0, dailyLimit - stats.count);
        
        // 创建或更新剩余次数展示标签
        let badge = document.getElementById('download-limit-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'download-limit-badge';
            badge.style.cssText = 'position:fixed;bottom:20px;right:20px;background:rgba(0,0,0,0.8);color:#fff;padding:10px 15px;border-radius:12px;font-size:13px;z-index:9999;pointer-events:none;border:1px solid rgba(255,255,255,0.1);box-shadow:0 4px 12px rgba(0,0,0,0.3);font-family:sans-serif;transition:all 0.3s ease;';
            document.body.appendChild(badge);
        }
        
        badge.innerHTML = `📅 今日剩余下载次数: <b style="color:${remaining > 0 ? '#4caf50' : '#ff5252'};font-size:15px;">${remaining}</b> / ${dailyLimit}`;
        
        // 如果次数用完，尝试寻找下载链接并置灰（可选增强）
        if (remaining <= 0) {
            document.querySelectorAll('a[href*="123pan.cn"]').forEach(a => {
                a.style.opacity = '0.5';
                a.style.cursor = 'not-allowed';
            });
        }
    }

    // 拦截下载点击
    document.addEventListener('click', function(e) {
        // 查找点击的目标是否为下载链接（123网盘链接）
        const target = e.target.closest('a');
        if (target && target.href && (target.href.includes('123pan.cn') || target.href.includes('v.123pan.cn'))) {
            const stats = getStats();
            if (stats.count >= dailyLimit) {
                e.preventDefault();
                alert(`⚠️ 抱歉，今日免费下载次数已达上限 (${dailyLimit}次)。\n\n请明天再来，或联系管理员获取更多权限。`);
                return false;
            }
            
            // 确认下载后记录
            // 注意：由于无法 100% 确认用户是否真的下载成功，这里点击即视为一次下载
            stats.count += 1;
            saveStats(stats);
            updateUI();
        }
    }, true);

    // 从 config.json 同步配置
    function syncConfig() {
        fetch('config.json?t=' + Date.now()) // 加时间戳防止缓存
            .then(res => res.json())
            .then(config => {
                if (config.site && config.site.downloadLimit) {
                    dailyLimit = parseInt(config.site.downloadLimit);
                } else if (config.downloadLimit) {
                    dailyLimit = parseInt(config.downloadLimit);
                }
                updateUI();
            })
            .catch(err => {
                console.error('无法加载下载限制配置:', err);
                updateUI();
            });
    }

    // 初始化
    syncConfig();
    
    // 定时刷新 UI（应对 SPA 路由切换和零点重置）
    setInterval(updateUI, 3000);
    
    // 暴露接口供调试
    window.resetDownloadCount = function() {
        localStorage.removeItem(STORAGE_KEY);
        syncConfig();
        console.log('下载计数已重置');
    };
})();
