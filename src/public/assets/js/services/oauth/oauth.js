const oauth = {
  methods: {
    async saveOAuthConfig() {
      switch (this.imapConfig.provider) {
        case "google": return await this.google_saveConfig();
        case "outlook": return await this.msft_saveConfig();
        default: return null;
      }
    },
    async loadOAuthConfig() {
      switch (this.imapConfig.provider) {
        case "google": return await this.google_loadConfig();
        case "outlook": return await this.msft_loadConfig();
        default: return null;
      }
    },
    async checkOAuthTokens() {
      switch (this.imapConfig.provider) {
        case "google": return await this.google_checkTokens();
        case "outlook": return await this.msft_checkTokens();
        default: return null;
      }
    },
    async forceOAuthRefresh() {
      switch (this.imapConfig.provider) {
        case "google": return await this.google_forceRefresh();
        case "outlook": return await this.msft_forceRefresh();
        default: return null;
      }
    },
  }
}
