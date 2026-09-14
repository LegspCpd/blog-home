import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const I18N_DIR = path.join(__dirname, '../src/i18n');

// ==========================================
// 🔴 请在这里粘贴你 zh_CN.ts 里的对象内容！
// ==========================================
// 示例格式：
// const SOURCE_DATA = {
//   [Key.home]: "主页",
//   [Key.about]: "关于我",
//   // ... 把所有内容贴在这里
// };
//
// 注意：为了简化，你可以把 [Key.xxx] 替换成普通字符串 "xxx"
// 或者直接把整个对象贴进来，脚本会尝试处理。

// 👇👇👇 把你的源数据粘贴到这里 👇👇👇
const SOURCE_DATA = {
  // 这里只是示例，请替换成你实际的内容！
  "home": "主页",
  "about": "关于我",
  "archive": "归档",
  "search": "搜索"
  // ...
};
// 👆👆👆 粘贴结束 👆👆👆

// 目标26种语言
const TARGET_LANGS = [
  'en', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt',
  'ru', 'ar', 'hi', 'tr', 'vi', 'th', 'id', 'ms', 'nl', 'pl',
  'sv', 'no', 'da', 'fi', 'cs', 'hu'
];

// 简单的翻译函数（谷歌免费接口）
async function translate(text, to) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data[0].map(x => x[0]).join('');
  } catch (e) {
    console.log(`翻译失败: ${text}`);
    return text; // 失败则保留原文
  }
}

// 延迟防封
const delay = ms => new Promise(r => setTimeout(r, ms));

// 主逻辑
async function run() {
  console.log('🚀 开始生成 26 国语言 JSON 文件...\n');
  
  // 确保目录存在
  if (!fs.existsSync(I18N_DIR)) {
    fs.mkdirSync(I18N_DIR, { recursive: true });
  }

  // 1. 先生成源语言的 zh-CN.json
  const zhCnPath = path.join(I18N_DIR, 'zh-CN.json');
  fs.writeFileSync(zhCnPath, JSON.stringify(SOURCE_DATA, null, 2), 'utf-8');
  console.log('✅ 已生成 zh-CN.json (源语言)\n');

  // 2. 逐个生成其他语言
  for (const lang of TARGET_LANGS) {
    console.log(`==================== 正在翻译: ${lang} ====================`);
    const result = {};
    
    // 读取现有文件（如果有）
    const targetPath = path.join(I18N_DIR, `${lang}.json`);
    let existing = {};
    if (fs.existsSync(targetPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      } catch {}
    }

    // 翻译每一条
    for (const key of Object.keys(SOURCE_DATA)) {
      if (existing[key]) {
        result[key] = existing[key]; // 保留已有翻译
        continue;
      }
      
      const text = SOURCE_DATA[key];
      console.log(`🔄 翻译 ${key}: ${text}`);
      result[key] = await translate(text, lang);
      await delay(600);
    }

    // 保存
    fs.writeFileSync(targetPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`✅ ${lang}.json 已保存\n`);
  }

  console.log('🎉 全部完成！JSON 文件已生成在 src/i18n/ 目录下');
}

run();