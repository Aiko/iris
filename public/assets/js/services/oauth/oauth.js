const oauth = {
  methods: {
    async saveOAuthConfig() {
      const config = this.imapConfig || this.smtpConfig
      switch (config.provider) {
        case "google": return await this.google_saveConfig();
        case "microsoft": return await this.msft_saveConfig();
        default: return null;
      }
    },
    async loadOAuthConfig() {
      const config = this.imapConfig || this.smtpConfig
      switch (config.provider) {
        case "google": return await this.google_loadConfig();
        case "microsoft": return await this.msft_loadConfig();
        default: return null;
      }
    },
    async checkOAuthTokens() {
      const config = this.imapConfig || this.smtpConfig
      switch (config.provider) {
        case "google": return await this.google_checkTokens();
        case "microsoft": return await this.msft_checkTokens();
        default: return null;
      }
    },
    async forceOAuthRefresh() {
      const config = this.imapConfig || this.smtpConfig
      switch (config.provider) {
        case "google": return await this.google_forceRefresh();
        case "microsoft": return await this.msft_forceRefresh();
        default: return null;
      }
    },
  }
}
