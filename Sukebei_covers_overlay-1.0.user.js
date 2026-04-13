// ==UserScript==
// @name         Sukebei_covers_overlay
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  hentai-coversのリンクに対応した同人誌であればオーバーレイ表示でカーソルを合わせるだけで表示できるようになります。
// @author       Kisaragi Ririka
// @match        https://sukebei.nyaa.si/*
// @grant        GM_xmlhttpRequest
// @connect      sukebei.nyaa.si
// @connect      hentai-covers.site
// ==/UserScript==

(function() {
    'use strict';

    const detailLinkPattern = /\/view\/\d+/;
    const targetSiteDomain = "hentai-covers.site";

    const previewDiv = document.createElement('div');
    previewDiv.style.cssText = `
        position: fixed; z-index: 10000; display: none; pointer-events: none;
        background: #1a1a1a; border: 1px solid #444; padding: 5px; border-radius: 4px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5); color: #fff; font-size: 11px;
    `;
    const previewImg = document.createElement('img');
    previewImg.style.cssText = "max-height: 650px; width: auto; display: none; border: 1px solid #555;";
    const statusText = document.createElement('div');
    statusText.style.padding = "10px";

    previewDiv.appendChild(previewImg);
    previewDiv.appendChild(statusText);
    document.body.appendChild(previewDiv);

    document.addEventListener('mouseover', function(e) {
        const link = e.target.closest('a');
        if (link && detailLinkPattern.test(link.href)) {
            const detailUrl = link.href;

            statusText.innerText = "🔍 Scanning Detail Page...";
            statusText.style.display = 'block';
            previewImg.style.display = 'none';
            previewDiv.style.display = 'block';

            GM_xmlhttpRequest({
                method: "GET",
                url: detailUrl,
                onload: function(res) {
                    const htmlText = res.responseText;

                    // 1. 文字列からURLを抽出（元々の正常動作ロジック）
                    const regex = new RegExp("https?://" + targetSiteDomain + "/image/[\\w\\d]+", 'i');
                    const foundMatch = htmlText.match(regex);
                    let imagePageUrl = foundMatch ? foundMatch[0] : null;

                    // 2. DOMから抽出
                    if (!imagePageUrl) {
                        const doc = new DOMParser().parseFromString(htmlText, "text/html");
                        const aTag = Array.from(doc.querySelectorAll('a')).find(a => a.href.includes(targetSiteDomain));
                        if (aTag) imagePageUrl = aTag.href;
                    }

                    if (imagePageUrl) {
                        statusText.innerText = "🚀 Fetching Final Image...";
                        fetchStep2(imagePageUrl.replace(/&amp;/g, '&'));
                    } else {
                        statusText.innerText = "❌ Error: Link to Cover Site not found";
                    }
                }
            });
        }
    }, false);

    function fetchStep2(url) {
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: function(res2) {
                const doc2 = new DOMParser().parseFromString(res2.responseText, "text/html");
                const allImgs = Array.from(doc2.querySelectorAll('img'));

                // 【修正】「/images/」を含み、かつシステム系でないものを探す
                const finalImg = allImgs.find(img => {
                    const src = img.getAttribute('src') || "";
                    // 除外：システムディレクトリ、ロゴ、または空のsrc
                    const isSystem = src.includes('/system/') || src.includes('logo') || src === "";
                    // 採用：/images/ パスを含んでいる
                    const isTarget = src.includes('/images/');

                    return isTarget && !isSystem;
                });

                if (finalImg) {
                    let imgSrc = finalImg.getAttribute('src');
                    if (imgSrc.startsWith('/')) imgSrc = new URL(url).origin + imgSrc;

                    previewImg.src = imgSrc;
                    previewImg.onload = () => {
                        statusText.style.display = 'none';
                        previewImg.style.display = 'block';
                    };
                } else {
                    statusText.innerText = "❌ Error: Target image not found";
                }
            }
        });
    }

    document.addEventListener('mousemove', e => {
        if (previewDiv.style.display === 'block') {
            const offset = 20;
            let x = e.clientX + offset;
            let y = e.clientY + offset;
            if (x + previewDiv.offsetWidth > window.innerWidth) x = e.clientX - previewDiv.offsetWidth - offset;
            if (y + previewDiv.offsetHeight > window.innerHeight) y = e.clientY - previewDiv.offsetHeight - offset;
            previewDiv.style.left = x + 'px';
            previewDiv.style.top = y + 'px';
        }
    });

    document.addEventListener('mouseout', e => {
        const link = e.target.closest('a');
        if (link && detailLinkPattern.test(link.href)) {
            previewDiv.style.display = 'none';
            previewImg.src = '';
        }
    });
})();