const fs = require('fs')

module.exports = fp => {return {
    data: {
        authenticated: false
    },
    load: () => {
        const s = fs.readFileSync(fp)
        const d = JSON.parse(s)
        return d
    },
    save: d => {
        const s = JSON.stringify(d)
        fs.writeFileSync(fp, s)
    }
}}