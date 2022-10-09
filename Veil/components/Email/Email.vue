<script lang="ts" setup>
import Icon from "@Veil/components/Base/Icon.vue";
import { ref } from '@vue/reactivity';

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
          <div class="photo">
            <img src="@Veil/assets/img/user.png" />
          </div>
          <div class="sender">
            <div class="name">
              Ruben Touitou
            </div>
            <div class="details">
              <div><span>From</span> rubentouitou@gmail.com</div>
              <div><span>cc</span> rubentouitou@gmail.com</div>
              <div><span>to</span> rubencharlestouitou@gmail.com</div>
            </div>
          </div>
          <div class="date">
            Time
          </div>
        </div>
        <div class="row">
          <div class="subject" @click="toggleEmailCollapse()">
            Subject goes
          </div>
          <div class="actions">
            <span title="Reply">
              <Icon name="reply" color="normal" />
            </span>
            <span title="Reply all">
              <Icon name="reply-all" color="normal" />
            </span>
            <span title="Forward">
              <Icon name="forward" color="normal" />
            </span>
            <span title="Star">
              <Icon name="star" color="normal" />
            </span>
            <span title="Print">
              <Icon name="print" color="normal" />
            </span>
            <span title="Trash">
              <Icon name="trash" color="normal" />
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="email-body">

    </div>
  </div>
</template>

<style scoped>
.photo img {
  width: 55px;
  border: 4px solid var(--primary-background-color);
  border-radius: 50%;
}

.photo {
  margin: auto;
  margin-right: 0;
  margin-left: 0;
}

.actions {
  margin-top: 15px;
  position: absolute;
  width: 192px;
  right: 0;
  margin-right: 10px;
}

.actions span img {
  width: 32px;
  margin: auto;
  padding: 10px 7px 10px 7px;
  transition: .2s;
}

.actions span img:hover {
  opacity: .6;
  transition: .2s;
}

.actions span {
  margin-top: 15px;
  width: 180px;
  cursor: pointer;
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
  padding: 15px 15px 15px 15px;
}

.email.collapsed .email-header {
  padding: 9px 15px 10px 15px;
}

.date {
  position: absolute;
  top: 0;
  right: 0;
  margin-right: 15px;
  margin-top: 15px;
}

.subject {
  color: var(--strong-font-color);
  font-weight: 500;
  margin-top: 15px;
  font-size: 17px;
  width: calc(100% - 192px);
}

.details {
  background: var(--primary-background-color);
  padding: 0 5px;
  padding: 3px 7px;
  font-size: 14px;
  width: fit-content;
  border-radius: var(--primary-border-radius);
  opacity: .8;
  user-select: none;
  transition: .2s;
}

.details:hover {
  opacity: 1;
  transition: .2s;
}

.details span {
  opacity: .6;
}

.sender {
  width: calc(100% - 150px);
  margin-left: 10px;
}

.name {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 5px;
}

.details div {
  white-space: nowrap;
}

.email.collapsed .email-body,
.email.collapsed .email-header .details,
.email.collapsed .email-header .actions {
  display: none;
}

.email.collapsed .email-header .photo img {
  width: 35px;
}

.email.collapsed .email-header .sender {
  margin-top: 5px;
}

.email.collapsed .email-header .date {
  margin-top: 16px;
}

.email.collapsed .email-header .subject {
  margin-top: 5px;
}

.email-body {
  width: 100%;
  height: 100px;
  background: #fff;
  overflow: scroll;
}
</style>