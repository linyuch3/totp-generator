// Helper functions
function getCurrentSeconds() {
  return Math.round(new Date().getTime() / 1000.0);
}

function stripSpaces(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\s/g, '');
}

function truncateTo(str, digits) {
  if (typeof str !== 'string') str = String(str);
  if (str.length <= digits) {
    return str;
  }
  return str.slice(-digits);
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const app = Vue.createApp({
  data() {
    return {
      // API and Auth config
      workerUrl: '[https://multi-user-totp-api.your-username.workers.dev](https://multi-user-totp-api.your-username.workers.dev)', // <-- REPLACE THIS WITH YOUR WORKER URL
      user: {
        loggedIn: false,
        name: '',
        token: null,
      },
      auth: {
        mode: 'login', // 'login' or 'register'
        username: '',
        loading: false,
      },
      
      // App state
      keys: [], 
      batchSecretsInput: '', 
      batchDefaultSettings: { 
        digits: 6,
        period: 30,
      },
      intervalHandle: null,
      toastTimeout: null,
      isQrModalActive: false, 
      qrCodeKeyName: '', 
      isLoading: false,
    };
  },

  mounted: function () {
    // Check if a session token exists in localStorage
    const sessionToken = localStorage.getItem('userSessionToken');
    const username = localStorage.getItem('username');
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
        if (!this.auth.username.trim()) {
            this.showToast('请输入用户名', true);
            return;
        }
        this.auth.loading = true;
        try {
            // 1. Get registration options from server
            let regOptionsRes = await fetch(`${this.workerUrl}/register/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.auth.username }),
            });
            if (!regOptionsRes.ok) throw new Error(await regOptionsRes.text());
            
            const options = await regOptionsRes.json();
            
            // 2. Use browser to create credential
            const credential = await SimpleWebAuthnBrowser.startRegistration(options);
            
            // 3. Send credential to server for verification
            let verificationRes = await fetch(`${this.workerUrl}/register/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.auth.username, response: credential }),
            });
            if (!verificationRes.ok) throw new Error(await verificationRes.text());

            const verificationJSON = await verificationRes.json();
            if (verificationJSON && verificationJSON.verified) {
                this.showToast('注册成功！请使用 Passkey 登录。');
                this.auth.mode = 'login';
            } else {
                throw new Error('注册验证失败。');
            }
        } catch (error) {
            this.showToast(`注册失败: ${error.message}`, true);
            console.error(error);
        } finally {
            this.auth.loading = false;
        }
    },

    async login() {
        if (!this.auth.username.trim()) {
            this.showToast('请输入用户名', true);
            return;
        }
        this.auth.loading = true;
        try {
            // 1. Get login options from server
            const loginOptionsRes = await fetch(`${this.workerUrl}/login/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.auth.username }),
            });
            if (!loginOptionsRes.ok) throw new Error(await loginOptionsRes.text());
            
            const options = await loginOptionsRes.json();
            
            // 2. Use browser to get assertion
            const assertion = await SimpleWebAuthnBrowser.startAuthentication(options);

            // 3. Send assertion to server for verification
            const verificationRes = await fetch(`${this.workerUrl}/login/finish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: this.auth.username, response: assertion }),
            });

            if (!verificationRes.ok) throw new Error(await verificationRes.text());

            const verificationJSON = await verificationRes.json();
            if (verificationJSON && verificationJSON.verified && verificationJSON.token) {
                this.user.loggedIn = true;
                this.user.name = this.auth.username;
                this.user.token = verificationJSON.token;
                localStorage.setItem('userSessionToken', this.user.token);
                localStorage.setItem('username', this.user.name);
                this.showToast(`欢迎, ${this.user.name}!`);
                await this.loadKeysFromCloud();
            } else {
                 throw new Error('登录验证失败。');
            }
        } catch (error) {
            this.showToast(`登录失败: ${error.message}`, true);
            console.error(error);
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

    // --- Core App Methods (Now Async and using fetch) ---
    updateAllTokens() {
        // This remains a client-side only operation, no need to change
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
      // This method now adds keys to the local array and then calls saveKeysToCloud
      const currentInput = this.batchSecretsInput; 
      if (!currentInput.trim()) { return; }

      const lines = currentInput.split('\n');
      let addedCount = 0, failedCount = 0;
      let newKeysToAdd = [];

      lines.forEach((line, index) => {
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

    showQrCode(keyEntry) { /* This method remains the same */ },
    closeQrModal() { /* This method remains the same */ },

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
        if (!res.ok) throw new Error(await res.text());
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
            if (!res.ok) throw new Error(await res.text());
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
    
    copyToken(token) { /* This method remains the same */ },
    showToast(message, isError = false) { /* This method remains the same */ },
  }
});

app.mount('#app');
