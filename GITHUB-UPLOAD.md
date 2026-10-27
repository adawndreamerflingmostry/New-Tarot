# 零基础上传到 GitHub（不用装 Git、不用命令行）

> 目标：把 `E:\tarro` 这个项目放到 GitHub，并开启一个手机能直接打开的网址。
> 全程在浏览器里点鼠标完成，大约 5 分钟。

---

## 第一步：注册 / 登录 GitHub

1. 打开浏览器，访问 **https://github.com**
2. 没有账号：点右上角 **Sign up**，用邮箱注册（需要去邮箱点验证链接）
3. 已有账号：点右上角 **Sign in** 登录

---

## 第二步：新建一个空仓库

1. 登录后，点右上角的 **“+”** → **New repository**
2. **Repository name** 填：`tarot`（也可以填别的英文名，记住它）
3. 选 **Public**（公开）——只有公开仓库才能免费用 GitHub Pages 做网页
4. 下面的 “Add a README file / Add .gitignore / Choose a license” **都不要勾**
5. 点绿色按钮 **Create repository**

---

## 第三步：把项目文件传上去

1. 新建成功后，页面上有一行小字：**“uploading an existing file”**，点它
   （如果没有，就点 **Add file** → **Upload files**）
2. 打开电脑上的 `E:\tarro` 文件夹
3. 按 **Ctrl + A** 全选（`.git` 是隐藏文件夹，不会被选中，不用管它）
4. 把选中的文件**拖进浏览器的上传区域**
5. 等所有文件上传完成，页面拉到最下面，点绿色按钮 **Commit changes**
6. 看到仓库里出现了 `index.html`、`spatial.html` 等文件 = 上传成功

> 文件比较多（约 5 MB，含预览图片），上传等几秒到几十秒即可。

---

## 第四步：开启网页（GitHub Pages）

1. 在仓库页面顶部点 **Settings**
2. 左侧菜单点 **Pages**
3. **Source** 选 **Deploy from a branch**
4. **Branch** 选 **main**，右边的目录选 **/(root)**
5. 点 **Save**
6. 等 1–2 分钟，刷新这个页面，顶部会出现一行：
   **Your site is live at https://你的用户名.github.io/tarot/**

---

## 第五步：手机访问

- 空间塔罗系统：`https://你的用户名.github.io/tarot/spatial.html`
- 传统抽牌：`https://你的用户名.github.io/tarot/`
- 手机浏览器打开后，iPhone 可以点「分享 → 添加到主屏幕」，像 App 一样用

---

## 以后想更新代码

改完文件后，在仓库页面点 **Add file → Upload files**，把改过的文件重新拖进去，
点 **Commit changes**，等 1–2 分钟网页会自动更新。

---

## 常见问题

**打开网址是 404？**
- 刚开启 Pages 需要等 1–2 分钟；
- 确认 Settings → Pages 里显示 “Your site is live at …”；
- 确认仓库是 **Public**（Private 仓库的 Pages 需要付费计划）。

**上传时提示文件太大？**
- 单个文件 GitHub 限制 100 MB，本项目所有文件都远小于这个值（最大约 1.5 MB 的截图）。

**不想把截图传上去？**
- `preview/` 文件夹只是 README 里的预览图，不传也不影响程序运行，只是 README 图片会显示不出来。

**只想在手机上用，不想折腾 GitHub？**
- 直接把 `dist\tarot-spatial.html` 这一个文件发到手机（微信/邮件/AirDrop），
  Android 用 Chrome 打开即可；iPhone 建议用 GitHub Pages 的网址，体验最好。
