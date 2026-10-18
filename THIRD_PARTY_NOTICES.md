# 第三方来源与许可

## 终末地风味主题（endfield-ui）

`src/styles/endfield/` 下的 token 与换皮规则，依据 **endfield-ui skill** 写成
（原始目录：`F:\web\new blog\endfield-ui-skill-main`）。

- 该 skill 的说明写明：**所有代码、模板、token 和规则可自由使用**。
- 它**没有使用任何游戏官方素材**（字体、标志、图标、立绘、截图、文案），
  本站同样不使用。
- 本站的做法与参考站 2x.nz 一致：**同一份 DOM，两套皮肤**，
  主题是 `<html>` 上的一个 data 属性。

### Saira 字体

`public/ef/Saira.ttf` —— Copyright 2020 The Saira Project Authors，
**SIL Open Font License 1.1**，许可证全文见同目录 `Saira-OFL.txt`。
界面上的宽体拉丁字（`//` 眉标、编号、字段、字标）靠它的字宽轴（wdth 50–125）。

### 等高线底纹

`public/ef/contours/` 下的两张 SVG 由该 skill 的
`assets/contours/draw-contours.mjs` 生成，可自由使用。

## WinUIonWeb

`vendor/winuionweb/` —— 上游 [Furry-Xiyi/WinUIonWeb](https://github.com/Furry-Xiyi/WinUIonWeb)，
**GPL-3.0-only**。许可证与第三方声明随源码放在该目录下。

**Segoe Fluent Icons 不可随网站分发**（上游 `docs/icon-font.md` 有说明）：
导航图标用的是字形码，依赖 Windows 系统已装的字体；
Windows 之外的平台字形会缺失 —— 这是上游的既有约束，不是本项目引入的。
