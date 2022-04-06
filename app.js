import Charts from "./Charts.js";

const themeOptions = {
  dark: {
    textPrimary: "#ffffff",
    grayLight: "#4d4d4d",
    grayDark: "#ebebeb",
    blue: "#5757ff",
    svgBg: "#000000",
    askLine: "#e80b3a",
    askRect: "#300000",
    bidLine: "#00aa40",
    bidRect: "#00200c",
    border: "#333333",
  },
  light: {
    textPrimary: "#ffffff",
    grayLight: "#d3d3d3",
    grayDark: "#8b8b8b",
    blue: "darkblue",
    svgBg: "#ffffff",
    askLine: "#ff5050",
    askRect: "#ffe5ec",
    bidLine: "#3cd83c",
    bidRect: "#d9ffe7",
    border: "#f6f6f6",
  },
};

const app = Vue.createApp({
  components: {
    charts: Charts,
  },
  data: function () {
    return {
      isDark: false,
    };
  },
  computed: {
    selectedTheme() {
      return themeOptions[this.isDark ? "dark" : "light"];
    },
  },
  watch: {
    isDark(newVal, oldVal) {
      if (newVal) {
        d3.select("body").style("background", "#000000");
        d3.selectAll("div").style("color", "#ffffff");
      } else {
        d3.select("body").style("background", "#ffffff");
        d3.selectAll("div").style("color", "#000000");
      }
    },
  },
  template: `<div class="app-container">
  <label class="toggle">
    <span class="toggle-icon-sun" :style="{visibility: isDark ? 'visible' : 'hidden'}">🌞</span>
    <input
      v-model="isDark"
      class="toggle-checkbox"
      type="checkbox"
      checked
    />
    <div class="toggle-switch"></div>
    <span class="toggle-icon-moon" :style="{visibility: isDark ? 'hidden' : 'visible'}">🌙</span>
  </label>
  <div class="info-section">
  <h1>Market Depth Visualization</h1>
  <ul>
    <li>
      You can interact with the chart by
      <strong>hovering or scrolling your <i class="fas fa-mouse"></i></strong>
    </li>
    <li>Dotted lines shows support and resistance spots.</li>
    <li>
      Used rects as a horizontal bars and lines for coloring the edges.
    </li>
    <li>
      <span style="color: #3cd83c">Greens</span> represents bids(buyers)
      and <span style="color: #ff5050">Reds</span> represents
      asks(sellers).
    </li>
    <li>
      Rectangles heights&widths calculating dynamically for react any orderbook
      changes.
    </li>
  </ul>
</div>
<charts :selectedTheme="selectedTheme" />
</div>`,
});
app.mount("#app");
