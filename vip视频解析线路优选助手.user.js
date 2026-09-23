// ==UserScript==
// @name              vip视频解析线路优选助手
// @name:zh-CN        vip视频解析线路优选助手
// @namespace         urn:yk1234f:vip-route-selector
// @author            yk1234f
// @grant             GM_addStyle
// @grant             GM_openInTab
// @grant             GM_getValue
// @grant             GM_setValue
// @charset           UTF-8
// @license           GPL License
// @version           3.9.8
// @updateURL         https://update.greasyfork.org/scripts/596803/vip%E8%A7%86%E9%A2%91%E8%A7%A3%E6%9E%90%E7%BA%BF%E8%B7%AF%E4%BC%98%E9%80%89%E5%8A%A9%E6%89%8B.meta.js
// @downloadURL       https://update.greasyfork.org/scripts/596803/vip%E8%A7%86%E9%A2%91%E8%A7%A3%E6%9E%90%E7%BA%BF%E8%B7%AF%E4%BC%98%E9%80%89%E5%8A%A9%E6%89%8B.user.js
// @description       按正片时长自动试线，观察实际播放进度，持续暂停原视频；检测未知时明确提示。
// @run-at            document-start
// @grant             GM_xmlhttpRequest
// @grant             unsafeWindow
// @match             http://*/*
// @match             https://*/*
// @connect           api.bilibili.com
// ==/UserScript==

// 本修改版维护者：yk1234f。名称和 namespace 已独立。
// 上游参考：爱观影视vip通行证，作者 lsym。
// 上游来源：https://scriptcat.org/zh-CN/script-show-page/6458
// 用户提供版本的许可证声明为 GPL License，未注明具体版本；本文件保留该声明。
// 本版新增并发实播评分、时长比较、成功计数和排序，保留上游来源说明，非冒充上游作者。

(function () {
    "use strict";
    const apis = [
        { n: "虾米",       u: "https://jx.xmflv.com/?url=" },
        { n: "M1907",      u: "https://im1907.top/?jx=" },
        // 暂停：2s0、777/花旗、芒果 m3u8.tv、七哥、973、夜幕
        { n: "IK9",        u: "https://yparse.ik9.cc/index.php?url=" },
        { n: "playerjy",   u: "https://jx.playerjy.com/?url=" },
        { n: "IK",         u: "https://pl.aszzys.com/player/ec.php?code=ikm3u8&if=1&url=" },
        // 从芒果TV1聚合页提取；虾米不重复添加，M1907保留原入口，2s0继续停用。
        { n: "TXNP",       u: "https://bfq.txnp.cn/player?url=" },
        { n: "Playr",      u: "https://super.playr.top/?url=" },
        { n: "DMFLV",      u: "https://jx.dmflv.cc/?url=" },
        { n: "七七云解析", u: "https://jx.77flv.cc/?url=" },
        { n: "臻享视听",   u: "https://player.maqq.cn/?url=" },
        { n: "HLS",        u: "https://jx.hls.one/?url=" }
    ];
    const hosts = [
        ["v.qq.com","#mod_player,#player-container,.container-player,.txp-player-container"],
        ["m.v.qq.com",".mod_player,#player"],["w.mgtv.com","#mgtv-player-wrap"],
        ["www.mgtv.com","#mgtv-player-wrap"],["m.mgtv.com",".video-area"],
        ["www.bilibili.com","#player_module,#bilibiliPlayer,#bilibili-player"],
        ["m.bilibili.com",".player-wrapper,.player-container,.mplayer"],
        ["www.iqiyi.com","#video"],["m.iqiyi.com",".m-video-player-wrap,iqpdiv.iqp-player"],
        ["www.iq.com",".intl-video-wrap"],
        ["v.youku.com","#player,#playerMouseWheel,.youku-player,.player-container"],
        ["m.youku.com","#player,.h5-detail-player"],["tv.sohu.com","#player"],
        ["film.sohu.com","#playerWrap"],["www.le.com","#le_playbox"],
        ["video.tudou.com",".td-playbox"],["v.pptv.com","#pptv_playpage_box"],
        ["vip.pptv.com",".w-video"],["www.wasu.cn","#flashContent"],
        ["www.acfun.cn","#player"],["vip.1905.com","#player,#vodPlayer"],
        ["www.1905.com","#player,#vodPlayer"]
    ];
    const DurationTools = (() => {
        function parse(value) {
            if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
            if (typeof value !== 'string') return null;
            let s = value.normalize('NFKC').trim();
            s=s.replace(/[零〇一二两三四五六七八九十百]+(?=\s*(?:小时|小時|时|時|分钟|分鐘|分|秒))/g,word=>{
                let result=0,current=0;
                const digits={'零':0,'〇':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
                for(const c of word) {
                    if(c==='十'||c==='百'){result+=(current||1)*(c==='十'?10:100);current=0;}
                    else current=digits[c];
                }
                return String(result+current);
            });
            s = s.replace(/^(?:正片时长|总时长|视频时长|时长|total\s*(?:duration|time|length)|duration|runtime|length)\s*[:：]?\s*/i,'');
            if (s.includes('/')) s = s.split('/').at(-1).trim();
            if (/^\d+(?:\.\d+)?$/.test(s)) return parse(Number(s));
            const iso = s.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i);
            if (iso) return parse((+iso[1] || 0) * 86400 + (+iso[2] || 0) * 3600 + (+iso[3] || 0) * 60 + (+iso[4] || 0));
            let total=0, units=0;
            const rest=s.replace(/(\d+(?:\.\d+)?)\s*(小时|小時|钟头|鐘頭|时|時|hours?|hrs?|h|分钟|分鐘|分|minutes?|mins?|m|秒钟|秒鐘|秒|seconds?|secs?|s)/gi,(_,n,unit)=>{
                units++;
                total+=Number(n)*(/^(?:小时|小時|钟头|鐘頭|时|時|h)/i.test(unit)?3600:/^(?:分钟|分鐘|分|m)/i.test(unit)?60:1);
                return '';
            }).replace(/[\s,，]+|\band\b/gi,'');
            if(units && !rest) return parse(total);
            if (!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(s)) return null;
            const parts = s.split(':').map(Number);
            if (parts.slice(1).some(n => n >= 60)) return null;
            return parse(parts.reduce((total, n) => total * 60 + n, 0));
        }
        function input(value) {
            const s = String(value).normalize('NFKC').trim();
            return /^\d+(?:\.\d+)?$/.test(s) ? parse(Number(s) * 60) : parse(s);
        }
        function format(seconds) {
            if (!Number.isFinite(seconds) || seconds <= 0) return '未知';
            const n = Math.round(seconds);
            const sec = String(n % 60).padStart(2, '0');
            const min = Math.floor(n / 60);
            return min >= 60 ? `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}:${sec}` : `${min}:${sec}`;
        }
        function tolerance(target) { return Math.min(90, Math.max(3, target * 0.02)); }
        function classify(actual, target) {
            if (!parse(actual) || !parse(target)) return 'unknown';
            if (Math.abs(actual - target) <= tolerance(target)) return 'match';
            return actual < target ? 'short' : 'long';
        }
        function detect(doc, pageUrl) {
            const page = new URL(pageUrl);
            const canonical = doc.querySelector('link[rel="canonical"]')?.href || page.href;
            const equivalent = value => {
                try {
                    const candidate = new URL(value, page);
                    return [page.href, canonical].some(url => {
                        const expected = new URL(url, page);
                        return candidate.origin === expected.origin && candidate.pathname === expected.pathname && candidate.search === expected.search;
                    });
                } catch { return false; }
            };
            const videos = [];
            function visit(value, depth = 0) {
                if (!value || typeof value !== 'object' || depth > 12) return;
                if (Array.isArray(value)) { value.forEach(v => visit(v, depth + 1)); return; }
                const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
                if (types.includes('VideoObject') && parse(value.duration)) videos.push(value);
                for (const child of Object.values(value)) if (child && typeof child === 'object') visit(child, depth + 1);
            }
            for (const node of doc.querySelectorAll('script[type="application/ld+json"]')) {
                if (node.textContent.length > 1000000) continue;
                try { visit(JSON.parse(node.textContent)); } catch {}
            }
            const explicit = videos.filter(v => [v.url, v.mainEntityOfPage?.['@id'], typeof v.mainEntityOfPage === 'string' ? v.mainEntityOfPage : null].some(url => typeof url === 'string' && equivalent(url)));
            const candidates = explicit.length ? explicit : videos.filter(v => !v.url && !v.mainEntityOfPage);
            const unique = [...new Set(candidates.map(v => parse(v.duration)))];
            if (unique.length === 1 && (explicit.length || videos.length === 1)) return {seconds:unique[0], origin:'页面标注'};
            for (const selector of ['meta[property="video:duration"]', 'meta[property="og:video:duration"]', 'meta[itemprop="duration"]']) {
                const values = [...new Set([...doc.querySelectorAll(selector)].map(el => parse(el.content)).filter(Boolean))];
                if (values.length === 1) return {seconds:values[0], origin:'页面标注'};
            }
            const labels=[];
            for(const element of doc.querySelectorAll('[data-duration],[itemprop="duration"],.duration,.video-duration,.runtime')) {
                const text=element.getAttribute('data-duration') || element.textContent;
                if(!text || text.length>100) continue;
                // Only labelled page duration, not an arbitrary recommendation/card timer.
                if(!/^(?:正片时长|总时长|视频时长|时长|total\s*(?:duration|time|length)|duration|runtime|length)/i.test(text.trim())) continue;
                const seconds=parse(text); if(seconds) labels.push(seconds);
            }
            const uniqueLabels=[...new Set(labels)];
            if(uniqueLabels.length===1) return {seconds:uniqueLabels[0],origin:'页面中英文标注'};
            // A native video's duration may be the VIP preview or an advertisement.
            // Do not use it as the target for determining full-length availability.
            return null;
        }
        function score({ratio, stalls, startup, buffer, dropRatio}) {
            return Math.max(0, Math.min(100, ratio * 75 + Math.min(buffer, 10) * 1.5 + 10 - Math.min(startup, 25) * .4 - Math.min(stalls, 10) * 3 - dropRatio * 25));
        }
        return {parse, input, format, tolerance, classify, detect, score};
    })();

    const IdentityTools = (() => {
        const normalize = value => typeof value === 'string'
            ? value.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '') : '';
        function read(doc) {
            const items = [];
            function visit(value, depth = 0) {
                if (!value || depth > 8) return;
                if (Array.isArray(value)) return value.slice(0, 30).forEach(v => visit(v, depth + 1));
                if (typeof value !== 'object') return;
                if (['VideoObject', 'Movie', 'TVEpisode'].includes(value['@type']) && typeof value.name === 'string')
                    items.push({title:value.name.slice(0,200), year:String(value.datePublished || '').match(/^\d{4}/)?.[0] || '', episode:String(value.episodeNumber || '')});
                if (value['@graph']) visit(value['@graph'], depth + 1);
                if (value.mainEntity) visit(value.mainEntity, depth + 1);
            }
            for (const el of doc.querySelectorAll('script[type="application/ld+json"]')) {
                try { visit(JSON.parse(el.textContent)); } catch {}
            }
            // Ambiguous structured titles are not sufficient to identify a film.
            return items.length === 1 ? items[0] : null;
        }
        function compare(expected, actual) {
            if (!expected?.title || !actual?.title) return 'unknown';
            if (normalize(expected.title) !== normalize(actual.title)) return 'conflict';
            if (expected.year && actual.year && expected.year !== actual.year) return 'conflict';
            if (expected.episode && actual.episode && expected.episode !== actual.episode) return 'conflict';
            return 'match';
        }
        return {read, compare};
    })();

    const HealthTools = (() => {
        const DAY = 86400000;
        const outcomes = new Set(['pass', 'fail', 'timeout', 'unknown', 'limited']);
        function valid(event, now) {
            return event && typeof event.id === 'string' && event.id.trim().length > 0 && event.id.length <= 128
                && Number.isFinite(event.at) && event.at > 0 && event.at <= now
                && event.at >= now - 30 * DAY && outcomes.has(event.outcome);
        }
        function eventsOf(raw, now) {
            const byId = new Map();
            for (const event of Array.isArray(raw?.events) ? raw.events : []) {
                if (valid(event, now)) byId.set(event.id, {id:event.id, at:event.at, outcome:event.outcome});
            }
            return [...byId.values()].sort((a,b)=>a.at-b.at).slice(-20);
        }
        function update(raw, event, now = Date.now()) {
            const events = eventsOf(raw, now);
            if (valid(event, now)) {
                const old = events.findIndex(item=>item.id===event.id);
                if (old !== -1) events.splice(old,1);
                events.push(event);
            }
            return {events:eventsOf({events},now)};
        }
        function summarize(raw, now = Date.now()) {
            const events = eventsOf(raw,now);
            const confirmed = events.filter(event=>['pass','fail'].includes(event.outcome));
            const successes = events.filter(event=>event.outcome==='pass').length;
            let timeoutStreak = 0;
            for (let i=events.length-1;i>=0 && events[i].outcome==='timeout';i--) timeoutStreak++;
            let weight = 0, passedWeight = 0, lastSuccess = 0;
            for (const event of confirmed) {
                const w = Math.pow(0.5,(now-event.at)/(7*DAY));
                weight += w;
                if (event.outcome==='pass') {passedWeight += w;lastSuccess=Math.max(lastSuccess,event.at);}
            }
            // Neutral prior lets untested routes precede repeatedly failing ones.
            // Seven-day decay stops old evidence from dominating indefinitely.
            const score = (passedWeight+1)/(weight+2);
            return {events, attempts:confirmed.length, limited:events.length-confirmed.length, successes, rate:confirmed.length?successes/confirmed.length:null,
                timeoutStreak, lastSuccess, score};
        }
        return {update,summarize};
    })();

    // Cross-origin player hosts are often created dynamically. On unrelated top
    // pages the script exits; subframes remain dormant until a verified top-page
    // session sends a command. No cookies or page contents are transmitted.
    const supportedTop = hosts.some(([host]) => host === location.hostname);
    const pageWindow = typeof unsafeWindow === 'object' ? unsafeWindow : window;
    const mediaAccess = (() => {
        const ownerDocument = document;
        const ownerHost = location.hostname;
        const roots = new Set();
        const seen = new Set();
        let blocker = null;
        const enabled = supportedTop || window.top !== window.self;
        if (enabled) {
            const proto = pageWindow.Element?.prototype;
            const nativeAttach = proto?.attachShadow;
            if (nativeAttach) {
                try {
                    proto.attachShadow = function (...args) {
                        const root = nativeAttach.apply(this, args);
                        roots.add(root);
                        return root;
                    };
                } catch {}
            }
            const nativeProto = pageWindow.HTMLMediaElement?.prototype;
            const nativePlay = nativeProto?.play;
            if (nativePlay) {
                try {
                    nativeProto.play = function (...args) {
                        seen.add(this);
                        if (blocker && this.ownerDocument === ownerDocument) { blocker(this, true); return Promise.resolve(); }
                        return nativePlay.apply(this, args);
                    };
                } catch {}
            }
        }
        function visit(root, visitor) {
            root?.querySelectorAll?.('video,audio,bwp-video').forEach(visitor);
            root?.querySelectorAll?.('*').forEach(el => { if (el.shadowRoot) roots.add(el.shadowRoot); });
        }
        function collect() {
            const result = new Set();
            visit(ownerDocument, media => result.add(media));
            for (const root of roots) {
                if (!root.host?.isConnected) { roots.delete(root); continue; }
                visit(root, media => result.add(media));
            }
            for (const media of seen) {
                if (media.isConnected) result.add(media);
                else seen.delete(media);
            }
            return [...result].filter(media => media.ownerDocument === ownerDocument && typeof media.pause === 'function');
        }
        function block() {
            const saved = new Map();
            const watched = new Set();
            const observers = [];
            let running = true;
            function silence(media, force = false) {
                if (!running || !media || media.ownerDocument !== ownerDocument || typeof media.pause !== 'function') return;
                const first = !saved.has(media);
                if (first) saved.set(media, {muted:media.muted, volume:media.volume,
                    autoplay:media.getAttribute?.('autoplay'), preload:media.getAttribute?.('preload')});
                try { if (!media.muted) media.muted = true; } catch {}
                try { if (media.volume !== 0) media.volume = 0; } catch {}
                media.removeAttribute?.('autoplay');
                if (media.getAttribute?.('preload') !== 'none') media.setAttribute?.('preload', 'none');
                if (first || force || !media.paused) { try { media.pause(); } catch {} }
            }
            const event = e => silence(e.target, e.type === 'play' || e.type === 'playing');
            function watch(root) {
                if (watched.has(root)) return;
                watched.add(root);
                for (const name of ['play','playing','volumechange','loadedmetadata']) root.addEventListener(name,event,true);
                const observer = new MutationObserver(poll);
                observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['autoplay','muted','src','preload']});
                observers.push(observer);
            }
            function poll() {
                if(!running || !ownerDocument.documentElement) return;
                for (const media of collect()) silence(media);
                watch(ownerDocument);
                for (const root of roots) watch(root);
                // Bilibili's custom player can control a closed-root video.
                if (ownerHost.endsWith('.bilibili.com')) {
                    try { if (typeof pageWindow.player?.pause === 'function') pageWindow.player.pause(); } catch {}
                }
            }
            blocker = silence;
            poll();
            const timer = setInterval(poll,250);
            return () => {
                running = false;
                if (blocker === silence) blocker = null;
                clearInterval(timer); observers.forEach(observer=>observer.disconnect());
                for (const root of watched) for (const name of ['play','playing','volumechange','loadedmetadata']) root.removeEventListener(name,event,true);
                for (const [media,state] of saved) {
                    try { media.muted=state.muted; if(Number.isFinite(state.volume)) media.volume=state.volume; } catch {}
                    for (const name of ['autoplay','preload']) {
                        if (state[name] == null) media.removeAttribute?.(name);
                        else media.setAttribute?.(name,state[name]);
                    }
                }
                saved.clear(); watched.clear();
            };
        }
        return {collect,block};
    })();

    const DURATION_CHANNEL = 'vip-duration-v3';
    const parserOrigins = new Set(apis.filter(a => a.u).map(a => new URL(a.u).origin));
    function installDurationReporter() {
        if (window.top === window.self) return false;
        let session = null;
        let originalStop = null;
        let originalLease = 0;
        let serial = 0;
        let committed = false;
        let stopMonitor = () => {};
        const retiredTokens = new Set();
        const media = new Map();
        let armed = /^vrprobe:[a-f0-9]{32}$/.test(window.name);
        const initialMute = new WeakMap();
        const attemptedStartButtons = new WeakSet();
        function activateStartButton() {
            if (!session || session.mode === 'hold') return;
            const videos = mediaAccess.collect();
            if (videos.some(video => !video.paused && video.readyState >= 2)) return;
            // Only explicit playback controls; never confirmation links or arbitrary overlays.
            const buttons = document.querySelectorAll('button,[role="button"],.play-button,.play-btn,#playbutton,#start');
            for (const button of buttons) {
                const label = (button.textContent || button.getAttribute('aria-label') || '').trim();
                if (!/^(点击播放|开始播放|立即播放|播放|click to play|play|start playback)$/i.test(label) ||
                    button.closest('a') || button.disabled || attemptedStartButtons.has(button) || !button.getClientRects().length) continue;
                attemptedStartButtons.add(button);
                for (const video of videos) video.muted = true;
                button.click();
                break;
            }
        }
        let clearSoundRecovery = () => {};
        function earlyMute(event) {
            if ((!armed && !session) || !event.target.matches?.('video')) return;
            if (!initialMute.has(event.target)) initialMute.set(event.target, event.target.muted);
            if (!event.target.muted) event.target.muted = true;
        }
        document.addEventListener('play', earlyMute, true);
        document.addEventListener('volumechange', earlyMute, true);
        function visit(root, callback) {
            mediaAccess.collect().filter(el => el.localName !== 'audio').forEach(callback);
        }
        function restore(commitId = null) {
            stopMonitor();
            const controlSession = session;
            clearSoundRecovery();
            armed = false;
            // Disable the guard before changing muted; some players dispatch
            // volumechange synchronously and would otherwise mute the winner again.
            if (session) { retiredTokens.add(session.token); if (retiredTokens.size > 64) retiredTokens.delete(retiredTokens.values().next().value); }
            session = null;
            for (const [video, state] of media) {
                if (commitId === state.id) {
                    // Passive diagnostics: never call play/pause or change volume here.
                    if (controlSession) {
                        let pauses=0,waits=0,ticks=0;
                        const onPause=()=>pauses++, onWait=()=>waits++;
                        video.addEventListener('pause',onPause); video.addEventListener('waiting',onWait);
                        const monitor=setInterval(()=>{
                            if(!video.isConnected || ++ticks>120){stopMonitor();return;}
                            let buffer=0;
                            try { for(let i=0;i<video.buffered.length;i++) if(video.buffered.start(i)<=video.currentTime && video.buffered.end(i)>=video.currentTime) buffer=video.buffered.end(i)-video.currentTime; }catch{}
                            controlSession.source.postMessage({channel:DURATION_CHANNEL,kind:'playback-health',token:controlSession.token,
                                time:video.currentTime,paused:video.paused,ready:video.readyState,buffer,pauses,waits,error:video.error?.code||0},controlSession.origin);
                        },1000);
                        stopMonitor=()=>{clearInterval(monitor);video.removeEventListener('pause',onPause);video.removeEventListener('waiting',onWait);};
                    }
                    // The winner must be audible even when the parser starts
                    // muted or a fresh retest session inherited probe muting.
                    const enableSound = () => {
                        video.defaultMuted = false;
                        video.removeAttribute('muted');
                        video.muted = false;
                        if (video.volume === 0) video.volume = 0.5;
                        return video.play();
                    };
                    let active = true, button = null, retryTimer = null;
                    const audible = () => !video.paused && !video.muted && video.volume > 0 && video.readyState >= 2;
                    const cleanup = () => {
                        active = false; clearTimeout(retryTimer); button?.remove();
                        for (const name of ['playing','volumechange','timeupdate']) video.removeEventListener(name,checkRecovered);
                    };
                    const checkRecovered = () => { if (audible()) cleanup(); };
                    clearSoundRecovery = cleanup;
                    for (const name of ['playing','volumechange','timeupdate']) video.addEventListener(name,checkRecovered);
                    const offerGesture = () => {
                        if (!active || !video.isConnected || audible() || button) return;
                        button = document.createElement('button');
                        button.dataset.vipEnableSound = 'true';
                        button.textContent = '浏览器限制自动有声播放，点击继续';
                        button.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:2147483647;background:#166534;color:white;border:2px solid white;border-radius:8px;padding:12px;cursor:pointer;';
                        button.addEventListener('click', () => {
                            attempt(false);
                        });
                        (document.body || document.documentElement).append(button);
                    };
                    const failed = (error, retry) => {
                        if (!active || !video.isConnected) return;
                        if (audible()) {cleanup();return;}
                        if (error?.name === 'NotAllowedError') offerGesture();
                        else if (error?.name === 'AbortError' && retry) retryTimer=setTimeout(()=>attempt(false),350);
                        else cleanup();
                    };
                    const attempt = retry => {
                        if (!active || !video.isConnected) return;
                        try { Promise.resolve(enableSound()).then(checkRecovered,error=>failed(error,retry)); }
                        catch (error) {failed(error,retry);}
                    };
                    attempt(true);
                } else { try { video.pause(); } catch {} }
            }
            media.clear();
        }
        function sample() {
            if (!session) return;
            if (Date.now() - session.touched > 20000) { restore(); return; }
            const pageText = (document.body?.innerText || document.body?.textContent || '').slice(0,6000);
            const restriction = /(?:你请求异常|请求过于频繁|请求频繁|访问过于频繁|too many requests)/i.test(pageText);
            if (restriction) {
                const wait = pageText.match(/请\s*(\d+)\s*分钟后重试/);
                session.source.postMessage({channel:DURATION_CHANNEL,kind:'status',token:session.token,
                    restricted:true, state:'站点限制请求' + (wait ? '，提示等待' + wait[1] + '分钟' : '')},session.origin);
                return;
            }
            activateStartButton();
            session.source.postMessage({channel:DURATION_CHANNEL,kind:'status',token:session.token,
                state:mediaAccess.collect().length?'等待视频元数据或播放':'等待播放器出现'},session.origin);
            visit(document, video => {
                if (!media.has(video)) media.set(video, {
                    id: String(++serial), muted:initialMute.has(video) ? initialMute.get(video) : video.muted, previousTime:null,
                    previousWall:null, progressed:0, lastAttempt:0, duration:null,
                    startedAt:null, stalls:0, wasStalled:false, startup:null, playError:null
                });
                const state = media.get(video);
                video.muted = true;
                if (session.mode === 'hold') { if (!video.paused) { try { video.pause(); } catch {} } return; }
                const now = Date.now();
                const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
                if (duration && (!state.duration || Math.abs(duration-state.duration)>Math.max(1,state.duration*.01))) {
                    state.duration = duration; state.progressed = 0; state.previousTime = null; state.startedAt = null; state.stalls = 0; state.wasStalled = false;
                }
                const elapsed = state.previousWall === null ? 0 : (now - state.previousWall) / 1000;
                const delta = state.previousTime === null ? 0 : video.currentTime - state.previousTime;
                // A seek jump is not evidence of continuous playback.
                if (!video.seeking && !video.paused && delta > 0 && delta <= elapsed * 3 + .2) {
                    if (state.startedAt === null) { state.startedAt = now; state.startup = (now - session.began) / 1000; }
                    state.progressed += Math.min(delta, elapsed);
                }
                const stalled = state.startedAt !== null && (video.readyState < 3 || (elapsed > .2 && delta <= 0));
                if (stalled && !state.wasStalled) state.stalls++;
                state.wasStalled = stalled;
                state.previousTime = video.currentTime;
                state.previousWall = now;
                let buffer = 0;
                try {
                    for (let i = 0; i < video.buffered.length; i++) if (video.buffered.start(i) <= video.currentTime && video.buffered.end(i) >= video.currentTime)
                        buffer = Math.max(buffer, video.buffered.end(i) - video.currentTime);
                } catch {}
                let dropRatio = 0;
                try { const q = video.getVideoPlaybackQuality?.(); if (q?.totalVideoFrames) dropRatio = q.droppedVideoFrames / q.totalVideoFrames; } catch {}
                session.source.postMessage({channel:DURATION_CHANNEL, kind:'sample', token:session.token,
                    mediaId:state.id, duration, playError:state.playError, identity:IdentityTools.read(document), progressed:state.progressed,
                    observed:state.startedAt === null ? 0 : (now - state.startedAt) / 1000,
                    startup:state.startup, stalls:state.stalls, buffer, dropRatio,
                    readyState:Number.isInteger(video.readyState)?video.readyState:(state.progressed>0?2:0), error:video.error?.code || 0}, session.origin);
                if (video.paused && !video.ended && !video.error && now - state.lastAttempt > 2000) {
                    state.lastAttempt = now;
                    const rejected = error => {state.playError=typeof error?.name==='string'?error.name.slice(0,60):'UnknownError';};
                    try { Promise.resolve(video.play()).then(()=>{state.playError=null;},rejected); } catch(error) {rejected(error);}
                }
            });
        }
        window.addEventListener('message', event => {
            const data = event.data;
            if (!data || data.channel !== DURATION_CHANNEL || event.source !== window.top) return;
            try {
                const origin = new URL(event.origin);
                if (!['http:', 'https:'].includes(origin.protocol) || !hosts.some(([host]) => host === origin.hostname)) return;
            } catch { return; }
            if (typeof data.token !== 'string' || !/^[a-f0-9]{32}$/.test(data.token)) return;
            if (data.kind === 'source-stop') {
                if(session || committed) return;
                if(!originalStop) originalStop=mediaAccess.block();
                originalLease=Date.now();
                return;
            }
            if (data.kind === 'source-release') {
                originalStop?.(); originalStop=null; return;
            }
            if (retiredTokens.has(data.token)) return;
            if (data.kind === 'probe') {
                committed = false;
                stopMonitor();
                clearSoundRecovery();
                if(originalStop) {originalStop();originalStop=null;}
                if (session && session.token !== data.token) restore();
                const began = session?.began || Date.now();
                session = {token:data.token, origin:event.origin, source:event.source, touched:Date.now(), began, mode:'probe'};
                sample();
            } else if (session?.token === data.token && data.kind === 'hold') {
                session.mode = 'hold'; session.touched = Date.now(); sample();
            } else if (session?.token === data.token && data.kind === 'commit') {
                committed = true;
                originalStop?.(); originalStop = null;
                restore(typeof data.mediaId === 'string' ? data.mediaId : null);
            } else if (session?.token === data.token && data.kind === 'abort') restore();
        });
        setInterval(() => {
            if(originalStop && Date.now()-originalLease>20000) {originalStop();originalStop=null;}
            sample();
        },400);
        return true;
    }

    if (installDurationReporter()) return;
    function startMain() {
    // Keep the original array indices only for migration. URLs are stable identities thereafter.
    const seen = new Set();
    const sources = apis.filter(a => {
        if (!a.u || seen.has(a.u)) return false;
        try { if (!['https:', 'http:'].includes(new URL(a.u).protocol)) return false; }
        catch { return false; }
        seen.add(a.u);
        return true;
    });
    const selector = hosts.find(([host]) => host === location.hostname)?.[1];
    if (!selector || window.top !== window.self || document.querySelector('[data-vip-tools-root]')) return;

    const upstreamAliases = {
        'https://jiexi.789jiexi.com/?url=':'https://jx.xmflv.com/?url=',
        'https://www.ckplayer.vip/jiexi/?url=':'https://jx.xmflv.com/?url=',
        'https://www.playm3u8.cn/jiexi.php?url=':'https://jx.xmflv.com/?url=',
        'https://www.pangujiexi.com/jiexi/?url=':'https://jx.xmflv.com/?url=',
        'https://www.8090g.cn/?url=':'https://jx.xmflv.com/?url=',
        'https://jx.aidouer.net/?url=':'https://jx.77flv.cc/?url=',
        'https://jx.xymp4.cc/?url=':'https://jx.77flv.cc/?url=',
        'https://jx.xyflv.cc/?url=':'https://jx.77flv.cc/?url='
    };
    const upstreamNameAliases = {'789解析':'虾米',ckplayer:'虾米',playm3u8:'虾米','盘古':'虾米','8090':'虾米','爱豆':'七七云解析','咸鱼TV':'七七云解析','咸鱼新':'七七云解析'};
    const PREFIX = 'vip_tools_v2:';
    const SITE = PREFIX + location.hostname + ':';
    const uid = 'vip-tools-' + Math.random().toString(36).slice(2);
    const frameId = uid + '-frame';
    const hostClass = uid + '-host';
    const read = (key, fallback) => { try { return GM_getValue(key, fallback); } catch { return fallback; } };
    let warnedStorage = false;
    function save(key, value) {
        try { GM_setValue(key, value); return true; }
        catch {
            if (!warnedStorage) { warnedStorage = true; alert('设置未能保存，请检查篡改猴的存储权限。'); }
            return false;
        }
    }
    const yes = value => value === true || value === 'true';
    // v2 counted opening attempts. Keep those untouched; start verified counts separately.
    const countKey = source => PREFIX + 'success-stats-v3:' + source.u;
    const hiddenKey = source => PREFIX + 'hidden:' + source.u;
    const healthKey = source => PREFIX + 'route-health-v1:' + source.u;
    const healthBackupKey = PREFIX + 'health-reset-backup-v1';
    const health = source => HealthTools.summarize(read(healthKey(source),{}));
    function recordHealth(source, run, outcome) {
        if (!run?.healthId || !['pass','fail','timeout','unknown','limited'].includes(outcome)) return;
        // One slot per route and run: retest/late validation replaces its result.
        save(healthKey(source),HealthTools.update(read(healthKey(source),{}),{id:run.healthId,at:Date.now(),outcome}));
        if (outcome === 'pass') {
            const previous = stat(source);
            // A successful retest refreshes recency without increasing totals.
            save(countKey(source),{...previous,last:Date.now()});
        }
    }
    function stat(source) {
        const s = read(countKey(source), {});
        return {
            count: Number.isSafeInteger(s?.count) && s.count >= 0 ? s.count : 0,
            full: Number.isSafeInteger(s?.full) && s.full >= 0 ? s.full : 0,
            last: Number.isFinite(s?.last) && s.last >= 0 ? s.last : 0
        };
    }
    const isHidden = source => yes(read(hiddenKey(source), false));
    function ranked(includeHidden = false) {
        const storedOrder = read(PREFIX + 'manual-order', null);
        const order = Array.isArray(storedOrder) ? storedOrder.filter(url => typeof url === 'string').map(url => upstreamAliases[url] || url) : [];
        const rank = source => order.includes(source.u) ? order.indexOf(source.u) : order.length;
        return sources.map((source, index) => ({source, index, ...stat(source), health:health(source)}))
            .filter(row => includeHidden || !isHidden(row.source))
            .sort((a, b) => rank(a.source) - rank(b.source) || b.health.score - a.health.score
                || b.last - a.last || a.index - b.index)
            .map(row => row.source);
    }
    function record(source, full = false) {
        const previous = stat(source);
        save(countKey(source), {count: Math.min(Number.MAX_SAFE_INTEGER, previous.count + 1), full: Math.min(Number.MAX_SAFE_INTEGER, previous.full + Number(full)), last: Date.now()});
    }
    let autoOn = yes(read(SITE + 'auto', read('auto_player_key' + location.host, false)));
    const oldIndex = Number(read('auto_player_value_' + location.host, 0));
    const legacyNames = ['虾米','M1907','2s0','IK9','777','789解析','爱豆','芒果','七哥','playerjy','咸鱼TV','973解析','IK',null,'ckplayer','playm3u8','夜幕','盘古','8090','芒果TV1','FF','HM','LZ','七七云解析','臻享视听'];
    const legacySource = Number.isInteger(oldIndex) ? sources.find(source => source.n === (upstreamNameAliases[legacyNames[oldIndex]] || legacyNames[oldIndex])) : null;
    let selected = read(SITE + 'selected', legacySource?.u || '');
    selected = upstreamAliases[selected] || selected;
    let mode = read(SITE + 'mode', 'embedded') === 'tab' ? 'tab' : 'embedded';
    let managing = false;
    let activePlayer = null;
    let originalMediaGuard = null;
    const ownedFrames = new Set();
    let smartRun = null;
    let smartOn = read(SITE + 'smart', true) !== false;
    const probeResults = new Map();
    const probeStates = new Map();
    const expandedRoutes = new Set();
    let routeFilter = 'all';
    let density = read(PREFIX + 'density', 'compact') === 'comfortable' ? 'comfortable' : 'compact';
    let testProgress = null;
    let generation = 0;
    let cancelWait = null;
    let statusTimer = null;
    let leaveTimer = null;
    // Local inline vectors: no external icon or font dependency.
    function uiIcon(name) {
        const paths = {
            play:'<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
            restore:'<path d="M3 10a9 9 0 1 1 2 9M3 4v6h6"/>',
            sort:'<path d="M7 20V4m-4 4 4-4 4 4m6-4v16m-4-4 4 4 4-4"/>',
            settings:'<path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/><circle cx="12" cy="12" r="3"/>',
            check:'<path d="m5 12 4 4L19 6"/>',
            help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2m0 3h.01"/>',
            close:'<path d="m6 6 12 12M6 18 18 6"/>',
            clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
            grip:'<path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" stroke-width="3"/>',
            chevron:'<path d="m8 10 4 4 4-4"/>'
        };
        return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.help}</svg>`;
    }
    const box = document.createElement('div');
    box.id = uid;
    box.dataset.vipToolsRoot = '';
    box.innerHTML = `
        <button class="launcher" type="button" aria-label="打开线路菜单" aria-expanded="false">VIP</button>
        <button class="drag-handle" type="button" title="拖动；方向键微调" aria-label="拖动悬浮按钮">⠿</button>
        <section class="panel" aria-label="播放线路" hidden>
            <header><div class="brand"><span class="brand-logo" aria-hidden="true">${uiIcon('play')}</span><strong>线路优选</strong><small class="panel-subtitle">自动测试 · 智能择优</small></div><button type="button" data-action="close" aria-label="关闭菜单">${uiIcon('close')}</button></header>
            <div class="playback-controls"><div class="toolbar mode-switch">
                <button type="button" data-mode="embedded">内嵌播放</button>
                <button type="button" data-mode="tab">新标签页</button>
            </div>
            <div class="toolbar">
                <button type="button" data-action="auto">自动播放</button>
                <button type="button" data-action="restore-player">${uiIcon('restore')} 恢复原播放器</button>
            </div>
            </div>
            <div class="duration-controls">
                <div class="duration-field"><span>正片时长 <span class="info-icon" title="支持自动识别，或手动填写分钟、16:18、45分、45 min。时长未知也可测试。">ⓘ</span></span><label class="duration-choice"><input type="radio" name="${uid}-duration" value="auto" checked>自动识别</label><label class="duration-choice"><input type="radio" name="${uid}-duration" value="manual">手动填写</label><input class="target-duration" placeholder="例如：120" aria-label="正片时长，支持中文英文和时分秒"><span class="duration-unit">分钟</span></div>
                <p class="target-note hint">支持 16:18、16分18秒、16 min 18 sec。</p>
                <div class="toolbar test-actions">
                    <button type="button" data-action="smart">${uiIcon('play')} 开始择优</button>
                    <button type="button" data-action="stop-smart" hidden>停止测试并观看已通过线路</button>
                </div>
                <div class="toolbar test-settings">
                    <button type="button" data-action="smart-toggle">按时长优选：开</button>
                    <label>同时测试 <select class="probe-concurrency" aria-label="同时测试线路数"><option value="all" selected>全部</option><option value="6">6 条</option><option value="3">3 条</option><option value="1">1 条</option></select></label>
                    <label>加载等待 <select class="probe-timeout" aria-label="线路加载等待时间"><option value="30" selected>30 秒</option><option value="60">60 秒</option><option value="90">90 秒</option><option value="120">120 秒</option></select></label>
                </div>
            </div>
            <div class="now-playing" hidden role="status"></div>
            <div class="test-progress" hidden><div class="phase-labels"></div><progress max="100" value="0" aria-label="线路初测和复测进度"></progress></div>
            <p class="probe-summary hint" role="status"></p>
            <div class="route-filters" aria-label="筛选本轮线路结果"></div>
            <div class="toolbar route-toolbar"><strong class="routes-heading">可用线路</strong>
                <span class="route-primary-actions"><button type="button" data-action="manage">管理线路</button>
                <button type="button" data-action="reset-health" title="清空所有现有线路（含隐藏线路）的近期记录，保留累计次数、最近成功时间及手动顺序">${uiIcon('sort')} 重新计算健康记录</button></span>
                <button type="button" data-action="sort-success" hidden>近期健康排序</button>
                <button type="button" data-action="restore-sources" hidden>恢复全部隐藏线路</button>
                <button type="button" data-action="undo-health-reset" hidden>恢复上次健康记录</button>
            </div>
            <div class="source-list"></div>
            <div class="density-controls" aria-label="显示密度"><span>显示密度</span><button type="button" data-density="compact">紧凑</button><button type="button" data-density="comfortable">舒适</button></div>
            <p class="notice">第三方线路会收到当前视频网址。自动播放仅用于内嵌模式。</p>
            <p class="status" role="status" aria-live="polite"></p>
        </section>`;
    GM_addStyle(`
        #${uid}{position:fixed;left:8px;top:120px;z-index:2147483647;font:13px/1.45 system-ui,sans-serif;color:#e2e8f0;text-align:left;isolation:isolate}
        #${uid},#${uid} *{box-sizing:border-box}
        #${uid} [hidden]{display:none!important}
        #${uid} button{font:inherit;color:inherit;background:#263449;border:1px solid #475569;border-radius:7px;padding:6px 8px;cursor:pointer;line-height:1.4;min-height:30px;margin:0}
        #${uid} button:hover{background:#334766}
        #${uid} button:focus-visible{outline:2px solid #93c5fd;outline-offset:2px}
        #${uid} .launcher{display:block;width:42px;height:38px;background:#2563eb;font-weight:700;padding:0}
        #${uid} .drag-handle{display:block;width:42px;height:22px;min-height:22px;padding:0;cursor:move;touch-action:none;user-select:none}
        #${uid} .panel{position:fixed;width:350px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;padding:12px;border:1px solid #475569;border-radius:12px;background:#0f172a;box-shadow:0 10px 30px #0008}
        #${uid} header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}
        #${uid} strong{font-size:14px;color:#f8fafc}
        #${uid} .toolbar{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
        #${uid} .toolbar button{flex:1;white-space:nowrap}
        #${uid} button[aria-pressed="true"]{background:#1d4ed8;border-color:#93c5fd}
        #${uid} .source-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
        #${uid} .source-list.manage{grid-template-columns:1fr}
        #${uid} .source-row{display:flex;gap:6px;min-width:0}
        #${uid} .source-button{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left}
        #${uid} .source-button:disabled{opacity:.5;cursor:default}
        #${uid} .counter{display:block;opacity:1;font-size:11px;font-weight:700;white-space:normal;line-height:1.35;margin-top:3px;padding:2px 4px;border-radius:4px}
        #${uid} .counter.pass{color:#bbf7d0;background:#14532d;border:1px solid #4ade80} #${uid} .counter.fail{color:#fecaca;background:#7f1d1d;border:1px solid #f87171}
        #${uid} .counter.testing{color:#fef3c7;background:#78350f;border:1px solid #fbbf24} #${uid} .counter.idle{color:#e2e8f0;background:#334155;border:1px solid #64748b}
        #${uid} .counter.limited{color:#e0e7ff;background:#312e81;border:1px solid #a5b4fc}
        #${uid} .route-health{display:block;margin-top:5px;font-size:11px;line-height:1.5;color:#cbd5e1;font-weight:400;white-space:normal}
        #${uid} .health-warning{color:#fbbf24;font-weight:700}
        #${uid} .probe-summary .metric{font-weight:700;padding:0 2px;border-radius:3px}
        #${uid} .probe-summary .tested{color:#93c5fd} #${uid} .probe-summary .passed{color:#86efac}
        #${uid} .probe-summary .parallel{color:#c4b5fd} #${uid} .probe-summary .timeout{color:#fbbf24}
        #${uid} .reorder{min-height:26px;padding:2px;cursor:grab;border:0;background:transparent}
        #${uid} .source-row.drop-target{outline:2px solid #60a5fa;border-radius:6px}
        #${uid} .hint,#${uid} .notice,#${uid} .status{font-size:11px;margin:8px 0;color:#94a3b8}
        #${uid} .target-note{color:#e2e8f0}
        #${uid} .status{color:#bfdbfe;min-height:16px}
        #${uid} input,#${uid} select{font:inherit;background:#172033;color:#e2e8f0;border:1px solid #475569;border-radius:5px;padding:4px;max-width:150px}
        #${uid} .duration-controls{border-top:1px solid #334155;border-bottom:1px solid #334155;padding:8px 0;margin-bottom:8px}

        #${uid} .panel{width:540px;padding:18px;border:1px solid #496294;border-radius:20px;background:linear-gradient(145deg,#111e34f7,#0b1222fc);box-shadow:0 20px 65px #0009,0 0 35px #3463cc20;backdrop-filter:blur(18px);scrollbar-width:thin;scrollbar-color:#405677 #101b2d}
        #${uid} header{margin-bottom:16px} #${uid} header strong{font-size:23px;letter-spacing:1px}
        #${uid} .panel-subtitle{display:block;color:#8da6ce;font-size:11px;margin-top:3px}
        #${uid} button{border-radius:9px;background:#1b2a42;border-color:#3b5072;transition:background .16s,border-color .16s}
        #${uid} [data-action="smart"]{background:linear-gradient(135deg,#249aff,#2856e8);border-color:#60b8ff;font-weight:700;box-shadow:0 4px 16px #1669e333}
        #${uid} .route-toolbar{padding:4px 0 10px;position:relative}
        #${uid} .source-list{gap:12px;align-items:start}
        #${uid} .source-row{--accent:#64748b;position:relative;display:flex;flex-direction:column;gap:0;border:1px solid color-mix(in srgb,var(--accent) 45%,#24334b);border-radius:14px;background:linear-gradient(145deg,color-mix(in srgb,var(--accent) 9%,#142036),#101a2b);overflow:hidden;box-shadow:0 6px 16px #0002}
        #${uid} .source-row[data-state="pass"]{--accent:#39d798} #${uid} .source-row[data-state="fail"]{--accent:#ff637b}
        #${uid} .source-row[data-state="limited"]{--accent:#b088ff} #${uid} .source-row[data-state="testing"]{--accent:#ffc65c}
        #${uid} .source-row.is-playing{border-color:#36b2ff;box-shadow:0 0 0 1px #248aff55,0 0 20px #208dff25}
        #${uid} .source-button,#${uid} .source-button[aria-pressed="true"]{display:block;flex:auto;width:100%;padding:15px 13px 10px 30px;border:0;border-radius:0;background:transparent;white-space:normal;min-height:210px}
        #${uid} .source-button:hover{background:#ffffff06}
        #${uid} .route-name{display:block;font-size:15px;font-weight:700;color:#f0f5ff;overflow-wrap:anywhere;margin-bottom:8px}
        #${uid} .counter{display:inline-block;border-radius:20px;font-size:11px;padding:3px 9px;margin:0 4px 5px 0}
        #${uid} .counter.limited{color:#eadbff;border-color:#b088ff;background:#512f79}
        #${uid} .playing-badge{display:inline-block;font-size:10px;border:1px solid #439fff;background:#175cc3;border-radius:20px;padding:3px 7px;color:#fff}
        #${uid} .route-score{display:block;font-size:32px;line-height:1.15;font-weight:750;letter-spacing:-1px;color:#dae9ff;font-variant-numeric:tabular-nums;margin:10px 0}
        #${uid} .is-playing .route-score{color:#7dcdff}
        #${uid} .route-score small{display:block;font-size:10px;font-weight:400;letter-spacing:1px;color:#8ea8c8;margin-top:4px}
        #${uid} .route-result{display:block;color:var(--accent);font-size:11px;line-height:1.65;overflow-wrap:anywhere}
        #${uid} .recent-rate{display:block;margin-top:9px;color:#afc6e7;font-size:11px}
        #${uid} .route-health{border-top:1px solid #30415d;padding-top:9px;margin-top:9px;line-height:1.8}
        #${uid} .route-details{border:0;border-top:1px solid #30415d;border-radius:0;background:transparent;color:#99b2d5;font-size:11px;padding:7px}
        #${uid} .reorder{position:absolute;left:3px;top:13px;width:23px;padding:0;background:transparent;color:#7a94b9}
        #${uid} .probe-summary{padding:10px;border-radius:10px;background:#15253d;line-height:2}
        #${uid} .probe-summary:empty{display:none}
        #${uid} .probe-summary .metric{font-size:18px;padding:1px 5px;font-variant-numeric:tabular-nums}
        #${uid} .duration-controls{border-color:#30415d}
        @media(max-width:560px){#${uid} .panel{width:350px;padding:12px} #${uid} .source-list{gap:8px} #${uid} .source-button{padding:12px 9px 10px 25px} #${uid} .route-name{font-size:13px} #${uid} .route-score{font-size:28px} #${uid} .toolbar button{white-space:normal}}
        @media(max-width:330px){#${uid} .source-list{grid-template-columns:1fr}}
        @media(prefers-reduced-motion:reduce){#${uid} button{transition:none}}

        #${uid} .panel{width:620px;padding:18px}
        #${uid} header{padding-bottom:12px;border-bottom:1px solid #2b3b54;margin-bottom:10px}
        #${uid} .playback-controls{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}
        #${uid} .playback-controls .toolbar{align-items:center;margin:0 0 12px;gap:8px}
        #${uid} .mode-switch{border:1px solid #354863;border-radius:10px;background:#101c2e;padding:3px}
        #${uid} .mode-switch button{border:0;background:transparent}
        #${uid} .mode-switch button[aria-pressed="true"]{background:linear-gradient(135deg,#328fff,#2860dd);box-shadow:0 2px 8px #176aff35}
        #${uid} [data-action="restore-player"]{border:0;background:transparent;color:#69b4ff;padding:4px}
        #${uid} [data-action="auto"],#${uid} [data-action="smart-toggle"]{background:transparent;border:0;font-size:12px;display:inline-flex;gap:8px;align-items:center}
        #${uid} [data-action="auto"]:after,#${uid} [data-action="smart-toggle"]:after{content:'';width:30px;height:18px;flex-shrink:0;border-radius:20px;background:radial-gradient(circle at 9px 9px,#dce7f5 0 6px,transparent 7px),#46546b}
        #${uid} [data-action="auto"][aria-pressed="true"]:after,#${uid} [data-action="smart-toggle"][aria-pressed="true"]:after{background:radial-gradient(circle at 21px 9px,#fff 0 6px,transparent 7px),#2986ff}
        #${uid} .duration-controls{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:13px 15px;border:1px solid #35465f;border-radius:12px;background:linear-gradient(120deg,#1e2c40,#192638);margin:0 0 10px}
        #${uid} .duration-field{order:0;display:flex;align-items:center;gap:15px;width:100%;padding-bottom:10px;border-bottom:1px solid #35465f}
        #${uid} .target-duration{max-width:260px;flex:1;padding:7px 10px}
        #${uid} .test-settings{order:1;width:100%;align-items:center;justify-content:space-between;margin:0;padding-bottom:10px;border-bottom:1px solid #35465f}
        #${uid} .test-settings button{flex:0 1 auto;padding-left:0}
        #${uid} .test-settings label{font-size:12px;display:flex;align-items:center;gap:6px}
        #${uid} .target-note{order:2;flex:1;min-width:150px;margin:0;line-height:1.55}
        #${uid} .test-actions{order:3;margin:0;max-width:100%}
        #${uid} .test-actions button{padding:8px 15px;white-space:normal}
        #${uid} .test-actions button:disabled{display:none}
        #${uid} .probe-summary{margin:8px 0;padding:7px 12px;line-height:1.6;border:1px solid #2b3e59;border-radius:10px}
        #${uid} .probe-summary .metric{font-size:14px}
        #${uid} .route-toolbar{align-items:center;padding:4px 0;margin:10px 0}
        #${uid} .routes-heading{margin-right:auto;font-size:15px}
        #${uid} .route-toolbar button{flex:0 1 auto;background:transparent;border-color:transparent;color:#a6c9ee;font-size:12px;padding:4px 6px;white-space:normal}
        #${uid} .source-list{gap:10px}
        #${uid} .source-row{border-radius:12px;background:linear-gradient(125deg,#1e2d3d,#172231)}
        #${uid} .source-button,#${uid} .source-button[aria-pressed="true"]{display:grid;grid-template-columns:70px minmax(0,1fr);align-items:center;gap:8px 12px;padding:12px 12px 8px;min-height:0}
        #${uid} .card-heading{grid-column:1/-1;display:flex;gap:5px;align-items:center;flex-wrap:wrap;padding-left:13px;min-width:0}
        #${uid} .route-name{margin:0 auto 0 0;font-size:14px}
        #${uid} .counter{margin:0;padding:2px 7px;font-size:10px}
        #${uid} .playing-badge{padding:2px 5px;font-size:9px}
        #${uid} .route-score{font-size:27px;margin:0;align-self:center;color:#7ceab0}
        #${uid} .route-score small{font-size:9px;margin-top:3px}
        #${uid} .route-result{border-left:1px solid #3a4960;padding-left:12px;font-size:11px;line-height:1.6;color:#ccdaed}
        #${uid} .recent-rate{grid-column:1/-1;border-top:1px solid #354358;margin:0;padding:7px 50px 0 0;font-size:10px;min-height:25px}
        #${uid} .route-health{grid-column:1/-1;margin:0;font-size:11px}
        #${uid} .route-details{align-self:flex-end;padding:4px 9px;margin-top:-30px;margin-bottom:3px;min-height:27px;border:0;font-size:10px;z-index:1}
        #${uid} .source-row:has(.route-health:not([hidden])) .route-details{margin-top:0;border-top:1px solid #354358;width:100%}
        #${uid} .reorder{top:10px;left:3px;width:20px;font-size:12px}
        @media(max-width:650px){#${uid} .panel{width:calc(100vw - 24px);padding:12px}#${uid} .playback-controls{gap:0}#${uid} .source-button,#${uid} .source-button[aria-pressed="true"]{grid-template-columns:55px minmax(0,1fr);gap:7px;padding:10px}#${uid} .route-score{font-size:24px}#${uid} .route-result{padding-left:7px}#${uid} .test-settings{gap:8px}#${uid} .target-note{font-size:10px}}
        @media(max-width:380px){#${uid} .source-list{grid-template-columns:1fr}#${uid} .duration-controls{padding:10px}#${uid} .test-settings{justify-content:flex-start}#${uid} .target-duration{min-width:0;width:130px}}

        #${uid} .brand{display:flex;align-items:center;gap:11px;flex-wrap:wrap}
        #${uid} .brand-logo{display:inline-grid;place-items:center;width:28px;height:31px;font-size:27px;color:#5dd2ff;filter:drop-shadow(0 3px 4px #126bf866)}
        #${uid} .brand .panel-subtitle{margin:0 0 0 3px;font-size:12px}
        #${uid} header strong{font-size:22px;letter-spacing:0}
        #${uid} [data-action="restore-player"] span,#${uid} [data-action="sort-success"] span{font-size:19px;vertical-align:middle;margin-right:3px}
        #${uid} .duration-field{gap:12px;font-size:12px;flex-wrap:wrap}
        #${uid} .info-icon{color:#95a7c0;font-size:13px;margin-left:4px;cursor:help}
        #${uid} .duration-choice{display:inline-flex;gap:6px;align-items:center;white-space:nowrap;cursor:pointer;font-size:11px}
        #${uid} .duration-choice input{appearance:none;width:14px;height:14px;margin:0;padding:0;border:1px solid #70849d;border-radius:50%;background:transparent;max-width:none}
        #${uid} .duration-choice input:checked{border:2px solid #379bff;background:radial-gradient(circle,#379bff 0 3px,transparent 4px)}
        #${uid} .duration-choice input:focus-visible{outline:2px solid #9bcfff;outline-offset:3px}
        #${uid} .target-duration{max-width:135px;min-width:75px;padding:6px 8px}
        #${uid} .target-duration[readonly]{opacity:.6}
        #${uid} .duration-unit{color:#9cabbe;font-size:11px}
        #${uid} .route-toolbar [data-action="reset-health"]{border-left:1px solid #33445c;border-radius:0;padding-left:12px}
        #${uid} .counter{border-radius:20px;padding:3px 9px;box-shadow:inset 0 1px 2px #ffffff15;font-weight:500}
        #${uid} .counter.pass{color:#c6ffdf;background:linear-gradient(180deg,#247b56,#174936);border-color:#3e9968}
        #${uid} .counter.limited{color:#ecd8ff;background:linear-gradient(180deg,#794ca8,#482b6c);border-color:#9870c4}
        #${uid} .playing-badge{background:linear-gradient(180deg,#338bed,#2058a5);border-color:#62a6ff;padding:3px 7px;border-radius:20px;color:#e7f3ff}
        #${uid} .probe-summary{display:flex;flex-wrap:wrap;align-items:center;gap:0;background:linear-gradient(100deg,#1c2d43,#182639);border-radius:20px;font-size:11px}
        #${uid} .summary-item{display:inline-flex;gap:5px;align-items:center;padding:0 11px;border-left:1px solid #40516a}
        #${uid} .summary-item:first-child{border:0;padding-left:0}
        #${uid} .summary-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#50d987;margin-right:4px}
        #${uid} .summary-dot.running{background:#ffc45b}
        #${uid} .probe-summary .metric{font-size:12px;font-weight:600;padding:0}
        #${uid} .probe-summary .limited{color:#bf8eff}
        @media(max-width:650px){#${uid} .brand .panel-subtitle{font-size:10px}#${uid} .brand{gap:6px}#${uid} .duration-field{gap:9px}#${uid} .summary-item{padding:2px 7px}}

        /* Refined palette and hierarchy. State is carried by labels, not full-card borders. */
        #${uid} .panel{background:linear-gradient(145deg,#111d30,#0e1727);border-color:#34455d;box-shadow:0 24px 70px #0008,0 1px 0 #ffffff08 inset}
        #${uid} .ui-icon{width:15px;height:15px;flex-shrink:0;display:inline-block;vertical-align:-3px;pointer-events:none}
        #${uid} button{transition:background .15s,border-color .15s,box-shadow .15s}
        #${uid} header{border-bottom-color:#ffffff08;padding-bottom:15px}
        #${uid} .brand-logo{width:27px;height:29px;filter:none;background:linear-gradient(145deg,#68ddff,#2877eb);border-radius:8px;color:#ecfaff;box-shadow:0 4px 12px #1590ff20}
        #${uid} .brand-logo .ui-icon{width:23px;height:23px}
        #${uid} header strong{font-size:21px;font-weight:750}
        #${uid} .brand .panel-subtitle{color:#8399b5;letter-spacing:.3px}
        #${uid} [data-action="close"]{display:grid;place-items:center;width:28px;min-height:28px;padding:0;background:transparent;border-color:transparent;color:#8ba1be}
        #${uid} [data-action="close"]:hover{background:#ffffff0d;color:#fff}
        #${uid} .mode-switch{border-color:#2e4059;background:#0e1828}
        #${uid} .mode-switch button{font-size:12px;padding:6px 12px}
        #${uid} .duration-controls{background:linear-gradient(120deg,#1c2a3e,#19263a);border-color:#ffffff0a;box-shadow:inset 0 1px 0 #ffffff04;padding:14px 16px;border-radius:14px}
        #${uid} .duration-field,#${uid} .test-settings{border-bottom-color:#ffffff09;padding-bottom:12px}
        #${uid} input,#${uid} select{border-color:#36475e;background:#152135;border-radius:7px}
        #${uid} input:focus-visible,#${uid} select:focus-visible{outline:2px solid #74b7ff;outline-offset:2px}
        #${uid} [data-action="smart-toggle"],#${uid} [data-action="smart-toggle"][aria-pressed="true"],#${uid} [data-action="auto"],#${uid} [data-action="auto"][aria-pressed="true"]{background:transparent;border-color:transparent;box-shadow:none;color:#c3d0e2}
        #${uid} [data-action="smart-toggle"]:hover,#${uid} [data-action="auto"]:hover{background:#ffffff04}
        #${uid} [data-action="restore-player"],#${uid} .route-toolbar button{display:inline-flex;gap:5px;align-items:center;justify-content:center;color:#91b5df}
        #${uid} .route-toolbar button:hover,#${uid} [data-action="restore-player"]:hover{background:#ffffff06;color:#c6e2ff}
        #${uid} .route-toolbar [data-action="reset-health"]{border-left-color:#ffffff0b}
        #${uid} .routes-heading{font-size:14px;letter-spacing:.4px}
        #${uid} .route-primary-actions{display:inline-flex;align-items:center;flex-wrap:nowrap;gap:4px;flex:0 0 auto}
        #${uid} .route-primary-actions button{white-space:nowrap}
        #${uid} .probe-summary{border-color:#ffffff07;background:#19283c;border-radius:10px;padding:8px 12px}
        #${uid} .summary-item{border-color:#ffffff10}
        #${uid} .source-row{border:1px solid #304159;border-radius:13px;background:linear-gradient(135deg,#1b293b,#182436);box-shadow:0 3px 10px #00000012;transition:border-color .15s,box-shadow .15s}
        #${uid} .source-row:hover{border-color:#536b89;box-shadow:0 4px 14px #00000024}
        #${uid} .source-row.is-playing{border-color:#459eff;box-shadow:0 0 0 1px #378cff22,0 5px 20px #1166da14;background:linear-gradient(135deg,#1b304a,#19263c)}
        #${uid} .source-button,#${uid} .source-button[aria-pressed="true"]{grid-template-columns:64px minmax(0,1fr);gap:10px 12px;padding:13px 13px 8px}
        #${uid} .route-name{font-size:14px;font-weight:650;letter-spacing:.15px}
        #${uid} .card-heading{gap:6px}
        #${uid} .counter,#${uid} .playing-badge{display:inline-flex;align-items:center;gap:3px;font-size:10px;line-height:1.35;box-shadow:none;padding:3px 7px;border-radius:20px}
        #${uid} .counter .ui-icon,#${uid} .playing-badge .ui-icon{width:12px;height:12px;vertical-align:0}
        #${uid} .counter.pass{background:#204f40;color:#a0e8c0;border-color:#347254}
        #${uid} .counter.limited{background:#45305e;color:#d9b9ff;border-color:#74539a}
        #${uid} .counter.fail{background:#512d39;color:#ffb5c4;border-color:#895062}
        #${uid} .counter.testing{background:#4a402b;color:#f3cf8c;border-color:#7b6944}
        #${uid} .counter.idle{background:#28354a;color:#adbed4;border-color:#43516a}
        #${uid} .playing-badge{background:#214f87;color:#c9e5ff;border-color:#3b80c7}
        #${uid} .route-score{font-size:26px;letter-spacing:-.7px;font-weight:700;color:#97abc6}
        #${uid} .source-row[data-state="pass"] .route-score{color:#7eddb2}
        #${uid} .source-row.is-playing .route-score{color:#89caff}
        #${uid} .route-score small{font-size:9px;letter-spacing:.4px;color:#8197b3}
        #${uid} .route-result{border-left-color:#ffffff0b;padding-left:12px;line-height:1.6;color:#bdcce0;font-size:11px}
        #${uid} .route-result>span{display:block;text-wrap:pretty;overflow-wrap:anywhere}
        #${uid} .result-secondary{color:#90a6c1;font-size:10px}
        #${uid} .recent-rate{border-top-color:#ffffff09;color:#93a9c4;padding-top:8px}
        #${uid} .route-details{display:inline-flex;align-items:center;gap:2px;color:#90a6c1;padding:4px 10px}
        #${uid} .route-details .ui-icon{width:12px;height:12px}
        #${uid} .route-details[aria-expanded="true"] .ui-icon{transform:rotate(180deg)}
        #${uid} .route-details:hover{color:#cde6ff;background:#ffffff05}
        #${uid} .route-health{border-top-color:#ffffff09;color:#a0b3cb}
        #${uid} .reorder{color:#7389a5;display:grid;place-items:center;top:12px}
        #${uid} .reorder .ui-icon{width:12px;height:15px}
        @media(max-width:650px){#${uid} .source-button,#${uid} .source-button[aria-pressed="true"]{grid-template-columns:52px minmax(0,1fr);gap:8px;padding:11px 10px 8px}#${uid} .route-score{font-size:24px}#${uid} .route-result{padding-left:8px}}
        @media(prefers-reduced-motion:reduce){#${uid} button,#${uid} .source-row{transition:none}}

        /* Lightweight motion: no timers, external assets or pointer tracking. */
        #${uid} .panel{background:radial-gradient(ellipse at 0 0,#213c5a36,transparent 50%),linear-gradient(145deg,#111d30,#0e1727)}
        #${uid} .panel:not([hidden]){animation:${uid}-panel-in .2s ease-out}
        #${uid} .brand-logo{box-shadow:0 3px 13px #188cfb30,inset 0 1px 0 #ffffff40}
        #${uid} .mode-switch button{transition:background .2s,box-shadow .2s,color .2s}
        #${uid} .mode-switch button[aria-pressed="true"]{box-shadow:0 3px 12px #177afa25,inset 0 1px 0 #ffffff25}
        #${uid} [data-action="smart"]{position:relative;overflow:hidden;background:linear-gradient(120deg,#219dec,#3263ef);box-shadow:0 4px 14px #176ce52b,inset 0 1px 0 #ffffff25;transition:box-shadow .2s,filter .2s,transform .2s}
        #${uid} [data-action="smart"]:before{content:'';position:absolute;inset:-40% auto -40% -65%;width:40%;background:linear-gradient(90deg,transparent,#ffffff25,transparent);transform:skewX(-20deg);pointer-events:none}
        #${uid} [data-action="smart"]:hover:before{animation:${uid}-button-shine .7s ease-out}
        #${uid} [data-action="smart"]:hover{box-shadow:0 5px 20px #237aff42;filter:brightness(1.08)}
        #${uid} [data-action="smart"]:active{transform:scale(.98)}
        #${uid} .source-row{transition:border-color .2s,box-shadow .2s,transform .2s;background:linear-gradient(125deg,#1c2c40,#182436)}
        #${uid} .source-row:focus-within{border-color:#72b5ff;box-shadow:0 0 0 2px #4b9eff20}
        #${uid} .source-row.is-playing{background:radial-gradient(ellipse at 100% 0,#327cd624,transparent 75%),linear-gradient(135deg,#1b304a,#19263c);box-shadow:0 0 0 1px #459eff25,0 5px 18px #1166da20}
        #${uid} .playing-badge{box-shadow:0 0 8px #2887f026}
        #${uid} .playing-badge .ui-icon{animation:${uid}-playing-glow 2.8s ease-in-out infinite}
        #${uid} .source-row[data-state="testing"] .counter{animation:${uid}-testing-glow 2.2s ease-in-out infinite}
        #${uid} .source-row[data-state="testing"] .counter .ui-icon{color:#ffdd9f}
        #${uid} .summary-dot.running{animation:${uid}-playing-glow 2s ease-in-out infinite}
        #${uid} .route-health:not([hidden]){animation:${uid}-details-in .2s ease-out}
        #${uid} .route-details .ui-icon{transition:transform .18s ease}
        #${uid} .counter{transition:filter .2s,box-shadow .2s}
        #${uid} .source-row:hover .counter{filter:brightness(1.08)}
        #${uid} .source-button:focus-visible{outline-offset:-3px;border-radius:12px}
        #${uid} .reorder:hover{color:#c0deff;background:#ffffff08}
        #${uid} .source-row.drop-target{outline:2px dashed #79bfff;outline-offset:-3px;background:#203751;box-shadow:0 0 18px #388cff20}
        @media(hover:hover) and (pointer:fine){#${uid} .source-row:hover{transform:translateY(-2px);border-color:#577494;box-shadow:0 7px 18px #0003}#${uid} .source-row.is-playing:hover{border-color:#83c2ff;box-shadow:0 7px 22px #1679f52b}}
        @keyframes ${uid}-panel-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ${uid}-details-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
        @keyframes ${uid}-button-shine{from{left:-65%}to{left:140%}}
        @keyframes ${uid}-playing-glow{0%,100%{opacity:1}50%{opacity:.55}}
        @keyframes ${uid}-testing-glow{0%,100%{box-shadow:0 0 0 0 #e8b75600}50%{box-shadow:0 0 9px 1px #e8b75625}}
        @media(prefers-reduced-motion:reduce){#${uid} .panel,#${uid} .panel *,#${uid} .panel *:before{animation:none!important;transition:none!important}#${uid} .source-row:hover,#${uid} [data-action="smart"]:active{transform:none}}

        #${uid} .now-playing{display:flex;align-items:center;gap:9px;padding:13px 15px;border:1px solid #328ce5;border-radius:10px;margin:12px 0;background:linear-gradient(110deg,#193e62,#162b46);color:#deefff}
        #${uid} .now-playing>span{flex:1;min-width:0;overflow-wrap:anywhere;font-weight:600}
        #${uid} .now-playing>.ui-icon{color:#61c5ff;width:23px;height:23px}
        #${uid} .now-playing>strong{font-size:20px;white-space:nowrap;color:#b3ddff}
        #${uid} .test-progress{margin:15px 0 12px}
        #${uid} .phase-labels{font-size:12px;color:#acc7e7;margin-bottom:8px}
        #${uid} progress{display:block;width:100%;height:6px;border:0;border-radius:8px;overflow:hidden;accent-color:#369bff;background:#213650}
        #${uid} progress::-webkit-progress-bar{background:#213650;border-radius:8px}
        #${uid} progress::-webkit-progress-value{background:linear-gradient(90deg,#2687ed,#64c3ff);border-radius:8px;transition:width .2s}
        #${uid} .route-filters{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0 8px}
        #${uid} .route-filters button{display:inline-flex;align-items:center;gap:6px;border-radius:22px;padding:6px 10px;border:1px solid #354b65;background:#17263a;font-size:12px}
        #${uid} .route-filters b{border-radius:12px;padding:1px 6px;background:#2d435f;font-variant-numeric:tabular-nums}
        #${uid} .route-filters [data-filter="pass"] b{color:#9cecc0;background:#20553e}
        #${uid} .route-filters [data-filter="limited"] b{color:#e2c8ff;background:#51367a}
        #${uid} .route-filters [data-filter="fail"] b{color:#ffc2ce;background:#683949}
        #${uid} .route-filters button[aria-pressed="true"]{border-color:#459eff;background:#174b80;color:#e7f4ff}
        #${uid} .route-filters button:disabled{opacity:.5;cursor:default}
        #${uid} .health-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 10px}
        #${uid} .health-cell{display:flex;flex-direction:column;gap:3px;min-width:0;border-bottom:1px solid #ffffff08;padding-bottom:8px}
        #${uid} .health-cell>span{font-size:10px;color:#92a9c4}
        #${uid} .health-cell>strong{font-size:13px;font-weight:600;color:#e1edfc;overflow-wrap:anywhere}
        #${uid} .health-explanation{display:flex;flex-direction:column;gap:5px;font-size:11px;line-height:1.7;padding-top:10px}
        #${uid} .health-explanation>strong{font-size:11px;color:#c7ddf6}
        #${uid} .route-health{padding:12px;border:1px solid #324a64;border-radius:9px;background:#101e3055;margin:5px 0}
        #${uid} .density-controls{display:flex;align-items:center;gap:5px;border-top:1px solid #ffffff09;padding-top:12px;margin-top:16px;color:#94abc6;font-size:11px}
        #${uid} .density-controls>span{margin-right:7px}
        #${uid} .density-controls button{font-size:11px;border-radius:20px;padding:4px 12px;background:transparent;border-color:#30455f}
        #${uid} .density-controls button[aria-pressed="true"]{background:#194d82;border-color:#459eff;color:#d6edff}
        #${uid}[data-density="comfortable"] .source-button{padding:17px 15px 12px;gap:13px}
        #${uid}[data-density="comfortable"] .route-result{font-size:13px;line-height:1.8}
        #${uid}[data-density="comfortable"] .result-secondary{font-size:12px}
        #${uid}[data-density="comfortable"] .route-name{font-size:16px}
        #${uid}[data-density="comfortable"] .recent-rate{font-size:12px}
        @media(prefers-reduced-motion:reduce){#${uid} progress::-webkit-progress-value{transition:none}}
        #${uid} .playback-controls [data-action="restore-player"]{white-space:nowrap;flex:none}
        #${uid} .source-list{grid-auto-rows:1px;grid-auto-flow:row dense;gap:10px}
        #${uid} .source-list.manage{grid-auto-rows:auto}
        #${uid} .panel{overflow-anchor:none}
        .${hostClass}>:not(#${frameId}){visibility:hidden!important;pointer-events:none!important}
        #${frameId}{display:block!important;visibility:visible!important;opacity:1!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;z-index:2147483000!important;background:#000!important;pointer-events:auto!important}
    `);
    document.body.appendChild(box);
    const panel = box.querySelector('.panel');
    const launcher = box.querySelector('.launcher');
    const list = box.querySelector('.source-list');
    const dragHandle = box.querySelector('.drag-handle');
    function layoutCards() {
        if (panel.hidden) return;
        for (const row of list.querySelectorAll('.source-row')) {
            row.style.gridRowEnd = managing ? '' : 'span ' + Math.max(1, Math.ceil((row.getBoundingClientRect().height + 10) / 11));
        }
    }
    const cardResizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(layoutCards) : null;
    function message(text) {
        clearTimeout(statusTimer);
        box.querySelector('.status').textContent = text;
        if (!smartRun) statusTimer = setTimeout(() => { box.querySelector('.status').textContent = ''; }, 7000);
    }
    function positionPanel() {
        if (panel.hidden) return;
        const rect = box.getBoundingClientRect();
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const preferred = rect.right + 8 + width <= innerWidth ? rect.right + 8 : rect.left - width - 8;
        panel.style.left = Math.max(8, Math.min(preferred, innerWidth - width - 8)) + 'px';
        panel.style.top = Math.max(8, Math.min(rect.top, innerHeight - height - 8)) + 'px';
    }
    function openPanel(open) {
        clearTimeout(leaveTimer);
        panel.hidden = !open;
        launcher.setAttribute('aria-expanded', String(open));
        if (open) { render(); positionPanel(); }
    }
    function renderProgress() {
        const area = box.querySelector('.test-progress');
        area.hidden = !testProgress;
        if (!testProgress) return;
        const p = testProgress;
        const ended = ['done','stopped','early','error'].includes(p.phase);
        const stage = {initial:'初测中',retest:'复测中',done:'已完成',stopped:'已停止',early:'已提前选线',error:'未能启动'}[p.phase] || '准备中';
        const retestText = p.retestSkipped ? '已跳过（仅一条通过）' : p.retestTotal ? `${p.retestDone}/${p.retestTotal}` : p.phase === 'done' ? '无候选' : '待定';
        area.querySelector('.phase-labels').textContent = `初测 ${p.initialDone}/${p.initialTotal}　 ·　 复测 ${retestText}　 ·　 ${stage}`;
        const percent = p.phase === 'done' ? 100 : Math.min(99, (p.initialTotal ? p.initialDone / p.initialTotal : 0) * 70 + (p.retestTotal ? p.retestDone / p.retestTotal : 0) * 30);
        const meter = area.querySelector('progress'); meter.value = percent;
        meter.setAttribute('aria-valuetext', area.querySelector('.phase-labels').textContent);
        area.classList.toggle('ended', ended);
    }
    function render() {
        const scrollBefore = panel.scrollTop;
        cardResizeObserver?.disconnect();
        list.replaceChildren();
        list.classList.toggle('manage', managing);
        box.dataset.density = density;
        box.querySelectorAll('[data-density]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.density === density)));
        renderProgress();
        const playingBar = box.querySelector('.now-playing');
        const current = activePlayer && !activePlayer.testing && activePlayer.frame.isConnected ? activePlayer.source : null;
        playingBar.hidden = !current;
        playingBar.replaceChildren();
        if (current) {
            const label = document.createElement('span'); label.textContent = '正在播放 · ' + current.n;
            const score = document.createElement('strong');
            const match = probeStates.get(current.u) === 'match' && probeResults.get(current.u)?.match(/通过\s+(\d+(?:\.\d+)?)\s*分/);
            score.textContent = match ? match[1] + ' 分' : '未实测';
            playingBar.innerHTML = uiIcon('play'); playingBar.append(label, score);
        }
        let available = ranked(managing);
        // Health scores change while samples arrive; keep cards in their run order.
        if (smartRun && !managing) {
            if (!smartRun.displayOrder) smartRun.displayOrder = available.map(source => source.u);
            available.sort((a,b) => smartRun.displayOrder.indexOf(a.u) - smartRun.displayOrder.indexOf(b.u));
        }
        const matchesFilter = (source, filter) => filter === 'all' || (filter === 'pass' ? probeStates.get(source.u) === 'match' : filter === 'limited' ? ['limited','unknown'].includes(probeStates.get(source.u)) : probeStates.get(source.u) === 'failed');
        const filters = box.querySelector('.route-filters'); filters.replaceChildren();
        for (const [value, label] of [['all','全部'],['pass','通过'],['limited','无法检测'],['fail','未通过']]) {
            const control = document.createElement('button'); control.type = 'button'; control.dataset.filter = value;
            control.setAttribute('aria-pressed', String(routeFilter === value)); control.disabled = managing;
            control.append(document.createTextNode(label + ' '));
            const count = document.createElement('b'); count.textContent = available.filter(source => matchesFilter(source,value)).length;
            control.appendChild(count); filters.appendChild(control);
        }
        for (const source of available.filter(source => managing || matchesFilter(source, routeFilter))) {
            const row = document.createElement('div');
            row.className = 'source-row';
            row.dataset.orderSource = source.u;
            const handle = document.createElement('button');
            handle.type = 'button'; handle.className = 'reorder'; handle.draggable = !smartRun; handle.disabled = !!smartRun;
            handle.innerHTML = uiIcon('grip'); handle.title = '拖动调整顺序；按上下方向键也可移动';
            handle.setAttribute('aria-label', '调整' + source.n + '顺序');
            row.appendChild(handle);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'source-button';
            button.dataset.source = source.u;
            const name = document.createElement('span');
            name.className = 'route-name'; name.textContent = source.n;
            button.appendChild(name);
            const s = stat(source);
            button.title = `${source.n}\n${s.last ? '最近成功：' + new Date(s.last).toLocaleString() : '尚无实测成功记录'}\n累计成功次数：${s.count}\n${source.u}`;
            const probeStatus = probeResults.get(source.u);
            if (probeStatus) button.title += '\n本次检测：' + probeStatus;
            button.disabled = isHidden(source);
            button.setAttribute('aria-pressed', String(source.u === selected));
            const badge = document.createElement('span');
            const state = probeStates.get(source.u) || 'idle';
            const statusClass = {match:'pass',failed:'fail',limited:'limited',unknown:'limited',testing:'testing',retesting:'testing'}[state] || 'idle';
            badge.className = 'counter ' + statusClass;
            // The first label describes this run. Historical counters are
            // deliberately secondary so they cannot be mistaken for a live
            // playback result.
            const resultLabel = {match:'通过',failed:'未通过',limited:'无法检测',testing:'检测中',retesting:'复测中',unknown:'无法检测',cancelled:'已取消',queued:'待测',idle:'未测试'}[state];
            badge.innerHTML = uiIcon({pass:'check',limited:'help',fail:'close',testing:'clock'}[statusClass] || 'clock');
            badge.appendChild(document.createTextNode(resultLabel));

            if (probeStatus) badge.title = '本轮：' + probeStatus;
            const cardHeading = document.createElement('span'); cardHeading.className = 'card-heading';
            cardHeading.append(name, badge); button.appendChild(cardHeading);
            row.dataset.state = statusClass;
            const playing = activePlayer && !activePlayer.testing && activePlayer.source?.u === source.u;
            row.classList.toggle('is-playing', !!playing);
            if (playing) {
                const now = document.createElement('span'); now.className = 'playing-badge';
                now.innerHTML = uiIcon('play') + '正在播放'; cardHeading.appendChild(now);
            }
            const scoreMatch = statusClass === 'pass' && probeStatus?.match(/通过\s+(\d+(?:\.\d+)?)\s*分/);
            const score = document.createElement('span'); score.className = 'route-score';
            score.textContent = scoreMatch ? scoreMatch[1] : '—';
            const scoreLabel = document.createElement('small'); scoreLabel.textContent = '流畅评分';
            score.appendChild(scoreLabel); button.appendChild(score);
            const result = document.createElement('span'); result.className = 'route-result';
            const resultText = (probeStatus || '等待开始测试').replace(/((?:实播|复测)通过)\s+\d+(?:\.\d+)?\s*分/, '$1');
            // Keep complete text accessible in details; each status phrase gets its own line.
            result.title = resultText;
            resultText.split(' · ').forEach((text, index) => {
                const line = document.createElement('span'); line.className = index ? 'result-secondary' : 'result-primary';
                line.textContent = text; result.appendChild(line);
            });
            button.appendChild(result);
            const h = health(source);
            const healthInfo = document.createElement('span');
            healthInfo.className = 'route-health';
            const recent = h.rate === null ? '暂无样本' : `${Math.round(h.rate*100)}%（${h.successes}/${h.attempts}）`;
            healthInfo.hidden = !expandedRoutes.has(source.u);
            const recentLine = document.createElement('span'); recentLine.className = 'recent-rate';
            recentLine.textContent = `近期成功率 ${recent}`; button.appendChild(recentLine);
            const healthGrid = document.createElement('span'); healthGrid.className = 'health-grid';
            for (const [label,value] of [
                ['最近成功',s.last ? new Date(s.last).toLocaleString() : '暂无'],
                ['累计成功次数',String(s.count)],
                ['近期成功率',recent],
                ['连续超时',h.timeoutStreak + ' 次'],
                ['时长匹配',s.full + ' 次'],
                ['无法检测',h.limited + ' 次']
            ]) {
                const cell = document.createElement('span'); cell.className = 'health-cell';
                const caption = document.createElement('span'); caption.textContent = label + ' ';
                const valueNode = document.createElement('strong'); valueNode.textContent = value;
                cell.append(caption,valueNode); healthGrid.appendChild(cell);
            }
            const explanation = document.createElement('span'); explanation.className = 'health-explanation';
            const heading = document.createElement('strong'); heading.textContent = '检测说明';
            const text = document.createElement('span'); text.textContent = probeStatus || '尚未测试；历史记录不代表本次播放结果。';
            explanation.append(heading,text); healthInfo.append(healthGrid,explanation);
            healthInfo.title = '最近30天内最多20轮记录；成功率仅计算明确通过或未通过。无法检测、超时及旧版无法确认不计分母，也不直接降低健康分。复测覆盖本轮，取消不新增记录。';
            button.appendChild(healthInfo);
            row.appendChild(button);
            const detail = document.createElement('button'); detail.type = 'button';
            detail.className = 'route-details'; detail.dataset.detail = source.u;
            detail.setAttribute('aria-expanded', String(expandedRoutes.has(source.u)));
            detail.setAttribute('aria-label', source.n + '的检测与健康详情');
            detail.innerHTML = (expandedRoutes.has(source.u) ? '收起详情' : '详情') + uiIcon('chevron');
            row.appendChild(detail);
            if (managing) {
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.dataset.toggle = source.u;
                toggle.textContent = isHidden(source) ? '恢复' : '隐藏';
                toggle.setAttribute('aria-label', toggle.textContent + source.n);
                row.appendChild(toggle);
            }
            list.appendChild(row);
            cardResizeObserver?.observe(row);
        }
        if (!list.children.length) list.textContent = routeFilter !== 'all' && !managing ? '本轮暂无此类线路，可切换“全部”查看。' : '暂无显示的线路，可在管理中恢复。';
        box.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
        const autoButton = box.querySelector('[data-action="auto"]');
        autoButton.textContent = '自动播放';
        autoButton.setAttribute('aria-pressed', String(autoOn));
        box.querySelector('[data-action="manage"]').innerHTML = uiIcon(managing ? 'check' : 'settings') + (managing ? '完成管理' : '管理');
        box.querySelector('[data-action="restore-sources"]').hidden = !managing;
        box.querySelector('[data-action="sort-success"]').hidden = !managing;
        box.querySelector('[data-action="reset-health"]').disabled = !!smartRun;
        box.querySelector('[data-action="undo-health-reset"]').hidden = !managing || !read(healthBackupKey,null);
        box.querySelector('[data-action="undo-health-reset"]').disabled = !!smartRun;
        box.querySelector('[data-action="smart-toggle"]').textContent = '按时长优选';
        box.querySelector('[data-action="smart-toggle"]').setAttribute('aria-pressed', String(smartOn));
        box.querySelector('[data-action="stop-smart"]').hidden = !smartRun;
        box.querySelector('[data-action="smart"]').disabled = !!smartRun;
        box.querySelector('.target-duration').disabled = !!smartRun;
        box.querySelectorAll('.duration-choice input').forEach(input => { input.disabled = !!smartRun; });
        box.querySelector('.probe-concurrency').disabled = !!smartRun;
        box.querySelector('.probe-timeout').disabled = !!smartRun;
        layoutCards();
        positionPanel();
        panel.scrollTop = scrollBefore;
    }
    window.addEventListener('message',event=>{
        const d=event.data;
        if(!activePlayer || activePlayer.testing || d?.channel!==DURATION_CHANNEL || d.kind!=='playback-health' || d.token!==activePlayer.monitorToken) return;
        if(!/^https?:\/\//.test(event.origin) || !descendantWindows(activePlayer.frame).includes(event.source))return;
        if(![d.time,d.ready,d.buffer,d.pauses,d.waits,d.error].every(Number.isFinite) || typeof d.paused!=='boolean')return;
        const samples=activePlayer.diagnostics || (activePlayer.diagnostics=[]);
        samples.push({at:new Date().toISOString(),host:new URL(event.origin).hostname,time:d.time,paused:d.paused,ready:d.ready,buffer:d.buffer,pauses:d.pauses,waits:d.waits,error:d.error});
        if(samples.length>20)samples.shift();
        const hint=d.error?'媒体错误 '+d.error:d.paused?'当前暂停（不自动干预）':d.ready<3 && d.buffer<1?'正在等待媒体数据':'正在播放';
    });
    function setPosition(left, top, persist = false) {
        const x = Math.max(0, Math.min(left, Math.max(0, innerWidth - 46)));
        const y = Math.max(0, Math.min(top, Math.max(0, innerHeight - 64)));
        box.style.left = x + 'px';
        box.style.top = y + 'px';
        if (persist) save(PREFIX + 'position', {x, y});
        positionPanel();
    }
    const position = read(PREFIX + 'position', {});
    setPosition(Number.isFinite(position?.x) ? position.x : 8, Number.isFinite(position?.y) ? position.y : 120);
    let drag = null;
    dragHandle.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        const r = box.getBoundingClientRect();
        drag = {id: event.pointerId, dx: event.clientX - r.left, dy: event.clientY - r.top};
        dragHandle.setPointerCapture(event.pointerId);
    });
    dragHandle.addEventListener('pointermove', event => {
        if (drag?.id === event.pointerId) setPosition(event.clientX - drag.dx, event.clientY - drag.dy);
    });
    function endDrag() {
        if (!drag) return;
        drag = null;
        setPosition(parseFloat(box.style.left), parseFloat(box.style.top), true);
    }
    dragHandle.addEventListener('pointerup', endDrag);
    dragHandle.addEventListener('pointercancel', endDrag);
    dragHandle.addEventListener('lostpointercapture', endDrag);
    dragHandle.addEventListener('keydown', event => {
        const delta = {ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10]}[event.key];
        if (!delta) return;
        event.preventDefault();
        setPosition(parseFloat(box.style.left) + delta[0], parseFloat(box.style.top) + delta[1], true);
    });
    window.addEventListener('resize', () => setPosition(parseFloat(box.style.left), parseFloat(box.style.top)));
    launcher.addEventListener('click', () => openPanel(panel.hidden));
    box.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') clearTimeout(leaveTimer); });
    box.addEventListener('pointerleave', event => {
        if (event.pointerType === 'mouse' && !box.contains(document.activeElement) && !drag)
            leaveTimer = setTimeout(() => openPanel(false), 450);
    });
    document.addEventListener('pointerdown', event => { if (!box.contains(event.target)) openPanel(false); });
    box.addEventListener('keydown', event => {
        if (event.key === 'Escape') { openPanel(false); launcher.focus(); }
    });

    function stopPending() {
        generation++;
        if (cancelWait) { cancelWait(); cancelWait = null; }
    }
    function waitForContainer() {
        const found = document.querySelector(selector);
        if (found) return Promise.resolve(found);
        return new Promise(resolve => {
            let done = false;
            const finish = value => {
                if (done) return;
                done = true;
                observer.disconnect();
                clearTimeout(timer);
                if (cancelWait === cancel) cancelWait = null;
                resolve(value);
            };
            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) finish(element);
            });
            const timer = setTimeout(() => finish(null), 8000);
            const cancel = () => finish(null);
            cancelWait = cancel;
            observer.observe(document.body, {childList: true, subtree: true});
        });
    }
    // The site's video can live outside the chosen player container. Guard the
    // original document for the entire embedded session, not just on mounting.
    function guardOriginalMedia() {
        const release = mediaAccess.block();
        const token = randomToken();
        const targets = new Set();
        function stopOriginalFrames() {
            for (const element of document.querySelectorAll('iframe')) {
                if (ownedFrames.has(element)) continue;
                for (const child of descendantWindows(element)) {
                    targets.add(child);
                    try { child.postMessage({channel:DURATION_CHANNEL,kind:'source-stop',token},'*'); } catch {}
                }
            }
        }
        stopOriginalFrames();
        const timer = setInterval(stopOriginalFrames,700);
        return () => {
            clearInterval(timer); release();
            for (const child of targets) try { child.postMessage({channel:DURATION_CHANNEL,kind:'source-release',token},'*'); } catch {}
            targets.clear();
        };
    }
    function guardOriginalFrames(container, frame) {
        const oldFrames = new Map();
        function protect() {
            // Hidden iframes can still emit audio. Unload only original frames
            // inside this player, never the newly mounted third-party player.
            for (const original of container.querySelectorAll('iframe')) {
                if (original === frame || ownedFrames.has(original)) continue;
                if (!oldFrames.has(original)) oldFrames.set(original, {
                    src: original.getAttribute('src'), srcdoc: original.getAttribute('srcdoc')
                });
                if (original.hasAttribute('srcdoc')) original.removeAttribute('srcdoc');
                if (original.getAttribute('src') !== 'about:blank') original.setAttribute('src', 'about:blank');
            }
        }
        const observer = new MutationObserver(protect);
        observer.observe(container, {childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'srcdoc']});
        protect();
        return () => {
            observer.disconnect();
            for (const [original, state] of oldFrames) {
                for (const attr of ['src', 'srcdoc']) {
                    if (state[attr] === null) original.removeAttribute(attr);
                    else original.setAttribute(attr, state[attr]);
                }
            }
        };
    }
    function restorePlayer() {
        if (originalMediaGuard) { originalMediaGuard(); originalMediaGuard = null; }
        if (!activePlayer) return;
        const {container, frame, styles, cleanup} = activePlayer;
        activePlayer = null;
        cleanup();
        for (const owned of ownedFrames) owned.remove();
        ownedFrames.clear();
        frame.remove();
        container.classList.remove(hostClass);
        for (const [name, oldValue, oldPriority, applied] of styles) {
            if (container.style.getPropertyValue(name) !== applied) continue;
            if (oldValue) container.style.setProperty(name, oldValue, oldPriority);
            else container.style.removeProperty(name);
        }
        // Leave original media paused; the user can explicitly resume it.
    }
    function choose(source) {
        selected = source.u;
        save(SITE + 'selected', selected);
    }
    async function play(source, manual = false, testing = false) {
        if (!source || isHidden(source)) return;
        stopPending();
        const token = generation;
        const targetUrl = location.href;
        message('正在查找播放器…');
        const container = await waitForContainer();
        if (token !== generation || targetUrl !== location.href || isHidden(source)) return;
        if (!container?.isConnected) { message('未找到播放器，可切换“新标签页”使用。'); return; }
        restorePlayer();
        const styles = [];
        const changeStyle = (name, value) => {
            styles.push([name, container.style.getPropertyValue(name), container.style.getPropertyPriority(name), value]);
            container.style.setProperty(name, value, 'important');
        };
        if (!getComputedStyle(container).position || getComputedStyle(container).position === 'static') changeStyle('position', 'relative');
        if (container.getBoundingClientRect().height < 120) changeStyle('min-height', '260px');
        const frame = document.createElement('iframe');
        frame.id = frameId;
        frame.title = source.n + ' 第三方播放器';
        if (testing) frame.name = 'vrprobe:' + randomToken();
        frame.src = source.u + encodeURIComponent(videoPageUrl());
        frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'no-referrer';
        ownedFrames.add(frame);
        container.classList.add(hostClass);
        container.appendChild(frame);
        originalMediaGuard = guardOriginalMedia();
        const cleanup = guardOriginalFrames(container, frame);
        activePlayer = {container, frame, styles, cleanup, source, testing};
        if (!testing) choose(source);
        // Opening alone is not a verified success.
        render();
        if (!testing) message('已暂停并静音原网页音视频，正在使用 ' + source.n + '。');
        return activePlayer;
    }
    function preferredSource() { return ranked().find(s => s.u === selected) || ranked()[0]; }
    function runAuto() {
        if (autoOn && mode === 'embedded') {
            if (smartOn) void startSmartSelection();
            else void play(preferredSource());
        }
    }
    box.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || !box.contains(button)) return;
        if (button.dataset.filter) {
            routeFilter = button.dataset.filter; render();
            box.querySelector(`[data-filter="${routeFilter}"]`)?.focus(); return;
        }
        if (button.dataset.density) {
            density = button.dataset.density; save(PREFIX + 'density', density); render();
            box.querySelector(`[data-density="${density}"]`)?.focus(); return;
        }
        if (button.dataset.detail) {
            const url = button.dataset.detail;
            if (expandedRoutes.has(url)) expandedRoutes.delete(url); else expandedRoutes.add(url);
            const row = button.closest('.source-row');
            row.querySelector('.route-health').hidden = !expandedRoutes.has(url);
            button.setAttribute('aria-expanded', String(expandedRoutes.has(url)));
            button.innerHTML = (expandedRoutes.has(url) ? '收起详情' : '详情') + uiIcon('chevron');
            layoutCards();
            return;
        }
        if (button.dataset.source) {
            const source = sources.find(s => s.u === button.dataset.source);
            if (!source || isHidden(source)) return;
            if (smartRun && chooseTestedNow(source)) return;
            stopSmartSelection();
            if (mode === 'embedded') void play(source, true);
            else {
                try {
                    GM_openInTab(source.u + encodeURIComponent(videoPageUrl()), {active: true, insert: true});
                    choose(source); render();
                    message('已在新标签页打开，未验证播放，因此不增加成功次数。');
                } catch { message('无法打开标签页，请检查扩展权限。'); }
            }
            return;
        }
        if (button.dataset.toggle) {
            stopSmartSelection();
            const source = sources.find(s => s.u === button.dataset.toggle);
            if (!source) return;
            const hide = !isHidden(source);
            save(hiddenKey(source), hide);
            if (hide) stopPending();
            if (hide && source.u === selected) restorePlayer();
            render();
            message(hide ? '已从常用列表隐藏，可随时恢复。' : '已恢复线路及原有使用记录。');
            return;
        }
        if (button.dataset.mode) {
            stopSmartSelection();
            mode = button.dataset.mode;
            save(SITE + 'mode', mode);
            stopPending();
            if (mode === 'tab') restorePlayer();
            render();
            return;
        }
        switch (button.dataset.action) {
            case 'smart': void startSmartSelection(); break;
            case 'sort-success': save(PREFIX + 'manual-order', null); render(); break;
            case 'stop-smart':
                if (smartRun) {
                    refreshLateTarget(smartRun);
                    const available = [...smartRun.matches].filter(r=>r.frame.isConnected && probeStates.get(r.source.u)==='match').sort((a,b)=>b.score-a.score);
                    if (available[0] && chooseTestedNow(available[0].source)) break;
                }
                stopSmartSelection(); restorePlayer(); render();
                message('已停止测试，可手动选线或重新开始。'); break;
            case 'smart-toggle':
                stopSmartSelection(); smartOn = !smartOn; save(SITE + 'smart', smartOn); render(); break;
            case 'close': openPanel(false); launcher.focus(); break;
            case 'auto':
                stopSmartSelection();
                autoOn = !autoOn; save(SITE + 'auto', autoOn);
                stopPending(); render(); runAuto(); break;
            case 'restore-player':
                stopSmartSelection();
                stopPending(); restorePlayer();
                autoOn = false; save(SITE + 'auto', false); render();
                message('已恢复原播放器并关闭自动播放。'); break;
            case 'manage': managing = !managing; render(); break;
            case 'reset-health': {
                if (smartRun) {message('请先结束测试，再重新计算健康记录。');break;}
                const backup = sources.map(source=>({u:source.u,events:health(source).events}));
                if (!save(healthBackupKey,backup)) break;
                let ok=true;
                for (const source of sources) if(!save(healthKey(source),{events:[]})) ok=false;
                render();
                message(ok ? '健康记录已重新开始：近期成功率为暂无样本，连续超时为0；累计成功次数、最近成功时间和手动顺序保留。' : '部分记录未能清空，可恢复上次健康记录后重试。');
                break;
            }
            case 'undo-health-reset': {
                if (smartRun) {message('请先结束测试，再恢复健康记录。');break;}
                const backup=read(healthBackupKey,null);
                if(!Array.isArray(backup)) break;
                let ok=true;
                for(const source of sources) {
                    const old=backup.find(item=>item?.u===source.u);
                    if(!old) continue;
                    const events=[...(Array.isArray(old.events)?old.events:[]),...health(source).events];
                    // Keep post-reset results too; normal age/count limits still apply.
                    if(!save(healthKey(source),{events:HealthTools.summarize({events}).events})) ok=false;
                }
                if(ok) save(healthBackupKey,null);
                render();message(ok?'已恢复上次健康记录，并保留重置后的新检测结果。':'部分记录恢复失败，可重试。');
                break;
            }
            case 'restore-sources':
                for (const source of sources) save(hiddenKey(source), false);
                render(); message('全部线路已恢复。'); break;
        }
    });
    // SPA navigation: cancel stale work, restore the old container, then optionally mount anew.
    let lastUrl = location.href;
    function checkNavigation() {
        if (document.hidden) return;
        if (!box.isConnected) document.body.appendChild(box);
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            stopSmartSelection(); probeResults.clear(); probeStates.clear(); testProgress = null; routeFilter = 'all'; clearTargetDisplay();
            stopPending(); restorePlayer(); runAuto();
        } else if (activePlayer && !activePlayer.testing && !activePlayer.frame.isConnected) {
            const source = activePlayer.source;
            restorePlayer();
            if (mode === 'embedded') void play(source);
        }
    }
    let navigationTimer = null;
    function updatePolling() {
        clearInterval(navigationTimer);
        navigationTimer = null;
        if (!document.hidden) {
            checkNavigation();
            navigationTimer = setInterval(checkNavigation, 1000);
        }
    }
    window.addEventListener('popstate', checkNavigation);
    window.addEventListener('hashchange', checkNavigation);
    document.addEventListener('visibilitychange', updatePolling);
    window.addEventListener('pagehide', () => {
        stopSmartSelection();
        stopPending(); clearInterval(navigationTimer); clearTimeout(statusTimer); clearTimeout(leaveTimer);
    });
    window.addEventListener('pageshow', event => { if (event.persisted) updatePolling(); });
    const targetInput = box.querySelector('.target-duration');
    const targetNote = box.querySelector('.target-note');
    const concurrencySelect = box.querySelector('.probe-concurrency');
    const timeoutSelect = box.querySelector('.probe-timeout');
    const rememberedConcurrency = String(read(SITE + 'concurrency', 'all'));
    concurrencySelect.value = ['all', '1', '3', '6'].includes(rememberedConcurrency) ? rememberedConcurrency : 'all';
    concurrencySelect.addEventListener('change', () => save(SITE + 'concurrency', concurrencySelect.value));
    const rememberedTimeout = String(read(SITE + 'probe-timeout', '30'));
    timeoutSelect.value = ['30', '60', '90', '120'].includes(rememberedTimeout) ? rememberedTimeout : '30';
    timeoutSelect.addEventListener('change', () => save(SITE + 'probe-timeout', timeoutSelect.value));
    let draggedSource = null;
    function reorderSource(from, to) {
        const order = ranked(true).map(source => source.u);
        if (from === to || !order.includes(from) || !order.includes(to)) return;
        const destination = order.indexOf(to);
        order.splice(order.indexOf(from), 1);
        order.splice(destination, 0, from);
        save(PREFIX + 'manual-order', order);
        render(); message('已保存自定义顺序；可点击“按近期健康排序”恢复自动排序。');
    }
    list.addEventListener('dragstart', event => {
        if (!event.target.closest('.reorder')) return;
        draggedSource = event.target.closest('[data-order-source]')?.dataset.orderSource;
        event.dataTransfer?.setData('text/plain', draggedSource || '');
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    });
    list.addEventListener('dragover', event => {
        if (!draggedSource) return;
        const row = event.target.closest('[data-order-source]');
        if (row) {
            event.preventDefault();
            list.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
            row.classList.add('drop-target');
        }
    });
    list.addEventListener('drop', event => {
        if (!draggedSource) return;
        event.preventDefault();
        const to = event.target.closest('[data-order-source]')?.dataset.orderSource;
        if (to) reorderSource(draggedSource, to);
        draggedSource = null;
    });
    list.addEventListener('dragend', () => {
        draggedSource = null;
        list.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
    });
    list.addEventListener('keydown', event => {
        if (!event.target.closest('.reorder') || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const from = event.target.closest('[data-order-source]').dataset.orderSource;
        const visible = ranked(managing);
        const index = visible.findIndex(s => s.u === from) + (event.key === 'ArrowUp' ? -1 : 1);
        if (visible[index]) {
            reorderSource(from, visible[index].u);
            [...list.querySelectorAll('[data-order-source]')].find(el => el.dataset.orderSource === from)?.querySelector('.reorder').focus();
        }
    });
    let targetRequest = null;
    function videoPageUrl() {
        const url = new URL(location.href);
        if (url.hostname === 'v.qq.com' || url.hostname === 'm.v.qq.com') {
            url.searchParams.delete('callTime');
            return url.href;
        }
        if (url.hostname === 'www.bilibili.com' || url.hostname === 'm.bilibili.com') {
            const bvid = url.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/)?.[1];
            if (bvid) {
                const page = Number(url.searchParams.get('p') || 1);
                return `https://www.bilibili.com/video/${bvid}/` + (Number.isSafeInteger(page) && page > 1 ? `?p=${page}` : '');
            }
        }
        return location.href;
    }
    function targetKey() { return PREFIX + 'duration-target:' + videoPageUrl(); }
    function syncDurationMode(manual) {
        box.querySelectorAll('.duration-choice input').forEach(input => { input.checked = input.value === (manual ? 'manual' : 'auto'); });
        targetInput.readOnly = !manual;
    }
    box.querySelectorAll('.duration-choice input').forEach(input => input.addEventListener('change', () => {
        if (smartRun || !input.checked) return;
        const manual = input.value === 'manual';
        syncDurationMode(manual);
        if (manual) { targetInput.focus(); targetInput.select(); }
        else { save(targetKey(), null); clearTargetDisplay(); }
    }));
    targetInput.addEventListener('change', () => {
        const seconds = DurationTools.input(targetInput.value);
        if (targetInput.value.trim() && (!seconds || seconds > 86400)) {
            message('时长支持 16:18、16分18秒、16 min 18 sec、1小时30分钟。'); return;
        }
        syncDurationMode(!!seconds);
        save(targetKey(), seconds || null);
        targetRequest = null;
        if (seconds) { targetInput.value = DurationTools.format(seconds); targetNote.textContent = '已使用你填写的正片时长。'; }
        else clearTargetDisplay();
    });
    function fetchBilibiliTarget(url) {
        const pageUrl = new URL(url);
        const bvid = pageUrl.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/)?.[1];
        if (!bvid || !['www.bilibili.com', 'm.bilibili.com'].includes(pageUrl.hostname)) return Promise.resolve(null);
        const page = Number(pageUrl.searchParams.get('p') || 1);
        return new Promise(resolve => {
            let done = false;
            let request = null;
            const finish = value => { if (!done) { done = true; clearTimeout(timer); resolve(value); } };
            const timer = setTimeout(() => { request?.abort?.(); finish(null); }, 6500);
            const onload = response => {
                try {
                    const json = JSON.parse(response.responseText);
                    const data = json.data;
                    if (json.code !== 0 || data?.bvid !== bvid || !Array.isArray(data.pages)) return finish(null);
                    const part = data.pages.find(item => item.page === page);
                    const seconds = DurationTools.parse(part?.duration);
                    finish(seconds ? {seconds, origin:`B 站第 ${page} P`} : null);
                } catch { finish(null); }
            };
            if (typeof GM_xmlhttpRequest !== 'function') { finish(null); return; }
            try {
                request = GM_xmlhttpRequest({method:'GET', url:'https://api.bilibili.com/x/web-interface/view?bvid=' + encodeURIComponent(bvid),
                    anonymous:true, timeout:6000, onload, onerror:() => finish(null), ontimeout:() => finish(null)});
            } catch { finish(null); }
        });
    }
    async function resolveTarget() {
        const key = videoPageUrl();
        const manual = read(targetKey(), null);
        if (typeof manual === 'number' && manual > 0 && manual <= 86400) return {seconds:manual, origin:'手动指定'};
        if (!targetRequest || targetRequest.key !== key) {
            const currentDocument = document;
            targetRequest = {key, promise:fetchBilibiliTarget(key).then(async value => {
                if(value) return value;
                const metadata=DurationTools.detect(currentDocument,key);
                if(metadata) return metadata;
                if(!['v.qq.com','m.v.qq.com'].includes(new URL(key).hostname) || !currentDocument.querySelector('#app')) return null;
                // Tencent's current Vue/Pinia page stores full video metadata by
                // exact VID. Its native video duration may only be the preview.
                for(let attempt=0;attempt<40;attempt++) {
                    if(!currentDocument.documentElement || videoPageUrl()!==key) return null;
                    const target=readTencentDuration(key);
                    if(target) return target;
                    await new Promise(resolve=>setTimeout(resolve,500));
                }
                return null;
            })};
        }
        return targetRequest.promise;
    }
    function readTencentDuration(key) {
        const vid=new URL(key).pathname.match(/\/([A-Za-z0-9]+)\.html$/)?.[1];
        if(!vid) return null;
        try {
            for(const element of pageWindow.document.querySelectorAll('#app,#main-player,.container-player')) {
                const app=element.__vue_app__;
                const context=app?._context || element.__vueParentComponent?.appContext;
                const pinia=context?.config?.globalProperties?.$pinia || app?.config?.globalProperties?.$pinia;
                const state=pinia?.state?.value?.union || pinia?._s?.get?.('union');
                const info=state?.videoInfoMap?.[vid];
                if(!info || (info.vid && info.vid!==vid)) continue;
                const seconds=DurationTools.parse(info.duration) || DurationTools.parse(info.ext_info?.video_duration);
                if(seconds && seconds<86400) return {seconds,origin:'腾讯当前视频正片数据'};
            }
        } catch {}
        return null;
    }
    function clearTargetDisplay() {
        targetRequest = null;
        syncDurationMode(!!read(targetKey(), null));
        targetInput.value = '';
        const key = videoPageUrl();
        targetNote.textContent = '正在读取正片时长…';
        box.querySelector('.probe-summary').textContent = '';
        void resolveTarget().then(target => {
            if (!box.isConnected) return;
            if (videoPageUrl() !== key || targetInput.value || (!targetInput.readOnly && !read(targetKey(), null))) return;
            if (target) {
                targetInput.value = DurationTools.format(target.seconds);
                targetNote.textContent = `${target.origin} · 可手动修正。纯数字表示分钟。`;
            } else targetNote.textContent = '未识别正片时长，仍可实测择优；完整时长未验证。可选填 45:00。';
        });
    }
    function descendantWindows(frame) {
        const found = [];
        const queue = [];
        if (frame.contentWindow) queue.push(frame.contentWindow);
        while (queue.length && found.length < 64) {
            const item = queue.shift();
            if (!item || found.includes(item)) continue;
            found.push(item);
            try {
                for (let index = 0; index < Math.min(item.length, 32); index++) queue.push(item.frames[index]);
            } catch { /* Some embedded contexts cannot be enumerated. */ }
        }
        return found;
    }
    function randomToken() {
        return [...crypto.getRandomValues(new Uint8Array(16))].map(n => n.toString(16).padStart(2, '0')).join('');
    }
    function sendControl(frame, token, kind, winner = null) {
        for (const target of descendantWindows(frame)) {
            const data = {channel:DURATION_CHANNEL, kind, token};
            if (kind === 'commit') data.mediaId = target === winner?.reporter ? winner.mediaId : null;
            // Only a random session identifier is broadcast; the page URL and
            // target duration are not shared with unrelated nested frames.
            try { target.postMessage(data, '*'); } catch {}
        }
    }
    function inspectCandidate(frame, source, run) {
        return new Promise(resolve => {
            const token = randomToken();
            let finished = false;
            let firstDurationAt = null;
            let hasMatchingMetadata = false;
            let received = false;
            let lastDuration = null;
            let playerError = false;
            let playBlocked = false;
            const cleanup = () => {
                clearInterval(pulse); clearTimeout(deadline);
                window.removeEventListener('message', onMessage);
                run.cancellers.delete(cancel);
            };
            const finish = result => {
                if (finished) return;
                finished = true; cleanup();
                probeStates.set(source.u, result.type);
                probeResults.set(source.u, result.label);
                if (!run.cancelled && smartRun === run && result.type !== 'cancelled') {
                    recordHealth(source,run,result.type==='match'?'pass':result.type==='failed'?'fail':result.healthOutcome || 'unknown');
                }
                if (result.type !== 'match') sendControl(frame, token, 'abort');
                resolve({...result, frame, token});
            };
            const cancel = () => finish({type:'cancelled', label:'已停止'});
            const onMessage = event => {
                const data = event.data;
                if (smartRun !== run || run.cancelled || location.href !== run.url || !frame.isConnected) return;
                if (!data || data.channel !== DURATION_CHANNEL || data.token !== token) return;
                if (!/^https?:\/\//.test(event.origin) || !descendantWindows(frame).includes(event.source)) return;
                if(data.kind === 'status') {
                    received = true;
                    if (data.restricted === true) {
                        finish({type:'limited',healthOutcome:'limited',label:String(data.state || '站点限制请求').slice(0,80) + ' · ' + new URL(event.origin).hostname}); return;
                    }
                    if(!firstDurationAt) probeResults.set(source.u, String(data.state || '等待播放器').slice(0,40));
                    return;
                }
                if(data.kind !== 'sample') return;
                if (typeof data.mediaId !== 'string' || data.mediaId.length > 64) return;
                if (!Number.isInteger(data.readyState) || data.readyState < 0 || data.readyState > 4) return;
                received = true;
                const identity = IdentityTools.compare(run.identity, data.identity);
                if (identity === 'conflict') {
                    finish({type:'failed',label:'片名、年份或集数冲突，已排除'}); return;
                }
                if (data.error) playerError = true;
                playBlocked = data.playError === 'NotAllowedError';
                if ([2,3,4].includes(data.error)) {
                    finish({type:'failed',label:({2:'媒体网络错误',3:'媒体解码错误',4:'媒体格式不支持'})[data.error]+'，本次无法播放'});return;
                }
                if (playBlocked) {
                    probeResults.set(source.u,'浏览器限制自动播放，等待播放器授权或重试');
                    return;
                }
                if (typeof data.duration !== 'number' || !Number.isFinite(data.duration) || data.duration <= 0) {
                    probeResults.set(source.u,'等待时长（0:00 不是失败）');return;
                }
                firstDurationAt ??= Date.now();
                lastDuration = data.duration;
                const classification = run.target ? DurationTools.classify(data.duration, run.target.seconds) : 'match';
                if (classification === 'match') {
                    hasMatchingMetadata = true;
                    probeResults.set(source.u,`时长 ${DurationTools.format(data.duration)} · 正在实播${run.target ? '' : ' · 完整时长未验证'}`);
                    if(!observationDeadline) observationDeadline = Date.now()+45000;
                    if (data.error === 0 && data.readyState >= 2 && Number.isFinite(data.progressed) && data.progressed >= 4 && Number.isFinite(data.observed) && data.observed >= 8) {
                        const metrics = {
                            ratio:Math.min(1, data.progressed / Math.max(1, data.observed)),
                            stalls:Number.isFinite(data.stalls) ? Math.max(0, data.stalls) : 0,
                            startup:Number.isFinite(data.startup) ? Math.max(0, data.startup) : 25,
                            buffer:Number.isFinite(data.buffer) ? Math.max(0, data.buffer) : 0,
                            dropRatio:Number.isFinite(data.dropRatio) ? Math.max(0, Math.min(1, data.dropRatio)) : 0
                        };
                        const score = DurationTools.score(metrics);
                        finish({type:'match', label:`${run.phase === 'retest' ? '复测' : '实播'}通过 ${score.toFixed(1)} 分${run.target ? '' : ' · 完整时长未验证'} · ${identity === 'match' ? '片名元数据匹配' : '内容未核验'}`, score, metrics, duration:data.duration, reporter:event.source, mediaId:data.mediaId});
                    }
                } else probeResults.set(source.u,`暂读 ${DurationTools.format(data.duration)} · 等待正片`);
            };
            const started = Date.now();
            const loadingTimeout = Math.max(30, Math.min(120, Number(timeoutSelect.value) || 30)) * 1000;
            let observationDeadline = null;
            let latestRender = 0;
            const pulse = setInterval(() => {
                if (smartRun !== run || run.cancelled || location.href !== run.url || !frame.isConnected) { cancel(); return; }
                sendControl(frame, token, 'probe');
                // Loading and observation are separate phases; 0:00, trailers
                // and changing metadata do not terminate a usable route early.
                const limit = observationDeadline || (started + loadingTimeout);
                if(Date.now() >= limit) {
                    const kind = DurationTools.classify(lastDuration,run.target?.seconds);
                    const label = playBlocked ? '浏览器限制自动播放，需在播放器内点击后重测' : hasMatchingMetadata ? (run.target ? '时长匹配，未能自动实播' : '已读时长，未确认实播') :
                        lastDuration ? `${kind==='short'?'偏短':'偏长'} ${DurationTools.format(lastDuration)}` :
                        playerError ? '加载报错，未确认' : received ? '仍未读到有效时长' : '检测器未响应/页面未加载';
                    finish({type:!playBlocked && run.target && lastDuration && !hasMatchingMetadata ? 'failed' : 'limited',
                        healthOutcome:playBlocked?'limited':'timeout',label});
                }
                if(Date.now()-latestRender>1200){latestRender=Date.now();render();}
            }, 500);
            const deadline = setTimeout(() => {
                const label = playBlocked ? '浏览器限制自动播放，需点击后重测' : hasMatchingMetadata ? '已读时长，未确认播放' : playerError ? '播放中断，未确认' : received ? '检测器已连接，未读到有效时长' : '检测器未响应（可能未注入或页面加载受限）';
                finish({type:'limited', healthOutcome:playBlocked?'limited':'timeout', label});
            }, 165000);
            run.cancellers.add(cancel);
            window.addEventListener('message', onMessage);
            sendControl(frame, token, 'probe');
        });
    }
    function stopSmartSelection() {
        if (!smartRun) return;
        const run = smartRun;
        run.cancelled = true;
        if (testProgress) testProgress.phase = 'stopped';
        smartRun = null;
        clearInterval(run.holdTimer);
        for (const result of run.matches || []) sendControl(result.frame, result.token, 'abort');
        for (const cancel of [...run.cancellers]) cancel();
        for (const [url, state] of probeStates) if (['queued','testing','retesting','match'].includes(state)) {
            probeStates.set(url,'cancelled'); probeResults.set(url,'本轮已停止');
        }
        stopPending();
        if (activePlayer?.testing || (!activePlayer && originalMediaGuard)) restorePlayer();
        render();
    }
    function refreshLateTarget(run, supplied = null) {
        if (run.target || smartRun !== run || run.cancelled) return;
        const found = supplied || DurationTools.detect(document, run.key) || readTencentDuration(run.key);
        if (!found && !run.targetFetch && Date.now()-(run.lastTargetFetch || 0)>10000 && /bilibili\.com/.test(new URL(run.key).hostname)) {
            run.lastTargetFetch=Date.now();run.targetFetch=true;
            void fetchBilibiliTarget(run.key).then(value=>{
                run.targetFetch=false;
                if(value) refreshLateTarget(run,value);
            });
        }
        if (!found?.seconds || found.seconds > 86400) return;
        run.target = found;
        targetInput.value = DurationTools.format(found.seconds);
        targetNote.textContent = `已补读正片时长 ${DurationTools.format(found.seconds)}，正在重新核对候选。`;
        for (const candidate of run.matches) {
            if (!candidate.frame.isConnected || candidate === run.retesting) continue;
            if (DurationTools.classify(candidate.duration,found.seconds) !== 'match') {
                probeStates.set(candidate.source.u,'failed');
                probeResults.set(candidate.source.u,'补读正片时长后不匹配，已排除');
                recordHealth(candidate.source,run,'fail');
                sendControl(candidate.frame,candidate.token,'abort');
                candidate.frame.remove(); ownedFrames.delete(candidate.frame);
            } else {
                probeResults.set(candidate.source.u,candidate.label.replace('完整时长未验证','补读时长匹配'));
            }
        }
        render();
    }
    function chooseTestedNow(source) {
        const run = smartRun;
        if (!run || !activePlayer) return false;
        refreshLateTarget(run);
        const best = run.matches.find(r=>r.source.u===source.u && r.frame.isConnected && probeStates.get(source.u)==='match');
        if (!best) return false;
        if (testProgress) testProgress.phase = 'early';
        run.cancelled=true; smartRun=null; clearInterval(run.holdTimer);
        for (const cancel of [...run.cancellers]) cancel();
        for (const other of run.matches) if(other!==best) sendControl(other.frame,other.token,'abort');
        for (const [url,state] of probeStates) if(['queued','testing','retesting'].includes(state)) {
            probeStates.set(url,'cancelled');probeResults.set(url,'已提前选择其他线路');
        }
        sendControl(best.frame,best.token,'abort');
        void play(best.source,true).then(loaded=>{
            if(!loaded)return;
            box.querySelector('.probe-summary').textContent='已提前选线，其余测试已停止。';
            message(`已全新载入 ${source.n}，退出测试状态；如未自动播放，请点击播放器播放。`);
        });
        return true;
    }
    function probeFrame(source, container) {
        const frame = document.createElement('iframe');
        frame.title = source.n + ' 时长测试';
        frame.name = 'vrprobe:' + randomToken();
        frame.src = source.u + encodeURIComponent(videoPageUrl());
        frame.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'no-referrer';
        frame.style.cssText = 'position:absolute!important;visibility:visible!important;pointer-events:auto!important;';
        ownedFrames.add(frame);
        container.appendChild(frame);
        return frame;
    }
    function layoutProbeFrames() {
        const frames=[...ownedFrames].filter(frame=>frame.isConnected);
        const columns=Math.ceil(Math.sqrt(Math.max(1,frames.length)));
        const rows=Math.ceil(frames.length/columns);
        frames.forEach((frame,index)=>{
            frame.style.cssText=`position:absolute!important;left:${(index%columns)*100/columns}%!important;top:${Math.floor(index/columns)*100/rows}%!important;width:${100/columns}%!important;height:${100/rows}%!important;inset:auto!important;visibility:visible!important;display:block!important;opacity:1!important;pointer-events:auto!important;z-index:2147483000!important;border:1px solid #475569!important;`;
            frame.style.setProperty('left',`${(index%columns)*100/columns}%`,'important');
            frame.style.setProperty('top',`${Math.floor(index/columns)*100/rows}%`,'important');
        });
    }
    async function startSmartSelection() {
        stopSmartSelection();
        const run = {url:location.href, key:videoPageUrl(), healthId:randomToken(), cancellers:new Set(), cancelled:false, matches:[], holdTimer:null};
        run.identity = IdentityTools.read(document);
        smartRun = run; probeResults.clear(); probeStates.clear();
        routeFilter = 'all';
        testProgress = {phase:'initial',initialDone:0,initialTotal:ranked().length,retestDone:0,retestTotal:0};
        for (const source of ranked()) probeStates.set(source.u,'queued');
        render(); openPanel(true);
        if(!originalMediaGuard) originalMediaGuard=guardOriginalMedia();
        message('正在获取正片总时长…');
        targetRequest = null;
        const resolved = await resolveTarget();
        if (smartRun !== run || run.cancelled || location.href !== run.url) return;
        const target = resolved?.seconds > 0 && resolved.seconds <= 86400 ? resolved : null;
        run.target = target;
        targetInput.value = target ? DurationTools.format(target.seconds) : '';
        targetNote.textContent = target
            ? `${target.origin} · 正片 ${DurationTools.format(target.seconds)} · 容差 ±${Math.round(DurationTools.tolerance(target.seconds))} 秒`
            : '未识别正片时长，照常检测播放与流畅度；完整时长未验证。可选填时长后重测。';
        let candidates = ranked();
        // Respect the manual/health order; a historical winner must not jump
        // ahead of healthier candidates in a batched run.
        if (!candidates.length) { testProgress.phase = 'error'; smartRun = null; restorePlayer(); render(); message('没有可测试的线路，请先恢复至少一条。'); return; }
        mode = 'embedded'; save(SITE + 'mode', mode);
        const player = await play(candidates[0], false, true);
        if (smartRun !== run || run.cancelled) return;
        if (!player) { testProgress.phase = 'error'; smartRun = null; restorePlayer(); render(); message('未找到原播放器，无法启动内嵌选线。'); return; }
        const limit = concurrencySelect.value === 'all' ? candidates.length : Math.max(1, Math.min(6, Number(concurrencySelect.value) || 3));
        run.holdTimer = setInterval(() => {
            refreshLateTarget(run);
            for (const result of run.matches) if(result !== run.retesting) sendControl(result.frame, result.token, 'hold');
        }, 1000);
        let next = 0;
        let completed = 0;
        const summary = () => {
            if (testProgress) { testProgress.initialDone = completed; renderProgress(); }
            const passed = candidates.filter(source=>probeStates.get(source.u)==='match').length;
            const limited = candidates.filter(source => ['limited','unknown'].includes(probeStates.get(source.u))).length;
            const finished = smartRun !== run;
            const summaryBox = box.querySelector('.probe-summary');
            summaryBox.innerHTML = `<span class="summary-item"><i class="summary-dot ${finished ? '' : 'running'}"></i>${finished ? '已完成' : run.phase === 'retest' ? '复测中' : '测试中'}</span><span class="summary-item">已测 <span class="metric tested">${completed}/${candidates.length}</span></span><span class="summary-item">通过 <span class="metric passed">${passed}</span></span><span class="summary-item limited">无法检测 <span class="metric limited">${limited}</span></span>`;
            summaryBox.title = `${run.target ? '已读取正片时长' : '完整时长未验证'} · 同时 ${run.phase === 'retest' ? 1 : limit} 条 · 加载最多${timeoutSelect.value}秒，再实播观察`;
        };
        async function worker() {
            while (smartRun === run && !run.cancelled && next < candidates.length) {
                const index = next++;
                const source = candidates[index];
                const frame = index === 0 ? player.frame : probeFrame(source, player.container);
                layoutProbeFrames();
                probeStates.set(source.u,'testing');
                probeResults.set(source.u, '测试中'); summary(); render();
                const result = await inspectCandidate(frame, source, run);
                if (smartRun !== run || run.cancelled) {
                    if (result.type === 'match') sendControl(frame, result.token, 'abort');
                    return;
                }
                completed++;
                probeResults.set(source.u, result.label);
                if (result.type === 'match') {
                    run.matches.push({source, ...result});
                    record(source, !!run.target);
                    sendControl(frame, result.token, 'hold');
                } else {
                    frame.remove(); ownedFrames.delete(frame);
                    layoutProbeFrames();
                }
                summary(); render();
            }
        }
        message(`正在同时测试 ${limit} 条线路，全部测完后选择${target ? '时长匹配且' : ''}实测最流畅的一条。${target ? '' : '完整时长未验证。'}`);
        await Promise.all(Array.from({length:Math.min(limit, candidates.length)}, worker));
        if (smartRun !== run || run.cancelled) return;
        run.phase = 'retest';
        testProgress.phase = 'retest';
        refreshLateTarget(run);
        const finalists = [...run.matches].filter(r=>r.frame.isConnected).sort((a,b)=>b.score-a.score);
        testProgress.retestTotal = Math.min(3, finalists.length);
        const skipRetest = finalists.length === 1;
        testProgress.retestSkipped = skipRetest;
        if (skipRetest) testProgress.retestTotal = 0;
        const verified = skipRetest ? [finalists[0]] : [];
        let attempted=0;
        for (const candidate of (skipRetest ? [] : finalists)) {
            if (smartRun !== run || run.cancelled) return;
            refreshLateTarget(run);
            if (attempted >= 3 && verified.some(r=>r.frame.isConnected)) break;
            if (!candidate.frame.isConnected) continue;
            attempted++;
            testProgress.retestTotal = Math.max(testProgress.retestTotal, attempted);
            run.retesting = candidate;
            probeStates.set(candidate.source.u,'retesting');
            probeResults.set(candidate.source.u,'单路重新计时，独立复测');
            summary();
            message(`正在依次复测第 ${attempted}/${finalists.length} 个候选；前三名全失败后继续尝试后续线路。`);
            render();
            // A fresh token clears reporter measurements; held samples cannot
            // satisfy the new observation period.
            const result = await inspectCandidate(candidate.frame,candidate.source,run);
            if (smartRun !== run || run.cancelled) return;
            Object.assign(candidate,result);
            run.retesting = null;
            testProgress.retestDone = attempted;
            if(result.type === 'match') {
                verified.push(candidate); sendControl(candidate.frame,candidate.token,'hold');
            } else { candidate.frame.remove(); ownedFrames.delete(candidate.frame); }
            summary(); render();
        }
        if (smartRun === run) {
            clearInterval(run.holdTimer);
            testProgress.phase = 'done';
            testProgress.retestTotal = testProgress.retestDone;
            smartRun = null;
            const best = verified.filter(result => result.frame.isConnected).sort((a, b) => b.score - a.score || a.metrics.startup - b.metrics.startup)[0];
            if (best && activePlayer) {
                for (const result of run.matches) sendControl(result.frame, result.token, 'abort');
                const loaded = await play(best.source, true);
                if (!loaded || videoPageUrl() !== run.key) return;
                save(PREFIX + 'duration-success:' + run.key, {u:best.source.u, target:run.target?.seconds ?? null, fullDurationVerified:!!run.target, actual:best.duration, at:Date.now()});
                summary(); render();
                message(`已选 ${best.source.n}：${DurationTools.format(best.duration)}，本轮 ${best.score.toFixed(1)} 分。${run.target ? '' : '完整时长未验证，可能包含试看；可填写正片时长后重测。'}${skipRetest ? '仅一条通过，已跳过复测。' : '复测择优完成。'}已全新载入；如未自动播放，请点击播放器播放。`);
            } else {
                restorePlayer(); summary(); render();
                message(`本轮没有确认到${target ? '时长匹配且' : ''}已播放的线路。可查看检测结果；未知不等于永久失效。`);
            }
        }
    }

    clearTargetDisplay();
    render();
    updatePolling();
    runAuto();

    }
    if (document.body) startMain();
    else document.addEventListener("DOMContentLoaded", startMain, {once: true});
})();
