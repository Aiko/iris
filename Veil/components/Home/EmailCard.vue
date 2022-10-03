<script lang="ts" setup>

</script>

<template>
  <div class="email-card">
    <div class="row">
      <div class="col-8 p0 sender">
        Ruben Touitou from Aiko Mail
      </div>
      <div class="col-4 p0 date">
        Yesterday 9:36PM
      </div>
    </div>
    <div class="subject">
      Meeting request from rubentouitou.com
    </div>
    <div class="preview">
      Hi this is a reminder that this is a preview, not the full email, but when you click on quick reply, you can
      actually see all of it and scroll through its very nice
    </div>
    <div class="bottom">
      <div class="quick-action">
        <span>Quick Reply</span>
      </div>
      <div class="actions">
        reply
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
  width: calc(100% + 20px);
  height: 27px;
  margin-left: -10px;
  border-radius: 0 0 5px 5px;
  padding: 0 10px;
  margin-top: 2px;
}

.email-card .bottom span {
  color: var(--primary-color);
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
</style>