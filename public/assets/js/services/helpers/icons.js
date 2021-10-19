const ICONS_TAG = ['%c[ICONS]', 'background-color: #B00B1E; color: #000;']

const icon_mgr = {
  methods: {
    resolveIcon(path) {
      const icon = path.split("/").last()
      const def = window.Icons[icon]
      if (!def) return path;
      if (this.isDarkMode) return path.replace(icon, def.dark);
      return path.replace(icon, def.light);
    }
  }
}
