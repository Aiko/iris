const chokidar = require('chokidar')
const child_process = require('child_process')

const reload = () => child_process.execSync('ts-node ./Veil/utils/rosetta/compile.ts')

// One-liner for current directory
chokidar.watch('./Veil/utils/rosetta').on('all', (_, path) => {
  if (!(path.endsWith('compile.ts') || path.endsWith('.yml'))) return
  //? run node script
  reload()
  console.log("Hot reloading Rosetta config:", path)
})