const VueP = appname => {
    if (!!!appname) appname = 'my-app'
    const prefix = '@' + appname + '/'; let ignored = []
    if (localStorage['vuep:' + appname + '/ignore']) ignored = JSON.parse(localStorage.getItem('vuep:' + appname + '/ignored'))
    return {
        _ignored: [],
        ignore: async function(k) {
            this._ignored.push(k)
            localStorage.setItem('vuep:' + appname + '/ignore', JSON.stringify(this._ignored))
        },
        ignoreMany: async function(...ks) {
            ks.map(k => this._ignored.push(k))
            localStorage.setItem('vuep:' + appname + '/ignore', JSON.stringify(this._ignored))
        },
        clear: async () => {
            await Promise.all(
                Object.keys(localStorage).map(async k =>
                    k.startsWith(prefix) ? localStorage.removeItem(k) : null)
            )
            console.log("[VueP]", prefix, "Cleared application.")
        },
        save: async function(app) {
            await Promise.all(
                Object.keys(app._data).map(async k => this._ignored.includes(k) ? null :
                    localStorage.setItem(prefix + k, JSON.stringify(app[k])))
            )
            console.log("[VueP]", prefix, "Saved application.")
        },
        load: async function(app) {
            await Promise.all(
                Object.keys(localStorage).map(async k => k.startsWith(prefix) && !this._ignored.includes(k.substr(prefix.length)) ?
                    (app[k.substr(prefix.length)] = JSON.parse(localStorage[k])) : null)
            )
            console.log("[VueP]", prefix, "Loaded application.")
        }
    }
}