# YZ Voice 全功能升级包

这是把你现在的 Vercel + LiveKit 静态项目升级成「真实账号 + 房间 + 钱包 + 礼物」的基础版本。

## 你的 11 项需求
- Email 注册 + Google 登录/注册：已实现。
- 微信登录/注册：代码已写，但必须先到微信开放平台申请网站应用 AppID/Secret。
- 密码至少8位，且必须含字母+数字：服务端强制。
- 用户ID：计数从 1000000 开始，显示时左补0为8位，第一个是 `01000000`。
- 性别：注册后没有任何修改 API。
- 昵称：唯一，可修改。
- 生日：公开月+日；出生年份只存在 `user_private`，不在公开 profile。
- 钱包：coins + diamonds。
- 礼物：20个；100金币以上带大动画；收礼按70%转钻石。
- 头像：上传 Firebase Storage，房主和麦位使用头像。
- 房间背景：房主/管理员可更换。
- 房间密码：支持 bcrypt 哈希。
- 管理员：房主可用8位ID添加/移除。
- 房主本身就是普通账号，不占固定麦位，可正常上麦开麦。
- 8号位：老板位 + 沙发/金色装饰。
- 麦克风音量：Web Audio Gain 0-200%。
- 扬声器音量：0-100%。
- 房间聊天：LiveKit Data 实时同步。
- 聊天背景：半透明。

## 重要：这不是只复制几个文件就能立即上线
你需要先配置 Firebase，因为注册、资料、昵称唯一、钱包、房间和礼物都必须有真正数据库。

### Firebase 开启
1. Authentication -> Email/Password
2. Authentication -> Google
3. Firestore Database
4. Storage
5. 建立 Web App，并把公开配置填进 `firebase-config.js`

### Firebase Rules
把：
- `firestore.rules`
- `storage.rules`
分别复制到 Firebase 对应 Rules 页面发布。

## Vercel 环境变量
```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
FIREBASE_WEB_API_KEY=

LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

微信要另外加：
```
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_REDIRECT_URI=https://你的域名/api/auth/wechat-callback
```

`FIREBASE_PRIVATE_KEY`、`LIVEKIT_API_SECRET`、`WECHAT_APP_SECRET` 绝对不要放进 GitHub。

## 安装
项目根目录执行：
```
npm install
```
然后 commit 到 GitHub，让 Vercel 部署。

## 首页按钮建议
```
登录/注册 -> auth.html
个人资料 -> profile.html
创建房间 -> create-room.html
```

## 关于充值 / 真正提现
这套代码只做：
- 钱包余额
- 礼物扣金币
- 收礼70%进钻石
- 提交提现申请

真实充值、真实银行/电子钱包付款和真实提现没有伪造实现。上线前必须接正规支付商，并处理 KYC、退款、盗刷、税务、反洗钱和当地法律要求。

## 关于用户条款
`terms.html` 是原创草案，不复制“氧气语音”等其他平台文字。正式上线前请让目标市场律师审核。

## 下一步建议
先按顺序完成：
1. Firebase
2. Email注册
3. Google登录
4. 个人资料
5. 创建房间
6. 进入房间
7. 麦位/头像
8. 聊天
9. 礼物
10. 微信开放平台
11. 正式充值/提现
