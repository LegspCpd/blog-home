import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义26种语言列表
const languages = [
  'en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'fr', 'de', 'es', 'it', 'pt',
  'ru', 'ar', 'hi', 'tr', 'vi', 'th', 'id', 'ms', 'nl', 'pl',
  'sv', 'no', 'da', 'fi', 'cs', 'hu'
];

// i18n 文件夹路径
const i18nDir = path.resolve(__dirname, '../src/i18n');

// 确保 i18n 文件夹存在
if (!fs.existsSync(i18nDir)) {
  fs.mkdirSync(i18nDir, { recursive: true });
}

// 读取现有的 en.json 作为模板（如果有的话）
let templateData = {};
const enJsonPath = path.join(i18nDir, 'en.json');
if (fs.existsSync(enJsonPath)) {
  try {
    templateData = JSON.parse(fs.readFileSync(enJsonPath, 'utf-8'));
    console.log('Read en.json as the template');
  } catch (e) {
    console.log('Warning: failed to read en.json; using an empty template');
  }
}

// 生成所有语言文件
let generatedCount = 0;
languages.forEach(lang => {
  const filePath = path.join(i18nDir, `${lang}.json`);
  
  // 如果文件已存在，跳过不覆盖
  if (fs.existsSync(filePath)) {
    console.log(`Skipped ${lang}.json (already exists)`);
    return;
  }

  // 生成文件内容：如果有模板，复制键；如果没有，创建空对象
  let fileContent = {};
  if (Object.keys(templateData).length > 0) {
    // 复制模板的键，值留空或者用英文占位（方便后续翻译）
    for (const key in templateData) {
      fileContent[key] = ''; // 或者改成 templateData[key] 先用英文占位
    }
  }

  // 写入文件
  fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf-8');
  console.log(`Created ${lang}.json`);
  generatedCount++;
});

console.log(`\nDone. Generated ${generatedCount} new language file(s)`);
console.log(`Output directory: ${i18nDir}`);