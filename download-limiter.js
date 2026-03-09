/**
 * 下载限制管理脚本
 * 功能：根据 config.json 中的 dailyDownloadLimit 字段限制每日下载次数
 * 存储：使用 localStorage 记录每个资源的每日下载次数
 * 重置：每天午夜自动重置计数器
 */

(function() {
  'use strict';

  const STORAGE_PREFIX = 'download_limit_';
  const STORAGE_DATE_SUFFIX = '_date';

  /**
   * 获取今天的日期字符串 (YYYY-MM-DD)
   */
  function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }

  /**
   * 获取资源的下载计数
   */
  function getDownloadCount(resourceId) {
    const key = STORAGE_PREFIX + resourceId;
    const dateKey = key + STORAGE_DATE_SUFFIX;
    const today = getTodayDateString();
    const storedDate = localStorage.getItem(dateKey);

    // 如果日期不匹配，重置计数
    if (storedDate !== today) {
      localStorage.setItem(dateKey, today);
      localStorage.setItem(key, '0');
      return 0;
    }

    const count = localStorage.getItem(key);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * 增加下载计数
   */
  function incrementDownloadCount(resourceId) {
    const key = STORAGE_PREFIX + resourceId;
    const dateKey = key + STORAGE_DATE_SUFFIX;
    const today = getTodayDateString();

    const currentCount = getDownloadCount(resourceId);
    localStorage.setItem(dateKey, today);
    localStorage.setItem(key, String(currentCount + 1));
  }

  /**
   * 检查是否可以下载
   */
  function canDownload(resourceId, dailyLimit) {
    // 如果没有设置限制，允许下载
    if (!dailyLimit || dailyLimit <= 0) {
      return true;
    }

    const currentCount = getDownloadCount(resourceId);
    return currentCount < dailyLimit;
  }

  /**
   * 获取剩余下载次数
   */
  function getRemainingDownloads(resourceId, dailyLimit) {
    if (!dailyLimit || dailyLimit <= 0) {
      return null; // 无限制
    }

    const currentCount = getDownloadCount(resourceId);
    return Math.max(0, dailyLimit - currentCount);
  }

  /**
   * 拦截所有下载链接
   */
  function interceptDownloads() {
    // 监听所有点击事件
    document.addEventListener('click', function(event) {
      const target = event.target;

      // 查找最近的下载链接或按钮
      let downloadElement = target.closest('[data-download-id]');
      
      if (!downloadElement) {
        // 尝试找到包含 href 的链接
        const link = target.closest('a[href]');
        if (link && link.getAttribute('data-download-id')) {
          downloadElement = link;
        }
      }

      if (downloadElement) {
        const resourceId = downloadElement.getAttribute('data-download-id');
        const dailyLimit = parseInt(downloadElement.getAttribute('data-daily-limit') || '0', 10);

        if (dailyLimit > 0 && !canDownload(resourceId, dailyLimit)) {
          event.preventDefault();
          event.stopPropagation();

          const remaining = getRemainingDownloads(resourceId, dailyLimit);
          const message = remaining === 0 
            ? `今日下载次数已达上限 (${dailyLimit}次)，请明天再试`
            : `今日剩余下载次数: ${remaining}`;

          alert(message);
          return false;
        }

        // 允许下载，增加计数
        incrementDownloadCount(resourceId);
      }
    }, true);
  }

  /**
   * 更新 UI 显示剩余下载次数
   */
  function updateDownloadLimitDisplay() {
    const elements = document.querySelectorAll('[data-download-id][data-daily-limit]');
    
    elements.forEach(element => {
      const resourceId = element.getAttribute('data-download-id');
      const dailyLimit = parseInt(element.getAttribute('data-daily-limit') || '0', 10);

      if (dailyLimit > 0) {
        const remaining = getRemainingDownloads(resourceId, dailyLimit);
        const limitText = element.getAttribute('data-limit-text-element');

        if (limitText) {
          const textElement = document.querySelector(limitText);
          if (textElement) {
            if (remaining === 0) {
              textElement.textContent = '(今日已达限制)';
              textElement.style.color = '#ef4444';
            } else {
              textElement.textContent = `(今日剩余: ${remaining}/${dailyLimit})`;
              textElement.style.color = '#f59e0b';
            }
          }
        }
      }
    });
  }

  /**
   * 初始化
   */
  function init() {
    interceptDownloads();
    updateDownloadLimitDisplay();

    // 每分钟更新一次显示（以防跨越午夜）
    setInterval(updateDownloadLimitDisplay, 60000);
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露到全局作用域供外部调用
  window.DownloadLimiter = {
    canDownload,
    getRemainingDownloads,
    getDownloadCount,
    incrementDownloadCount
  };
})();
