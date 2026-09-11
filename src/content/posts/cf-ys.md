---
title: Cloudflare优选教程，让Cloudflare在国内不再是减速器
published: 2026-04-19
tags: [CloudFlare, CloudFlare优选, CloudFlare优选教程, 教程]
category: CloudFlare
draft: false
---


#### 作者的优选域名
CF: [https://cf.legspcpd.furry.bz/](https://cf.legspcpd.furry.bz/)
![](https://imghub.legspcpd.indevs.in/file/image/cf.png)
真 移动优化: [https://cmcc.legspcpd.furry.bz/](https://cmcc.legspcpd.furry.bz/)
![](https://imghub.legspcpd.indevs.in/file/image/cf-cmcc.png)

---


#### 什么是优选？
简单来说，优选就是选择一个国内访问速度更快的Cloudflare节点。

Cloudflare官方分配给我们的IP，在国内访问时延迟往往较高，甚至可能出现无法访问的情况。而通过优选，我们可以手动将域名解析到那些国内访问更快的Cloudflare IP，从而显著提升网站的访问速度和可用性。

从上面的对比图可以看到，优选过的网站响应速度有很大提升，出口IP也变多了。这能让你的网站可用性大大提高，并且加载速度显著变快。

要实现优选，我们需要做到两点：自己控制路由规则 和 自己控制DNS解析。通过Cloudflare SaaS或Worker路由，我们可以同时实现这两点，下面会详细说明

---

#### 优选原理
首先我们要知道CDN是如何通过不同域名给不同内容的。

我们可以将其抽象为2层：规则层和解析层。当我们普通的在Cloudflare添加一条开启了小黄云的解析，Cloudflare会为我们做两件事：

帮我们写一条DNS解析指向Cloudflare
在Cloudflare创建一条路由规则
如果你想要优选，实际上你是要手动更改这个DNS解析，使其指向一个更快的Cloudflare节点。

但是，一旦你将小黄云关闭，路由规则也会被删除，再访问就会显示DNS直接指向IP——这就没法用了。

而SaaS和Worker路由的出现改变了这一切。

使用SaaS后，Cloudflare不再帮你做这两件事了，这两件事你都可以自己做了：

1.你可以自己写一条SaaS规则（规则层）
2.你可以自己写一条CNAME解析到优选节点（解析层）

使用Worker路由同理，你创建Worker路由规则后，DNS解析就可以随便指向任何优选节点了。

这就是为什么经由SaaS或Worker路由的流量可以做优选的原因。

---

# 选择优选域名

优选的核心就是选择一个国内访问速度更快的Cloudflare节点IP或域名。

## 传统优选域名

常用的社区优选域名：[https://cf.090227.xyz](https://cf.090227.xyz/)

这些优选域名通常是通过扫描Cloudflare官方IP段，找出国内延迟最低的IP整理而成。

---
# 各类优选方案
## 更简单的优选方法
### 使用A/AAAA指向指定IPV4/V6

打开Cloudflare或者其他云平台
新建一个A记录
![cf-jl.png](https://imghub.legspcpd.indevs.in/file/image/cf-jl.png)
找一个CF优选IP，我这里拿**104.20.28.171**这个IP做例子
![ip.png](https://imghub.legspcpd.indevs.in/file/image/ip.png)
按照这样填写

我们打开ITDOG进行测速
![itdog-test-ip.png](https://imghub.legspcpd.indevs.in/file/image/itdog-test-ip.png)
已经解析完毕，可以使用

---

## Worker项目优选（最简单）

接下来编写Worker路由
```js
// 域名前缀映射配置
const domain_mappings = {
  '源站.com': '最终访问头.',
//例如：
//'gitea.072103.xyz': 'gitea.',
//则你设置Worker路由为gitea.*都将会反代到gitea.072103.xyz
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const current_host = url.host;

  // 强制使用 HTTPS
  if (url.protocol === 'http:') {
    url.protocol = 'https:';
    return Response.redirect(url.href, 301);
  }

  const host_prefix = getProxyPrefix(current_host);
  if (!host_prefix) {
    return new Response('Proxy prefix not matched', { status: 404 });
  }

  // 查找对应目标域名
  let target_host = null;
  for (const [origin_domain, prefix] of Object.entries(domain_mappings)) {
    if (host_prefix === prefix) {
      target_host = origin_domain;
      break;
    }
  }

  if (!target_host) {
    return new Response('No matching target host for prefix', { status: 404 });
  }

  // 构造目标 URL
  const new_url = new URL(request.url);
  new_url.protocol = 'https:';
  new_url.host = target_host;

  // 创建新请求
  const new_headers = new Headers(request.headers);
  new_headers.set('Host', target_host);
  new_headers.set('Referer', new_url.href);

  try {
    const response = await fetch(new_url.href, {
      method: request.method,
      headers: new_headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual'
    });

    // 复制响应头并添加CORS
    const response_headers = new Headers(response.headers);
    response_headers.set('access-control-allow-origin', '*');
    response_headers.set('access-control-allow-credentials', 'true');
    response_headers.set('cache-control', 'public, max-age=600');
    response_headers.delete('content-security-policy');
    response_headers.delete('content-security-policy-report-only');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response_headers
    });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
}

function getProxyPrefix(hostname) {
  for (const prefix of Object.values(domain_mappings)) {
    if (hostname.startsWith(prefix)) {
      return prefix;
    }
  }
  return null;
}
```
创建路由:
![](https://imghub.legspcpd.indevs.in/file/image/cf-ly.png)
像这样
![](https://imghub.legspcpd.indevs.in/file/image/cf-lytx.png)

---

**(SaaS将会引用二叉树树的教程)**
# 传统SaaS优选
### SaaS做了什么？
Cloudflare SaaS是一个不需要你改变一个域名的NS服务器，就可以让其受益于Cloudflare网络的功能。

当一个域名被SaaS到一个已经在Cloudflare的域名后，它就完整受益所有Cloudflare服务。如我将 umami.acofork.com SaaS 到 2x.nz，我就可以在 2x.nz 里为 umami.acofork.com 写规则了：
![cf-saas-1.webp](https://imghub.legspcpd.indevs.in/file/image/cf-saas-1.webp)
![cf-saas-2.webp](https://imghub.legspcpd.indevs.in/file/image/cf-saas-2.webp)
![cf-saas-3.webp](https://imghub.legspcpd.indevs.in/file/image/cf-saas-3.webp)
Worker中的路由规则也适用：
![cf-saas-4.webp](https://imghub.legspcpd.indevs.in/file/image/cf-saas-4.webp)

SaaS优选步骤
简单易懂（pro.yourdomain.com 是最终访问域名）： CF SaaS DNS origin.yourdomain.com -> 源站开小黄云 cdn.yourdomain.com -> cf优选域名 pro.yourdomain.com -> cdn.yourdomain.com

CF SaaS 添加自定义主机名pro.yourdomain.com 源站为origin.yourdomain.com

警告
Cloudflare最近将新接入的域名SSL默认设为了完全，记得将 SSL 改为灵活。

### 准备工作
我们需要一个域名或两个域名（单域名直接用子域名即可。双域名比如：onani.cn和acofork.cn）。

如果在同一CF账号下不可用，请尝试将俩域名放置在不同账号

这里我们让onani.cn成为主力域名，让acofork.cn成为辅助域名。

单域名效果：
![cf-fastip-1.webp](https://imghub.legspcpd.indevs.in/file/image/cf-fastip-1.webp)



具体步骤
首先新建一个DNS解析，指向你的源站，开启cf代理
![c94c34ee262fb51fb5697226ae0df2d804bf76fe.webp](https://imghub.legspcpd.indevs.in/file/image/c94c34ee262fb51fb5697226ae0df2d804bf76fe.webp)

前往辅助域名的 SSL/TLS -> 自定义主机名。设置回退源为你刚才的DNS解析的域名：xlog.acofork.cn（推荐 HTTP 验证）

点击添加自定义主机名。设置一个自定义主机名，比如 onani.cn，然后选择自定义源服务器，填写第一步的域名，即 xlog.acofork.cn。

如果你想要创建多个优选也就这样添加，一个自定义主机名对应一个自定义源服务器。如果你将源服务器设为默认，则源服务器是回退源指定的服务器，即 xlog.acofork.cn

![f6170f009c43f7c6bee4c2d29e2db7498fa1d0dc.webp](https://imghub.legspcpd.indevs.in/file/image/f6170f009c43f7c6bee4c2d29e2db7498fa1d0dc.webp)

继续在你的辅助域名添加一条解析。CNAME到优选节点：如cloudflare.182682.xyz，不开启cf代理
![4f9f727b0490e0b33d360a2363c1026003060b29.webp](https://imghub.legspcpd.indevs.in/file/image/4f9f727b0490e0b33d360a2363c1026003060b29.webp)

最后在你的主力域名添加解析。域名为之前在辅助域名的自定义主机名（onani.cn），目标为刚才的cdn.acofork.cn，不开启cf代理
![6f51cb2a42140a9bf364f88a5715291be616a254.webp](https://imghub.legspcpd.indevs.in/file/image/6f51cb2a42140a9bf364f88a5715291be616a254.webp)

优选完毕，确保优选有效后尝试访问
![cf-fastip-10.webp](https://imghub.legspcpd.indevs.in/file/image/cf-fastip-10.webp)

（可选）你也可以将cdn子域的NS服务器更改为阿里云\华为云\腾讯云云解析做线路分流解析

优选工作流：用户访问 -> 由于最终访问的域名设置了CNAME解析，所以实际上访问了cdn.acofork.cn，并且携带 源主机名：onani.cn -> 到达优选域名进行优选 -> 优选结束，cf边缘节点识别到了携带的 源主机名：onani.cn 查询发现了回退源 -> 回退到回退源内容（xlog.acofork.cn） -> 访问成功

---

# 针对于Cloudflare Page

1. 你可以直接将你绑定到Page的子域名直接更改NS服务器到阿里云\华为云\腾讯云云解析做线路分流解析
    
2. 将您的Page项目升级为Worker项目，使用Worker优选方案（更简单）。详细方法见：【CF Page一键迁移到Worker？好处都有啥？-哔哩哔哩】 [https://www.bilibili.com/video/BV1wBTEzREcb](https://www.bilibili.com/video/BV1wBTEzREcb)
---
# 针对于Cloudflare Workers

1. 在Workers中添加路由，然后直接将你的路由域名从指向xxx.worker.dev改为优选域名即可

2. 如果是外域，SaaS后再添加路由即可，就像：
![cf-fastip-12.webp](https://imghub.legspcpd.indevs.in/file/image/cf-fastip-12.webp)
![cf-fastip-13.webp](https://imghub.legspcpd.indevs.in/file/image/cf-fastip-13.webp)

---

# 针对于使用了各种CF规则的网站

你只需要让规则针对于你的 **最终访问域名** ，因为CF的规则是看主机名的，而不是看是由谁提供的。

# 针对于虚拟主机

保险起见，建议将源站和优选域名同时绑定到你的虚拟主机，保证能通再一个个删。
