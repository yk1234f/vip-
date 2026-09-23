# 上游审计与入口去重（2026-09-23）

## 结论与边界

审计现有19个入口；从3个公开源码项目提取并额外检查43个不重复候选地址；对其中6个候选进行浏览器动态追踪，另复核TXNP实播及M1907原始参数。

确认两组共用转接服务，3.9.1移除8个重复入口，保留11个入口。**11个入口不代表11个独立且有效的后端。** 客户端只能确认可见跳转、播放器和接口，无法证明不同域名背后没有共享私有解析服务。不同CDN、相同页面模板或同一媒体片源，均不单独用作服务去重依据。

本次没有找到可以同时确认“新增、独立、有效”的入口，未为凑数量加入不可靠线路。TXNP确认媒体能开始播放，但未核验与原站内容及完整时长一致，也没有观看完整视频。

测试页面：https://v.qq.com/x/cover/mzc0020042zp1r8/s4102dlk9wg.html

## 确认共用：每组仅保留一个入口

| 保留入口 | 移除入口 | 证据 |
|---|---|---|
| 虾米 `https://jx.xmflv.com/?url=` | 789解析、ckplayer、playm3u8、盘古、8090 | 789 → 789jiexi.net → xmflv；ckplayer/jx.php与playm3u8.php HTML直接嵌入xmflv；盘古 → jiexila → xmflv；8090 → bbb/api.php → xmflv |
| 七七云 `https://jx.77flv.cc/?url=` | 爱豆、咸鱼TV、咸鱼新 | 爱豆、咸鱼新跳转77flv；77flv及xymp4均加载 `https://123.129.229.14:4433/Index.php`。保留正常公开入口，不使用带临时参数的内部地址 |

虾米的实际解析XHR端点为 `https://cache.0567890.xyz:4433/Api`。HTTP 200不等于解析成功：响应JSON为业务错误，页面显示“你请求异常，请…分钟后重试”。重试后等待数字增加；不据此判断具体限流算法，停止对此服务的重复测试。后续候选若试图访问已确认重复的xmflv或123.129.229.14，审计直接阻断并记录，避免继续请求。

## 其余入口与实际观测

| 入口 | 可见下游 | 本次结果 | 判断 |
|---|---|---|---|
| TXNP | bfq.txnp.cn；qcb.iisfu.top播放清单；lfthirtytwo.com分片 | 媒体时长7057.2秒，静音播放进度0→2.43秒，分片HTTP200；页面片名“年会不能停2” | 可播放，内容和全片一致性未验证；未发现接入上述两组的证据，服务端独立性仍不能证明 |
| M1907 | cloud.nnpp.vip的2223端口，api/v2 | 出现“是否播放此视频”的确认页；编码与原始参数均如此 | 单独可见服务链，未确认实播；页面注明演示版请勿调用，未绕过 |
| IK9 | yparse.ik9.cc/api.php → jx.nmjsjs.com | 未发现有效媒体 | 待验证，不能判定独立有效 |
| playerjy | getdata.staticfile.link → media.staticfile.link | 文档加载未在期限内完成 | 待验证，不算播放失败结论 |
| IK | pl.aszzys.com/player/ec.php | 无有效媒体；弹幕接口500 | 不能将弹幕接口错误等同于视频解析错误；待验证 |
| Playr | super.playr.top | 403 Forbidden | 当前不可用，不绕过访问限制 |
| DMFLV | jx.dmflv.cc | 浏览器ERR_CERT_DATE_INVALID | 本次证书验证失败，未跳过证书检查 |
| 臻享视听 | ll9-beta-tos.1ljx.com/_panel/、/_player/ | 未发现有效媒体 | 可见单独播放器链，后端独立性未知 |
| HLS | jx.hls.one | ERR_NAME_NOT_RESOLVED | 本次DNS失败，不能据此证明永久失效 |

## 新候选动态复核

| 候选 | 结果 | 是否加入 |
|---|---|---|
| 七哥 jx.202617.xyz | 页面“立即播放”，未读到媒体，仅见报告接口 | 否，未确认有效 |
| bd.jx.cn | 转入jiexi.bot.cd，无有效媒体 | 否，待验证 |
| 芒果m3u8 jx.m3u8.tv | jx/jx.php嵌入xmflv，阻断重复请求 | 否，重复 |
| jx.nodenode.dpdns.org | /api/hotlink-token、/api/site-info、/api/security/bootstrap；停在访问私有云提示，无媒体 | 否，未确认有效，不绕过检查 |
| ckmov.vip | 域名出售页面 | 否，不再是有效解析入口 |
| wsyzy.vip/m3u8 | 页面检查超时，未确认媒体 | 否，待验证 |

候选中的789jiexi.icu同样直接嵌入xmflv；8090g.cn/jiexi属于已知8090链；nnxv.cn跳转202617.xyz，不算新增独立服务。其余候选的静态结果见附表，HTTP200只代表页面可达。

## 可复查来源与测试范围

候选来源：
- https://github.com/whyyy-404/video_freevip （vip-video.user.js）
- https://github.com/88lin/video_vip （video_vip.user.js）
- https://github.com/lb94wpz/vip （index.html）

现有入口采用顺序浏览器导航，通常观察8秒；新增候选通常观察12秒，媒体存在时另观察2.5秒播放推进。这足以确认部分跳转关系，**不足以证明等待更久也不能播放**。本次没有使用登录凭据、代理轮换或绕过站点限流。原站页面未能提供可靠对应片名/时长，因此不把媒体时长直接称为正片时长。

本地证据文件：`upstream-audit/current.json`、`additional-dynamic.json`、`candidates-static.json`及响应页面文本。原始证据含临时播放地址，只供本地审计，不上传这些临时链接。

脚本3.9.1进行已证实入口去重，并将旧版选择/手动排序中的重复入口映射到保留入口；未合并历史成功次数。剩余未知入口保持原设置，避免把暂时无法检测误作永久删除。已验证共用关系也可能随站点日后改版变化。

## 43个新候选的静态检查

| 地址 | HTTP/结果 | 页面标题/备注 |
|---|---|---|
| `https://jx.xmflv.cc/?url=` | TypeError: fetch failed |  |
| `https://jx.202617.xyz/tv.php?url=` | 200 | 七哥免费解析接口jx.202617.xyz |
| `https://jx.nnxv.cn/tv.php?url=` | 200 | 七哥免费解析接口jx.202617.xyz |
| `https://bd.jx.cn/?url=` | 200 | player |
| `https://jx.m3u8.tv/jiexi/?url=` | 200 |  |
| `https://www.pouyun.com/?url=` | TypeError: fetch failed |  |
| `https://video.isyour.love/player/getplayer?url=` | 200 |  |
| `https://jx.yparse.com/index.php?url=` | TypeError: fetch failed |  |
| `https://json.fongmi.cc/web?url=` | 403 | 403 Forbidden |
| `https://jiexi.789jiexi.icu:4433/?url=` | 200 |  |
| `https://jx.nodenode.dpdns.org/?url=` | 200 | PRIVATE CINEMA |
| `https://bfq.937auth.vip?url=` | TypeError: fetch failed |  |
| `https://jx.2s0.cn/player/?url=` | TypeError: fetch failed |  |
| `https://jx.973973.xyz/?url=` | 200 | 404 Not Found |
| `https://www.huaqi.live/?url=` | TypeError: fetch failed |  |
| `https://jx.jsonplayer.com/player/?url=` | TypeError: fetch failed |  |
| `https://rdfplayer.mrgaocloud.com/player/?url=` | TypeError: fetch failed |  |
| `https://jx.618g.com/?url=` | 200 | 618g.com |
| `https://www.gai4.com/?url=` | 401 |  |
| `https://www.h8jx.com/jiexi.php?url=` | TypeError: fetch failed |  |
| `https://www.ckmov.vip/api.php?url=` | 200 |  |
| `https://ckmov.ccyjjd.com/ckmov/?url=` | 200 | ccyjjd.com |
| `https://vip.laobandq.com/jiexi.php?url=` | TypeError: fetch failed |  |
| `https://www.mtosz.com/m3u8.php?url=` | TypeError: fetch failed |  |
| `https://www.nxflv.com/?url=` | TypeError: fetch failed |  |
| `https://okjx.cc/?url=` | TypeError: fetch failed |  |
| `https://api.jiexi.la/?url=` | TimeoutError: The operation was aborted due to timeout |  |
| `https://jx.blbo.cc:4433/?url=` | TypeError: fetch failed |  |
| `https://jx.ap2p.cn/?url=` | TypeError: fetch failed |  |
| `https://jsap.attakids.com/?url=` | 200 | attakids.com |
| `https://www.pangujiexi.cc/jiexi.php?url=` | TimeoutError: The operation was aborted due to timeout |  |
| `https://jx.ivito.cn/?url=` | TypeError: fetch failed |  |
| `https://jx.yangtu.top/?url=` | 200 | yangtu.top |
| `https://sb.5gseo.net/?url=` | TypeError: fetch failed |  |
| `https://go.yh0523.cn/y.cy?url=` | TypeError: fetch failed |  |
| `https://jx.dj6u.com/?url=` | TimeoutError: The operation was aborted due to timeout |  |
| `https://jx.000180.top/jx/?url=` | TypeError: fetch failed |  |
| `https://jx.4kdv.com/?url=` | TypeError: fetch failed |  |
| `https://43.240.74.102:4433?url=` | TypeError: fetch failed |  |
| `https://www.yemu.xyz/?url=` | 200 | 十八码 - 苹果CMS模板插件与WEB播放器整合使用经验交流社区 |
| `https://www.1717yun.com/jx/ty.php?url=` | TimeoutError: The operation was aborted due to timeout |  |
| `https://www.8090g.cn/jiexi/?url=` | 200 | 免费的无广告解析!　-　仅内部学习交流使用，请勿拿去对外公开使用！造成的一切责任本站概不负责！若给你带来不便，我们会删除！ |
| `https://wsyzy.vip/m3u8/?url=` | 200 | 无水印播放器 |


## 爱奇艺页面补充复核（2026-09-23）

测试地址：https://www.iqiyi.com/v_2ffkws1wzj4.html （移除无关追踪参数）

- DMFLV：Edge返回ERR_CERT_DATE_INVALID，未跳过证书验证。
- HLS：Edge返回ERR_NAME_NOT_RESOLVED，未读到下游。
- Playr：HTTP200但页面内容是403 Forbidden，无媒体。不能只按HTTP状态判断有效。
- bd.jx.cn：延长观察至25秒后，确认经jiexi.bot.cd转入jx.xmflv.com；已在请求发出前阻断重复下游。不是新的独立候选。
- 虾米：已有业务拒绝及长时间等待证据，本轮不重复触发解析接口；用户亦报告当前请求异常。

用户浏览器与本测试环境结果不同，不能据此认定用户侧DMFLV/HLS一定是证书或DNS问题；也不能仅凭相同错误页认定四者共用后端。
