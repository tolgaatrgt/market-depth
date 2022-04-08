export default {
  template: `<div id="market_depth_container_h"></div>`,
  data: () => {
    return {
      chartData: null,
      scope: 1,
      chartWidth: 750,
      chartHeight: 250,
      renderTask: null,
      lastMouseX: null,
      lastMouseY: null,
    };
  },
  props: ["selectedTheme"],
  created() {
    this.fillData();
  },
  mounted() {
    this.renderChart();
    this.renderTask = setInterval(() => {
      this.fillData();
      this.renderChart();
    }, 1000);
  },
  unmounted() {
    clearInterval(this.renderTask);
  },
  methods: {
    onWheel(direction) {
      if (!direction && this.scope <= 0.95) {
        this.scope = Number((this.scope + 0.05).toFixed(2));
      } else if (direction && this.scope > 0.05) {
        this.scope = Number((this.scope - 0.05).toFixed(2));
      }
    },
    getRandomNumberBetween(min, max) {
      return Math.floor(Math.random() * (max - min + 1) + min);
    },
    orderBookGenerator() {
      const asks = [];
      const bids = [];
      const askAmount = this.getRandomNumberBetween(100, 200);
      const bidAmount = this.getRandomNumberBetween(100, 200);
      for (var i = 0; i < askAmount; i++) {
        const dummyOrder = {};
        dummyOrder.price = this.getRandomNumberBetween(105, 200);
        dummyOrder.volume = this.getRandomNumberBetween(10, 100);
        asks.push(dummyOrder);
      }
      for (var i = 0; i < bidAmount; i++) {
        const dummyOrder = {};
        dummyOrder.price = this.getRandomNumberBetween(0, 100);
        dummyOrder.volume = this.getRandomNumberBetween(10, 100);
        bids.push(dummyOrder);
      }
      const orderBook = { asks: asks, bids: bids };
      return orderBook;
    },
    fillData() {
      let orderData = this.orderBookGenerator();
      let filledData = {};
      let asks = orderData.asks.sort((a, b) => a.price - b.price);
      let bids = orderData.bids.sort((a, b) => b.price - a.price);

      let askNormalizedData = [];
      let bidNormalizedData = [];

      for (var i = 0; i < asks.length; i++) {
        if (i > 0) {
          asks[i].totalVolume = asks[i - 1].totalVolume + asks[i].volume;
          if (asks[i].price > asks[i - 1].price) {
            askNormalizedData.push(asks[i]);
          } else {
            asks[i].volume +=
              askNormalizedData[askNormalizedData.length - 1].volume;
            askNormalizedData[askNormalizedData.length - 1] = asks[i];
          }
        } else {
          asks[i].totalVolume = asks[i].volume;
          askNormalizedData.push(asks[i]);
        }
      }
      asks = askNormalizedData;

      for (var i = 0; i < bids.length; i++) {
        if (i > 0) {
          bids[i].totalVolume = bids[i - 1].totalVolume + bids[i].volume;
          if (bids[i].price < bids[i - 1].price) {
            bidNormalizedData.push(bids[i]);
          } else {
            bids[i].volume +=
              bidNormalizedData[bidNormalizedData.length - 1].volume;
            bidNormalizedData[bidNormalizedData.length - 1] = bids[i];
          }
        } else {
          bids[i].totalVolume = bids[i].volume;
          bidNormalizedData.push(bids[i]);
        }
      }

      bids = bidNormalizedData;
      filledData.asks = asks;
      filledData.bids = bids;
      this.chartData = filledData;
    },
    renderChart() {
      const theme = this.selectedTheme;
      d3.selectAll("#market_depth_container_h svg").remove();
      let displayData = this.displayData;
      const unscopedData = this.chartData;
      let minVolume = d3.min(
        [...displayData.asks, ...displayData.bids],
        (d) => d.totalVolume
      );
      let maxVolume = d3.max(
        [...displayData.asks, ...displayData.bids],
        (d) => d.totalVolume
      );
      let minAsk = d3.min(displayData.asks, (d) => d.price);
      let maxAsk = d3.max(displayData.asks, (d) => d.price);
      let minBid = d3.min(displayData.bids, (d) => d.price);
      let maxBid = d3.max(displayData.bids, (d) => d.price);
      let midPrice = (minAsk + maxBid) / 2;

      let scaleSpacing = 40;
      let rightSpacing = 50;
      let leftSpacing = 20;
      let topSpacing = 20;
      let svg = d3
        .select("#market_depth_container_h")
        .append("svg")
        .attr("width", this.chartWidth)
        .attr("min-width", this.chartWidth)
        .attr("height", this.chartHeight)
        .style("background", "transparent");

      const xScale = d3
        .scaleLinear()
        .domain([
          displayData.asks.length > 1
            ? d3.max(displayData.asks, (d) => d.price)
            : 2 * d3.max(displayData.asks, (d) => d.price) ||
              2 * d3.max(displayData.bids, (d) => d.price),
          displayData.bids.length > 1
            ? d3.min(displayData.bids, (d) => d.price)
            : 0,
        ])
        .range([0, this.chartWidth - scaleSpacing - leftSpacing]);

      const yScale = d3
        .scaleLinear()
        .domain([0, maxVolume])
        .range([this.chartHeight - scaleSpacing, 0]);

      let xAxisGenerator = d3.axisBottom(xScale).ticks(6);
      let yAxisGenerator = d3
        .axisRight(yScale)
        .tickValues([minVolume, maxVolume]);

      ///////////////////////////////////////////////////////

      function getStandardDeviation(arr) {
        const volumes = arr.map((item) => item.volume);
        const n = volumes.length;
        const mean = volumes.reduce((a, b) => a + b, 0) / n;
        return Math.sqrt(
          volumes.map((v) => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) /
            n
        );
      }
      function getDynamicWidth(d, i, orderType) {
        if (orderType === "ask") {
          if (i < displayData.asks.length - 1) {
            return (
              Math.abs(
                xScale(d.price) - xScale(displayData.asks[i + 1].price)
              ) + 1
            );
          } else {
            if (displayData.asks.length < 2) {
              return Math.abs(xScale(d.price) - xScale(d.price * 2)) + 10;
            }
            return 10; //for the highest ask
          }
        } else if (orderType === "bid") {
          if (i < displayData.bids.length - 1) {
            return (
              Math.abs(
                xScale(d.price) - xScale(displayData.bids[i + 1].price)
              ) + 1
            );
          } else {
            if (displayData.bids.length < 2) {
              return Math.abs(xScale(d.price) - xScale(0)) + 10;
            }
            return 10; // for the lowest bid
          }
        }
      }

      let xAxis = svg
        .append("g")
        .attr(
          "transform",
          `translate(${-rightSpacing},${-topSpacing} ) rotate(180)`
        )
        .attr("transform-origin", "center")
        .call(xAxisGenerator);

      xAxis.select(".domain").attr("stroke", "none").attr("stroke-width", "2");

      xAxis
        .selectAll(".tick text")
        .attr("font-size", "12px")
        .attr("color", "#8f8f8f")
        .attr("transform", "rotate(180)");

      xAxis.selectAll(".tick line").remove();

      let yAxis = svg
        .append("g")
        .attr(
          "transform",
          `translate(${this.chartWidth - rightSpacing + 5}, ${topSpacing})`
        ) // 0 works well but should fix for the right bisector value after spacing!!!!!
        .call(yAxisGenerator);

      yAxis.select(".domain").attr("stroke", "none").attr("stroke-width", "2");

      yAxis
        .selectAll(".tick text")
        .attr("font-size", "12px")
        .attr("color", "#8f8f8f");

      yAxis.selectAll(".tick line").remove();

      let rectAsks = svg.selectAll(".askRect_h").data(displayData.asks);
      let rectBids = svg.selectAll(".bidRect_h").data(displayData.bids);

      rectAsks
        .enter()
        .append("rect")
        .attr("class", "askRect_h")
        .attr("height", (d) => yScale(0) - yScale(d.totalVolume))
        .attr("width", (d, i) => getDynamicWidth(d, i, "ask"))
        .attr("x", (d, i) => this.chartWidth - xScale(d.price) - rightSpacing)
        .attr("y", (d, i) => yScale(d.totalVolume) + topSpacing)
        .style("fill", theme.askRect);

      rectBids
        .enter()
        .append("rect")
        .attr("class", "bidRect_h")
        .attr("height", (d) => yScale(0) - yScale(d.totalVolume))
        .attr("width", (d, i) => getDynamicWidth(d, i, "bid"))
        .attr(
          "x",
          (d, i) =>
            this.chartWidth -
            xScale(d.price) -
            rightSpacing -
            getDynamicWidth(d, i, "bid")
        )
        .attr("y", (d, i) => yScale(d.totalVolume) + topSpacing)
        .style("fill", theme.bidRect);

      let stdDevAsks = getStandardDeviation(displayData.asks);
      let stdDevBids = getStandardDeviation(displayData.bids);

      displayData.asks.forEach((d, i) => {
        svg
          .append("line") // vertical
          .style("stroke", theme.askLine)
          .style("stroke-width", 2)
          .attr("x1", this.chartWidth - xScale(d.price) - rightSpacing)
          .attr("x2", this.chartWidth - xScale(d.price) - rightSpacing)
          .attr("y1", yScale(d.totalVolume) + topSpacing)
          .attr("y2", () => {
            if (i > 0) {
              return yScale(displayData.asks[i - 1].totalVolume) + topSpacing;
            } else {
              if (displayData.asks.length === 1) {
                return this.chartHeight - topSpacing; // just in case there is only 1 ask order.
              }
              return this.chartHeight - topSpacing; //for the highest ask
            }
          });

        if (i < displayData.asks.length - 1) {
          svg
            .append("line") // horizontal
            .style("stroke", theme.askLine)
            .style("stroke-width", 2)
            .attr("x1", this.chartWidth - xScale(d.price) - rightSpacing)
            .attr(
              "x2",
              this.chartWidth -
                xScale(displayData.asks[i + 1].price) -
                rightSpacing
            )
            .attr("y1", yScale(d.totalVolume) + topSpacing)
            .attr("y2", yScale(d.totalVolume) + topSpacing);
        } else {
          svg
            .append("line") // horizontal (for the last ask)
            .style("stroke", theme.askLine)
            .style("stroke-width", 2)
            .attr("x1", this.chartWidth - xScale(d.price) - rightSpacing)
            .attr("x2", this.chartWidth - rightSpacing + 10)
            .attr("y1", yScale(d.totalVolume) + topSpacing)
            .attr("y2", yScale(d.totalVolume) + topSpacing);
        }

        /*                   if (i < displayData.asks.length - 1) {
          if (
            displayData.asks[i + 1].totalVolume - d.totalVolume >
            stdDevAsks * 3
          ) {
            svg // adding vertical lines for support and resistance spots.
              .append("line")
              .attr("class", "supResLine_h")
              .style("stroke", "#eaeaea")
              .style("stroke-width", 1)
              .style("stroke-dasharray", "5,5")
              .attr("x1", 0)
              .attr(
                "x2",
                this.chartWidth -
                  xScale(displayData.asks[i + 1].totalVolume) -
                  rightSpacing
              )
              .attr("y1", yScale(displayData.asks[i + 1].price) + topSpacing)
              .attr("y2", yScale(displayData.asks[i + 1].price) + topSpacing);

            svg
              .append("text")
              .style("fill", "#8b8b8b")
              .style("font-family", "PT Mono")
              .style("font-size", '12px')
              .attr("x", 0)
              .attr("y", yScale(displayData.asks[i + 1].price) + topSpacing - 2)
              .text(displayData.asks[i + 1].price.toFixed(2));
          }
        } */
      });

      displayData.bids.forEach((d, i) => {
        svg
          .append("line") // vertical
          .style("stroke", theme.bidLine)
          .style("stroke-width", 2)
          .attr("x1", this.chartWidth - xScale(d.price) - rightSpacing)
          .attr("x2", this.chartWidth - xScale(d.price) - rightSpacing)
          .attr("y1", yScale(d.totalVolume) + topSpacing)
          .attr("y2", () => {
            if (i > 0) {
              return yScale(displayData.bids[i - 1].totalVolume) + topSpacing;
            } else {
              if (displayData.bids.length === 1) {
                return this.chartHeight - topSpacing; // just in case there is only 1 bid order.
              }
              return this.chartHeight - topSpacing; //for the highest bid
            }
          });

        if (i < displayData.bids.length - 1) {
          svg
            .append("line") // horizontal
            .style("stroke", theme.bidLine)
            .style("stroke-width", 2)
            .attr("x1", this.chartWidth - xScale(d.price) - rightSpacing)
            .attr(
              "x2",
              this.chartWidth -
                xScale(displayData.bids[i + 1].price) -
                rightSpacing
            )
            .attr("y1", yScale(d.totalVolume) + topSpacing)
            .attr("y2", yScale(d.totalVolume) + topSpacing);
        } else {
          svg
            .append("line") // horizontal (for the last bid)
            .style("stroke", theme.bidLine)
            .style("stroke-width", 2)
            .attr("x1", this.chartWidth - xScale(d.price) - rightSpacing)
            .attr(
              "x2",
              displayData.bids.length === 1
                ? 0
                : this.chartWidth - xScale(d.price) - rightSpacing - 10
            )
            .attr("y1", yScale(d.totalVolume) + topSpacing)
            .attr("y2", yScale(d.totalVolume) + topSpacing);
        }

        /*         if (i < displayData.bids.length - 1) {
          if (
            displayData.bids[i + 1].totalVolume - d.totalVolume >
            stdDevBids * 3
          ) {
            svg // adding horizontal lines for support and resistance spots.
              .append("line")
              .attr("class", "supResLine_h")
              .style("stroke", "#eaeaea")
              .style("stroke-width", 1)
              .style("stroke-dasharray", "5,5")
              .attr("x1", 0)
              .attr(
                "x2",
                this.chartWidth - xScale(d.totalVolume) - rightSpacing
              )
              .attr("y1", yScale(displayData.bids[i + 1].price) + topSpacing)
              .attr("y2", yScale(displayData.bids[i + 1].price) + topSpacing);

            svg
              .append("text")
              .style("fill", "#8b8b8b")
              .style("font-family", "PT Mono")
              .style("font-size", '12px')
              .attr("x", 0)
              .attr(
                "y",
                yScale(d.price) + topSpacing + getDynamicHeight(d, i, "bid") - 2
              )
              .text(displayData.bids[i + 1].price.toFixed(2));
          }
        } */
      });

      svg.append("g").attr("id", "midPriceLabel_h");

      let midPriceLabel = d3.selectAll("#midPriceLabel_h");
      if (midPrice) {
        midPriceLabel
          .append("rect")
          .attr("width", midPrice.toFixed(2).length * 7.25)
          .attr("height", "1.25rem")
          .attr("y", this.chartHeight - topSpacing + 2)
          .attr(
            "x",
            this.chartWidth -
              xScale(midPrice) -
              rightSpacing -
              (midPrice.toFixed(2).length * 7.25) / 2
          ) // dynamic width of rect based on its text length.
          .style("fill", theme.blue);

        midPriceLabel
          .append("text")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .style("fill", theme.textPrimary)
          .attr("y", this.chartHeight - topSpacing + 15)
          .attr(
            "x",
            this.chartWidth -
              xScale(midPrice) -
              rightSpacing -
              (midPrice.toFixed(2).length * 7.25) / 2 +
              2
          ) // dynamic text placement based on width of container rect.
          .text(midPrice.toFixed(2));
      }

      //////////////////// STANDART DEVIATION LEVELS ////////////////////

      // -- STD. DEV. OF PROB. DIST.

      //////////////////////

      // section in below keep coord. tooltips in the chart on mousemove end.
      let x = this.lastMouseX;
      let y = this.lastMouseY;
      if (x && y) {
        let yPrice = yScale.invert(y - topSpacing);
        let xTotalVolume = xScale.invert(this.chartWidth - x - rightSpacing);

        svg.append("g").attr("id", "yTooltip_h");
        svg.append("g").attr("id", "xTooltip_h");

        let yTooltip = d3.selectAll("#yTooltip_h");
        let xTooltip = d3.selectAll("#xTooltip_h");

        yTooltip
          .append("rect")
          .attr("width", "2.5rem")
          .attr("height", "1.25rem")
          .attr("y", y - 10) // - 10 for its height(20px)/2 to centering.
          .attr("x", this.chartWidth - rightSpacing + 10)
          .style("fill", "red");

        yTooltip
          .append("text")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .style("fill", theme.textPrimary)
          .attr("y", y + 4)
          .attr("x", this.chartWidth - rightSpacing + 11)
          .text(Number(yPrice.toFixed(1)));

        svg
          .append("line")
          .attr("id", "yTooltipLine_h")
          .attr("x1", this.chartWidth - rightSpacing + 10)
          .attr("x2", 0)
          .attr("y1", y)
          .attr("y2", y)
          .style("stroke", theme.grayDark)
          .style("stroke-width", 1)
          .style("cursor", "cell")
          .style("stroke-dasharray", "2,2")
          .style("pointer-events", "none");

        xTooltip
          .append("rect")
          .attr("width", xTotalVolume.toFixed(2).length * 7.25)
          .attr("height", "1.25rem")
          .attr("x", x - (xTotalVolume.toFixed(2).length * 7.25) / 2)
          .attr("y", this.chartHeight - topSpacing + 2)
          .style("fill", "red");

        xTooltip
          .append("text")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .style("fill", theme.textPrimary)
          .attr("x", x - (xTotalVolume.toFixed(2).length * 7.25) / 2 + 2)
          .attr("y", this.chartHeight - 5)
          .text(xTotalVolume.toFixed(2));

        svg
          .append("line")
          .attr("id", "xTooltipLine_h")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", 0)
          .attr("y2", this.chartHeight - topSpacing)
          .style("stroke", theme.grayDark)
          .style("stroke-width", 1)
          .style("cursor", "cell")
          .style("stroke-dasharray", "2,2")
          .style("pointer-events", "none");
      }
      //

      /////////////////////////////////////////////////////// mouse events

      let overlay = svg
        .append("rect")
        .attr("id", "overlay_h")
        .attr("width", this.chartWidth)
        .attr("height", this.chartHeight - topSpacing)
        .attr("x", 0)
        .attr("y", 0)
        .style("pointer-events", "all")
        .style("fill", "none")
        .style("cursor", "cell");

      overlay.on("mousemove", (e) => {
        d3.selectAll(
          "#yTooltip_h, #yTooltipLine_h, #xTooltip_h, #xTooltipLine_h"
        ).remove();

        let coordinates = d3.pointer(e);
        let x = coordinates[0];
        let y = coordinates[1];
        this.lastMouseX = x;
        this.lastMouseY = y;
        let yPrice = yScale.invert(y - topSpacing);
        let xTotalVolume = xScale.invert(this.chartWidth - x - rightSpacing);

        svg.append("g").attr("id", "yTooltip_h");

        svg.append("g").attr("id", "xTooltip_h");

        let yTooltip = d3.selectAll("#yTooltip_h");
        let xTooltip = d3.selectAll("#xTooltip_h");

        yTooltip
          .append("rect")
          .attr("width", "2.5rem")
          .attr("height", "1.25rem")
          .attr("y", y - 10) // - 10 for its height(20px)/2 to centering.
          .attr("x", this.chartWidth - rightSpacing + 10)
          .style("fill", "red");

        yTooltip
          .append("text")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .style("fill", theme.textPrimary)
          .attr("y", y + 4)
          .attr("x", this.chartWidth - rightSpacing + 11)
          .text(Number(yPrice.toFixed(1)));

        svg
          .append("line")
          .attr("id", "yTooltipLine_h")
          .attr("x1", this.chartWidth - rightSpacing + 10)
          .attr("x2", 0)
          .attr("y1", y)
          .attr("y2", y)
          .style("stroke", theme.grayDark)
          .style("stroke-width", 1)
          .style("cursor", "cell")
          .style("stroke-dasharray", "2,2")
          .style("pointer-events", "none");

        xTooltip
          .append("rect")
          .attr("width", xTotalVolume.toFixed(2).length * 7.25)
          .attr("height", "1.25rem")
          .attr("x", x - (xTotalVolume.toFixed(2).length * 7.25) / 2)
          .attr("y", this.chartHeight - topSpacing + 2)
          .style("fill", "red");

        xTooltip
          .append("text")
          .style("font-size", "11px")
          .style("font-weight", "bold")
          .style("fill", theme.textPrimary)
          .attr("x", x - (xTotalVolume.toFixed(2).length * 7.25) / 2 + 2)
          .attr("y", this.chartHeight - 5)
          .text(xTotalVolume.toFixed(2));

        svg
          .append("line")
          .attr("id", "xTooltipLine_h")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", 0)
          .attr("y2", this.chartHeight - topSpacing)
          .style("stroke", theme.grayDark)
          .style("stroke-width", 1)
          .style("cursor", "cell")
          .style("stroke-dasharray", "2,2")
          .style("pointer-events", "none");
      });
      //

      const mdWrapper = d3.selectAll(".md-wrapper");

      overlay.on("mousenter", (e) => {});

      overlay.on("mouseleave", (e) => {
        d3.selectAll("#yTooltip_h").remove();
        d3.selectAll("#yTooltipLine_h").remove();
        d3.selectAll("#xTooltip_h").remove();
        d3.selectAll("#xTooltipLine_h").remove();
        d3.selectAll(".supResLine_h").style("visibility", "visible");
        this.lastMouseX = null;
        this.lastMouseY = null;
      });

      svg.on("wheel", (e) => {
        let direction = e.wheelDelta < 0;
        direction ? this.onWheel(false) : this.onWheel(true);
      });

      mdWrapper.on("mouseenter", (e) => {
        d3.selectAll("#order-flow-page").style("overflow-y", "hidden");
      });
      mdWrapper.on("mouseleave", (e) => {
        d3.selectAll("#order-flow-page").style("overflow-y", "auto");
      });

      //console.log("CHART RENDERED SUCCESSFULLY !!");
    },
  },
  computed: {
    displayData() {
      // for react to scope changes on mouse wheel.
      const lengthOfAsks = this.chartData.asks.length;
      const lengthOfBids = this.chartData.bids.length;
      const askAmounttoDisplay = Math.round(lengthOfAsks * this.scope);
      const bidAmountToDisplay = Math.round(lengthOfBids * this.scope);
      const orderAmountToDisplay =
        askAmounttoDisplay - bidAmountToDisplay
          ? askAmounttoDisplay
          : bidAmountToDisplay;

      const asks = this.chartData.asks.slice(0, orderAmountToDisplay);
      const bids = this.chartData.bids.slice(0, orderAmountToDisplay);
      if (this.scope === 1) {
        return this.chartData;
      }
      return { asks: asks, bids: bids };
    },
  },
  watch: {
    scope: function (newVal, oldVal) {
      this.renderChart();
    },
    selectedTheme: function (newVal, oldVal) {
      this.renderChart();
    },
  },
};
