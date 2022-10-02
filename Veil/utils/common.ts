// Custom functions
//! FIXME: these should all live on the component
import { ref } from '@vue/reactivity';

//! FIXME: this should be a utility and rely on Dwarfhaven
// Change Date format from mm/dd/yy to DDD MMM DD
export const prettyDate = (date: Date) => {
  return date.toString().slice(0, -47)
}


//* Possibly replace this with a function to detect the next dropping NFT?
//* PS: I think having control over what is featured is best, for example
//* consider the case where it's the day after a drop, we should continue
//* to show the previous drop for some amount of time (let customer decide.)
//* Also, we want to prevent revealing NFTs until they're ready to go.

export const isLaunched = (date: Date) => date < new Date()

export let gridView = ref(true)
export const toggleView = () => gridView.value = !(gridView.value)

//! FIXME: AUTHENTICATION FOR DEMO PURPOSE
export let authed = ref(false)
export const toggleAuth = () => authed.value = !(authed.value)