import express from 'express'
const app = express()
app.use('/', express.static(__dirname + '/build/Veil'))
app.listen(3000)