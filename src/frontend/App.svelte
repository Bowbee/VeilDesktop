<script lang="ts">
  import { onMount } from "svelte";
  import Component from "./Component.svelte";
  const api = (window as any).electronAPI;
  let wowDirectory: string;
  let addons: {[key: string]: {name: string, url: string, installedVersion: string}} = {
    "ElvUI": {name: "ElvUI", url: "https://api.github.com/repos/Bowbee/ElvUI/releases", installedVersion: ""},
  }
  let packs : {[key: string]: any} = {
  }

  const handleDirClick = async () => {
    console.log("clicked");
    const dir = await api.setWoWDirectory()
    if (dir) {
      wowDirectory = dir;
      console.log(wowDirectory);
    }
  }

  onMount(async () => {
    wowDirectory = await api.getWoWDirectory();
    const installed = await api.getInstalledAddons();
    if(installed) {
      Object.keys(installed).forEach((addon) => {
        if(addons[addon]){
          addons[addon].installedVersion = installed[addon];
        }
      });
      addons = addons;
    }
  });
</script>

<main>
  <div id="bg"></div>
  <p id="logo">Veil</p>
  <img id="pepe" src="../stuff/pepe.png" alt="pepe">
  <div class="bodyBox">
    <div class="container">
      <div id="settingsBar">
        <p class="title">Install To:</p>
        <input class="wowDirSelector" type="text" bind:value={wowDirectory} readonly on:click={() => {handleDirClick()}} placeholder="WoW Directory">
      </div>
    </div>
    <div class="container">
      <p class="title">ADDONS</p>
      {#each Object.keys(addons) as addon}
        <Component args={addons[addon]} />
      {/each}
    </div>
    <div class="container">
      <p class="title">RESOURCE PACKS</p>
      {#if Object.keys(packs).length > 0}
        {#each Object.keys(packs) as pack}
          <Component args={packs[pack]} />
        {/each}
      {:else}
        <p id="nopack" style="color: gray">None yet...</p>
      {/if}
    </div>
  </div>
</main>


<style>
  #nopack {
    font-family: 'Roboto Mono', monospace;
  }
  #pepe {
    height: 32px;
    position: absolute;
    bottom: 0;
    right: 0;
    opacity: 30%;
    user-select: none;
  }
  #logo {
    color: #f90019;
    font-size: 6em;
    font-weight: 100;
    position: absolute;
    top: 0;
    left: 0;
    margin-top: 4px;
    margin-left: 12px;
    font-family: 'Halloween';
  }
  main {
    text-align: center;
    padding: 0;
    max-width: 240px;
    margin: 0 0;
    height: 100vh;
    width: 100vw;
    position: absolute;
    top: 0;
    left: 0;
    overflow: hidden;
  }
  #settingsBar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .bodyBox {
    position: absolute;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100%;
    padding-top: 8rem;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .container {
    width: 70%;
    align-self: center;
    padding: 0.25em;
    border-radius: 0.1em;
    border:#76000c 2px solid;
    margin-bottom: 2em;
    background-color: #0c000146;
  }
  .title {
    font-size: 1.25em;
    font-weight: 500;
    color: rgb(182, 182, 182);
    font-family: 'Roboto Mono', monospace;
    text-align: start;
    margin: 0px !important;
    padding: 0.25em;
  }

  .wowDirSelector {
    background-color: #0c000180;
    border: black;
    font-family: 'Roboto Mono', monospace;
    color: rgb(182, 182, 182);
    width: 66%;
    margin: 4px;
  }

  main {
    max-width: none;
  }

</style>
