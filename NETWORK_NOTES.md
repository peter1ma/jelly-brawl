# 联机与 TURN

果冻擂台的联机不自建服务器。信令走 Trystero 的公共 BitTorrent tracker，版本固定在 `src/config.js` 的 `net.trystero`。媒体数据是浏览器之间的 WebRTC，默认只带公共 STUN。

两台电脑在同一网络里通常能直接连上。一边是对称 NAT、公司网或移动数据时，直连会失败，需要 TURN 做中继。流量只有连不上的那一对才走 TURN，内容仍然端到端加密。

## 配置位置

只改 `src/config.js` 里的 `net.turn`。现在是 `null`。填上之后，`src/net.js` 的 `openRoom` 会把它交给 Trystero 的 `turnConfig`。不要把账号密码写进公开仓库。

```js
turn: [
  {
    urls: ['turn:your-turn.example.com:3478'],
    username: '用户名',
    credential: '密码',
  },
],
```

多个地址就在 `urls` 里继续加。Trystero 仍会保留它自己的 STUN。如果要连 STUN 一起换掉，改成在 `openRoom` 里传 `rtcConfig.iceServers`，那样不会再继承默认 STUN。

## 免费额度

Cloudflare Calls 有每月约 1000 GB 的免费 TURN。Open Relay 也有免费层，适合试玩。自己搭可以用 coturn、Pion TURN 或 eturnal。

拿到地址、用户名和密码后，只填上面的 `net.turn`，然后把 `sw.js` 的 `CACHE_VERSION` 加 1 再部署。

## 怎么判断是不是缺 TURN

同一台电脑开两个标签能进同一房间，但手机流量和一个 Wi-Fi 互相看不到，多半是 NAT，而不是房间码或种子。房间码只负责把两边送到同一个 Trystero 房间。
