// Helper functions
function getCurrentSeconds() { return Math.round(new Date().getTime() / 1000.0); }
function stripSpaces(str) { if (typeof str !== 'string') return ''; return str.replace(/\s/g, ''); }
function truncateTo(str, digits) { if (typeof str !== 'string') str = String(str); if (str.length <= digits) { return str; } return str.slice(-digits); }
function generateUUID() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }

const app = Vue.createApp({
  data() {
    return {
      workerUrl: '[https://multi-user-totp-api.your-username.workers.dev](https://multi-user-totp-api.your-username.workers.dev)', // <-- REPLACE THIS
      
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
    if (this.workerUrl.includes('your-username.workers.dev')) {
        this.showToast('请先在 app.js 文件中设置您的 Worker URL！', true);
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
      if (!currentInput.trim()) { return; }

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
        this.keys.splice(index, 1);
        await this.saveKeysToCloud();
        this.showToast(`密钥已删除。`);
    },
    async clearAllKeysWithConfirmation() {
        if (window.confirm("确定要清空所有密钥吗？")) {
            this.keys = [];
            await this.saveKeysToCloud();
            this.showToast("所有密钥已清空。");
        }
    },
    showQrCode(keyEntry) { /* Logic Unchanged */ },
    closeQrModal() { /* Logic Unchanged */ },

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
    
    copyToken(token) { /* Logic Unchanged */ },
    showToast(message, isError = false) { /* Logic Unchanged */ },
  }
});

// Full implementation of "unchanged" methods can be found in the immersive artifact
app.mount('#app');
