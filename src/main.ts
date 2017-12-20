import Vue from "vue";
import VueRouter from "vue-router";

import App from "./components/App";
import Boilerplate from "./components/Boilerplate";
import { ReadFile } from "./utils";

import {privkey} from "./keys";

const openpgp = require("openpgp");

openpgp.initWorker({ path: "/openpgp/dist/openpgp.worker.js" }); // set the relative web worker path

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log(
        "ServiceWorker registration successful with scope: ",
        reg.scope
      );
    } catch (error) {
      console.log("ServiceWorker registration failed :(", error);
    }
  });

  navigator.serviceWorker.addEventListener("message", async event => {
    console.log(`Found an encrypted thing to parse!`, event.data);

    const array = await ReadFile(event.data.blob);
    const options = {
      message: openpgp.message.read(array),
      password: "hello world",
      privateKey: privkey
    };

    const decrypted = await openpgp.decrypt(options);
    const response = event.data;
    response.blob = new Blob([decrypted.data]);
    console.log("Sending decrypted response to SW", response);
    navigator.serviceWorker.controller.postMessage(response);
  });
}

Vue.use(VueRouter);

const router = new VueRouter({
  mode: "history",
  routes: [
    { path: "/", component: App },
    { path: "/boilerplate", component: Boilerplate }
  ]
});

new Vue({
  el: "#app",
  router
});
