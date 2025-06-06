<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>多密钥 TOTP 生成器 (多用户云同步)</title>
  <link rel="stylesheet" href="css/bulma-0.9.4.min.css">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <style>
    :root {
      --primary-color: #3273dc;
      --primary-dark: #2366d1;
      --secondary-color: #48c774;
      --accent-color: #6c5ce7;
      --text-color: #363636;
      --bg-color: #f8f9fa;
      --danger-color: #f14668;
      --danger-dark: #d93058;
      --card-bg: white;
      --card-shadow: 0 6px 25px rgba(0, 0, 0, 0.07);
      --grid-gap: 0.75rem; 
    }

    [v-cloak] {
      display: none;
    }

    html, body {
      min-height: 100%;
      font-family: 'Roboto', sans-serif;
      background-color: var(--bg-color);
      overflow-x: hidden;
      padding-bottom: 2rem; 
    }

    .container {
      position: relative;
      margin-top: 1.5rem;
      margin-bottom: 1.5rem;
      z-index: 1;
      max-width: 1200px !important; 
    }
    
    .title {
      color: var(--primary-color);
      font-weight: 700;
      margin-bottom: 2rem;
    }

    .label {
      color: var(--text-color);
      font-weight: 600;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }

    .input, .textarea {
      border: 1px solid #dbdee5;
      border-radius: 8px;
      box-shadow: none;
      transition: all 0.2s;
      padding: 0.75rem 1rem;
      height: 2.8rem;
      background-color: rgba(255, 255, 255, 0.9);
    }
    .textarea {
        min-height: 7em; 
        height: auto;
        padding: 1rem;
    }

    .input:focus, .textarea:focus {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(50, 115, 220, 0.25);
      background-color: white;
    }
    
    .progress {
      height: 4px; 
      border-radius: 2px;
      overflow: hidden;
      margin-top: 0.25rem; 
      background-color: rgba(234, 234, 234, 0.6);
    }

    .progress::-webkit-progress-value {
      background-color: var(--primary-color);
      transition: width 0.3s ease-out;
    }
     .progress::-moz-progress-bar {
      background-color: var(--primary-color);
      transition: width 0.3s ease-out;
    }

    .keys-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); 
        gap: var(--grid-gap);
        margin-bottom: 2rem;
    }

    .key-entry-card {
      background: var(--card-bg);
      border-radius: 8px; 
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
      position: relative; 
      padding: 0.7rem; 
    }
    .key-entry-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 7px 18px rgba(0,0,0,0.08);
    }

    .token {
      font-size: 1.5rem; 
      font-weight: 700;
      letter-spacing: 1.5px; 
      margin: 0; 
      padding: 0.1rem 0;
      background-image: linear-gradient(135deg, var(--primary-color), var(--accent-color));
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      cursor: pointer;
      line-height: 1.1;
      text-align: center;
    }

    .pulse {
      animation: pulse 0.8s infinite alternate; 
    }

    @keyframes pulse {
      from { opacity: 0.85; }
      to { opacity: 1; }
    }
    
    .delete-button {
      background-color: var(--danger-color);
      color: white;
      border: none;
      border-radius: 50%; 
      width: 24px; 
      height: 24px;
      padding: 0;
      transition: all 0.2s;
      position: absolute;
      top: 6px;
      right: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.65;
      z-index: 5;
      cursor: pointer;
    }
    .key-entry-card:hover .delete-button {
        opacity: 1;
    }
    .delete-button:hover {
      background-color: var(--danger-dark);
      transform: scale(1.1);
    }
    .delete-button .icon {
        margin: 0;
        font-size: 0.65rem; 
    }

    .qr-code-trigger {
        text-align: center;
        margin-top: 4px; 
    }

    .qr-code-trigger .button {
        background: none;
        border: none;
        color: #b5b5b5; 
        opacity: 0.8; 
        transition: all 0.2s ease;
        padding: 0;
        height: 24px;
        width: 24px;
        cursor: pointer;
    }
    .qr-code-trigger .button:hover {
        color: var(--primary-color);
        opacity: 1;
        transform: scale(1.15);
    }
    .qr-code-trigger .icon {
        font-size: 1.2rem; 
        height: 1.2rem;
        width: 1.2rem;
    }
    
    .button.is-primary, .button.is-success, .button.is-danger { 
        border-radius: 8px; 
        font-weight: 500;
        padding: 0.75rem 1.5rem; 
        transition: all 0.2s ease-out;
    }
     .button.is-danger.is-outlined { 
        border-color: var(--danger-color);
        color: var(--danger-color);
     }
     .button.is-danger.is-outlined:hover {
        background-color: var(--danger-color);
        color: white;
     }
    .button.is-success {
        background-color: var(--secondary-color);
        box-shadow: 0 4px 12px rgba(72, 199, 116, 0.2);
    }
    .button.is-success:hover {
        background-color: #3db865;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(72, 199, 116, 0.3);
    }

    .toast {
      position: fixed;
      bottom: 2rem;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--secondary-color);
      color: white;
      padding: 0.8rem 1.5rem;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 500;
      box-shadow: 0 5px 15px rgba(0,0,0,0.15);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .toast.show {
      opacity: 1;
      visibility: visible;
      animation: fadeInBottom 0.4s ease-out;
    }

    @keyframes fadeInBottom {
      0% { transform: translateX(-50%) translateY(20px); opacity: 0; }
      100% { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    
    .add-key-section {
        padding: 1.5rem;
        border-top: 1px solid #eee;
    }

    .key-name-display {
        font-weight: 500; 
        color: var(--text-color);
        margin-bottom: 0.1rem; 
        font-size: 0.8rem; 
        cursor: pointer;
        display: block; 
        padding: 0.1rem 0.2rem;
        border-radius: 3px;
        transition: background-color 0.2s;
        line-height: 1.2;
        word-break: break-word; 
        text-align: center; 
    }
    .key-name-display:hover {
        background-color: #f0f0f0;
    }
    .key-name-input {
        font-size: 0.8rem; 
        font-weight: 500;
        padding: 0.2rem 0.4rem;
        border: 1px solid var(--primary-color);
        border-radius: 4px;
        width: 100%; 
        margin-bottom: 0.25rem;
        box-sizing: border-box; 
    }
    .secret-key-display {
        font-size: 0.6rem; 
        color: #bbb; 
        word-break: break-all;
        margin-bottom: 0.2rem; 
        line-height: 1.1;
        text-align: center; 
        height: 1.1em; 
        overflow: hidden;
    }
    .no-keys-message {
        text-align: center;
        padding: 3rem 2rem; 
        color: #7a7a7a;
        background-color: var(--card-bg);
        border-radius: 12px;
        box-shadow: var(--card-shadow);
    }
    .no-keys-message p:first-child {
      font-size: 1.2rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }
    
    .page-footer { 
        padding: 2rem 1.5rem;
        background-color: transparent; 
        text-align: center;
        margin-top: 2rem;
    }
    .instructions-card {
        background: var(--card-bg);
        border-radius: 12px;
        box-shadow: var(--card-shadow);
        padding: 1.5rem;
        margin-top: 2.5rem;
        color: #555;
    }
    .instructions-card h2 {
        color: var(--primary-color);
        font-weight: 600;
        margin-bottom: 1rem;
    }
    .instructions-card p {
        margin-bottom: 0.5rem;
        line-height: 1.6;
        font-size: 0.9rem;
    }
    .instructions-card strong {
        color: var(--primary-dark);
    }
    .actions-bar {
        display: flex;
        justify-content: space-between; 
        align-items: center;
        margin-bottom: 1rem; 
    }
    .loading-indicator {
        display: flex;
        align-items: center;
        color: var(--text-color);
        font-size: 0.9rem;
    }
    .loading-indicator .loader {
        margin-right: 0.5rem;
    }
    
    /* Auth Form Styles */
    .auth-container {
        max-width: 400px;
        margin: 4rem auto;
    }
    .auth-tabs .tabs {
        margin-bottom: 1.5rem;
    }
    
    /* QR Code Modal Styles */
    #qrcode-container img {
        display: block;
        margin: auto;
        border: 6px solid white;
        border-radius: 10px;
    }
    .modal-card-title {
        color: var(--text-color);
    }

  </style>
</head>
<body>

  <div id="toast" class="toast">信息已提示!</div>

  <section id="app" class="section" v-cloak>
    <div class="container">
        
        <!-- Logged In View -->
        <div v-if="user.loggedIn">
            <h1 class="title is-3 has-text-centered">多账户 2FA 验证码</h1>
            <p class="subtitle is-6 has-text-centered">已作为 <strong>{{ user.name }}</strong> 登录</p>

            <div class="actions-bar">
                <div class="loading-indicator" v-if="isLoading">
                    <span class="loader"></span>
                    <span>同步中...</span>
                </div>
                <div>
                    <button v-if="keys.length > 0" class="button is-danger is-outlined is-small mr-2" @click="clearAllKeysWithConfirmation">
                        <span class="icon is-small"><i class="fas fa-trash-alt"></i></span>
                        <span>清空所有</span>
                    </button>
                    <button class="button is-small" @click="logout">
                        <span class="icon is-small"><i class="fas fa-sign-out-alt"></i></span>
                        <span>登出</span>
                    </button>
                </div>
            </div>

            <div v-if="keys.length > 0" class="keys-grid">
                <!-- Key cards loop -->
                <div v-for="(keyEntry, index) in keys" :key="keyEntry.id" class="key-entry-card">
                    <button class="button is-small delete-button" @click="removeKey(index)" title="删除密钥">
                        <span class="icon is-small"><i class="fas fa-times"></i></span>
                    </button>
                    <div v-if="!keyEntry.isEditingName" class="key-name-display" @click="startEditKeyName(keyEntry, index)">
                        {{ keyEntry.name || '密钥 ' + (index + 1) }}
                        <span class="icon is-small has-text-grey-light ml-1" title="点击编辑名称">
                        <i class="fas fa-pencil-alt fa-xs"></i>
                        </span>
                    </div>
                    <input v-else :id="'name-input-' + keyEntry.id" type="text" class="input is-small key-name-input mb-1" v-model="keyEntry.editingNameValue" @keyup.enter="saveKeyName(keyEntry)" @blur="saveKeyName(keyEntry)" placeholder="输入名称">
                    <p class="secret-key-display">{{ keyEntry.secret }}</p>
                    <div class="mb-05">
                        <span class="has-text-grey is-size-7">{{ keyEntry.updatingIn }} 秒后更新</span>
                        <progress class="progress is-info is-small" :value="keyEntry.updatingIn" :max="keyEntry.period"></progress>
                    </div>
                    <p class="title is-5 token" :class="{ 'pulse': keyEntry.updatingIn <= 5 }" @click="copyToken(keyEntry.token, keyEntry.id)">
                        {{ keyEntry.token }}
                    </p>
                    <div class="qr-code-trigger">
                        <button class="button" @click="showQrCode(keyEntry)" title="显示二维码">
                            <span class="icon"><i class="fas fa-qrcode"></i></span>
                        </button>
                    </div>
                </div>
            </div>
            <div v-else class="no-keys-message">
                <p class="is-size-5">还没有添加密钥哦！</p>
                <p>请在下方文本框中粘贴您的密钥可批量添加。</p>
            </div>
            <!-- Add Keys Section -->
            <div class="box add-key-section mt-5">
                <h2 class="title is-4 has-text-centered mb-4">添加密钥</h2>
                <div class="field">
                <label class="label">密钥列表 (每行一个)</label>
                <div class="control">
                    <textarea class="textarea" v-model="batchSecretsInput" @paste.prevent="handlePaste" @blur="processBatchInputOnBlur" placeholder="BCLQ5FLW3TLOTUXK&#10;Google:G6RYBUGRDCS74LD4" rows="5"></textarea>
                </div>
                <p class="help">支持格式：<code>密钥</code>, <code>名称:密钥</code>, <code>名称\t密钥</code>, <code>名称<空格>密钥</code>。位数(默认6)和周期(默认30)使用默认值。</p>
                </div>
                <div class="columns is-mobile">
                    <div class="column">
                        <div class="field">
                        <label class="label">默认位数</label>
                        <div class="control">
                            <input class="input is-small" type="number" v-model.number="batchDefaultSettings.digits">
                        </div>
                        </div>
                    </div>
                    <div class="column">
                        <div class="field">
                        <label class="label">默认周期 (秒)</label>
                        <div class="control">
                            <input class="input is-small" type="number" v-model.number="batchDefaultSettings.period">
                        </div>
                        </div>
                    </div>
                </div>
                <div class="field has-text-centered mt-4">
                    <button class="button is-success is-fullwidth" @click="processBatchInput(false)" :disabled="!batchSecretsInput.trim() || isLoading">
                        <span class="icon"><i class="fas fa-plus-circle"></i></span>
                        <span>添加输入框中的密钥</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- Auth View -->
        <div v-else class="auth-container">
            <div class="box">
                <div class="auth-tabs tabs is-toggle is-fullwidth">
                    <ul>
                        <li :class="{'is-active': auth.mode === 'login'}" @click="auth.mode = 'login'"><a>登录</a></li>
                        <li :class="{'is-active': auth.mode === 'register'}" @click="auth.mode = 'register'"><a>注册</a></li>
                    </ul>
                </div>
                <div class="field">
                    <label class="label">用户名</label>
                    <div class="control has-icons-left">
                        <input class="input" type="text" placeholder="输入您的用户名" v-model="auth.username" @keyup.enter="auth.mode === 'login' ? login() : register()">
                        <span class="icon is-small is-left"><i class="fas fa-user"></i></span>
                    </div>
                </div>
                <div class="field">
                    <label class="label">密码</label>
                    <div class="control has-icons-left">
                        <input class="input" type="password" placeholder="至少8位" v-model="auth.password" @keyup.enter="auth.mode === 'login' ? login() : register()">
                        <span class="icon is-small is-left"><i class="fas fa-lock"></i></span>
                    </div>
                </div>
                <div class="field">
                    <button class="button is-primary is-fullwidth" :class="{'is-loading': auth.loading}" @click="auth.mode === 'login' ? login() : register()">
                        <span class="icon"><i :class="auth.mode === 'login' ? 'fa-sign-in-alt' : 'fa-user-plus'" class="fas"></i></span>
                        <span>{{ auth.mode === 'login' ? '登 录' : '注 册' }}</span>
                    </button>
                </div>
            </div>
        </div>

      <!-- Instructions Card and Footer can be outside the v-if/v-else -->
      <div class="instructions-card mt-5"> 
        <h2 class="title is-5">使用说明</h2>
        <p><strong>1.</strong> **注册/登录**: 首次使用请选择“注册”，输入用户名和密码（至少8位），然后点击注册。之后使用相同的用户名和密码登录。</p>
        <p><strong>2.</strong> **批量添加**: 登录后，在“密钥列表”文本框中输入或粘贴密钥，每行一个。支持格式如 <code>密钥</code>、<code>名称:密钥</code>、<code>名称<空格>密钥</code> 等。</p>
        <p><strong>3.</strong> **使用**: 点击验证码可复制，点击 <i class="fas fa-qrcode"></i> 可显示二维码供手机应用扫描。所有密钥均通过您的账户安全地在云端同步。</p>
      </div>
    </div>

    <!-- QR Code Modal -->
    <div class="modal" :class="{'is-active': isQrModalActive}">
        <div class="modal-background" @click="closeQrModal"></div>
        <div class="modal-card">
        <header class="modal-card-head">
            <p class="modal-card-title">扫描二维码添加密钥</p>
            <button class="delete" aria-label="close" @click="closeQrModal"></button>
        </header>
        <section class="modal-card-body is-flex is-flex-direction-column is-align-items-center">
            <div id="qrcode-container"></div>
            <p class="has-text-centered mt-2 has-text-weight-bold">{{ qrCodeKeyName }}</p>
        </section>
        </div>
    </div>
  </section>

  <footer class="page-footer"> 
    <div class="container">
      <div class="content has-text-centered">
        <p>Built by <a href="https://hailizi.456785.xyz" target="_blank">海蛎子</a></p>
      </div>
    </div>
  </footer>

  <!-- No longer need SimpleWebAuthn browser script -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>
  <script src="js/assets/vue-3.4.20.global.prod.js"></script>
  <script src="js/assets/otpauth-9.1.3.min.js"></script>
  <script src="js/app.js?v=1.14"></script> 
</body>
</html>
```javascript
// Helper functions
function getCurrentSeconds() { return Math.round(new Date().getTime() / 1000.0); }
function stripSpaces(str) { if (typeof str !== 'string') return ''; return str.replace(/\s/g, ''); }
function truncateTo(str, digits) { if (typeof str !== 'string') str = String(str); if (str.length <= digits) { return str; } return str.slice(-digits); }
function generateUUID() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }

const app = Vue.createApp({
  data() {
    return {
      workerUrl: '[https://multi-user-totp-api.hailizi.workers.dev/](https://multi-user-totp-api.hailizi.workers.dev/)', 
      
      user: {
        loggedIn: false,
        name: '',
        token: null,
      },
      auth: {
        mode: 'login',
        username: '',
        password: '', 
        loading: false,
      },
      
      keys: [], 
      batchSecretsInput: '', 
      batchDefaultSettings: { digits: 6, period: 30 },
      intervalHandle: null,
      toastTimeout: null,
      isQrModalActive: false, 
      qrCodeKeyName: '', 
      isLoading: false,
    };
  },

  mounted: async function () {
    const sessionToken = localStorage.getItem('userSessionToken');
    const username = localStorage.getItem('username');
    if (!this.workerUrl || this.workerUrl.includes('your-username.workers.dev')) {
        this.showToast('请在 app.js 中配置您的 Worker URL！', true);
        return;
    }
    if (sessionToken && username) {
        this.user.token = sessionToken;
        this.user.name = username;
        this.user.loggedIn = true;
        this.loadKeysFromCloud();
    }
    this.intervalHandle = setInterval(this.updateAllTokens, 1000);
  },

  beforeUnmount: function () {
    clearInterval(this.intervalHandle);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  },

  methods: {
    // --- Auth Methods ---
    async register() {
        if (!this.auth.username.trim() || !this.auth.password) {
            this.showToast('用户名和密码不能为空', true);
            return;
        }
        if(this.auth.password.length < 8) {
            this.showToast('密码长度至少为8位', true);
            return;
        }
        this.auth.loading = true;
        try {
            const res = await fetch(`${this.workerUrl}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.auth.username, password: this.auth.password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '注册失败');
            
            this.showToast('注册成功！请登录。');
            this.auth.mode = 'login';
            this.auth.password = ''; 
        } catch (error) {
            this.showToast(`注册失败: ${error.message}`, true);
        } finally {
            this.auth.loading = false;
        }
    },

    async login() {
        if (!this.auth.username.trim() || !this.auth.password) {
            this.showToast('请输入用户名和密码', true);
            return;
        }
        this.auth.loading = true;
        try {
            const res = await fetch(`${this.workerUrl}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.auth.username, password: this.auth.password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '登录失败');

            this.user.loggedIn = true;
            this.user.name = this.auth.username;
            this.user.token = data.token;
            localStorage.setItem('userSessionToken', this.user.token);
            localStorage.setItem('username', this.user.name);
            this.auth.password = ''; 
            this.showToast(`欢迎, ${this.user.name}!`);
            await this.loadKeysFromCloud();
        } catch (error) {
            this.showToast(`登录失败: ${error.message}`, true);
        } finally {
            this.auth.loading = false;
        }
    },

    logout() {
        this.user.loggedIn = false;
        this.user.name = '';
        this.user.token = null;
        this.keys = [];
        this.auth.username = '';
        localStorage.removeItem('userSessionToken');
        localStorage.removeItem('username');
        this.showToast('已成功登出。');
    },

    // --- Core App Methods ---
    updateAllTokens() {
        this.keys.forEach(keyEntry => {
            try {
                if (!keyEntry.secret || stripSpaces(keyEntry.secret).length === 0) { throw new Error("密钥无效"); }
                const totp = new OTPAuth.TOTP({
                    issuer: keyEntry.name || 'TOTP Generator',
                    label: keyEntry.name || undefined,
                    algorithm: 'SHA1',
                    digits: parseInt(keyEntry.digits, 10) || 6,
                    period: parseInt(keyEntry.period, 10) || 30,
                    secret: OTPAuth.Secret.fromBase32(stripSpaces(keyEntry.secret)),
                });
                keyEntry.token = truncateTo(totp.generate(), keyEntry.digits || 6);
                keyEntry.updatingIn = (parseInt(keyEntry.period, 10) || 30) - (getCurrentSeconds() % (parseInt(keyEntry.period, 10) || 30));
            } catch (error) {
                keyEntry.token = "格式错误";
                keyEntry.updatingIn = (parseInt(keyEntry.period, 10) || 30);
            }
        });
    },

    async processBatchInput(isFromPaste = false) {
      const currentInput = this.batchSecretsInput; 
      if (!currentInput.trim()) { 
        if (!isFromPaste) this.showToast("输入框为空。", true);
        return; 
      }

      const lines = currentInput.split('\n');
      let addedCount = 0, failedCount = 0, newKeysToAdd = [];

      lines.forEach((line) => {
        let name = '', secretPart = line.trim();
        if (!secretPart) return;

        let parts;
        if (secretPart.includes('\t')) parts = secretPart.split('\t');
        else {
            const lastSpaceIndex = secretPart.lastIndexOf(' ');
            if (lastSpaceIndex > 0) {
                const potentialKey = secretPart.substring(lastSpaceIndex + 1);
                if (/^[A-Z2-7]+=*$/.test(stripSpaces(potentialKey.toUpperCase()))) {
                     parts = [secretPart.substring(0, lastSpaceIndex), potentialKey];
                }
            }
            if (!parts && secretPart.includes(':')) {
                const i = secretPart.indexOf(':');
                parts = [secretPart.substring(0, i), secretPart.substring(i + 1)];
            }
        }
        if (parts && parts.length > 1) {
            name = parts[0].trim();
            secretPart = parts.slice(1).join(parts.length > 1 && secretPart.includes('\t') ? '\t' : ':').trim();
        }

        try {
          const strippedSecret = stripSpaces(secretPart);
          if (!strippedSecret) throw new Error("密钥部分为空。");
          OTPAuth.Secret.fromBase32(strippedSecret);
          newKeysToAdd.push({
            id: generateUUID(),
            name: name || `密钥 ${this.keys.length + newKeysToAdd.length + 1}`,
            secret: strippedSecret.toUpperCase(),
            digits: parseInt(this.batchDefaultSettings.digits, 10) || 6,
            period: parseInt(this.batchDefaultSettings.period, 10) || 30,
            algorithm: 'SHA1',
            isEditingName: false,
            editingNameValue: name || `密钥 ${this.keys.length + newKeysToAdd.length + 1}`,
          });
        } catch (e) { failedCount++; }
      });
      
      if (newKeysToAdd.length > 0) {
        this.keys.push(...newKeysToAdd);
        await this.saveKeysToCloud();
        this.updateAllTokens();
        addedCount = newKeysToAdd.length;
      }
      
      this.batchSecretsInput = ''; 
      
      let message = '';
      if (addedCount > 0) message += `成功添加 ${addedCount} 个密钥。`;
      if (failedCount > 0) message += (message ? ' ' : '') + `${failedCount} 个密钥添加失败。`;
      if (message) this.showToast(message, failedCount > 0 && addedCount === 0);
    },
    
    async processBatchInputOnBlur() {
        if (this.batchSecretsInput.trim()) await this.processBatchInput(false);
    },
    async handlePaste(event) {
        event.preventDefault();
        this.batchSecretsInput = (event.clipboardData || window.clipboardData).getData('text');
        this.$nextTick(async () => { await this.processBatchInput(true); });
    },
    
    startEditKeyName(keyEntry, index) { 
        this.keys.forEach((k, i) => { 
            if (k.isEditingName && i !== index) this.saveKeyName(k);
            k.isEditingName = (i === index);
        });
        keyEntry.editingNameValue = keyEntry.name;
        this.$nextTick(() => { document.getElementById('name-input-' + keyEntry.id)?.focus(); });
    },
    async saveKeyName(keyEntry) { 
      if (keyEntry.isEditingName) { 
        keyEntry.name = keyEntry.editingNameValue.trim();
        keyEntry.isEditingName = false;
        await this.saveKeysToCloud();
      }
    },
    async removeKey(index) {
        const keyName = this.keys[index].name || `密钥 #${index + 1}`;
        this.keys.splice(index, 1);
        await this.saveKeysToCloud();
        this.showToast(`密钥 "${keyName}" 已删除。`);
    },
    async clearAllKeysWithConfirmation() {
        if (window.confirm("确定要清空所有密钥吗？")) {
            this.keys = [];
            await this.saveKeysToCloud();
            this.showToast("所有密钥已清空。");
        }
    },
    showQrCode(keyEntry) {
        try {
            const totp = new OTPAuth.TOTP({
                issuer: keyEntry.name || 'TOTP Generator',
                label: keyEntry.name || undefined,
                algorithm: 'SHA1',
                digits: parseInt(keyEntry.digits, 10) || 6,
                period: parseInt(keyEntry.period, 10) || 30,
                secret: OTPAuth.Secret.fromBase32(stripSpaces(keyEntry.secret)),
            });
            const uri = totp.toString();
            this.qrCodeKeyName = keyEntry.name || keyEntry.secret.substring(0, 16) + '...';
            this.isQrModalActive = true;
            this.$nextTick(() => {
                const container = document.getElementById('qrcode-container');
                if (container) {
                    container.innerHTML = ''; 
                    const qr = qrcode(0, 'M'); 
                    qr.addData(uri);
                    qr.make();
                    container.innerHTML = qr.createImgTag(5, 8); 
                }
            });
        } catch (error) {
            this.showToast("生成二维码失败，密钥格式可能不正确。", true);
        }
    },
    closeQrModal() { 
        this.isQrModalActive = false;
        const container = document.getElementById('qrcode-container');
        if (container) { container.innerHTML = ''; }
    },

    async saveKeysToCloud() {
      if (!this.user.token) return;
      this.isLoading = true;
      try {
        const keysToSave = this.keys.map(k => ({
            id: k.id, name: k.name, secret: k.secret, digits: k.digits, period: k.period, algorithm: k.algorithm
        }));
        const res = await fetch(`${this.workerUrl}/api/keys`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.user.token}` },
            body: JSON.stringify(keysToSave),
        });
        if (!res.ok) { const data = await res.json(); throw new Error(data.error || '同步失败'); }
      } catch (e) {
        this.showToast(`同步失败: ${e.message}`, true);
      } finally {
        this.isLoading = false;
      }
    },

    async loadKeysFromCloud() {
        if (!this.user.token) return;
        this.isLoading = true;
        try {
            const res = await fetch(`${this.workerUrl}/api/keys`, {
                headers: { 'Authorization': `Bearer ${this.user.token}` }
            });
            if (res.status === 401) { this.logout(); this.showToast("会话已过期，请重新登录。", true); return; }
            if (!res.ok) { const data = await res.json(); throw new Error(data.error || '加载失败'); }
            const storedKeys = await res.json();
            if (storedKeys && Array.isArray(storedKeys)) {
                this.keys = storedKeys.map(key => ({
                    ...key,
                    id: key.id || generateUUID(),
                    token: '', updatingIn: 0, isEditingName: false, editingNameValue: key.name || '',
                }));
            }
        } catch (e) {
            this.showToast(`加载失败: ${e.message}`, true);
            this.keys = [];
        } finally {
            this.isLoading = false;
        }
    },
    
    copyToken(token) {
        if (!token || isNaN(parseInt(token))) {
            this.showToast('无效验证码，无法复制', true);
            return;
        }
        navigator.clipboard.writeText(token).then(() => {
            this.showToast(`验证码 "${token}" 已复制!`);
        }).catch(err => {
            this.showToast('复制失败!', true);
        });
    },
    showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = message;
        toast.style.backgroundColor = isError ? 'var(--danger-color)' : 'var(--secondary-color)';
        toast.classList.add('show');
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
          toast.classList.remove('show');
        }, 3000);
      }
    },
  }
});
app.mount('#app');
