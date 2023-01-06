<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import Icon from "@Veil/components/Base/Icon.vue"
import { infoContent } from '@Veil/state/sections'
import scribe from "@Veil/utils/scribe"

// Information variables for 'EmailCard' component
const infoThreadCount = 'Number of emails in this thread'
const infoAttachment = 'This email has attachment(s)'
const infoBCC = 'You were BCC ed'
const infoTracker = 'One or more trackers blocked from tracking you'
const infoEvent = 'Email contains an event'
const infoQuickReply = 'Reply to this email right from the homescreen'

const infoReply = 'Reply to this email'
const infoReplyAll = 'Reply to all participants in this email'
const infoForward = 'Forward this email'
const infoStar = 'Star this email'
const infoTrash = 'Move this email to the trash'

let isThinking = ref(false)

const showQuickReply = ref(false)
const quickReplyText = ref('')
const quickReply = ref<HTMLDivElement | null>(null)

const typeQuickReply = (event: Event) => {
  quickReplyText.value = (event.target as HTMLInputElement).innerHTML
}

const quickReplyScribe = async () => {
  isThinking.value = true
  quickReplyText.value = (await scribe(quickReplyText.value))?.replace(/\n/gim, "<br>") ?? quickReplyText.value
  if (quickReply.value) quickReply.value.innerHTML = quickReplyText.value
  isThinking.value = false
}
</script>

<template>
  <div :class="{
    'qr': showQuickReply,
    'email-card': true,
    'unread': true,
    'starred': false,
    'selected': false,
  }">
    <div class="row">
      <div class="col-8 p0 sender">
        Sender
        <div class="thread-count" @mouseover="infoContent = infoThreadCount" @mouseleave="infoContent = ''">
          <Icon name="thread" color="normal" />
          <span>4</span>
        </div>
        <div class="attachment" @mouseover="infoContent = infoAttachment" @mouseleave="infoContent = ''">
          <Icon name="attachment" color="normal" />
        </div>
        <div class="bcc" @mouseover="infoContent = infoBCC" @mouseleave="infoContent = ''">
          <Icon name="bcc" color="normal" />
        </div>
        <div class="tracker" @mouseover="infoContent = infoTracker" @mouseleave="infoContent = ''">
          <Icon name="tracker" color="normal" />
        </div>
        <div class="event" @mouseover="infoContent = infoEvent" @mouseleave="infoContent = ''">
          <Icon name="calendar" color="normal" />
        </div>
      </div>
      <div class="col-4 p0 date">
        Time
      </div>
    </div>
    <div class="subject">
      Subject
    </div>
    <div class="preview">
      Hi this is a reminder that this is a preview, not the full email, but when you click on quick reply, you can
      actually see all of it and scroll through its very nice
    </div>
    <div class="quick-reply">
      <div ref="quickReply" contenteditable="true" :class="{
        textarea: true,
        fadeInOut: isThinking,
      }" @input="typeQuickReply" placeholder="Type a reply here and send it or click the brain button to generate"
        autofocus>
      </div>

      <div class="send scribe" title="Generate email" @click="quickReplyScribe">
        <Icon name="scribe" color="white" />
      </div>


      <div class="send" title="Send reply">
        <Icon name="sent" color="normal" />
      </div>
    </div>
    <div class="bottom">
      <div class="quick-action">


        <!--QUICK ACTIONS BUTTONS-->
        <!--QUICK REPLY-->
        <span @focus="showQuickReply = true" tabindex="0" v-if="true" @mouseover="infoContent = infoQuickReply"
          @mouseleave="infoContent = ''">
          <Icon name="zap" color="normal" />
          <div class="text bodycolor" htext="Quick Reply">Quick Reply</div>
        </span>

        <!--OPEN SPECIFIC APP, REPLACE APP BY APP NAME-->
        <span v-if="false">
          <Icon name="link" color="blue" />
          <div class="text primarycolor" htext="Open App">Open App</div>
        </span>

        <!--COPY CODE-->
        <span v-if="false">
          <Icon name="copy" color="blue" />
          <div class="text primarycolor" htext="Copy Code">Copy Code</div>
        </span>

        <!--SCHEDULE-->
        <span v-if="false">
          <Icon name="calendar" color="blue" />
          <div class="text primarycolor" htext="Schedule">Schedule</div>
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
  padding: 8px 10px 0 10px;
  overflow: hidden;
  font-size: var(--body-font-size);
  contain: layout;
  transition: .2s;
  cursor: pointer;
}

.selected {
  border: 2px solid var(--primary-color);
  padding: 6px 6px 0 8px !important;
  transition: .2s;
}

.unread {
  border-left: 3px solid var(--primary-color);
  padding: 8px 10px 0 7px;
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

.scribe {
  margin-bottom: 28px !important;
  right: 0;
  border-top-left-radius: var(--primary-border-radius) !important;
  border-bottom-right-radius: 0 !important;
  background-color: var(--primary-color) !important;
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

.email-card .quick-reply .textarea {
  background: transparent;
  width: calc(100% - 25px);
  resize: none;
  min-height: 60px;
  cursor: text !important;
  padding-bottom: 2px;
  border: none;
  padding: 10px 0;
  outline: none;
  display: inline-block;
  color: var(--strong-font-color);
  border-radius: none;
  border-bottom-left-radius: var(--primary-border-radius);
}

.qr.email-card .bottom {
  display: none;
}

.email-card .send {
  width: 30px;
  display: inline;
  background: var(--primary-background-color);
  border: 1px solid var(--secondary-background-color);
  padding: 5px;
  height: 30px;
  position: absolute;
  right: 0;
  bottom: 0;
  margin-right: -1px;
  margin-bottom: -1px;
  border-bottom-right-radius: var(--primary-border-radius);
  transition: .2s;
}

.email-card.qr .quick-reply {
  display: inline-block;
  width: calc(100% + 20px);
}

.email-card.qr .preview {
  overflow: scroll;
  height: fit-content;
  margin-bottom: 5px;
  max-height: 100px;
}

.email-card .send:hover {
  background: var(--primary-background-color-hover);
  transition: .2s;
}

.email-card .send img {
  width: 17px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
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
  opacity: 1;
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
  opacity: 1;
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
  background: var(--secondary-background-color);
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
