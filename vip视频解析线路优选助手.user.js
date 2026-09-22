// ==UserScript==
// @name              vip视频解析线路优选助手
// @name:zh-CN        vip视频解析线路优选助手
// @namespace         urn:yk1234f:vip-route-selector
// @author            yk1234f
// @include           *://v.qq.com/x/page/*
// @include           *://v.qq.com/x/cover/*
// @include           *://v.qq.com/tv/*
// @include           *://*.iqiyi.com/v_*
// @include           *://*.iqiyi.com/a_*
// @include           *://*.iqiyi.com/w_*
// @include           *://*.iq.com/play/*
// @include           *://v.youku.com/v_*
// @include           *://*.youku.com/v_*
// @include           *://*.youku.com/video*
// @include           *://*.youku.com/*?vid=*
// @include           *://*.mgtv.com/b/*
// @include           *://*.tudou.com/listplay/*
// @include           *://*.tudou.com/programs/view/*
// @include           *://*.tudou.com/albumplay/*
// @include           *://film.sohu.com/album/*
// @include           *://tv.sohu.com/v/*
// @include           *://*.bilibili.com/*
// @include           *://*.bilibili.com/video/*
// @include           *://*.bilibili.com/bangumi/play/*
// @include           *://v.pptv.com/show/*
// @include           *://vip.pptv.com/show/*
// @include           *://www.wasu.cn/Play/show/*
// @include           *://*.le.com/ptv/vplay/*
// @include           *://*.acfun.cn/v/*
// @include           *://*.acfun.cn/bangumi/*
// @include           *://*.1905.com/play/*
// @include           *://m.v.qq.com/x/page/*
// @include           *://m.v.qq.com/x/cover/*
// @include           *://m.v.qq.com/*
// @include           *://m.iqiyi.com/*
// @include           *://m.iqiyi.com/kszt/*
// @include           *://m.youku.com/video/*
// @include           *://m.mgtv.com/b/*
// @include           *://m.tv.sohu.com/v/*
// @include           *://m.film.sohu.com/album/*
// @include           *://m.pptv.com/show/*
// @include           *://m.bilibili.com/anime/*
// @include           *://m.bilibili.com/video/*
// @include           *://m.bilibili.com/bangumi/play/*
// @grant             GM_addStyle
// @grant             GM_openInTab
// @grant             GM_getValue
// @grant             GM_setValue
// @charset           UTF-8
// @license           GPL License
// @version           3.5.1
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
        { n: "789解析",    u: "https://jiexi.789jiexi.com/?url=" },
        { n: "爱豆",       u: "https://jx.aidouer.net/?url=" },
        { n: "playerjy",   u: "https://jx.playerjy.com/?url=" },
        { n: "咸鱼TV",     u: "https://jx.xymp4.cc/?url=" },
        { n: "IK",         u: "https://pl.aszzys.com/player/ec.php?code=ikm3u8&if=1&url=" },
        { n: "ckplayer",   u: "https://www.ckplayer.vip/jiexi/?url=" },
        { n: "playm3u8",   u: "https://www.playm3u8.cn/jiexi.php?url=" },
        { n: "盘古",       u: "https://www.pangujiexi.com/jiexi/?url=" },
        { n: "8090",       u: "https://www.8090g.cn/?url=" },
        // 从芒果TV1聚合页提取；虾米不重复添加，M1907保留原入口，2s0继续停用。
        { n: "TXNP",       u: "https://bfq.txnp.cn/player?url=" },
        { n: "Playr",      u: "https://super.playr.top/?url=" },
        { n: "DMFLV",      u: "https://jx.dmflv.cc/?url=" },
        { n: "七七云解析", u: "https://jx.77flv.cc/?url=" },
        { n: "臻享视听",   u: "https://player.maqq.cn/?url=" },
        { n: "咸鱼新",     u: "https://jx.xyflv.cc/?url=" },
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
        const outcomes = new Set(['pass', 'fail', 'timeout', 'unknown']);
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
            const successes = events.filter(event=>event.outcome==='pass').length;
            let timeoutStreak = 0;
            for (let i=events.length-1;i>=0 && events[i].outcome==='timeout';i--) timeoutStreak++;
            let weight = 0, passedWeight = 0, lastSuccess = 0;
            for (const event of events) {
                const w = Math.pow(0.5,(now-event.at)/(7*DAY));
                weight += w;
                if (event.outcome==='pass') {passedWeight += w;lastSuccess=Math.max(lastSuccess,event.at);}
            }
            const latestWeight = events.length ? Math.pow(0.5,(now-events.at(-1).at)/(7*DAY)) : 0;
            // Neutral prior lets untested routes precede repeatedly failing ones.
            // Seven-day decay stops old evidence from dominating indefinitely.
            const score = (passedWeight+1)/(weight+2) - Math.min(0.2,timeoutStreak*0.04)*latestWeight;
            return {events, attempts:events.length, successes, rate:events.length?successes/events.length:null,
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
                        if (blocker) { blocker(this, true); return Promise.resolve(); }
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
            return [...result].filter(media => typeof media.pause === 'function');
        }
        function block() {
            const saved = new Map();
            const watched = new Set();
            const observers = [];
            let running = true;
            function silence(media, force = false) {
                if (!running || !media || typeof media.pause !== 'function') return;
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
        const media = new Map();
        let armed = /^vrprobe:[a-f0-9]{32}$/.test(window.name);
        const initialMute = new WeakMap();
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
            armed = false;
            // Disable the guard before changing muted; some players dispatch
            // volumechange synchronously and would otherwise mute the winner again.
            session = null;
            for (const [video, state] of media) {
                if (commitId === state.id) {
                    // The winner must be audible even when the parser starts
                    // muted or a fresh retest session inherited probe muting.
                    const enableSound = () => {
                        video.defaultMuted = false;
                        video.removeAttribute('muted');
                        video.muted = false;
                        if (video.volume === 0) video.volume = 0.5;
                        return video.play();
                    };
                    const offerGesture = () => {
                        if (!video.isConnected || document.querySelector('[data-vip-enable-sound]')) return;
                        const button = document.createElement('button');
                        button.dataset.vipEnableSound = 'true';
                        button.textContent = '点击开启声音并播放';
                        button.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);z-index:2147483647;background:#166534;color:white;border:2px solid white;border-radius:8px;padding:12px;cursor:pointer;';
                        button.addEventListener('click', () => {
                            try { Promise.resolve(enableSound()).then(()=>button.remove(),()=>{button.textContent='请点击播放器开启声音';}); } catch {}
                        });
                        (document.body || document.documentElement).append(button);
                    };
                    try { Promise.resolve(enableSound()).catch(offerGesture); } catch { offerGesture(); }
                } else { try { video.pause(); } catch {} }
            }
            media.clear();
        }
        function sample() {
            if (!session) return;
            if (Date.now() - session.touched > 20000) { restore(); return; }
            session.source.postMessage({channel:DURATION_CHANNEL,kind:'status',token:session.token,
                state:mediaAccess.collect().length?'等待视频元数据或播放':'等待播放器出现'},session.origin);
            visit(document, video => {
                if (!media.has(video)) media.set(video, {
                    id: String(++serial), muted:initialMute.has(video) ? initialMute.get(video) : video.muted, previousTime:null,
                    previousWall:null, progressed:0, lastAttempt:0, duration:null,
                    startedAt:null, stalls:0, wasStalled:false, startup:null
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
                    mediaId:state.id, duration, identity:IdentityTools.read(document), progressed:state.progressed,
                    observed:state.startedAt === null ? 0 : (now - state.startedAt) / 1000,
                    startup:state.startup, stalls:state.stalls, buffer, dropRatio,
                    readyState:Number.isInteger(video.readyState)?video.readyState:(state.progressed>0?2:0), error:video.error?.code || 0}, session.origin);
                if (video.paused && !video.ended && !video.error && now - state.lastAttempt > 2000) {
                    state.lastAttempt = now;
                    try { video.play()?.catch(() => {}); } catch {}
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
                if(session) return;
                if(!originalStop) originalStop=mediaAccess.block();
                originalLease=Date.now();
                return;
            }
            if (data.kind === 'source-release') {
                originalStop?.(); originalStop=null; return;
            }
            if (data.kind === 'probe') {
                if(originalStop) {originalStop();originalStop=null;}
                if (session && session.token !== data.token) restore();
                const began = session?.began || Date.now();
                session = {token:data.token, origin:event.origin, source:event.source, touched:Date.now(), began, mode:'probe'};
                sample();
            } else if (session?.token === data.token && data.kind === 'hold') {
                session.mode = 'hold'; session.touched = Date.now(); sample();
            } else if (session?.token === data.token && data.kind === 'commit') {
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
    const health = source => HealthTools.summarize(read(healthKey(source),{}));
    function recordHealth(source, run, outcome) {
        if (!run?.healthId || !['pass','fail','timeout','unknown'].includes(outcome)) return;
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
        const order = Array.isArray(storedOrder) ? storedOrder.filter(url => typeof url === 'string') : [];
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
    const legacySource = Number.isInteger(oldIndex) ? sources.find(source => source.n === legacyNames[oldIndex]) : null;
    let selected = read(SITE + 'selected', legacySource?.u || '');
    let mode = read(SITE + 'mode', 'embedded') === 'tab' ? 'tab' : 'embedded';
    let managing = false;
    let activePlayer = null;
    let originalMediaGuard = null;
    const ownedFrames = new Set();
    let smartRun = null;
    let smartOn = read(SITE + 'smart', true) !== false;
    const probeResults = new Map();
    const probeStates = new Map();
    let generation = 0;
    let cancelWait = null;
    let statusTimer = null;
    let leaveTimer = null;
    const box = document.createElement('div');
    box.id = uid;
    box.dataset.vipToolsRoot = '';
    box.innerHTML = `
        <button class="launcher" type="button" aria-label="打开线路菜单" aria-expanded="false">VIP</button>
        <button class="drag-handle" type="button" title="拖动；方向键微调" aria-label="拖动悬浮按钮">⠿</button>
        <section class="panel" aria-label="播放线路" hidden>
            <header><strong>播放线路</strong><button type="button" data-action="close" aria-label="关闭菜单">×</button></header>
            <div class="toolbar">
                <button type="button" data-mode="embedded">内嵌播放</button>
                <button type="button" data-mode="tab">新标签页</button>
            </div>
            <div class="toolbar">
                <button type="button" data-action="auto">自动播放</button>
                <button type="button" data-action="restore-player">恢复原播放器</button>
            </div>
            <p class="hint">实播通过才计成功；正片时长已知时还须匹配，未知时照常测试。拖动线路左侧 ↕ 可自行排序。</p>
            <div class="duration-controls">
                <label>正片时长 <input class="target-duration" placeholder="自动 / 45分 / 45 min" aria-label="正片时长，支持中文英文和时分秒"></label>
                <p class="target-note hint">支持 16:18、16分18秒、16 min 18 sec。</p>
                <div class="toolbar">
                    <button type="button" data-action="smart">实测全部并择优</button>
                    <button type="button" data-action="stop-smart" hidden>停止测试并观看已通过线路</button>
                </div>
                <div class="toolbar">
                    <button type="button" data-action="smart-toggle">按时长优选：开</button>
                    <label>同时测试 <select class="probe-concurrency" aria-label="同时测试线路数"><option value="all" selected>全部</option><option value="6">6 条</option><option value="3">3 条</option><option value="1">1 条</option></select></label>
                    <label>加载等待 <select class="probe-timeout" aria-label="线路加载等待时间"><option value="30" selected>30 秒</option><option value="60">60 秒</option><option value="90">90 秒</option><option value="120">120 秒</option></select></label>
                </div>
                <p class="probe-summary hint" role="status"></p>
            </div>
            <div class="source-list"></div>
            <div class="toolbar">
                <button type="button" data-action="manage">管理线路</button>
                <button type="button" data-action="sort-success">按近期健康排序</button>
                <button type="button" data-action="restore-sources" hidden>恢复全部隐藏线路</button>
            </div>
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
        #${uid} .route-health{display:block;margin-top:5px;font-size:11px;line-height:1.5;color:#cbd5e1;font-weight:400;white-space:normal}
        #${uid} .health-warning{color:#fbbf24;font-weight:700}
        #${uid} .probe-summary .metric{font-weight:700;padding:0 2px;border-radius:3px}
        #${uid} .probe-summary .tested{color:#93c5fd} #${uid} .probe-summary .passed{color:#86efac}
        #${uid} .probe-summary .parallel{color:#c4b5fd} #${uid} .probe-summary .timeout{color:#fbbf24}
        #${uid} .reorder{min-height:26px;padding:2px;cursor:grab;border:0;background:transparent}
        #${uid} .source-row.drop-target{outline:2px solid #60a5fa;border-radius:6px}
        #${uid} .hint,#${uid} .notice,#${uid} .status{font-size:11px;margin:8px 0;color:#94a3b8}
        #${uid} .status{color:#bfdbfe;min-height:16px}
        #${uid} input,#${uid} select{font:inherit;background:#172033;color:#e2e8f0;border:1px solid #475569;border-radius:5px;padding:4px;max-width:150px}
        #${uid} .duration-controls{border-top:1px solid #334155;border-bottom:1px solid #334155;padding:8px 0;margin-bottom:8px}
        .${hostClass}>:not(#${frameId}){visibility:hidden!important;pointer-events:none!important}
        #${frameId}{display:block!important;visibility:visible!important;opacity:1!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;z-index:2147483000!important;background:#000!important;pointer-events:auto!important}
    `);
    document.body.appendChild(box);
    const panel = box.querySelector('.panel');
    const launcher = box.querySelector('.launcher');
    const list = box.querySelector('.source-list');
    const dragHandle = box.querySelector('.drag-handle');
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
    function render() {
        list.replaceChildren();
        list.classList.toggle('manage', managing);
        for (const source of ranked(managing)) {
            const row = document.createElement('div');
            row.className = 'source-row';
            row.dataset.orderSource = source.u;
            const handle = document.createElement('button');
            handle.type = 'button'; handle.className = 'reorder'; handle.draggable = !smartRun; handle.disabled = !!smartRun;
            handle.textContent = '↕'; handle.title = '拖动调整顺序；按上下方向键也可移动';
            handle.setAttribute('aria-label', '调整' + source.n + '顺序');
            row.appendChild(handle);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'source-button';
            button.dataset.source = source.u;
            button.textContent = source.n;
            const s = stat(source);
            button.title = `${source.n}\n${s.last ? '最近成功：' + new Date(s.last).toLocaleString() : '尚无实测成功记录'}\n累计成功次数：${s.count}\n${source.u}`;
            const probeStatus = probeResults.get(source.u);
            if (probeStatus) button.title += '\n本次检测：' + probeStatus;
            button.disabled = isHidden(source);
            button.setAttribute('aria-pressed', String(source.u === selected));
            const badge = document.createElement('span');
            const state = probeStates.get(source.u) || 'idle';
            const statusClass = {match:'pass',failed:'fail',testing:'testing',retesting:'testing'}[state] || 'idle';
            badge.className = 'counter ' + statusClass;
            // The first label describes this run. Historical counters are
            // deliberately secondary so they cannot be mistaken for a live
            // playback result.
            const resultLabel = {match:'通过',failed:'未通过',testing:'检测中',retesting:'复测中',unknown:'无法确认',cancelled:'已取消',queued:'待测',idle:'未测试'}[state];
            badge.textContent = resultLabel;
            if (probeStatus) badge.textContent += ' · ' + probeStatus;
            badge.textContent += ' · 时长匹配 ' + s.full;
            if (probeStatus) badge.title = '本轮：' + probeStatus;
            button.appendChild(badge);
            const h = health(source);
            const healthInfo = document.createElement('span');
            healthInfo.className = 'route-health';
            const recent = h.rate === null ? '暂无样本' : `${Math.round(h.rate*100)}%（${h.successes}/${h.attempts}）`;
            healthInfo.textContent = `近期成功率 ${recent} · 连续超时 ${h.timeoutStreak} 次`;
            if (h.timeoutStreak > 0) healthInfo.classList.add('health-warning');
            const last = document.createElement('span');
            last.style.display='block';
            last.textContent = '最近成功：' + (s.last ? new Date(s.last).toLocaleString() : '暂无');
            healthInfo.appendChild(last);
            const total = document.createElement('span');
            total.style.display = 'block';
            total.textContent = '累计成功次数：' + s.count;
            healthInfo.appendChild(total);
            healthInfo.title = '最近30天内最多20轮已结束检测；复测覆盖本轮结果，取消不新增记录。超时和无法确认也计入分母，不代表永久失效。最近成功为已通过实播的时间。';
            button.appendChild(healthInfo);
            row.appendChild(button);
            if (managing) {
                const toggle = document.createElement('button');
                toggle.type = 'button';
                toggle.dataset.toggle = source.u;
                toggle.textContent = isHidden(source) ? '恢复' : '隐藏';
                toggle.setAttribute('aria-label', toggle.textContent + source.n);
                row.appendChild(toggle);
            }
            list.appendChild(row);
        }
        if (!list.children.length) list.textContent = '暂无显示的线路，可在管理中恢复。';
        box.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
        const autoButton = box.querySelector('[data-action="auto"]');
        autoButton.textContent = '自动播放：' + (autoOn ? '开' : '关');
        autoButton.setAttribute('aria-pressed', String(autoOn));
        box.querySelector('[data-action="manage"]').textContent = managing ? '完成管理' : '管理线路';
        box.querySelector('[data-action="restore-sources"]').hidden = !managing;
        box.querySelector('[data-action="smart-toggle"]').textContent = '按时长优选：' + (smartOn ? '开' : '关');
        box.querySelector('[data-action="stop-smart"]').hidden = !smartRun;
        box.querySelector('[data-action="smart"]').disabled = !!smartRun;
        box.querySelector('.target-duration').disabled = !!smartRun;
        box.querySelector('.probe-concurrency').disabled = !!smartRun;
        box.querySelector('.probe-timeout').disabled = !!smartRun;
        positionPanel();
    }
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
            stopSmartSelection(); probeResults.clear(); probeStates.clear(); clearTargetDisplay();
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
    targetInput.addEventListener('change', () => {
        const seconds = DurationTools.input(targetInput.value);
        if (targetInput.value.trim() && (!seconds || seconds > 86400)) {
            message('时长支持 16:18、16分18秒、16 min 18 sec、1小时30分钟。'); return;
        }
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
        targetInput.value = '';
        const key = videoPageUrl();
        targetNote.textContent = '正在读取正片时长…';
        box.querySelector('.probe-summary').textContent = '';
        void resolveTarget().then(target => {
            if (!box.isConnected) return;
            if (videoPageUrl() !== key || targetInput.value) return;
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
                    const label = hasMatchingMetadata ? (run.target ? '时长匹配，未能自动实播' : '已读时长，未确认实播') :
                        lastDuration ? `${kind==='short'?'偏短':'偏长'} ${DurationTools.format(lastDuration)}` :
                        playerError ? '加载报错，未确认' : received ? '仍未读到有效时长' : '检测器未响应/页面未加载';
                    finish({type:run.target && lastDuration && !hasMatchingMetadata ? 'failed' : 'unknown',
                        healthOutcome:playerError?'unknown':'timeout',label});
                }
                if(Date.now()-latestRender>1200){latestRender=Date.now();render();}
            }, 500);
            const deadline = setTimeout(() => {
                const label = hasMatchingMetadata ? (run.target ? '时长接近，未确认播放' : '已读时长，未确认实播') : playerError ? '播放器报错' : received ? '未读到有效时长' : '无法检测/加载超时';
                finish({type:'unknown', healthOutcome:playerError?'unknown':'timeout', label});
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
        run.cancelled=true; smartRun=null; clearInterval(run.holdTimer);
        for (const cancel of [...run.cancellers]) cancel();
        for (const other of run.matches) if(other!==best) sendControl(other.frame,other.token,'abort');
        for (const [url,state] of probeStates) if(['queued','testing','retesting'].includes(state)) {
            probeStates.set(url,'cancelled');probeResults.set(url,'已提前选择其他线路');
        }
        for (const frame of [...ownedFrames]) if(frame!==best.frame) {frame.remove();ownedFrames.delete(frame);}
        best.frame.id=frameId;best.frame.style.cssText='';
        activePlayer.frame=best.frame;activePlayer.source=best.source;activePlayer.testing=false;
        choose(best.source);sendControl(best.frame,best.token,'commit',best);
        render();
        box.querySelector('.probe-summary').textContent='已提前选线，其余测试已停止。';
        message(`正在播放 ${source.n}，已保留播放器和进度。${run.target ? '' : '完整时长未验证。'}`);
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
        if (!candidates.length) { smartRun = null; restorePlayer(); render(); message('没有可测试的线路，请先恢复至少一条。'); return; }
        mode = 'embedded'; save(SITE + 'mode', mode);
        const player = await play(candidates[0], false, true);
        if (smartRun !== run || run.cancelled) return;
        if (!player) { smartRun = null; restorePlayer(); render(); message('未找到原播放器，无法启动内嵌选线。'); return; }
        const limit = concurrencySelect.value === 'all' ? candidates.length : Math.max(1, Math.min(6, Number(concurrencySelect.value) || 3));
        run.holdTimer = setInterval(() => {
            refreshLateTarget(run);
            for (const result of run.matches) if(result !== run.retesting) sendControl(result.frame, result.token, 'hold');
        }, 1000);
        let next = 0;
        let completed = 0;
        const summary = () => {
            const passed = candidates.filter(source=>probeStates.get(source.u)==='match').length;
            box.querySelector('.probe-summary').innerHTML = `已测 <span class="metric tested">${completed}/${candidates.length}</span> · 通过 <span class="metric passed">${passed}</span> 条${run.target ? '' : ' · 完整时长未验证'} · 同时 <span class="metric parallel">${run.phase === 'retest' ? 1 : limit}</span> 条 · 加载 <span class="metric timeout">最多${timeoutSelect.value}秒</span>，再实播观察`;
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
        refreshLateTarget(run);
        const finalists = [...run.matches].filter(r=>r.frame.isConnected).sort((a,b)=>b.score-a.score);
        const verified = [];
        let attempted=0;
        for (const candidate of finalists) {
            if (smartRun !== run || run.cancelled) return;
            refreshLateTarget(run);
            if (attempted >= 3 && verified.some(r=>r.frame.isConnected)) break;
            if (!candidate.frame.isConnected) continue;
            attempted++;
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
            if(result.type === 'match') {
                verified.push(candidate); sendControl(candidate.frame,candidate.token,'hold');
            } else { candidate.frame.remove(); ownedFrames.delete(candidate.frame); }
            summary(); render();
        }
        if (smartRun === run) {
            clearInterval(run.holdTimer);
            smartRun = null;
            const best = verified.filter(result => result.frame.isConnected).sort((a, b) => b.score - a.score || a.metrics.startup - b.metrics.startup)[0];
            if (best && activePlayer) {
                for (const result of run.matches) if (result !== best) sendControl(result.frame, result.token, 'abort');
                for (const frame of [...ownedFrames]) if (frame !== best.frame) { frame.remove(); ownedFrames.delete(frame); }
                // Promotion changes styles in-place; reparenting would reload the iframe.
                best.frame.id = frameId; best.frame.style.cssText = '';
                best.frame.title = best.source.n + ' 第三方播放器';
                activePlayer.frame = best.frame; activePlayer.source = best.source; activePlayer.testing = false;
                choose(best.source);
                sendControl(best.frame, best.token, 'commit', best);
                save(PREFIX + 'duration-success:' + run.key, {u:best.source.u, target:run.target?.seconds ?? null, fullDurationVerified:!!run.target, actual:best.duration, at:Date.now()});
                summary(); render();
                message(`已选 ${best.source.n}：${DurationTools.format(best.duration)}，本轮 ${best.score.toFixed(1)} 分。${run.target ? '' : '完整时长未验证，可能包含试看；可填写正片时长后重测。'}若无声请点播放器取消静音。`);
            } else {
                restorePlayer(); render();
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
