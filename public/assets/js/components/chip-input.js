/*
  Props:

  * v-model="some_list"

  * autocomplete="function_returns_results_given_term"
  Suggestions should be objects with as many properties as you wish,
  but MUST contain a 'value' key that will be used as the chip value

  * <div @blur="unfocus" @keydown.delete="pressDelete"
  *  @keydown.enter="completeChipWithSuggest" @keydown.tab="completeChipWithSuggest"
  *  @keydown.space="completeChip" @keydown.comma="completeChip"
  *  @keydown.left="pressLeft" @keydown.right="pressRight">
  The enclosing div should have the key bindings.

  * <input v-model="term" ref="termInput" @click="unfocus" :style="activeChip > -1 ? 'caret-color: transparent' : ''">
  The above will allow for some UI changes to reflect the selected token status.
*/

Vue.config.keyCodes.comma = 188

Vue.component('chip-input', {
  props: [ 'autocomplete', 'value'],
  data() {
    return {
      term: '',
      activeChip: -1,
      focused: true,
      suggestions: [],
      height: 0,
      activeSuggestion: -1,
      engine: this.$root.engine || this.$root.composerEngine
    }
  },
  watch: {
    async term(is, was) {
      if (this.activeChip > -1) this.term = was
      let suggestions = []
      if (this.focused) {
        if (is) suggestions = await this.engine.contacts.lookup(this.term)
        else suggestions = []
      } else suggestions = []
      this.suggestions = JSON.parse(JSON.stringify(suggestions))
      this.activeSuggestion = -1
      this.height = $(this.$el).height() + this.$el.offsetTop
    },
    async focused() {
      let suggestions = []
      if (this.term) suggestions = await this.engine.contacts.lookup(this.term)
      else suggestions = []
      this.suggestions = JSON.parse(JSON.stringify(suggestions))
      this.activeSuggestion = -1
      this.height = $(this.$el).height() + this.$el.offsetTop
    },
    async activeChip() {
      if (this.activeChip < 0) this.focused = true
    }
  },
  methods: {
    deleteChip(i) {
      this.value.splice(i, 1)
      app?.calculateComposerHeight()
    },
    checkEmail() {
      return /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/gim.test(this.term)
    },
    completeChip(e) {
      if (e.keyCode == 32 && !this.checkEmail()) return;
      e?.preventDefault();
      if (this.activeChip > -1) return;
      if (this.term) {
        this.value.push({
          value: this.term
        })
        this.term = ''
      }
      app?.calculateComposerHeight()
    },
    completeChipWithSuggest(e) {
      if (this.activeChip > -1) return;
      if (!this.term && this.activeSuggestion < 0) return;
      e?.preventDefault();
      if (this.activeSuggestion < 0 && this.suggestions.length > 0 && e?.keyCode == 9) this.activeSuggestion = 0
      if (this.activeSuggestion > -1) {
        this.value.push({
          value: this.suggestions[this.activeSuggestion].email,
          display: this.suggestions[this.activeSuggestion].name
        })
        this.term = ''
        app?.calculateComposerHeight()
        return;
      }
      this.completeChip()
    },
    pressDelete(e) {
      const { which } = e
      if (this.activeChip > -1) {
        e?.preventDefault();
        // if there is a chosen chip delete it
        this.deleteChip(this.activeChip)
        // decrements activechip so its still a chip (or nothing if there are no more chips)
        if(!this.value?.[this.activeChip]) this.activeChip--;
      } else if (which == 8) {
        // if press backspace while in the input field
        if (!this.term && this.value.length > 0) {
          e?.preventDefault();
          // and there is nothing typed and there are existing chips
          // delete the previous chip
          this.deleteChip(this.value.length - 1)
          // decrements activechip so its still a chip (or nothing if there are no more chips)
          if(!this.value?.[this.activeChip]) this.activeChip--;
        }
      }
      app?.calculateComposerHeight()
    },
    pressLeft(e) {
      // only works if there is no cursor or it is at the beginning of the term
      if (this.$refs.termInput?.selectionStart != 0) return;
      e?.preventDefault();
      if (this.activeChip < 0) {
        // if there is nothing selected then select the rightmost chip
        // (will be left of the cursor)
        this.activeChip = this.value.length - 1
      } else if (this.activeChip > 0) {
        // if there is something selected and it's not the leftmost chip
        // then select the previous chip (will be left of the cursor)
        this.activeChip--;
      }
      app?.calculateComposerHeight()
    },
    pressRight(e) {
      if (this.activeChip == this.value.length - 1) {
        e?.preventDefault();
        // if the rightmost chip is selected then focus the input
        // (will be right of the cursor)
        this.activeChip = -1
      } else if (this.activeChip > -1) {
        e?.preventDefault();
        // otherwise if there is something else selected
        // then select the next chip (will be right of the cursor)
        this.activeChip++;
      }
      app?.calculateComposerHeight()
    },
    pressDown(e) {
      e.preventDefault();
      if (this.suggestions?.length > 0 && this.activeSuggestion < this.suggestions.length - 1) this.activeSuggestion++;
      app?.calculateComposerHeight()
    },
    pressUp(e) {
      e.preventDefault();
      if (this.suggestions?.length > 0 && this.activeSuggestion > -1) this.activeSuggestion--;
      app?.calculateComposerHeight()
    },
    async unfocus(all=false) {
      await Vue.nextTick()
      this.activeChip = -1
      this.focused = !all
      if (!this.focused) this.activeSuggestion = -1
      app?.calculateComposerHeight()
    }
  },
})