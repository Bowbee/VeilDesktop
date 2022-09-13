<script lang="ts">
  import {onMount} from "svelte";
  export let args: {name: string, url: string, installedVersion: string};
  let data = {
    latestVersion: "",
    downloadUrl: "",
  };
  let installing = false;
  const githubData = async () => {
    const response = await fetch(args.url);
    const json = await response.json();
    // filter for latest release.
    const latest = json[0];
    console.log(latest);
    data.latestVersion = latest.tag_name;
    data.downloadUrl = latest.assets[0].browser_download_url;
    console.log(data);
    if(args.installedVersion === "") {
      console.log("not installed.");
    } else if(data.latestVersion === args.installedVersion) {
      console.log("up to date");
    } else {
      console.log("update available");
      installAddon();
    }
  };
  const installAddon = async () => {
    console.log("installing addon");
    const api = (window as any).electronAPI;
    installing = true;
    const installedItems = await api.installAddon({name: args.name, url: data.downloadUrl, version: data.latestVersion});
    console.log(installedItems);
    installing = false;
  };
  onMount(async () => {
    await githubData();
    setInterval(async () => {
      await githubData();
      console.log('Refreshing');
    }, 120000);
  });
</script>

<div class="addonBox">
  <div class="subBox">
    <span class="addonName">{args.name}</span>
    {#if !installing}
      <span class="version">{args.installedVersion}</span>
    {/if}
  </div>
  <div class="subBox">
    {#if installing}
      <span class="version">Installing...</span>
    {:else}
      {#if args.installedVersion !== "" && data.latestVersion !== args.installedVersion}
        <span class="version orange">{"Update!"}</span>
        <img id="download" alt="" src="../stuff/dl.svg" on:click={() => {installAddon()}} />
      {/if}
      {#if args.installedVersion !== "" && data.latestVersion === args.installedVersion}
        <span class="version green">{"Up to date!"}</span>
      {/if}
      {#if args.installedVersion === ""}
        <img id="download" alt="" src="../stuff/dl.svg" on:click={() => {installAddon()}} />
      {/if}
    {/if}
  </div>
</div>

<style>
  .orange {
    color: orange !important;
  }
  .addonBox {
    align-self: center;
    margin: 1em 1em 1em 1em;
    border-radius: 0.1em;
    border:#76000c 2px solid;
    background-color: #0c000163;
    padding: 0.25em;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 3em;
  }
  .subBox {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .addonName {
    font-size: 1.25em;
    font-weight: 500;
    color: rgb(222, 222, 222);
    font-family: 'Roboto Mono', monospace;
    text-align: start;
    margin: 0px !important;
    padding: 0.25em;
  }
  .version {
    font-size: 1em;
    font-weight: 500;
    color: rgb(179, 179, 179);
    font-family: 'Roboto Mono', monospace;
    text-align: start;
    margin: 0px !important;
    padding: 0.25em;
  }
  #download {
    color: white;
    filter: invert(100%);
    opacity: 50%;
    height: 20px;
    border: rgba(0, 0, 0) 1px solid;
    border-radius: 0.25em;
    padding: 0.5em;
    margin: 0.25em;
    cursor: pointer;
  }

</style>
