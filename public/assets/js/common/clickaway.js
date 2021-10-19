Vue.directive('clickaway', {
  bind (el, { value }) {
    if (typeof value !== 'function') {
      console.warn(`Expect a function, got ${value}`)
      return
    }

    document.addEventListener('click', e => el.contains(e.target) || value())
  }
})