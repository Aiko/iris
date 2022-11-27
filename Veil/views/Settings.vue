<script lang="ts" setup>
import { ref } from "@vue/reactivity";
import { selectedModal, Modal } from "@Veil/state/sections";
import NavLink from "@Veil/components/Sidebar/NavLink.vue";
import Alert from "@Veil/components/Sidebar/Alert.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";

enum Pane {
  Account,
  Appearance,
  Team,
  Spaces,
  Unsubscribe,
  Templates,
  Signatures,
  Billing,
  Integrations,
  Others,
}

let selectedPane = ref(Pane.Account);
</script>

<template>
  <div class="settings" v-if="true">
    <div class="sidebar">
      <h1>Settings</h1>
      <NavLink
        @click="selectedPane = Pane.Account"
        :class="selectedPane == Pane.Account ? 'active' : ''"
      >
        <Icon name="user" color="normal" class="special" />Account
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Appearance"
        :class="selectedPane == Pane.Appearance ? 'active' : ''"
      >
        <Icon name="image" color="normal" />Appearance
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Team"
        :class="selectedPane == Pane.Team ? 'active' : ''"
      >
        <Icon name="team" color="normal" />Team
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Spaces"
        :class="selectedPane == Pane.Spaces ? 'active' : ''"
      >
        <Icon name="home" color="normal" />Spaces
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Unsubscribe"
        :class="selectedPane == Pane.Unsubscribe ? 'active' : ''"
      >
        <Icon name="unsubscribe" color="normal" />Unsubscribe
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Templates"
        :class="selectedPane == Pane.Templates ? 'active' : ''"
      >
        <Icon name="templates" color="normal" />Templates
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Signatures"
        :class="selectedPane == Pane.Signatures ? 'active' : ''"
      >
        <Icon name="signature" color="normal" />Signatures
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Billing"
        :class="selectedPane == Pane.Billing ? 'active' : ''"
      >
        <Icon name="billing" color="normal" />Plans / Billing
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Integrations"
        :class="selectedPane == Pane.Integrations ? 'active' : ''"
      >
        <Icon name="integrations" color="normal" />Integrations
      </NavLink>
      <NavLink
        @click="selectedPane = Pane.Others"
        :class="selectedPane == Pane.Others ? 'active' : ''"
      >
        <Icon name="settings2" color="normal" />Others
      </NavLink>
      <Alert>
        <h1><i>Version: </i><b>BETA</b></h1>
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
          <div class="bullet" />
          Personal Information
        </h2>
        <p>Name</p>
        <input placeholder="Name" value="Ruben Touitou" />
        <ButtonSecondary class="save">Save changes</ButtonSecondary>

        <p>Primary email address (used to sign in to Aiko Mail)</p>
        <input placeholder="Primary email" value="ruben@aikomail.com" />
        <ButtonSecondary class="save">Send verification</ButtonSecondary>
        <h2>
          <div class="bullet" />
          Mailboxes
        </h2>
        <p>Add and remove email addresses to this device.</p>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save" color="red">Remove</ButtonSecondary>
        </div>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save" color="red">Remove</ButtonSecondary>
        </div>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save" color="red">Remove</ButtonSecondary>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.AddMailbox"
          >Add a mailbox</ButtonPrimary
        >
      </div>

      <div class="pane" v-if="selectedPane == Pane.Appearance">
        <h1>Appearance</h1>

        <h2>
          <div class="bullet" />
          Global app appearance
        </h2>

        <p>Theme</p>
        <form action="#">
          <p>
            <input type="radio" id="light" name="radio-group" />
            <label for="light">Light</label>
          </p>
          <p>
            <input type="radio" id="dark" name="radio-group" />
            <label for="dark">Dark</label>
          </p>
          <p>
            <input type="radio" id="system" name="radio-group" checked />
            <label for="system">System (default)</label>
          </p>
        </form>

        <h2>
          <div class="bullet" />
          Inbox appearance
        </h2>
        <p>Lines of preview for each email in boards.</p>
        <form action="#">
          <p>
            <input type="radio" id="1line" name="radio-group" />
            <label for="1line">1 line</label>
          </p>
          <p>
            <input type="radio" id="2lines" name="radio-group" />
            <label for="2lines">2 lines</label>
          </p>
          <p>
            <input type="radio" id="3lines" name="radio-group" checked />
            <label for="3lines">3 lines (default)</label>
          </p>
        </form>

        <h2>
          <div class="bullet" />
          Accessibility
        </h2>
        <p>Increased contrast</p>
        <form action="#">
          <p>
            <input type="radio" id="contrastoff" name="radio-group" checked />
            <label for="contrastoff">Off (default)</label>
          </p>
          <p>
            <input type="radio" id="contraston" name="radio-group" />
            <label for="contraston">On</label>
          </p>
        </form>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Team">
        <h1>Team</h1>
        <h2>
          <div class="bullet" />
          Team members
        </h2>
        <p>These members are part of your plan.</p>
        <div class="members">
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save" color="red">Remove</ButtonSecondary>
            <ButtonSecondary class="save">Make admin</ButtonSecondary>
          </div>
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save" color="red">Remove</ButtonSecondary>
            <ButtonSecondary class="save">Remove admin rights</ButtonSecondary>
          </div>
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save" color="red">Remove</ButtonSecondary>
            <ButtonSecondary class="save">Remove admin rights</ButtonSecondary>
          </div>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.InviteTeam"
          >Invite a new member</ButtonPrimary
        >
        <ButtonSecondary class="ml-2">Invite bulk (csv)</ButtonSecondary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Spaces">
        <h1>Spaces</h1>
        <p>
          These are your spaces, used to separate boards by topics.<br />Hover over to
          decide which board are shown in them.
        </p>
        <div class="spaces">
          <div class="space">
            <span>School Stuff</span>
            <ButtonSecondary class="save" color="red">Delete space</ButtonSecondary>
            <div class="aikocheckbox">
              <input type="checkbox" id="check1" />
              <label for="check1">Board 1</label>
            </div>
            <div class="aikocheckbox">
              <input type="checkbox" id="check2" />
              <label for="check2">Board2</label>
            </div>
          </div>
          <div class="space">
            <span>Work Stuff</span>
            <ButtonSecondary class="save" color="red">Delete space</ButtonSecondary>
            <div class="aikocheckbox">
              <input type="checkbox" id="check1" />
              <label for="check1">Board 1</label>
            </div>
            <div class="aikocheckbox">
              <input type="checkbox" id="check2" />
              <label for="check2">Board2</label>
            </div>
          </div>
          <div class="space">
            <span>Accounting</span>
            <ButtonSecondary class="save" color="red">Delete space</ButtonSecondary>
            <div class="aikocheckbox">
              <input type="checkbox" id="check1" />
              <label for="check1">Board 1</label>
            </div>
            <div class="aikocheckbox">
              <input type="checkbox" id="check2" />
              <label for="check2">Board2</label>
            </div>
          </div>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.AddSpace"
          >Add a new Space</ButtonPrimary
        >
      </div>

      <div class="pane" v-if="selectedPane == Pane.Unsubscribe">
        <h1>Unsubscribe</h1>
        <p>These are the email subscriptions we have detected.</p>
        <div class="subscriptions">
          <div class="subscription">
            <span>Forbes milky under milky</span>
            <ButtonSecondary class="save" color="red">Unsubscribe</ButtonSecondary>
          </div>
          <div class="subscription">
            <span>Yahoo Finance</span>
            <ButtonSecondary class="save" color="red">Unsubscribe</ButtonSecondary>
          </div>
          <div class="subscription">
            <span>Milky newsletter</span>
            <ButtonSecondary class="save" color="red">Unsubscribe</ButtonSecondary>
          </div>
        </div>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Templates">
        <h1>Templates</h1>
        <p class="mb-3">These are templates you can use while composing new emails.</p>
        <div class="template">
          <input placeholder="Template Name (e.g Sales rejection)" value="" />
          <div class="inline">
            <textarea placeholder="Template" value="Hi, This is the content" />
            <ButtonSecondary class="save">Save changes</ButtonSecondary>
          </div>
        </div>
        <ButtonPrimary>New template</ButtonPrimary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Signatures">
        <h1>Signatures</h1>
        <p class="mb-3">These are your signatures.</p>
        <div class="signature">
          <p>for ruben@aikomail.com</p>
          <div class="inline">
            <textarea placeholder="Signature" value="Best, Ruben Touitou" />
            <ButtonSecondary class="save">Save changes</ButtonSecondary>
          </div>
        </div>
        <div class="signature">
          <p>for rubencharles@aikomail.com</p>
          <div class="inline">
            <textarea placeholder="Signature" value="Best, Ruben Touitou" />
            <ButtonSecondary class="save">Save changes</ButtonSecondary>
          </div>
        </div>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Billing">
        <h1>Plans & Billing</h1>

        <h2>
          <div class="bullet" />
          Plans
        </h2>
        <p class="mb-5">These are available plans, click to upgrade.</p>

        <div class="plan current">
          <img src="@Veil/assets/img/aikofree.svg" />
          <span>$0/month</span>
          <span style="opacity: 0">.</span>
          <p>
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
          </p>
          <ButtonSecondary>Current plan</ButtonSecondary>
        </div>

        <div class="plan">
          <img src="@Veil/assets/img/aikopro.svg" />
          <span>$12/month</span>
          <span>Cancel anytime</span>
          <p>
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
            Feature<br />
          </p>
          <ButtonPrimary>Upgrade to Pro</ButtonPrimary>
        </div>
        <h2>
          <div class="bullet" />
          Billing details
        </h2>
        <p class="mb-2">Name</p>
        <input placeholder="Name" value="" />
        <ButtonSecondary class="save">Save changes</ButtonSecondary>

        <p class="mb-2 mt-4">Address</p>
        <input placeholder="Address" value="" />
        <ButtonSecondary class="save">Save changes</ButtonSecondary>

        <p class="mb-2 mt-4">Address</p>
        <input placeholder="Address" value="" />
        <ButtonSecondary class="save">Save changes</ButtonSecondary>

        <p class="mb-2 mt-4">Stripe</p>
        <input placeholder="Stripe stuff" value="" />
        <ButtonSecondary class="save">Save changes</ButtonSecondary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Integrations">
        <h1>Integrations</h1>

        <h2>
          <div class="bullet" />
          Available integrations
        </h2>
        <p>You can turn these on or off to use them in Aiko Mail</p>

        <div class="integration">
          <h3>Zoom</h3>
          <p>Videoconferencing app, send link within the composer</p>
          <ButtonPrimary>Enable</ButtonPrimary>
        </div>

        <div class="integration">
          <h3>Calendly</h3>
          <p>Videoconferencing app, send link within the composer</p>
          <ButtonSecondary>Disable</ButtonSecondary>
        </div>

        <div class="integration">
          <h3>Zapier</h3>
          <p>Videoconferencing app, send link within the composer</p>
          <ButtonPrimary>Enable</ButtonPrimary>
        </div>

        <h2>
          <div class="bullet" />
          Request an integration
        </h2>
        <p class="mb-2">
          If you don't see the integration you need, simply request it and we'll work on
          it.
        </p>
        <ButtonPrimary>Integration request</ButtonPrimary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Others">
        <h1>Other Settings</h1>
        <p>
          Out of Office Replies<br />
          Spelling and Autocorrect<br />
          Notifications<br />
        </p>
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
  width: 150px;
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

.plan {
  width: 100%;
  max-width: 250px;
  background: var(--primary-background-color);
  padding: 20px;
  position: relative;
  border-radius: var(--primary-border-radius);
  text-align: center;
  border: 2px solid var(--primary-background-color);
  cursor: pointer;
  display: inline-block;
  margin-right: 20px;
  margin-bottom: 20px;
  transition: 0.2s;
}

.plan:hover {
  border: 2px solid var(--primary-color);
  transition: 0.2s;
}

.plan p {
  margin-bottom: 20px !important;
}

.plan img {
  width: 80%;
  margin: auto;
}

.plan span:first-of-type {
  margin-top: 20px;
  color: var(--primary-color);
  font-weight: 500;
  width: 100%;
  margin-bottom: 0;
  display: block;
  font-size: 18px;
}

.plan span {
  margin-top: 20px;
  font-size: 12px;
  color: var(--primary-font-color);
  font-weight: 500;
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
  transition: 0.2s;
}

.space:hover {
  height: fit-content;
  background: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  transition: 0.2s;
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
  transition: 0.2s;
}

input + a {
  display: none;
  padding: 10px;
}

input:focus,
input:active {
  background: var(--primary-background-color);
  transition: 0.2s;
}

input:focus + a,
input:active + a {
  display: unset;
}

textarea + a {
  display: none;
}

textarea:focus + a,
textarea:active + a {
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

.integration p {
  margin: 8px 0px;
}

.integration {
  width: 210px;
  display: inline-block;
  margin-right: 20px;
  text-align: center;
  background: var(--primary-background-color);
  padding: 10px 10px 20px 10px;
  border-radius: var(--primary-border-radius);
  margin-top: 20px;
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

.inline {
  display: inline-flex;
}

.template {
  display: grid;
  padding: 10px;
  border: 2px solid var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  margin-bottom: 20px;
}

.template input {
  margin: 0;
  margin-bottom: 10px;
}

.template textarea {
  width: 100%;
  padding: 8px 10px;
  margin: 0;
}

.template a {
  padding: 20px !important;
}

.signature {
  display: grid;
  padding: 10px;
  border: 2px solid var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  margin-bottom: 20px;
}

.signature input {
  margin: 0;
  margin-bottom: 10px;
}

.signature textarea {
  width: 100%;
  padding: 8px 10px;
  margin: 0;
}

.signature p {
  margin: 0;
  margin-bottom: 6px;
}

.signature a {
  padding: 20px !important;
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
  transition: 0.2s;
  z-index: 1;
}

.alert h1:hover ~ div {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: 0.2s;
  position: relative;
}

.alert div:hover {
  margin-top: -20px;
  opacity: 1;
  height: unset;
  transition: 0.2s;
  position: relative;
}

.current:before {
  content: "Current plan";
  position: absolute;
  top: 0;
  left: 0;
  font-size: 14px;
  margin-top: -20px;
  background: var(--primary-background-color);
  color: var(--primary-color);
  padding: 2px 10px;
  border-radius: var(--primary-border-radius);
  margin-left: -2px;
  font-weight: 600;
}
</style>
