function getCurrentSeconds() {
  return Math.round(new Date().getTime() / 1000.0);
}

function stripSpaces(str) {
  return str.replace(/\s/g, '');
}

function truncateTo(str, digits) {
  if (str.length <= digits) {
    return str;
  }

  return str.slice(-digits);
}

function parseURLSearch(search) {
  const queryParams = search.substr(1).split('&').reduce(function (q, query) {
    const chunks = query.split('=');
    const key = chunks[0];
    let value = decodeURIComponent(chunks[1]);
    value = isNaN(Number(value)) ? value : Number(value);
    return (q[key] = value, q);
  }, {});

  return queryParams;
}

const app = Vue.createApp({
  data() {
    return {
      secret_key: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
      updatingIn: 30,
      token: null,
      clipboardButton: null,
      history: []
    };
  },

  mounted: function () {
    this.getKeyFromUrl();
    this.getQueryParameters();
    this.loadHistory();
    this.update();

    this.intervalHandle = setInterval(this.update, 1000);

    this.clipboardButton = new ClipboardJS('#clipboard-button');
  },

  destroyed: function () {
    clearInterval(this.intervalHandle);
  },

  computed: {
    totp: function () {
      return new OTPAuth.TOTP({
        algorithm: this.algorithm,
        digits: this.digits,
        period: this.period,
        secret: OTPAuth.Secret.fromBase32(stripSpaces(this.secret_key)),
      });
    }
  },

  methods: {
    update: function () {
      this.updatingIn = this.period - (getCurrentSeconds() % this.period);
      this.token = truncateTo(this.totp.generate(), this.digits);
    },

    getKeyFromUrl: function () {
      const key = document.location.hash.replace(/[#\/]+/, '');

      if (key.length > 0) {
        this.secret_key = key;
      }
    },
    getQueryParameters: function () {
      const queryParams = parseURLSearch(window.location.search);

      if (queryParams.key) {
        this.secret_key = queryParams.key;
      }

      if (queryParams.digits) {
        this.digits = queryParams.digits;
      }

      if (queryParams.period) {
        this.period = queryParams.period;
      }

      if (queryParams.algorithm) {
        this.algorithm = queryParams.algorithm;
      }
    },
    generateQRCode: function () {
      const qrcodeContainer = document.getElementById("qrcode");
      qrcodeContainer.innerHTML = ""; // 清空之前的二维码
      new QRCode(qrcodeContainer, {
        text: this.secret_key,
        width: 128,
        height: 128
      });
    },
    saveToHistory: function () {
      if (this.secret_key && !this.history.includes(this.secret_key)) {
        this.history.push(this.secret_key);
        localStorage.setItem('totp_history', JSON.stringify(this.history));
      }
    },
    loadHistory: function () {
      const history = localStorage.getItem('totp_history');
      if (history) {
        this.history = JSON.parse(history);
      }
    }
  },
  watch: {
    secret_key(newVal) {
      this.saveToHistory();
    }
  }
});

app.mount('#app');
