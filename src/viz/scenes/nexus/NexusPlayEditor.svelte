<script lang="ts">
  import { ControlPanel, type ControlPanelSetting, type ControlPanelState } from 'src/viz/UI/ControlPanel';
  import type { Viz } from 'src/viz';
  import {
    NEXUS_PLAY_DEFAULTS,
    applyNexusPlayPhysics,
    type NexusPlayPhysics,
  } from './nexusPlayBody';

  let { viz, initial }: { viz: Viz; initial: NexusPlayPhysics } = $props();

  let state: ControlPanelState = $state({ ...initial });

  const settings: ControlPanelSetting[] = [
    { type: 'range', key: 'gravity', label: 'Gravity', min: 4, max: 60, step: 0.5, initial: initial.gravity },
    {
      type: 'range',
      key: 'onGround',
      label: 'MM ground',
      min: 2,
      max: 28,
      step: 0.5,
      initial: initial.onGround,
    },
    { type: 'range', key: 'inAir', label: 'MM air', min: 2, max: 28, step: 0.5, initial: initial.inAir },
    {
      type: 'range',
      key: 'jumpVelocity',
      label: 'Jump velocity',
      min: 2,
      max: 40,
      step: 0.5,
      initial: initial.jumpVelocity,
    },
    {
      type: 'range',
      key: 'dashMagnitude',
      label: 'Dash distance',
      min: 2,
      max: 80,
      step: 1,
      initial: initial.dashMagnitude,
    },
    {
      type: 'button',
      label: 'Reset hub defaults',
      action: () => {
        state = { ...NEXUS_PLAY_DEFAULTS };
        applyNexusPlayPhysics(viz, NEXUS_PLAY_DEFAULTS);
      },
    },
  ];

  const onChange = (_key: string, _value: unknown, full: ControlPanelState) => {
    applyNexusPlayPhysics(viz, {
      gravity: Number(full.gravity),
      onGround: Number(full.onGround),
      inAir: Number(full.inAir),
      jumpVelocity: Number(full.jumpVelocity),
      dashMagnitude: Number(full.dashMagnitude),
    });
  };
</script>

<div class="nexus-play-editor">
  <ControlPanel title="F8 mobility (Ammo)" {settings} bind:state {onChange} width={280} />
</div>

<style>
  .nexus-play-editor {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 40;
    pointer-events: auto;
    background: rgba(12, 12, 14, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.12);
    padding: 6px;
  }
</style>
