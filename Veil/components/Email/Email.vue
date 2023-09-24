<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
import { ref } from '@vue/reactivity';
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";


let emailCollapse = ref(false)
const toggleEmailCollapse = () => emailCollapse.value = !(emailCollapse.value)
</script>

<template>
  <div :class="{
    'email': true,
    'collapsed': emailCollapse,
  }">
    <div class="email-header">
      <div class="container">
        <div class="row" @click="toggleEmailCollapse()">

          <div class="col-9 p0">
            <div class="photo">
              <Icon name="user" color="normal" />
            </div>
            <div class="name">
              Ruben Touitou
            </div>
            <div class="details">
              <div><span>{{ i18n(RosettaStone.email.from) }}</span> rubentouitou@gmail.com</div>
              <div><span>{{ i18n(RosettaStone.email.to) }}</span> rubencharlestouitou@gmail.com</div>
              <div><span>{{ i18n(RosettaStone.email.cc) }}</span> rubentouitou@gmail.com</div>
              <div><span>{{ i18n(RosettaStone.email.bcc) }}</span> rubentouitou@gmail.com</div>

            </div>
          </div>
          <div class="col-3 p0">
            <div class="date">
              Yesterday at 6:12pm
            </div>
          </div>



        </div>
        <div class="row">
          <div class="subject" @click="toggleEmailCollapse()">
            Subject here
          </div>
          <div class="actions">
            <div class="show">
              <span>
                <Icon name="star" color="normal" />
              </span>
              <span>
                <Icon name="print" color="normal" />
              </span>
              <span>
                <Icon name="trash" color="normal" />
              </span>
            </div>
            <span>
              <Icon name="reply" color="normal" />
            </span>
            <span>
              <Icon name="reply-all" color="normal" />
            </span>
            <span>
              <Icon name="forward" color="normal" />
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="email-body">

    </div>
  </div>
</template>

<style lang="scss" scoped>
.photo img {
  width: 35px;
  height: 35px;
  border: 3px solid var(--secondary-background-color);
  border-radius: 50%;
  padding: 2px;
}

.photo {
  display: inline-block;
}

.actions {
  margin-top: 3px;
  position: absolute;
  width: 192px;
  right: 0;
  margin-right: 10px;
}

.actions span img,
.actions div span img {
  width: 32px;
  margin: auto;
  padding: 10px 7px 10px 7px;
  transition: .1s;
}

.actions span img:hover,
.actions div span img:hover {
  opacity: .6;
  transition: .1s;
}

.actions span,
.actions div span {
  margin-top: 15px;
  width: 180px;
  cursor: pointer;
}

.show {
  opacity: 0;
  transition: .2s;
}

.actions:hover .show {
  opacity: 1;
  transition: .2s;
}

.actions div {
  display: inline-block;
}

.email {
  text-align: left;
  position: relative;
  border-radius: var(--primary-border-radius);
  background: var(--secondary-background-color);
  overflow: hidden;
  margin-bottom: 15px;
}

.email-header {
  color: var(--primary-font-color);
  width: 100%;
  font-weight: 500;
  padding: 10px 15px 10px 15px;
}

.date {
  margin-top: 5px;
  font-size: 14px;
  font-weight: normal;
  text-align: right;
  cursor: default;
}

.subject {
  color: var(--strong-font-color);
  font-weight: 500;
  margin-top: 10px;
  font-size: 16px;
  width: calc(100% - 192px);
}

.details {
  position: absolute;
  background: var(--primary-background-color);
  padding: 0 5px;
  padding: 4px 7px;
  margin-top: 5px;
  font-size: 13px;
  font-weight: normal;
  width: fit-content;
  border-radius: var(--primary-border-radius);
  opacity: 0.8;
  user-select: none;
  display: inline-grid;
  transition: 0.1s;
  margin-left: 10px;
  height: 27px;
  overflow: hidden;
}

.details:hover {
  opacity: 1;
  height: unset;
  position: absolute;
  background-color: var(--modal-backdrop);
  transition: .1s;
}

.details span {
  opacity: .6;
}

.name {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: -8px;
  white-space: nowrap;
  margin-left: 7px;
}

.details div {
  white-space: nowrap;
  display: inline-block;
}

.email.collapsed .email-body,
.email.collapsed .email-header .details,
.email.collapsed .email-header .actions {
  display: none;
}

.email.collapsed .subject {
  width: 100%;
}

.email-body {
  width: 100%;
  height: 100px;
  background: #fff;
  overflow: scroll;
}
</style>