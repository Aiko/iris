<script lang="ts" setup>
import { ref } from '@vue/reactivity';
let quickReply = ref(false)
</script>

<template>
  <div :class="{
    'qr': quickReply,
    'email-card': true,
  }">
    <div class="row">
      <div class="col-8 p0 sender">
        Ruben Touitou from Aiko Mail
      </div>
      <div class="col-4 p0 date">
        9:36PM
      </div>
    </div>
    <div class="subject">
      Meeting request from rubentouitou.com
    </div>
    <div class="preview">
      Hi this is a reminder that this is a preview, not the full email, but when you click on quick reply, you can
      actually see all of it and scroll through its very nice
    </div>
    <div class="quick-reply">
      <input placeholder="Type reply here" @focusout="quickReply = false" autofocus />
      <div class="send" title="Send reply" @click="quickReply = false">
        <img src="@Veil/assets/icons/Home/sent.svg" />
      </div>
    </div>
    <div class="bottom">
      <div class="quick-action">


        <span @focus="quickReply = true" tabindex="0"><img src="@Veil/assets/icons/Home/zap.svg" />
          <div class="text" htext="Quick Reply">Quick Reply</div>
        </span>


      </div>
      <div class="actions">
        <span><img src="@Veil/assets/icons/Home/reply.svg" /></span>
        <span><img src="@Veil/assets/icons/Home/reply-all.svg" /></span>
        <span><img src="@Veil/assets/icons/Home/forward.png" /></span>
        <span><img src="@Veil/assets/icons/Home/star.svg" /></span>
        <span><img src="@Veil/assets/icons/Home/trash2.svg" /></span>
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
}

.email-card:hover {
  filter: brightness(0.9);
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
  box-shadow: inset 5px 22px 40px -20px #00000073 !important;
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
  box-shadow: inset 5px 22px 40px -20px #00000073 !important;
  user-select: none;
  width: 100%;
  display: none;
  height: 27px;
  margin-left: -10px;
  border-radius: 0 0 5px 5px;
  padding: 0 10px;
  margin-top: 2px;
  background: var(--secondary-background-color);
  position: absolute;
  bottom: 0;
  z-index: 1;
}

.email-card .quick-reply input {
  background: transparent;
  border: none;
  width: calc(100% - 20px);
  cursor: text !important;
  padding-bottom: 2px;
}

.email-card .send {
  width: 30px;
  display: inline;
  background: var(--primary-background-color);
  border: 1px solid var(--secondary-background-color);
  padding: 5px;
  height: 27px;
  position: absolute;
  right: 0;
  border-bottom-right-radius: var(--primary-border-radius);
  transition: .2s;
}

.email-card.qr .quick-reply {
  display: unset;
}

.email-card.qr .preview {
  overflow: scroll;
  height: fit-content;
  max-height: 100px;
}



.email-card .send:hover {
  background: var(--primary-background-color-hover);
  transition: .2s;
}

.email-card .send img {
  width: 17px;
  margin-bottom: 6px;
}

.email-card .actions {
  text-align: right;
  white-space: nowrap;
}

.email-card .actions span {
  padding: 3px;
  margin-left: 3px;
  margin-top: 4px;
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
  filter: brightness(1.5);
}

.email-card .bottom .quick-action span {
  position: relative;
  cursor: pointer;
  display: inline-flex;
  height: 27px;
  transition: .2s;
}

.text {
  color: var(--primary-font-color);
}

.text::before {
  content: attr(htext);
  position: absolute;
  filter: brightness(1.5);
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
  filter: brightness(1.5);
  transition: .2s;
}

.email-card .bottom .quick-action span:hover .text::before,
.email-card .bottom .quick-action span:hover::before {
  width: 100%;
}
</style>