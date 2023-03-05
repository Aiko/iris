<script lang="ts" setup>
import Email from "@Veil/components/Email/Email.vue";
import { isEmailSidebarCollapsed } from '@Veil/state/sections'
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
        <Icon name="close" color="grey" />
      </p>
      <div class="content" v-if="!isEmailSidebarCollapsed">
        <h1>{{ i18n(RosettaStone.modals.email.participants) }}</h1>

        <div class="participants">
          <div class="participant">
            <div class="photo">
              <img src="@Veil/assets/img/user.png" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div>{{ i18n(RosettaStone.modals.email.email) }} <span>rubentouitou@gmail.com</span></div>
              </div>
              <ButtonSecondary>{{ i18n(RosettaStone.modals.email.send_new) }}</ButtonSecondary>
            </div>
          </div>

          <div class="participant">
            <div class="photo">
              <img src="@Veil/assets/img/user.png" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div>{{ i18n(RosettaStone.modals.email.email) }} <span>rubentouitou@gmail.com</span></div>
              </div>
              <ButtonSecondary>{{ i18n(RosettaStone.modals.email.send_new) }}</ButtonSecondary>
            </div>
          </div>

          <div class="participant">
            <div class="photo">
              <img src="@Veil/assets/img/user.png" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div>{{ i18n(RosettaStone.modals.email.email) }} <span>rubentouitou@gmail.com</span></div>
              </div>
              <ButtonSecondary>{{ i18n(RosettaStone.modals.email.send_new) }}</ButtonSecondary>
            </div>
          </div>

          <div class="participant">
            <div class="photo">
              <img src="@Veil/assets/img/user.png" />
            </div>
            <div class="sender">
              <div class="name">
                Ruben Touitou
              </div>
              <div class="details">
                <div>{{ i18n(RosettaStone.modals.email.email) }} <span>rubentouitou@gmail.com</span></div>
              </div>
              <ButtonSecondary>{{ i18n(RosettaStone.modals.email.send_new) }}</ButtonSecondary>
            </div>
          </div>


        </div>

        <h1>{{ i18n(RosettaStone.modals.email.related_emails) }}</h1>
        <div class="related-emails">
          <EmailCard />
          <EmailCard />
          <EmailCard />
          <EmailCard />
          <EmailCard />

        </div>
      </div>
    </div>
  </div>


</template>

<style scoped>
.email-view {
  width: 100%;
  overflow: hidden;
  height: 100%;
  display: inline-flex;
  text-align: unset;
}

.left {
  width: calc(100% - 300px);
  position: relative;
  background: var(--primary-background-color);
  height: 100%;
  padding: 15px;
  position: relative;
  transition: .2s;
}

.right {
  width: 300px;
  padding: 15px;
  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--secondary-background-color);
  transition: .2s;
}

.collapsed .left {
  width: calc(100% - 30px);
  transition: .2s;
}

.collapsed .right {
  width: 30px;
  transition: .2s;
}

.collapse-info {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  margin: 0;
  position: absolute;
  top: 0;
  left: 0;
  margin-left: 5px;
  margin-top: 15px;
  cursor: pointer;
  height: 100%;
}

.open img {
  width: 18px;
  margin-left: -11px;
  margin-bottom: 5px;
}

.closed img {
  width: 13px;
  margin-left: -7px;
  margin-bottom: 5px;
}

.collapse-info.open {
  display: none;
}

.collapse-info.closed {
  display: unset;
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
  width: 55px;
  border: 4px solid var(--primary-background-color);
  border-radius: 50%;
}

.sender {
  margin-left: 10px;
}

.name {
  width: 100%;
  overflow: hidden;
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
  transition: .2s;
}

.details div {
  white-space: nowrap;
}

.details div span {
  color: var(--strong-font-color);
}

.participant {
  display: inline-flex;
  width: 100%;
  overflow: hidden;
  padding: 10px 0;
  border-bottom: 1px solid var(--primary-background-color);
}

.participants {
  width: 100%;
  height: calc(50% - 30px);
  overflow: scroll;
  margin-bottom: 25px;
}

.related-emails {
  width: 100%;
  height: calc(50% - 40px);
  overflow: scroll;
}
</style>