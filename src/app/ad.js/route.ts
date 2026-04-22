import { NextRequest, NextResponse } from "next/server";

const AD_SERVER = process.env.AUTH_URL || "https://hikakinmaniacoin.hikamer.f5.si";

export async function GET(req: NextRequest) {
  const js = `
(function() {
  'use strict';
  var AD_SERVER = '${AD_SERVER}';
  var STORAGE_KEY = 'hkm_session';
  var AD_INTERVAL_MS = 30000;
  var shownFullscreen = false;

  function getSession() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch(e) { return ''; }
  }
  function getSiteName() { return location.hostname.replace(/^www\\./, ''); }

  // --- インフィード ---
  function injectInfeed(ad) {
    document.querySelectorAll('.hkm-ad-infeed').forEach(function(el) { el.remove(); });
    var div = makeBase('hkm-ad-infeed', ad);
    var targets = Array.from(document.querySelectorAll('article, main, .content, #content, body'));
    var inserted = false;
    for (var i = 0; i < targets.length; i++) {
      var children = Array.from(targets[i].children);
      var after = children.find(function(c) { return ['P','H1','H2','H3','DIV','SECTION'].includes(c.tagName) && !c.classList.contains('hkm-ad-infeed'); });
      if (after) { after.parentNode.insertBefore(div, after.nextSibling); inserted = true; break; }
    }
    if (!inserted) document.body.appendChild(div);
  }

  // --- ポップアップ ---
  function showPopup(ad) {
    if (document.getElementById('hkm-popup')) return;
    var overlay = document.createElement('div');
    overlay.id = 'hkm-popup';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center';
    var box = makeBase('', ad);
    box.style.cssText += ';max-width:400px;width:90%;position:relative;box-shadow:0 8px 32px rgba(0,0,0,0.5)';
    var close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'position:absolute;top:6px;right:8px;background:none;border:none;color:#94a3b8;font-size:16px;cursor:pointer';
    close.onclick = function() { overlay.remove(); };
    box.appendChild(close);
    overlay.appendChild(box);
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    setTimeout(function() { if (document.getElementById('hkm-popup')) overlay.remove(); }, 10000);
  }

  // --- 右下固定バナー ---
  function showFixedBanner(ad) {
    if (document.getElementById('hkm-fixed')) return;
    var div = makeBase('', ad);
    div.id = 'hkm-fixed';
    div.style.cssText += ';position:fixed;bottom:16px;right:16px;z-index:9999;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.4)';
    var close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'position:absolute;top:4px;right:6px;background:none;border:none;color:#94a3b8;font-size:12px;cursor:pointer';
    close.onclick = function() { div.remove(); };
    div.appendChild(close);
    document.body.appendChild(div);
  }

  // --- フルスクリーン ---
  function showFullscreen(ad) {
    if (shownFullscreen || document.getElementById('hkm-fullscreen')) return;
    shownFullscreen = true;
    var overlay = document.createElement('div');
    overlay.id = 'hkm-fullscreen';
    overlay.style.cssText = 'position:fixed;inset:0;background:#0a0a0f;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px';
    var box = makeBase('', ad);
    box.style.cssText += ';max-width:600px;width:100%';
    var skip = document.createElement('button');
    skip.textContent = '5秒後にスキップ →';
    skip.style.cssText = 'margin-top:16px;background:none;border:1px solid #f59e0b;color:#f59e0b;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px';
    skip.disabled = true;
    var count = 5;
    var timer = setInterval(function() {
      count--;
      skip.textContent = count > 0 ? count + '秒後にスキップ →' : 'スキップ →';
      if (count <= 0) { skip.disabled = false; clearInterval(timer); }
    }, 1000);
    skip.onclick = function() { overlay.remove(); };
    overlay.appendChild(box);
    overlay.appendChild(skip);
    document.body.appendChild(overlay);
  }

  // --- 共通ベース要素 ---
  function makeBase(cls, ad) {
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.style.cssText = 'display:block;padding:10px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;font-size:13px;color:#94a3b8;text-align:center;box-sizing:border-box;position:relative';
    var label = document.createElement('span');
    label.style.cssText = 'position:absolute;top:4px;left:6px;font-size:10px;color:#f59e0b;opacity:0.7';
    label.textContent = 'HKM広告';
    div.appendChild(label);
    if (ad.imageUrl) {
      var img = document.createElement('img');
      img.src = ad.imageUrl; img.alt = '';
      img.style.cssText = 'max-width:100%;max-height:120px;object-fit:contain;display:block;margin:4px auto';
      div.appendChild(img);
    }
    if (ad.content) {
      var p = document.createElement('p');
      p.style.margin = '4px 0 0'; p.textContent = ad.content;
      div.appendChild(p);
    }
    if (ad.linkUrl) {
      var a = document.createElement('a');
      a.href = ad.linkUrl; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.style.cssText = 'color:#f59e0b;font-size:12px;text-decoration:none;display:inline-block;margin-top:4px';
      a.textContent = '詳しく見る →';
      div.appendChild(a);
    }
    return div;
  }

  function handleAd(data) {
    if (!data.show || !data.ad) return;
    var t = data.ad.type;
    if (t === 'ALL_SITES' || t === 'SINGLE_SITE') injectInfeed(data.ad);
    else if (t === 'POPUP') showPopup(data.ad);
    else if (t === 'FIXED_BANNER') showFixedBanner(data.ad);
    else if (t === 'FULLSCREEN') showFullscreen(data.ad);
  }

  function fetchAndShow() {
    var url = AD_SERVER + '/api/ad-serve?site=' + encodeURIComponent(getSiteName()) + '&sessionToken=' + encodeURIComponent(getSession());
    fetch(url, { credentials: 'omit' }).then(function(r) { return r.json(); }).then(handleAd).catch(function() {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndShow);
  } else {
    fetchAndShow();
  }
  setInterval(fetchAndShow, AD_INTERVAL_MS);
})();
`;

  return new NextResponse(js, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
