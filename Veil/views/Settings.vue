<script lang="ts" setup>
import { ref } from "@vue/reactivity";
import { selectedModal, Modal } from "@Veil/state/sections";
import NavLink from "@Veil/components/Sidebar/NavLink.vue";
import Alert from "@Veil/components/Sidebar/Alert.vue";
import ButtonSecondary from "@Veil/components/Base/ButtonSecondary.vue";
import Icon from "@Veil/components/Base/Icon.vue";
import ButtonPrimary from "@Veil/components/Base/ButtonPrimary.vue";
import { RosettaStone, i18n } from "@Veil/utils/rosetta/rosetta";
import Menu from "@Veil/components/Base/Menu.vue";
import MenuItem from "@Veil/components/Base/MenuItem.vue";
import SubMenu from "@Veil/components/Base/SubMenu.vue";

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
      <h1>{{ i18n(RosettaStone.settings.title) }}</h1>
      <NavLink @click="selectedPane = Pane.Account" :class="selectedPane == Pane.Account ? 'active' : ''">
        <Icon name="user" color="normal" class="special" />{{ i18n(RosettaStone.settings.account.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Appearance" :class="selectedPane == Pane.Appearance ? 'active' : ''">
        <Icon name="image" color="normal" />{{ i18n(RosettaStone.settings.appearance.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Team" :class="selectedPane == Pane.Team ? 'active' : ''">
        <Icon name="team" color="normal" />{{ i18n(RosettaStone.settings.team.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Spaces" :class="selectedPane == Pane.Spaces ? 'active' : ''">
        <Icon name="home" color="normal" />{{ i18n(RosettaStone.settings.spaces.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Unsubscribe" :class="selectedPane == Pane.Unsubscribe ? 'active' : ''">
        <Icon name="unsubscribe" color="normal" />{{ i18n(RosettaStone.settings.unsubscribe.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Templates" :class="selectedPane == Pane.Templates ? 'active' : ''">
        <Icon name="templates" color="normal" />{{ i18n(RosettaStone.settings.templates.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Signatures" :class="selectedPane == Pane.Signatures ? 'active' : ''">
        <Icon name="signature" color="normal" />{{ i18n(RosettaStone.settings.signatures.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Billing" :class="selectedPane == Pane.Billing ? 'active' : ''">
        <Icon name="billing" color="normal" />{{ i18n(RosettaStone.settings.billing.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Integrations" :class="selectedPane == Pane.Integrations ? 'active' : ''">
        <Icon name="integrations" color="normal" />{{ i18n(RosettaStone.settings.integrations.title) }}
      </NavLink>
      <NavLink @click="selectedPane = Pane.Others" :class="selectedPane == Pane.Others ? 'active' : ''">
        <Icon name="settings2" color="normal" />{{ i18n(RosettaStone.settings.others.title) }}
      </NavLink>
      <Alert>
        <h1><i>{{ i18n(RosettaStone.settings.version) }}: </i><b>BETA</b></h1>
        <div>#darwin-3.8.1:INTERNAL</div>
        <p><span>{{ i18n(RosettaStone.settings.request1) }} </span> {{ i18n(RosettaStone.settings.request2) }}</p>
        <ButtonPrimary @click="selectedModal = Modal.Feedback">
          <span>{{ i18n(RosettaStone.settings.btn) }}</span>
        </ButtonPrimary>
      </Alert>
    </div>

    <div class="content">
      <div class="pane" v-if="selectedPane == Pane.Account">
        <h1>{{ i18n(RosettaStone.settings.account.title) }}</h1>
        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.account.language.title) }}
        </h2>
        <p>{{ i18n(RosettaStone.settings.account.language.info) }}</p>


        <Menu :direction="'bottom'" :width="150" :label="i18n(RosettaStone.settings.account.language.english)">
          <MenuItem>
          {{ i18n(RosettaStone.settings.account.language.french) }}
          </MenuItem>
          <SubMenu :label="'Select option'">
            <MenuItem>
            level 2
            </MenuItem>
            <MenuItem>
            level 2
            </MenuItem>
          </SubMenu>
          <MenuItem>
          level 1
          </MenuItem>
          <MenuItem>
          level 1
          </MenuItem>
          <SubMenu :label="'Select'">
            <MenuItem>
            level 2
            </MenuItem>
            <SubMenu :label="'Select option'">
              <MenuItem>
              level 3
              </MenuItem>
              <MenuItem>
              level 3
              </MenuItem>
            </SubMenu>
          </SubMenu>
        </Menu>


        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.account.personal_info) }}
        </h2>
        <p>{{ i18n(RosettaStone.settings.account.name) }}</p>
        <input placeholder="Name" value="Ruben Touitou" />
        <ButtonSecondary class="save">Save changes</ButtonSecondary>

        <p>{{ i18n(RosettaStone.settings.account.primary_email) }}</p>
        <input :placeholder="i18n(RosettaStone.settings.account.primary_email_placeholder)" value="ruben@aikomail.com" />
        <ButtonSecondary class="save">{{ i18n(RosettaStone.settings.account.send) }}</ButtonSecondary>
        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.account.mailboxes) }}
        </h2>
        <p>{{ i18n(RosettaStone.settings.account.add_remove) }}</p>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.account.remove) }}</ButtonSecondary>
        </div>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.account.remove) }}</ButtonSecondary>
        </div>
        <div class="mailbox">
          <span>ruben@milky.com</span>
          <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.account.remove) }}</ButtonSecondary>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.AddMailbox">{{ i18n(RosettaStone.settings.account.add_mailbox) }}
        </ButtonPrimary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Appearance">
        <h1>{{ i18n(RosettaStone.settings.appearance.title) }}</h1>

        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.appearance.subtitle) }}
        </h2>

        <p>{{ i18n(RosettaStone.settings.appearance.theme) }}</p>
        <form action="#">
          <p>
            <input type="radio" id="light" name="radio-group" />
            <label for="light">{{ i18n(RosettaStone.settings.appearance.light) }}</label>
          </p>
          <p>
            <input type="radio" id="dark" name="radio-group" />
            <label for="dark">{{ i18n(RosettaStone.settings.appearance.dark) }}</label>
          </p>
          <p>
            <input type="radio" id="system" name="radio-group" checked />
            <label for="system">{{ i18n(RosettaStone.settings.appearance.system) }}</label>
          </p>
        </form>

        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.appearance.inbox) }}
        </h2>
        <p>{{ i18n(RosettaStone.settings.appearance.lines) }}</p>
        <form action="#">
          <p>
            <input type="radio" id="1line" name="radio-group" />
            <label for="1line">{{ i18n(RosettaStone.settings.appearance.one_line) }}</label>
          </p>
          <p>
            <input type="radio" id="2lines" name="radio-group" />
            <label for="2lines">{{ i18n(RosettaStone.settings.appearance.two_lines) }}</label>
          </p>
          <p>
            <input type="radio" id="3lines" name="radio-group" checked />
            <label for="3lines">{{ i18n(RosettaStone.settings.appearance.three_lines) }}</label>
          </p>
        </form>

        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.appearance.accessibility) }}
        </h2>
        <p>{{ i18n(RosettaStone.settings.appearance.contrast) }}</p>
        <form action="#">
          <p>
            <input type="radio" id="contrastoff" name="radio-group" checked />
            <label for="contrastoff">{{ i18n(RosettaStone.settings.appearance.contrast_off) }}</label>
          </p>
          <p>
            <input type="radio" id="contraston" name="radio-group" />
            <label for="contraston">{{ i18n(RosettaStone.settings.appearance.contrast_on) }}</label>
          </p>
        </form>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Team">
        <h1>{{ i18n(RosettaStone.settings.team.title) }}</h1>
        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.team.members) }}
        </h2>
        <p>{{ i18n(RosettaStone.settings.team.members_subtitle) }}</p>
        <div class="members">
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.team.remove) }}</ButtonSecondary>
            <ButtonSecondary class="save">{{ i18n(RosettaStone.settings.team.make_admin) }}</ButtonSecondary>
          </div>
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.team.remove) }}</ButtonSecondary>
            <ButtonSecondary class="save">{{ i18n(RosettaStone.settings.team.remove_admin) }}</ButtonSecondary>
          </div>
          <div class="member">
            <span>ruben@milky.com</span>
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.team.remove) }}</ButtonSecondary>
            <ButtonSecondary class="save">{{ i18n(RosettaStone.settings.team.remove_admin) }}</ButtonSecondary>
          </div>
        </div>

        <ButtonPrimary @click="selectedModal = Modal.InviteTeam">{{ i18n(RosettaStone.settings.team.invite) }}
        </ButtonPrimary>
        <ButtonSecondary class="ml-2">{{ i18n(RosettaStone.settings.team.invite_csv) }}</ButtonSecondary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Spaces">
        <h1>{{ i18n(RosettaStone.settings.spaces.title) }}</h1>
        <p>
          {{ i18n(RosettaStone.settings.spaces.subtitle) }}

        </p>
        <div class="spaces">
          <div class="space">
            <span>School Stuff</span>
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.spaces.delete) }}</ButtonSecondary>
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
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.spaces.delete) }}</ButtonSecondary>
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
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.spaces.delete) }}</ButtonSecondary>
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

        <ButtonPrimary @click="selectedModal = Modal.AddSpace">{{ i18n(RosettaStone.settings.spaces.add) }}
        </ButtonPrimary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Unsubscribe">
        <h1>{{ i18n(RosettaStone.settings.unsubscribe.title) }}</h1>
        <p>{{ i18n(RosettaStone.settings.unsubscribe.subtitle) }}</p>
        <div class="subscriptions">
          <div class="subscription">
            <span>Forbes milky under milky</span>
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.unsubscribe.unsubscribe) }}
            </ButtonSecondary>
          </div>
          <div class="subscription">
            <span>Yahoo Finance</span>
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.unsubscribe.unsubscribe) }}
            </ButtonSecondary>
          </div>
          <div class="subscription">
            <span>Milky newsletter</span>
            <ButtonSecondary class="save" color="red">{{ i18n(RosettaStone.settings.unsubscribe.unsubscribe) }}
            </ButtonSecondary>
          </div>
        </div>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Templates">
        <h1>{{ i18n(RosettaStone.settings.templates.title) }}</h1>
        <p class="mb-3">{{ i18n(RosettaStone.settings.templates.subtitle) }}</p>
        <br />
        <div class="template">
          <input :placeholder="i18n(RosettaStone.settings.templates.placeholder_title)" value="" />
          <div class="inline">
            <textarea :placeholder="i18n(RosettaStone.settings.templates.placeholder_body)"
              value="Hi, This is the content" />
            <ButtonSecondary class="save">{{ i18n(RosettaStone.settings.templates.save) }}</ButtonSecondary>
          </div>
        </div>
        <ButtonPrimary>{{ i18n(RosettaStone.settings.templates.new) }}</ButtonPrimary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Signatures">
        <h1>{{ i18n(RosettaStone.settings.signatures.title) }}</h1>
        <p class="mb-3">{{ i18n(RosettaStone.settings.signatures.subtitle) }}</p>
        <br />
        <div class="signature">
          <p>{{ i18n(RosettaStone.settings.signatures.for) }} ruben@aikomail.com</p>
          <div class="inline">
            <textarea placeholder="Signature" value="Best, Ruben Touitou" />
            <ButtonSecondary class="save">Save changes</ButtonSecondary>
          </div>
        </div>
        <div class="signature">
          <p>{{ i18n(RosettaStone.settings.signatures.for) }} rubencharles@aikomail.com</p>
          <div class="inline">
            <textarea placeholder="Signature" value="Best, Ruben Touitou" />
            <ButtonSecondary class="save">{{ i18n(RosettaStone.settings.signatures.save) }}</ButtonSecondary>
          </div>
        </div>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Billing">
        <h1>{{ i18n(RosettaStone.settings.billing.title) }}</h1>

        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.billing.plans) }}
        </h2>
        <p class="mb-5">{{ i18n(RosettaStone.settings.billing.plans_list) }}</p>
        <br />

        <div class="plan current">
          <img src="@Veil/assets/img/aikofree.svg" />
          <span>$0/{{ i18n(RosettaStone.settings.billing.month) }}</span>
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
          <ButtonSecondary>{{ i18n(RosettaStone.settings.billing.current) }}</ButtonSecondary>
        </div>

        <div class="plan">
          <img src="@Veil/assets/img/aikopro.svg" />
          <span>$12/{{ i18n(RosettaStone.settings.billing.month) }}</span>
          <span>{{ i18n(RosettaStone.settings.billing.cancel_info) }}</span>
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
          <ButtonPrimary>{{ i18n(RosettaStone.settings.billing.upgrade_to) }} Pro</ButtonPrimary>
        </div>

        <ButtonSecondary class="save">{{ i18n(RosettaStone.settings.billing.edit) }}</ButtonSecondary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Integrations">
        <h1>{{ i18n(RosettaStone.settings.integrations.title) }}</h1>

        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.integrations.subtitle) }}

        </h2>
        <p>{{ i18n(RosettaStone.settings.integrations.instructions) }}</p>

        <div class="integration">
          <h3>Zoom</h3>
          <p>{{ i18n(RosettaStone.settings.integrations.zoom) }}</p>
          <ButtonPrimary>{{ i18n(RosettaStone.settings.integrations.enable) }}</ButtonPrimary>
        </div>

        <div class="integration">
          <h3>Calendly</h3>
          <p>{{ i18n(RosettaStone.settings.integrations.calendly) }}</p>
          <ButtonSecondary>{{ i18n(RosettaStone.settings.integrations.disable) }}</ButtonSecondary>
        </div>

        <div class="integration">
          <h3>Zapier</h3>
          <p>{{ i18n(RosettaStone.settings.integrations.zapier) }}</p>
          <ButtonPrimary>{{ i18n(RosettaStone.settings.integrations.enable) }}</ButtonPrimary>
        </div>

        <h2>
          <div class="bullet" />
          {{ i18n(RosettaStone.settings.integrations.request) }}
        </h2>
        <p class="mb-2">
          {{ i18n(RosettaStone.settings.integrations.request_info) }}
        </p>
        <ButtonPrimary>{{ i18n(RosettaStone.settings.integrations.request_btn) }}</ButtonPrimary>
      </div>

      <div class="pane" v-if="selectedPane == Pane.Others">
        <h1>{{ i18n(RosettaStone.settings.others.title2) }}</h1>
        <p>
          Coming soon:<br />
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
  width: 160px;
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
  padding-top: 70px;
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
  padding: 20px 20px 50px 20px;
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

.plan a {
  position: absolute;
  bottom: 0;
  width: calc(100% - 40px);
  left: 0;
  margin: 10px 20px;
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

input+a {
  display: none;
  padding: 10px;
}

input:focus,
input:active {
  background: var(--primary-background-color);
  transition: 0.2s;
}

input:focus+a,
input:active+a {
  display: unset;
}

textarea+a {
  display: none;
}

textarea:focus+a,
textarea:active+a {
  display: unset;
}

.content p {
  margin-bottom: 3px !important;
  margin-top: 0px;
}

.content h2 {
  margin-bottom: 20px;
  margin-top: 40px;
}

.integration p {
  margin: 8px 0px;
}

.integration {
  width: 210px;
  display: inline-table;
  min-height: 170px;
  margin-right: 20px;
  text-align: center;
  background: var(--primary-background-color);
  padding: 10px 10px 20px 10px;
  border-radius: var(--primary-border-radius);
  margin-top: 20px;
  position: relative;
}

.integration a {
  position: absolute;
  bottom: 0;
  width: calc(100% - 40px);
  left: 0;
  margin: 10px 20px;
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
  margin-top: -3px;
}

.alert {
  margin-bottom: 100px;
  width: calc(100% - 13px);
  margin-left: 5px;
  margin-right: 0px;
  position: absolute;
  padding: 7px 7px 40px 7px;
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
  text-align: center;
  height: 28px;
  font-size: 13.5px !important;
  display: inline-grid;
  letter-spacing: 0 !important;
  position: absolute;
  bottom: 0;
  width: calc(100% - 10px);
  left: 0;
  margin: 5px 5px;
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

.alert h1:hover~div {
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

select {
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  border: 1px solid var(--secondary-background-color);
  padding: 5px;
  color: var(--primary-font-color);
  margin-right: 8px;
  outline: none !important;
}
</style>
