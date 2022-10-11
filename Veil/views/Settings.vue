<script lang="ts" setup>
import { ref } from '@vue/reactivity'
import { selectedModal, Modal } from '@Veil/state/sections'
import NavLink from '@Veil/components/Sidebar/NavLink.vue'
import Alert from '@Veil/components/Sidebar/Alert.vue'
import ButtonSecondary from '@Veil/components/Base/ButtonSecondary.vue'
import Icon from '@Veil/components/Base/Icon.vue'
import ButtonPrimary from '@Veil/components/Base/ButtonPrimary.vue'

enum Pane {
  Account,
  Appearance,
  Team,
  Spaces,
  Unsubscribe,
  Templates,
  Billing,
  Integrations,
  Others
}

let selectedPane = ref(Pane.Account)
</script>

<template>
  <div class="settings" v-if="true">
    <div class="sidebar">
      <h1>Settings</h1>
      <NavLink @click="selectedPane = Pane.Account" :class="selectedPane == Pane.Account ? 'active' : ''">
        <Icon name="user" color="normal" class="special" />Account
      </NavLink>
      <NavLink @click="selectedPane = Pane.Appearance" :class="selectedPane == Pane.Appearance ? 'active' : ''">
        <Icon name="image" color="normal" />Appearance
      </NavLink>
      <NavLink @click="selectedPane = Pane.Team" :class="selectedPane == Pane.Team ? 'active' : ''">
        <Icon name="team" color="normal" />Team
      </NavLink>
      <NavLink @click="selectedPane = Pane.Spaces" :class="selectedPane == Pane.Spaces ? 'active' : ''">
        <Icon name="home" color="normal" />Spaces
      </NavLink>
      <NavLink @click="selectedPane = Pane.Unsubscribe" :class="selectedPane == Pane.Unsubscribe ? 'active' : ''">
        <Icon name="unsubscribe" color="normal" />Unsubscribe
      </NavLink>
      <NavLink @click="selectedPane = Pane.Templates" :class="selectedPane == Pane.Templates ? 'active' : ''">
        <Icon name="templates" color="normal" />Templates
      </NavLink>
      <NavLink @click="selectedPane = Pane.Billing" :class="selectedPane == Pane.Billing ? 'active' : ''">
        <Icon name="billing" color="normal" />Billing
      </NavLink>
      <NavLink @click="selectedPane = Pane.Integrations" :class="selectedPane == Pane.Integrations ? 'active' : ''">
        <Icon name="integrations" color="normal" />Integrations
      </NavLink>
      <NavLink @click="selectedPane = Pane.Others" :class="selectedPane == Pane.Others ? 'active' : ''">
        <Icon name="settings2" color="normal" />Others
      </NavLink>
      <Alert>
        <h1>
          <i>Version: </i><b>BETA</b>
        </h1>
        <div>#darwin-3.8.1:INTERNAL</div>
        <p><span>Request features and </span>report issues</p>
        <ButtonPrimary @click="selectedModal = Modal.Feedback">
          <span>Give feedback</span>
        </ButtonPrimary>
      </Alert>
    </div>

    <div class="content">
      <div class="pane" v-if="selectedPane == Pane.Account">
        <h1>Account</h1>
        <h2>
          <div class="bullet" />Personal Information
        </h2>
        <p>Name</p>
        <input placeholder="Name" value="Ruben Touitou" />
        <ButtonSecondary class="save">Save changes</ButtonSecondary>

        <p>Primary email address (used to sign in to Aiko Mail)</p>
        <input placeholder="Primary email" value="ruben@aikomail.com" />
        <ButtonSecondary class="save">Send verification</ButtonSecondary>
        <h2>
          <div class="bullet" />Mailboxes
        </h2>
        <p>Add and remove email addresses to this device.</p>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save">Remove</ButtonSecondary>
        </div>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save">Remove</ButtonSecondary>
        </div>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save">Remove</ButtonSecondary>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.AddMailbox">Add a mailbox</ButtonPrimary>
      </div>



      <div class="pane" v-if="selectedPane == Pane.Appearance">
        <h1>Appearance</h1>

        <h2>
          <div class="bullet" />Global app appearance
        </h2>

        <p>Theme</p>
        <form action="#">
          <p>
            <input type="radio" id="light" name="radio-group">
            <label for="light">Light</label>
          </p>
          <p>
            <input type="radio" id="dark" name="radio-group">
            <label for="dark">Dark</label>
          </p>
          <p>
            <input type="radio" id="system" name="radio-group" checked>
            <label for="system">System (default)</label>
          </p>
        </form>

        <h2>
          <div class="bullet" />Inbox appearance
        </h2>
        <p>Lines of preview for each email in boards.</p>
        <form action="#">
          <p>
            <input type="radio" id="1line" name="radio-group">
            <label for="1line">1 line</label>
          </p>
          <p>
            <input type="radio" id="2lines" name="radio-group">
            <label for="2lines">2 lines</label>
          </p>
          <p>
            <input type="radio" id="3lines" name="radio-group" checked>
            <label for="3lines">3 lines (default)</label>
          </p>
        </form>

        <h2>
          <div class="bullet" />Accessibility
        </h2>
        <p>Increased contrast</p>
        <form action="#">
          <p>
            <input type="radio" id="contrastoff" name="radio-group" checked>
            <label for="contrastoff">Off (default)</label>
          </p>
          <p>
            <input type="radio" id="contraston" name="radio-group">
            <label for="contraston">On</label>
          </p>
        </form>
      </div>



      <div class="pane" v-if="selectedPane == Pane.Team">
        <h1>Team</h1>
        <h2>
          <div class="bullet" />Team members
        </h2>
        <p>These members are part of your plan.</p>
        <div class="members">
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save">Remove</ButtonSecondary>
            <ButtonSecondary class="save">Make admin</ButtonSecondary>
          </div>
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save">Remove</ButtonSecondary>
            <ButtonSecondary class="save">Remove admin rights</ButtonSecondary>
          </div>
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save">Remove</ButtonSecondary>
            <ButtonSecondary class="save">Remove admin rights</ButtonSecondary>
          </div>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.InviteTeam">Invite a new member</ButtonPrimary>
        <ButtonSecondary class="ml-2">Invite bulk (csv)</ButtonSecondary>

      </div>



      <div class="pane" v-if="selectedPane == Pane.Spaces">
        <h1>Spaces</h1>
        <p>These are your spaces, used to separate boards by topics.<br />Hover over to decide which board are shown in
          them.</p>
        <div class="spaces">
          <div class="space">
            <span>School Stuff</span>
            <ButtonSecondary class="save">Delete space</ButtonSecondary>
            <div class="aikocheckbox">
              <input type="checkbox" id="check1">
              <label for="check1">Board 1</label>
            </div>
            <div class="aikocheckbox">
              <input type="checkbox" id="check2">
              <label for="check2">Board2</label>
            </div>
          </div>
          <div class="space">
            <span>Work Stuff</span>
            <ButtonSecondary class="save">Delete space</ButtonSecondary>
            <div class="aikocheckbox">
              <input type="checkbox" id="check1">
              <label for="check1">Board 1</label>
            </div>
            <div class="aikocheckbox">
              <input type="checkbox" id="check2">
              <label for="check2">Board2</label>
            </div>
          </div>
          <div class="space">
            <span>Accounting</span>
            <ButtonSecondary class="save">Delete space</ButtonSecondary>
            <div class="aikocheckbox">
              <input type="checkbox" id="check1">
              <label for="check1">Board 1</label>
            </div>
            <div class="aikocheckbox">
              <input type="checkbox" id="check2">
              <label for="check2">Board2</label>
            </div>
          </div>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.AddSpace">Add a new Space</ButtonPrimary>
      </div>



      <div class="pane" v-if="selectedPane == Pane.Unsubscribe">
        <h1>Unsubscribe</h1>
        <p>These are the email subscriptions we have detected.</p>
        <div class="subscriptions">
          <div class="subscription">
            <span>Forbes milky under milky</span>
            <ButtonSecondary class="save">Unsubscribe</ButtonSecondary>
          </div>
          <div class="subscription">
            <span>Yahoo Finance</span>
            <ButtonSecondary class="save">Unsubscribe</ButtonSecondary>
          </div>
          <div class="subscription">
            <span>Milky newsletter</span>
            <ButtonSecondary class="save">Unsubscribe</ButtonSecondary>
          </div>
        </div>
      </div>



      <div class="pane" v-if="selectedPane == Pane.Templates">
        <h1>Templates</h1>
      </div>



      <div class="pane" v-if="selectedPane == Pane.Billing">
        <h1>Billing</h1>
      </div>



      <div class="pane" v-if="selectedPane == Pane.Integrations">
        <h1>Integrations</h1>
      </div>



      <div class="pane" v-if="selectedPane == Pane.Others">
        <h1>Others</h1>
      </div>

    </div>
  </div>
</template>

<style scoped>
.settings {
  width: 100%;
  overflow-y: scroll;
  height: 100%;
  display: inline-flex;
  background-color: var(--secondary-background-color);
  border: 3px solid var(--primary-background-color);
}

.sidebar {
  width: 130px;
  height: 100%;
  background-color: var(--primary-background-color);
  padding: 8px 8px 8px 3px;
  position: relative;
  box-shadow: var(--sidebar-shadow);
  z-index: 1;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.pane {
  padding-left: 10%;
  padding-top: 50px;
  position: relative;
}

.pane h1 {
  position: absolute;
  top: 0;
  left: 0;
  margin-left: 0;
  margin-bottom: 20px;
}

.save {
  margin-left: 10px;
}

.pane span {
  color: var(--primary-font-color);
}

.bullet {
  width: 10%;
  height: 5px;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  position: absolute;
  margin-top: 9px;
  margin-left: -10px;
  left: 0;
}

.mailbox {
  padding: 15px;
}

.member {
  padding: 15px;
}

.pane h2 {
  font-size: 20px;
}

.content {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  padding: 20px 30px;
}

.members {
  width: 100%;
  height: 100%;
  max-height: 400px;
  overflow: scroll;
  margin-bottom: 20px;
}

.subscriptions {
  width: 100%;
  height: 100%;
  max-height: 400px;
  overflow: scroll;
  margin-top: 20px;
}

.subscription {
  padding: 15px;
}

.spaces {
  width: 100%;
  height: 100%;
  max-height: 400px;
  overflow: scroll;
  margin-bottom: 40px;
}

.space {
  height: 45px;
  margin-top: 20px;
  padding: 20px;
  overflow: hidden;
  cursor: default;
  transition: .2s;
}

.space:hover {
  height: fit-content;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  transition: .2s;
}

.space label {
  color: var(--primary-font-color);
}

input {
  width: 100%;
  max-width: 250px;
  border-radius: var(--primary-border-radius);
  font-size: 16px;
  margin-top: 9px;
  margin-bottom: 10px;
  color: var(--strong-font-color);
  background: var(--secondary-background-color);
  cursor: text !important;
  padding: 8px 10px;
  transition: .2s;
}

input+a {
  display: none;
  padding: 10px;
}

input:focus,
input:active {
  background: var(--primary-background-color);
  transition: .2s;
}

input:focus+a,
input:active+a {
  display: unset;
}

.content p {
  margin-bottom: 0;
  margin-top: 20px;
}

.content h2 {
  margin-bottom: 0;
  margin-top: 40px;
}

.alert p {
  margin: 0;
}

.special {
  width: 12px !important;
  margin-right: 7px !important;
  margin-top: -1px;
}

.sidebar a {
  display: block;
  margin-bottom: 5px;
}

.sidebar a img {
  width: 16px;
  height: auto;
  margin-right: 5px;
}

.alert {
  margin-bottom: 100px;
  width: calc(100% - 13px);
  margin-left: 5px;
  margin-right: 0px;
  position: absolute;
  padding: 7px;
  bottom: 0;
  left: 0;
  background: var(--secondary-background-color);
}

.sidebar .alert a {
  display: unset;
}

.sidebar h1 {
  font-size: 18px;
  margin-bottom: 30px;
  margin-left: 5px;
  color: var(--strong-font-color);
}

.alert h1 {
  font-size: 13px;
  margin: 0;
}

.alert p {
  font-size: 12px;
  margin-bottom: 8px;
  z-index: 1;
  position: relative;
  letter-spacing: -0.1px;
}

.alert a {
  padding: 4px 10px 5px 9px;
  font-size: 13px !important;
  letter-spacing: 0 !important;
  margin-left: -4px;
}

.alert b {
  color: var(--primary-color);
  font-weight: 700;
}

.alert div {
  position: relative;
  color: var(--primary-color);
  background-color: var(--secondary-background-color);
  font-size: 13px;
  margin-top: 0;
  width: 100%;
  left: 0;
  height: 0;
  padding: 2px;
  border-radius: 5px;
  opacity: 0;
  transition: .2s;
  z-index: 1;
}

.alert h1:hover~div {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: .2s;
  position: relative;
}

.alert div:hover {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: .2s;
  position: relative;
}



[type="radio"]:checked,
[type="radio"]:not(:checked) {
  position: absolute;
  left: -9999px;
}

[type="radio"]:checked+label,
[type="radio"]:not(:checked)+label {
  position: relative;
  padding-left: 28px;
  cursor: pointer;
  line-height: 20px;
  display: inline-block;
  color: var(--primary-font-color);
}

[type="radio"]:checked+label:before,
[type="radio"]:not(:checked)+label:before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  border: 1px solid var(--primary-font-color);
  border-radius: 100%;
  background: var(--primary-background-color);
}

[type="radio"]:checked+label:after,
[type="radio"]:not(:checked)+label:after {
  content: '';
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  position: absolute;
  top: 4px;
  left: 4px;
  border-radius: 100%;
  -webkit-transition: all 0.2s ease;
  transition: all 0.2s ease;
}

[type="radio"]:not(:checked)+label:after {
  opacity: 0;
  -webkit-transform: scale(0);
  transform: scale(0);
}

[type="radio"]:checked+label:after {
  opacity: 1;
  -webkit-transform: scale(1);
  transform: scale(1);
}
</style>