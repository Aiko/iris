<script lang="ts" setup>


const props = defineProps<{
  preview?: number;
}>()

</script>

<template>
  <!--START Single Listogram (the g100 is percentage of bar graph)-->
  <div class="filter-listogram">
    <div class="col one">
      <input type="checkbox" checked class="listogram-checkbox" />
      <div class="listogram-label">Black</div>
    </div>
    <div class="col two">
      <div class="listogram-number">222</div>
    </div>
    <div class="col three">
      <div class="listogram-graph g100"></div>
    </div>
  </div>
  <!--END Single Listogram-->


  <!--START Single Listogram-->
  <div class="filter-listogram">
    <div class="col one">
      <input type="checkbox" checked class="listogram-checkbox" />
      <div class="listogram-label">Black</div>
    </div>
    <div class="col two">
      <div class="listogram-number">112</div>
    </div>
    <div class="col three">
      <div class="listogram-graph g40"></div>
    </div>
  </div>
  <!--END Single Listogram-->


  <!--START Single Listogram-->
  <div class="filter-listogram ">
    <div class="col one">
      <input type="checkbox" checked class="listogram-checkbox" />
      <div class="listogram-label">Black</div>
    </div>
    <div class="col two">
      <div class="listogram-number">16</div>
    </div>
    <div class="col three">
      <div class="listogram-graph g20"></div>
    </div>
  </div>
  <!--END Single Listogram-->




  <!--Show more button-->
  <div class="filter-show-more">Show more</div>
</template>

<style lang="scss" scoped>
.filter-listogram {
  cursor: pointer;
  opacity: .8;
  transition: .2s;
  display: flex;
  margin-bottom: 3px;
}

.filter-listogram:hover {
  opacity: 1;
  transition: .2s;
}

[type=checkbox]::before {
  background-color: #000000ba !important;
}

[type=checkbox]:checked::before {
  background-color: #5f5f5f !important;
}

.listogram-checkbox {
  width: 17px;
  height: 17px;
  outline: none;
  border: none !important;
  margin-right: 6px;
  display: inline-block;
}

.listogram-label {
  color: var(--primary-font-color);
  margin-top: -2px;
  font-size: 14px;
  white-space: nowrap;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.listogram-number {
  color: var(--primary-font-color);
  font-size: 14px;
  text-align: right;
  margin-top: -2px;
  opacity: .6;
}

.listogram-graph {
  width: 50px;
  margin-top: 1px;
  height: 15px;

  background-color: var(--primary-color);
  border-radius: 2px;

}

.filter-show-more {
  width: 100%;
  text-align: center;
  color: var(--primary-font-color);
  font-size: 13px;
  cursor: pointer;
  margin-top: 10px;
  transition: .2s;
  border: 1px solid var(--primary-background-color);
  background-color: var(--primary-background-color);
  border-radius: var(--primary-border-radius);
  padding: 2px;
  opacity: .8;
}

[type=checkbox]:checked::before {
  background-color: #3d3d3d !important;
}

.filter-show-more:hover {
  opacity: 1;
  transition: .2s;
}




.col {
  flex-grow: 1;
  padding: 0 2px;
}

.one {
  display: inline-flex;
  text-align: left;
  padding-left: 0;
  max-width: 60%;
}

.three {
  width: 40px;
  max-width: 40px;
}

.g1 {
  width: 1%;
}

.g2 {
  width: 2%;
}

.g3 {
  width: 3%;
}

.g4 {
  width: 4%;
}

.g5 {
  width: 5%;
}

.g6 {
  width: 6%;
}

.g7 {
  width: 7%;
}

.g8 {
  width: 8%;
}

.g9 {
  width: 9%;
}

.g10 {
  width: 10%;
}

.g11 {
  width: 11%;
}

.g12 {
  width: 12%;
}

.g13 {
  width: 13%;
}

.g14 {
  width: 14%;
}

.g15 {
  width: 15%;
}

.g16 {
  width: 16%;
}

.g17 {
  width: 17%;
}

.g18 {
  width: 18%;
}

.g19 {
  width: 19%;
}

.g20 {
  width: 20%;
}

.g21 {
  width: 21%;
}

.g22 {
  width: 22%;
}

.g23 {
  width: 23%;
}

.g24 {
  width: 24%;
}

.g25 {
  width: 25%;
}

.g26 {
  width: 26%;
}

.g27 {
  width: 27%;
}

.g28 {
  width: 28%;
}

.g29 {
  width: 29%;
}

.g30 {
  width: 30%;
}

.g31 {
  width: 31%;
}

.g32 {
  width: 32%;
}

.g33 {
  width: 33%;
}

.g34 {
  width: 34%;
}

.g35 {
  width: 35%;
}

.g36 {
  width: 36%;
}

.g37 {
  width: 37%;
}

.g38 {
  width: 38%;
}

.g39 {
  width: 39%;
}

.g40 {
  width: 40%;
}

.g41 {
  width: 41%;
}

.g42 {
  width: 42%;
}

.g43 {
  width: 43%;
}

.g44 {
  width: 44%;
}

.g45 {
  width: 45%;
}

.g46 {
  width: 46%;
}

.g47 {
  width: 47%;
}

.g48 {
  width: 48%;
}

.g49 {
  width: 49%;
}

.g50 {
  width: 50%;
}

.g51 {
  width: 51%;
}

.g52 {
  width: 52%;
}

.g53 {
  width: 53%;
}

.g54 {
  width: 54%;
}

.g55 {
  width: 55%;
}

.g56 {
  width: 56%;
}

.g57 {
  width: 57%;
}

.g58 {
  width: 58%;
}

.g59 {
  width: 59%;
}

.g60 {
  width: 60%;
}

.g61 {
  width: 61%;
}

.g62 {
  width: 62%;
}

.g63 {
  width: 63%;
}

.g64 {
  width: 64%;
}

.g65 {
  width: 65%;
}

.g66 {
  width: 66%;
}

.g67 {
  width: 67%;
}

.g68 {
  width: 68%;
}

.g69 {
  width: 69%;
}

.g70 {
  width: 70%;
}

.g71 {
  width: 71%;
}

.g72 {
  width: 72%;
}

.g73 {
  width: 73%;
}

.g74 {
  width: 74%;
}

.g75 {
  width: 75%;
}

.g76 {
  width: 76%;
}

.g77 {
  width: 77%;
}

.g78 {
  width: 78%;
}

.g79 {
  width: 79%;
}

.g80 {
  width: 80%;
}

.g81 {
  width: 81%;
}

.g82 {
  width: 82%;
}

.g83 {
  width: 83%;
}

.g84 {
  width: 84%;
}

.g85 {
  width: 85%;
}

.g86 {
  width: 86%;
}

.g87 {
  width: 87%;
}

.g88 {
  width: 88%;
}

.g89 {
  width: 89%;
}

.g90 {
  width: 90%;
}

.g91 {
  width: 91%;
}

.g92 {
  width: 92%;
}

.g93 {
  width: 93%;
}

.g94 {
  width: 94%;
}

.g95 {
  width: 95%;
}

.g96 {
  width: 96%;
}

.g97 {
  width: 97%;
}

.g98 {
  width: 98%;
}

.g99 {
  width: 99%;
}

.g100 {
  width: 100%;
}

input {
  cursor: pointer !important;
}
</style>
