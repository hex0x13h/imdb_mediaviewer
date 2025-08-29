// ==UserScript==
// @name         IMDb Mediaviewer
// @namespace    hex0x13h
// @version      1.0.0
// @description  在 IMDb 图片浏览器添加“下载原图”按钮/快捷键S。
// @author       you
// @match        https://www.imdb.com/*/mediaviewer/*
// @match        https://www.imdb.com/title/*/mediaviewer/*
// @match        https://www.imdb.com/name/*/mediaviewer/*
// @match        https://www.imdb.com/gallery/*/mediaviewer/*
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  function upscaleAmazonImage(url) {
    if (!url) return url;
    try {
      const u = new URL(url, location.href);
      u.search = ''; u.hash = '';
      u.pathname = u.pathname
        .replace(/_(UX|UY|SX|SY)\d+_/gi, '_')
        .replace(/_CR\d+,\d+,\d+,\d+_/gi, '_')
        .replace(/_QL\d+_/gi, '_')
        .replace(/_AL_/gi, '_')
        .replace(/_FMwebp_/gi, '_')
        .replace(/_V1_.*(\.jpe?g|\.png)$/i, '_V1$1')
        .replace(/__+/g, '_');
      return u.toString();
    } catch { return url; }
  }
  function rectVisibleArea(rect) {
    const vw = window.innerWidth, vh = window.innerHeight;
    const left = Math.max(0, Math.min(vw, rect.left));
    const right = Math.max(0, Math.min(vw, rect.right));
    const top = Math.max(0, Math.min(vh, rect.top));
    const bottom = Math.max(0, Math.min(vh, rect.bottom));
    return Math.max(0, right - left) * Math.max(0, bottom - top);
  }
  function isActuallyVisible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width >= 100 && r.height >= 100 && rectVisibleArea(r) > 0;
  }
  function guessWidthFromUrl(u) {
    const m = u.match(/_(?:U?X|S[XY]|SR)(\d+)[_,.]/i) || u.match(/(\d{3,5})\.(?:jpe?g|png)/i);
    return m ? +m[1] : 0;
  }

  function getCurrentImageUrl() {
    const cands = [];
    document.querySelectorAll('img').forEach(img => {
      const url = img.currentSrc || img.src || img.getAttribute('data-src');
      if (!url || !/m\.media-amazon\.com\/images/i.test(url)) return;
      if (!isActuallyVisible(img)) return;
      const r = img.getBoundingClientRect();
      const area = rectVisibleArea(r);
      cands.push({ url, area });
    });
    document.querySelectorAll('*').forEach(el => {
      if (!(el instanceof HTMLElement)) return;
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg.includes('m.media-amazon.com/images')) return;
      if (!isActuallyVisible(el)) return;
      const m = bg.match(/url\(["']?([^"')]+)["']?\)/i);
      if (m && m[1]) {
        const r = el.getBoundingClientRect();
        const area = rectVisibleArea(r);
        cands.push({ url: m[1], area });
      }
    });
    cands.sort((a, b) => b.area - a.area);
    if (cands.length) return upscaleAmazonImage(cands[0].url);

    // 兜底：取分辨率最高的一张
    const urls = Array.from(document.images).map(i => i.currentSrc || i.src || i.getAttribute('data-src'))
      .filter(u => u && /m\.media-amazon\.com\/images/i.test(u));
    urls.sort((a, b) => guessWidthFromUrl(b) - guessWidthFromUrl(a));
    return urls.length ? upscaleAmazonImage(urls[0]) : null;
  }

  /* ---------- UI ---------- */
  function createButton() {
    const btn = document.createElement('button');
    btn.textContent = '下载原图';
    btn.id = 'imdb-dl-btn';
    Object.assign(btn.style, {
      position:'fixed', right:'16px', bottom:'16px',
      padding:'10px 14px', borderRadius:'10px', border:'none',
      background:'rgba(32,33,36,0.9)', color:'#fff',
      fontSize:'14px', cursor:'pointer', zIndex:999999,
      boxShadow:'0 6px 16px rgba(0,0,0,0.25)', backdropFilter:'blur(4px)'
    });
    btn.addEventListener('click', () => {
      const url = getCurrentImageUrl();
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    });
    document.body.appendChild(btn);
  }

  function setupHotkey() {
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 's' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const tag = (document.activeElement && document.activeElement.tagName) || '';
        if (!/INPUT|TEXTAREA|SELECT/.test(tag)) {
          e.preventDefault();
          const url = getCurrentImageUrl();
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
        }
      }
    }, true);
  }

  function init() {
    if (!document.getElementById('imdb-dl-btn')) createButton();
    setupHotkey();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  setTimeout(init, 800);
})();
