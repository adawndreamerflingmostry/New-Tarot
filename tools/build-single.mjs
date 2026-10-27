/**
 * 把多文件页面打包成"单文件 HTML"，方便直接发送到手机 / 离线打开。
 *
 * 用法：node tools/build-single.mjs
 * 输出：dist/tarot-spatial.html  （空间塔罗 · 思维语法系统）
 *       dist/tarot-classic.html  （传统塔罗抽牌）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function inline({ html, css, scripts, out }) {
  let s = read(html);

  const cssTag = `<link rel="stylesheet" href="${css}">`;
  if (!s.includes(cssTag)) throw new Error(`${html} 中找不到样式外链 ${css}`);
  s = s.replace(cssTag, `<style>\n${read(css)}\n</style>`);

  scripts.forEach(function (js) {
    const tag = `<script src="${js}"></script>`;
    if (!s.includes(tag)) throw new Error(`${html} 中找不到脚本外链 ${js}`);
    const code = read(js);
    if (/<\/script/i.test(code)) throw new Error(`${js} 含 </script>，不能直接内联`);
    s = s.replace(tag, `<script>\n${code}\n</script>`);
  });

  if (/<script src=|<link rel="stylesheet"/.test(s)) {
    throw new Error(`${out} 仍有未内联的外部资源`);
  }

  fs.writeFileSync(path.join(dist, out), s, 'utf8');
  const kb = (Buffer.byteLength(s, 'utf8') / 1024).toFixed(1);
  console.log(out, kb + ' KB');
}

inline({
  html: 'spatial.html',
  css: 'spatial.css',
  scripts: ['tarot-data.js', 'card-art.js', 'spatial.js'],
  out: 'tarot-spatial.html'
});

inline({
  html: 'index.html',
  css: 'styles.css',
  scripts: ['tarot-data.js', 'card-art.js', 'app.js'],
  out: 'tarot-classic.html'
});
