import MarketDepth from "./MarketDepth.js";
import MarketDepthHorizontal from "./MarketDepthHorizontal.js";
export default {
  props: ["selectedTheme"],
  components: {
    "market-depth": MarketDepth,
    "market-depth-horizontal": MarketDepthHorizontal,
  },
  template: `<div>
  <div class="charts-container">
  <market-depth :selectedTheme="selectedTheme"></market-depth>
  <market-depth-horizontal :selectedTheme="selectedTheme"></market-depth-horizontal>
  </div>
  </div>
  `,
};
