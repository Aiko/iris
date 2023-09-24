<script lang="ts" setup>
import Email from "@Veil/components/Email/Email.vue";
import { isEmailSidebarCollapsed } from '@Veil/state/common'
import Icon from '@Veil/components/Base/Icon.vue'
import ButtonSecondary from '../Base/ButtonSecondary.vue'
import EmailCard from '@Veil/components/Home/EmailCard.vue'
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";


const toggleEmailSidebar = () => isEmailSidebarCollapsed.value = !(isEmailSidebarCollapsed.value)

</script>

<template>
  <div :class="{
    'email-view': true,
    'collapsed': isEmailSidebarCollapsed
  }">

    <div class="left">
      <Email />
    </div>
    <div class="right">
      <p class="collapse-info open" @click="toggleEmailSidebar()">
        <Icon name="sidebar-collapse" color="grey" />{{ i18n(RosettaStone.modals.email.show_participants) }}
      </p>
      <p class="collapse-info closed" @click="toggleEmailSidebar()">
        <Icon name="sidebar-collapse" color="grey" />
      </p>
      <div class="content" v-if="!isEmailSidebarCollapsed">
        <h1>{{ i18n(RosettaStone.modals.email.participants) }}</h1>

        <div class="participants">
          <div class="participant">
            <div class="photo">
              <Icon name="user" color="normal" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div><span>rubentouitou@gmail.com</span></div>
              </div>
            </div>
          </div>

          <div class="participant">
            <div class="photo">
              <Icon name="user" color="normal" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div><span>rubentouitou@gmail.com</span></div>
              </div>
            </div>
          </div>

          <div class="participant">
            <div class="photo">
              <Icon name="user" color="normal" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div><span>rubentouitou@gmail.com</span></div>
              </div>
            </div>
          </div>

          <div class="participant">
            <div class="photo">
              <Icon name="user" color="normal" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div><span>rubentouitou@gmail.com</span></div>
              </div>
            </div>
          </div>

          <div class="show-more">
            {{ i18n(RosettaStone.modals.email.show_more) }}
          </div>
        </div>

        <h1>{{ i18n(RosettaStone.modals.email.summary) }}</h1>
        <div class="summary">
          This is the summary of the thread here, john said this and john said that you know.
          <div class="show-more">
            {{ i18n(RosettaStone.modals.email.show_more) }}
          </div>
        </div>

        <h1>{{ i18n(RosettaStone.modals.email.notes) }}

        </h1>
        <div class="notes">
          <textarea placeholder="Notes" />
          <div class="show-more">
            {{ i18n(RosettaStone.modals.email.show_more) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.email-view {
  width: 100%;
  overflow: hidden;
  height: 100%;
  display: inline-flex;
  text-align: unset;
}

.summary {
  width: 100%;
  max-height: 150px;
  overflow: hidden;
  margin-bottom: 15px;
  font-size: 14px;
  color: var(--primary-font-color);
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  padding: 10px 8px;
}

.notes {
  width: 100%;
  max-height: 150px;
  overflow: hidden;
  margin-bottom: 15px;
  font-size: 14px;
  color: var(--primary-font-color);
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  padding: 10px 8px;
}

.notes textarea {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: var(--primary-font-color);
  resize: none;
  outline: none;
  font-size: 14px;
  padding: 0;
}

.left {
  width: calc(100% - 300px);
  position: relative;
  background: var(--primary-background-color);
  height: 100%;
  padding: 15px;
  position: relative;
  transition: .1s;
}

.right {
  width: 300px;
  padding: 10px;
  position: relative;
  height: 100%;
  overflow: hidden;
  border: 5px solid var(--primary-background-color);
  background: var(--secondary-background-color);
  transition: .1s;
}

.collapsed .left {
  width: calc(100% - 30px);
  transition: .1s;
}

.collapsed .right {
  width: 30px;
  transition: .1s;
}

.collapse-info {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
  position: absolute;
  top: 0;
  left: 0;
  margin-top: 15px;
  cursor: default;
  height: 100%;
}

.open img {
  width: 15px;
  margin-left: -11px;
  margin-bottom: 5px;
}

.show-more {
  width: 100%;
  text-align: center;
  margin-top: 5px;
  font-size: 13px;
  padding: 3px;
  border-radius: var(--primary-border-radius);
  cursor: pointer;
  color: var(--primary-font-color);
  z-index: 1;
  background: var(--primary-background-color);
  border: 1px solid var(--primary-background-color);
  transition: .2s;
}

.show-more:hover {
  background: var(--secondary-background-color);
  border: 1px solid var(--primary-background-color);
  transition: .2s;
}

.closed img {
  width: 17px;
  position: absolute;
  left: 0;
  margin-left: 5px;
}

.collapse-info.open {
  display: none;
}

.collapse-info.closed {
  display: unset;
  height: 30px;
  width: 100%;
}

.collapsed .collapse-info.open {
  display: unset;
}

.collapsed .collapse-info.closed {
  display: none;
}

.right h1 {
  text-align: center;
  font-size: 18px;
}

.content {
  height: 100%;
  overflow: hidden;
}

.photo img {
  width: 35px;
  height: 35px;
  border: 3px solid var(--secondary-background-color);
  border-radius: 50%;
  margin-top: 2px;
  padding: 2px;
}

.sender {
  margin-left: 5px;
}

.name {
  width: 100%;
  overflow: hidden;
  margin-bottom: -4px;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--strong-font-color);
}

.details {
  font-size: 14px;
  overflow-x: scroll;
  width: 100%;
  opacity: .7;
  text-overflow: ellipsis;
  margin-bottom: 5px;
  user-select: none;
  color: var(--primary-font-color);
  transition: .1s;
}

.details div {
  white-space: nowrap;
}

.details div span {
  font-size: 13px;
  color: var(--primary-font-color);
}

.participant {
  display: inline-flex;
  width: 100%;
  overflow: hidden;
  padding: 5px 0 0 0;
  border-bottom: 1px solid var(--primary-background-color);
  cursor: pointer;
  transition: .2s;
}

.participant:hover {
  filter: brightness(.8);
  transition: .2s;
}

.participants {
  width: 100%;
  height: 238px;
  overflow: hidden;
  margin-bottom: 15px;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  padding: 3px 8px;
}

.related-emails {
  width: 100%;
  height: calc(50% - 40px);
  overflow: scroll;
}
</style>@Veil/state/common