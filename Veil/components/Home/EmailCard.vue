<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import { nextTick } from 'vue'
import Icon from "@Veil/components/Base/Icon.vue"
import { infoContent } from '@Veil/state/sections'
import { scribeVoiceBrowser, scribeVoiceState, ScribeVoiceState } from '@Veil/utils/whisper/whisper'
import scribe from "@Veil/utils/scribe"
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
import Logger from "@Veil/services/roots"
const Log = new Logger("EmailCard", {
  bgColor: "#ff99ff",
  fgColor: "#000000",
})

const props = defineProps<{
  email?: {
    sender: string
    subject: string
    preview: string
    date: string
    attachments: any[]
    threadCount: number
    bcc: boolean
    tracker: boolean
    event: boolean
  }
  demo?: boolean
}>()

// Information variables for 'EmailCard' component
const infoThreadCount = i18n(RosettaStone.boards.email_cards.thread)
const infoAttachment = i18n(RosettaStone.boards.email_cards.has_attachments)
const infoBCC = i18n(RosettaStone.boards.email_cards.bccd)
const infoTracker = i18n(RosettaStone.boards.email_cards.info_tracker)
const infoEvent = i18n(RosettaStone.boards.email_cards.contains_event)
const infoQuickReply = i18n(RosettaStone.boards.email_cards.info_quick_reply)

const infoReply = i18n(RosettaStone.boards.email_cards.reply)
const infoReplyAll = i18n(RosettaStone.boards.email_cards.reply_all)
const infoForward = i18n(RosettaStone.boards.email_cards.forward)
const infoStar = i18n(RosettaStone.boards.email_cards.star)
const infoTrash = i18n(RosettaStone.boards.email_cards.trash)
const infoScribe = i18n(RosettaStone.boards.email_cards.generate_info)
const infoSend = i18n(RosettaStone.boards.email_cards.click_to_send)

let isThinking = ref(false)

const quickReply = ref<HTMLDivElement | null>(null)
const isQuickReplyOpen = ref(props.demo)
const showQuickReply = () => {
  Log.info("Opening quick reply...")
  isQuickReplyOpen.value = true
  nextTick(() => {
    if (quickReply.value) quickReply.value.focus()
  })
}
const savedQuickReply = ref('')
const quickReplyText = ref('')
let stopQuickReplyHide = false
const hideQuickReply = () => {
  Log.info("Closing quick reply...")
  nextTick(() => {
    nextTick(() => {
      setTimeout(() => {
        if (stopQuickReplyHide) return;
        isQuickReplyOpen.value = false
        savedQuickReply.value = quickReplyText.value
      }, 200)
    })
  })
}

const typeQuickReply = (event: Event) => {
  quickReplyText.value = (event.target as HTMLInputElement).innerHTML
}

const quickReplyScribe = async () => {
  stopQuickReplyHide = true
  Log.log("Running scribe...")
  isThinking.value = true
  const prompt = quickReplyText.value
  Log.info("Prompt:", prompt)
  quickReplyText.value = (await scribe(prompt, props.email!.preview))?.replace(/\n/gim, "<br>") ?? prompt
  Log.success("Generated email.")
  if (quickReply.value) quickReply.value.innerHTML = quickReplyText.value
  isThinking.value = false
  if (quickReply.value) quickReply.value.focus()
  nextTick(() => stopQuickReplyHide = false)
}

const quickReplyScribeVoice = async () => {
  stopQuickReplyHide = true
  Log.log("Listening...")
  const prompt = await scribeVoiceBrowser()
  Log.log("Running scribe...")
  isThinking.value = true
  savedQuickReply.value = prompt
  scribeVoiceState.value = ScribeVoiceState.Generating
  Log.info("Prompt:", prompt)
  quickReplyText.value = (await scribe(prompt, props.email!.preview, props.email!.sender))?.replace(/\n/gim, "<br>") ?? prompt
  Log.success("Generated email.")
  if (quickReply.value) quickReply.value.innerHTML = quickReplyText.value
  isThinking.value = false
  scribeVoiceState.value = ScribeVoiceState.Hidden
  if (quickReply.value) quickReply.value.focus()
  nextTick(() => stopQuickReplyHide = false)
}
</script>

<template>
  <div v-if="email" :class="{
      'qr': isQuickReplyOpen,
      'email-card': true,
      'democard': demo,
      'unread': true,
      'starred': false,
      'selected': false,
    }">
    <div class="row">
      <div class="col-9 p0 sender">
        {{ email.sender }}
        <div v-if="email.threadCount > 1" class="thread-count" @mouseover="infoContent = infoThreadCount"
          @mouseleave="infoContent = ''">
          <Icon name="thread" color="normal" />
          <span>{{ email.threadCount }}</span>
        </div>
        <div v-if="email.attachments.length > 0" class="attachment" @mouseover="infoContent = infoAttachment"
          @mouseleave="infoContent = ''">
          <Icon name="attachment" color="normal" />
        </div>
        <div v-if="email.bcc" class="bcc" @mouseover="infoContent = infoBCC" @mouseleave="infoContent = ''">
          <Icon name="bcc" color="normal" />
        </div>
        <div v-if="email.tracker" class="tracker" @mouseover="infoContent = infoTracker" @mouseleave="infoContent = ''">
          <Icon name="tracker" color="normal" />
        </div>
        <div v-if="email.event" class="event" @mouseover="infoContent = infoEvent" @mouseleave="infoContent = ''">
          <Icon name="calendar" color="normal" />
        </div>
      </div>
      <div class="col-3 p0 date">
        {{ email.date }}
      </div>
    </div>
    <div class="subject">
      {{ email.subject }}
    </div>
    <div :class="{
      'preview': true,
      'long': isQuickReplyOpen
    }">
      {{ email.preview }}
    </div>
    <div class="quick-reply">
      <div v-html="savedQuickReply" ref="quickReply" @blur="hideQuickReply" contenteditable="true" :class="{
        textarea: true,
        fadeInOut: isThinking,
      }" @input="typeQuickReply" :placeholder="i18n(RosettaStone.boards.email_cards.scribe_placeholder)">
      </div>

      <div class="scribe" @click.stop.prevent="quickReplyScribe" @mouseover="infoContent = infoScribe"
        @mouseleave="infoContent = ''">
        <Icon name="scribe" color="white" /> <span class="label">{{
          i18n(RosettaStone.boards.email_cards.generate)
        }}</span>
      </div>

      <div v-if="demo" class="send" @click.stop="quickReplyScribeVoice" @mouseover="infoContent = infoSend"
        @mouseleave="infoContent = ''">
        <Icon name="microphone" color="normal" /> <span class="label">{{
          i18n(RosettaStone.boards.email_cards.voice)
        }}</span>
      </div>

      <div v-if="!demo" class="send" @click.stop="Log.log('send email')" @mouseover="infoContent = infoSend"
        @mouseleave="infoContent = ''">
        <Icon name="sent" color="normal" /> <span class="label">{{ i18n(RosettaStone.boards.email_cards.send) }}</span>
      </div>
    </div>
    <div class="bottom">
      <div class="quick-action">


        <!--QUICK ACTIONS BUTTONS-->
        <!--QUICK REPLY-->
        <span @click.stop.prevent="showQuickReply" tabindex="0" v-if="true" @mouseover="infoContent = infoQuickReply"
          @mouseleave="infoContent = ''">
          <Icon name="zap" color="normal" />
          <div class="text bodycolor" :htext="i18n(RosettaStone.boards.email_cards.quick_reply)">{{
            i18n(RosettaStone.boards.email_cards.quick_reply)
          }}</div>
        </span>

        <!--OPEN SPECIFIC APP, REPLACE APP BY APP NAME-->
        <span v-if="false">
          <Icon name="link" color="blue" />
          <div class="text primarycolor" :htext="i18n(RosettaStone.boards.email_cards.copy_code) + 'App'">{{
            i18n(RosettaStone.boards.email_cards.open_app)
          }} App</div>
        </span>

        <!--COPY CODE-->
        <span v-if="false">
          <Icon name="copy" color="blue" />
          <div class="text primarycolor" htext="Copy Code">{{ i18n(RosettaStone.boards.email_cards.copy_code) }}</div>
        </span>

        <!--SCHEDULE-->
        <span v-if="false">
          <Icon name="calendar" color="blue" />
          <div class="text primarycolor" htext="Schedule">{{ i18n(RosettaStone.boards.email_cards.schedule) }}</div>
        </span>
      </div>
      <div class="actions">
        <span @mouseover="infoContent = infoReply" @mouseleave="infoContent = ''">
          <Icon name="reply" color="normal" />
        </span>
        <span @mouseover="infoContent = infoReplyAll" @mouseleave="infoContent = ''">
          <Icon name="reply-all" color="normal" />
        </span>
        <span @mouseover="infoContent = infoForward" @mouseleave="infoContent = ''">
          <Icon name="forward" color="normal" />
        </span>
        <span @mouseover="infoContent = infoStar" @mouseleave="infoContent = ''">
          <Icon name="star" color="normal" />
          <Icon name="starred" color="normal" v-if="false" />
        </span>
        <span @mouseover="infoContent = infoTrash" @mouseleave="infoContent = ''">
          <Icon name="trash" color="normal" />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.email-card {
  position: relative;
  background: #fff;
  border-radius: 5px;
  user-select: none;
  margin-bottom: 15px;
  width: 100%;
  background: var(--secondary-background-color);
  padding: 6px 6px 0 6px;
  overflow: hidden;
  font-size: var(--body-font-size);
  contain: layout;
  transition: .2s;
  cursor: pointer;
}

.selected {
  border: 2px solid var(--primary-color);
  padding: 4px 4px 0 6px !important;
  transition: .2s;
}

.unread {
  border-left: 3px solid var(--primary-color);
  padding: 6px 6px 0 6px;
  transition: .2s;
}

.starred {
  border-left: 3px solid #ffbf07;
  padding: 8px 10px 0 7px;
  transition: .2s;
}

.email-card:hover {
  filter: brightness(1.2);
  box-shadow: none;
  transition: .2s;
}

.email-card .top {
  display: inline-flex;
}

.email-card .sender {
  color: var(--primary-font-color);
  font-size: 14px;
  white-space: nowrap;
  line-height: 20px;
  text-overflow: ellipsis;
  overflow: hidden;
  text-align: left;
  margin-bottom: 0;
  letter-spacing: .4px;
  font-weight: 500;
  user-select: none;
  display: inline-flex;
}

.medium .label {
  display: none;
}

.email-card .date {
  color: var(--primary-font-color);
  font-size: 13px;
  text-align: right;
  font-weight: 500;
  white-space: nowrap;
}

.email-card .preview {
  color: var(--primary-font-color);
  font-size: var(--small-font-size);
  filter: brightness(0.8);
  height: 33px;
  overflow: hidden;
  line-height: 16px;
  margin-bottom: 3px;
  text-overflow: ellipsis;
  letter-spacing: .1px;
  width: 100%;
  transition: .2s;
}



.email-card .subject {
  font-size: 14px;
  margin-bottom: 2px;
  font-weight: 600;
  height: 20px;
  overflow: hidden;
  width: 100%;
  text-overflow: ellipsis;
  margin-top: -1px;
  white-space: nowrap;
  letter-spacing: .4px;
  color: var(--strong-font-color);
}

.email-card .bottom {
  box-shadow: var(--email-bottom-shadow);
  user-select: none;
  display: flex;
  width: calc(100% + 20px);
  height: 27px;
  margin-left: -10px;
  border-radius: 0 0 5px 5px;
  padding: 0 10px;
  margin-top: 2px;
}

.email-card .bottom .quick-action span {
  color: var(--primary-font-color);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .1px;
  line-height: 28px;
  white-space: nowrap;
  text-transform: uppercase;
  width: 140px;
  display: inline-block;
  height: 30px;
  padding: 0;
  overflow: hidden;
  opacity: .9;
  text-overflow: ellipsis;
}

.email-card .bottom .quick-action span img {
  height: 15px;
  margin-top: 6px !important;
  margin-right: 3px !important;
}

.email-card .quick-reply {
  box-shadow: var(--email-bottom-shadow);
  user-select: none;
  width: 100%;
  display: none;
  min-height: 27px;
  margin-left: -10px;
  border-radius: 0 0 5px 5px;
  padding: 0 10px;
  margin-top: 2px;
  background: var(--primary-background-color);
  border: 2px solid var(--secondary-background-color);
  position: relative;
  bottom: 0;
  z-index: 1;
}

.email-card.unread .quick-reply {
  width: calc(100% + 3px);
}

.email-card.starred .quick-reply {
  width: calc(100% + 3px);
}

.email-card.selected .quick-reply {
  width: calc(100% + 4px);
}

.medium .email-card.qr .quick-reply {
  width: calc(100% + 20px);
  min-height: 129px;
}

.qr.email-card {
  padding: 6px 6px 20px 6px !important;
}

.email-card .quick-reply .textarea {
  background: transparent;
  width: 100%;
  resize: none;
  min-height: 62px;
  cursor: text !important;
  padding-bottom: 2px;
  border: none;
  padding: 6px 0 12px 0;
  outline: none;
  display: inline-block;
  color: var(--strong-font-color);
  border-radius: none;
  border-bottom-left-radius: var(--primary-border-radius);
}

.email-card .send {
  display: inline;
  background: var(--p-opaque);
  width: calc(50% + 3px);
  padding: 4px 6px !important;
  height: 30px;
  position: absolute;
  right: 0;
  bottom: 0;
  margin-right: -1px;
  margin-bottom: -1px;
  border-bottom-right-radius: var(--primary-border-radius);
  transition: .2s;
  font-weight: 500;
  text-align: center;
  position: absolute;
  margin-bottom: -23px;
  color: var(--primary-font-color);
  margin-right: -2px;
  padding: 0 6px;
  transition: .2s;
}

.democard {
  margin-bottom: 22px;
}

.email-card .voice {
  width: 30px;
  display: inline;
  background: unset;
  padding: 6px;
  height: 30px;
  position: absolute;
  right: 0;
  bottom: 0;
  margin-bottom: -23px;
  color: var(--primary-font-color);
  margin-right: -2px;
  padding: 0 6px;
  transition: .2s;
}

.email-card .scribe {
  display: inline;
  padding: 4px 6px;
  text-align: center;
  height: 30px;
  font-weight: 500;
  color: #fff;
  background: var(--primary-color);
  width: calc(50% + 3px);
  bottom: 0;
  left: 0;
  border-bottom-left-radius: var(--primary-border-radius);
  position: absolute;
  margin-bottom: -23px;
  margin-left: -2px;
  transition: .2s;
}

.email-card .send img {
  width: 17px;
  margin-right: 2px;
  position: relative;
  margin-top: -2px;
}

.email-card .scribe img {
  width: 17px;
  margin-right: 2px;
  position: relative;
  margin-top: -2px;
}

.email-card.qr .quick-reply {
  display: inline-block;
  width: calc(100% + 20px);
}

.email-card .preview.long {
  overflow: scroll;
  height: fit-content;
  margin-bottom: 5px;
  max-height: 100px;
}

.email-card .send:hover {
  background: var(--s-opaque);
  transition: .2s;
}

.qr .bottom {
  display: none;
}

.email-card .actions {
  text-align: right;
  white-space: nowrap;
}

.email-card .actions span {
  padding: 3px;
  margin-left: 3px;
  margin-top: 4px;
  cursor: pointer;
}

.email-card:hover .actions span img {
  opacity: .5;
  transition: .2s;
}

.email-card .actions span img {
  margin-top: 1px;
  transition: .2s;
  opacity: 0;
  margin-top: 2px;
  height: 15px;
  transition: .2s;
}

.email-card .actions span img:hover {
  transition: .2s;
  opacity: .7;
}

.email-card .bottom .quick-action span {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  height: 27px;
  transition: .2s;
}

.text::before {
  content: attr(htext);
  position: absolute;
  filter: brightness(0.7);
  width: 0;
  overflow: hidden;
  transition: 0.6s;
}

.email-card .bottom .quick-action span::before {
  content: "";
  width: 0%;
  height: 100%;
  position: absolute;
  right: 0;
  top: 0;
  transition: 0.6s;
}

.email-card .bottom .quick-action span:hover img {
  opacity: .7;
  transition: .2s;
}

.email-card .bottom .quick-action span img {
  opacity: .5;
  transition: .2s;
}

.email-card .bottom .quick-action span:hover .text::before,
.email-card .bottom .quick-action span:hover::before {
  width: 100%;
}

.email-card .row {
  width: 100%;
  margin-left: 0px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.thread-count span {
  height: 11px;
  border-radius: var(--primary-border-radius);
  position: relative;
  width: fit-content;
  color: var(--main-text-color);
  margin-left: -8px;
  font-size: 10px;
  padding: 0 0px 1px 1px;
  font-weight: 600;
  line-height: 10px;
  background: var(--p-opaque);
}


.bcc img {
  height: 15px;
  margin-left: 4px;
}

.event img,
.attachment img,
.tracker img,
.thread-count img {
  height: 16px;
  margin-left: 4px;
}

[contentEditable=true]:empty:before {
  content: attr(placeholder);
  opacity: 0.4;
}

.fadeInOut {
  opacity: 1;
  -webkit-animation: fade 2s linear forwards;
  animation: fade 2s linear forwards;
  animation-iteration-count: infinite;
}


@-webkit-keyframes fade {

  0%,
  100% {
    opacity: 0.2;
  }

  50% {
    opacity: 1;
  }
}

@keyframes fade {

  0%,
  100% {
    opacity: 0.2;
  }

  50% {
    opacity: 1;
  }
}
</style>
