import { NextRequest, NextResponse } from "next/server";

const AD_SERVER = process.env.AUTH_URL || "https://hikakinmaniacoin.hikamer.f5.si";

// Serves /ad.js - paste one line to any site to enable HKM ads
export async function GET(req: NextRequest) {
  const js = `
(function() {
  'use strict';
  var AD_SERVER = '${AD_SERVER}';
  var STORAGE_KEY = 'hkm_session';
  var MAX_ADS = 3;
  var AD_INTERVAL_MS = 30000; // 30s between checks

  function getSession() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch(e) { return ''; }
  }

  function getSiteName() {
    return location.hostname.replace(/^www\\./, '');
  }

  function createAdContainer(ad) {
    var div = document.createElement('div');
    div.className = 'hkm-ad';
    div.style.cssText = [
      'display:block',
      'margin:8px auto',
      'padding:8px 12px',
      'background:rgba(245,158,11,0.08)',
      'border:1px solid rgba(245,158,11,0.2)',
      'border-radius:8px',
      'font-size:13px',
      'color:#94a3b8',
      'text-align:center',
      'max-width:728px',
      'box-sizing:border-box',
      'position:relative',
    ].join(';');

    var label = document.createElement('span');
    label.style.cssText = 'position:absolute;top:4px;right:6px;font-size:10px;color:#f59e0b;opacity:0.7';
    label.textContent = 'HKM広告';
    div.appendChild(label);

    if (ad) {
      var inner = document.createElement('div');
      inner.style.marginTop = '4px';
      if (ad.imageUrl) {
        var img = document.createElement('img');
        img.src = ad.imageUrl;
        img.style.cssText = 'max-width:100%;max-height:90px;object-fit:contain;display:block;margin:0 auto 4px';
        img.alt = '';
        inner.appendChild(img);
      }
      if (ad.content) {
        var p = document.createElement('p');
        p.style.margin = '0';
        p.textContent = ad.content;
        inner.appendChild(p);
      }
      if (ad.linkUrl) {
        var a = document.createElement('a');
        a.href = ad.linkUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.cssText = 'color:#f59e0b;font-size:12px;text-decoration:none';
        a.textContent = '詳しく見る →';
        inner.appendChild(a);
      }
      div.appendChild(inner);
    } else {
      // No HKM ad - show placeholder (AdSense can fill this)
      div.setAttribute('data-hkm-empty', '1');
      div.style.display = 'none';
    }
    return div;
  }

  function injectAds(data) {
    // Remove existing HKM ads
    document.querySelectorAll('.hkm-ad').forEach(function(el) { el.remove(); });

    if (!data.show) return; // User paid to hide ads

    // Find insertion points: after first <p>, <h1>, <h2>, <article>
    var targets = Array.from(document.querySelectorAll('article, main, .content, #content, body'));
    var inserted = 0;
    for (var i = 0; i < targets.length && inserted < MAX_ADS; i++) {
      var target = targets[i];
      var children = Array.from(target.children);
      // Insert after first meaningful child
      var insertAfter = children.find(function(c) {
        return ['P','H1','H2','H3','DIV','SECTION'].includes(c.tagName);
      });
      if (insertAfter && !insertAfter.classList.contains('hkm-ad')) {
        var adEl = createAdContainer(data.ad);
        insertAfter.parentNode.insertBefore(adEl, insertAfter.nextSibling);
        inserted++;
        break; // One ad per page by default
      }
    }

    // Fallback: append to body
    if (inserted === 0 && data.ad) {
      var adEl = createAdContainer(data.ad);
      adEl.style.position = 'fixed';
      adEl.style.bottom = '16px';
      adEl.style.right = '16px';
      adEl.style.zIndex = '9999';
      adEl.style.maxWidth = '320px';
      adEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      document.body.appendChild(adEl);
    }
  }

  function fetchAndInject() {
    var session = getSession();
    var site = getSiteName();
    var url = AD_SERVER + '/api/ad-serve?site=' + encodeURIComponent(site) + '&sessionToken=' + encodeURIComponent(session);
    fetch(url, { credentials: 'omit' })
      .then(function(r) { return r.json(); })
      .then(injectAds)
      .catch(function() {});
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchAndInject);
  } else {
    fetchAndInject();
  }

  // Refresh periodically
  setInterval(fetchAndInject, AD_INTERVAL_MS);
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
