<template>
  <div v-if="isOverlayShown" data-overlay>
    <slot name="popup" :isOverlayShown="isOverlayShown"></slot>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

@Component
export default class Overlay extends Vue {
  @Prop({ default: false }) showOverlay!: boolean;

  isOverlayShown = this.showOverlay;

  @Watch('showOverlay')
  overlayVisibilityChanged(newValue: boolean): void {
    this.isOverlayShown = newValue;
  }
}
</script>

<style lang="scss">
@import '../../../sass/main.scss';

[data-overlay] {
  display: block !important;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999998 !important;
}
</style>
