export default {
  template:
    "<div  :style='{borderRight: `solid 1px ${selectedTheme.border}`,paddingRight: `1rem`}' id='market_depth_container'></div>",
  data: () => {
    return {
      chartData: null,
      scope: 1,
      chartWidth: 300,
      chartHeight: 500,
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
      const askAmount = this.getRandomNumberBetween(50, 200);
      const bidAmount = this.getRandomNumberBetween(50, 200);
      for (var i = 0; i < askAmount; i++) {
        const dummyOrder = {};
        dummyOrder.price = this.getRandomNumberBetween(105, 200);
        dummyOrder.volume = this.getRandomNumberBetween(10, 1000);
        asks.push(dummyOrder);
      }
      for (var i = 0; i < bidAmount; i++) {
        const dummyOrder = {};
        dummyOrder.price = this.getRandomNumberBetween(0, 100);
        dummyOrder.volume = this.getRandomNumberBetween(10, 1000);
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
      d3.selectAll("#market_depth_container svg").remove();
      //d3.selectAll("#tooltip").remove();
      const displayData = this.displayData;
      const maxVolume = d3.max(
        [...displayData.asks, ...displayData.bids],
        (d) => d.totalVolume
      );
      const minAsk = d3.min(displayData.asks, (d) => d.price);
      const maxBid = d3.max(displayData.bids, (d) => d.price);
      const midPrice = (minAsk + maxBid) / 2;
      const orderCount = [...displayData.asks, ...displayData.bids].length;
      const scaleSpacing = 55;
      const rightSpacing = 50;
      const topSpacing = 20;
      const svg = d3
        .select("#market_depth_container")
        .append("svg")
        .attr("id", "chartSVG")
        .attr("width", this.chartWidth)
        .attr("height", this.chartHeight)
        .style("background", "transparent");
      const yScale = d3
        .scaleLinear()
        .domain([
          d3.max(displayData.asks, (d) => d.price),
          d3.min(displayData.bids, (d) => d.price),
        ])
        .range([0, this.chartHeight - scaleSpacing]);

      const xScale = d3
        .scaleLinear()
        .domain([0, maxVolume])
        .range([0, this.chartWidth - scaleSpacing]);

      const xAxisGenerator = d3.axisBottom(xScale).ticks(3);
      const yAxisGenerator = d3.axisRight(yScale).ticks(3);

      function getStandardDeviation(arr) {
        const volumes = arr.map((item) => item.volume);
        const n = volumes.length;
        const mean = volumes.reduce((a, b) => a + b, 0) / n;
        return Math.sqrt(
          volumes.map((v) => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) /
            n
        );
      }
      function getDynamicHeight(d, i, orderType) {
        if (orderType === "ask") {
          if (i < displayData.asks.length - 1) {
            return (
              Math.abs(
                yScale(d.price) - yScale(displayData.asks[i + 1].price)
              ) + 1
            );
          } else return 10; //for the highest ask
        } else if (orderType === "bid") {
          if (i < displayData.bids.length - 1) {
            return (
              Math.abs(
                yScale(d.price) - yScale(displayData.bids[i + 1].price)
              ) + 1
            );
          } else return 10; // for the lowest bid
        }
      }

      var xAxis = svg
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
        .attr("font-size", 12)
        .attr("color", "#8f8f8f")
        .attr("transform", "rotate(180)");

      xAxis.selectAll(".tick line").remove();

      var yAxis = svg
        .append("g")
        .attr(
          "transform",
          `translate(${this.chartWidth - rightSpacing}, ${topSpacing})`
        ) // 0 works well but should fix for the right bisector value after spacing!!!!!
        .call(yAxisGenerator);

      yAxis.select(".domain").attr("stroke", "none").attr("stroke-width", "2");

      yAxis
        .selectAll(".tick text")
        .attr("font-size", 12)
        .attr("color", "#8f8f8f");

      yAxis.selectAll(".tick line").remove();

      svg.append("g").attr("id", "midPriceLabel");
      const midPriceLabel = d3.selectAll("#midPriceLabel");
      if (midPrice) {
        midPriceLabel
          .append("rect")
          .attr("width", "2.75rem")
          .attr("height", "1.25rem")
          .attr("y", yScale(midPrice) + topSpacing - 10)
          .attr("x", this.chartWidth - rightSpacing + 5)
          .style("fill", theme.blue);
        midPriceLabel
          .append("polygon")
          .attr(
            "points",
            `${this.chartWidth - rightSpacing + 5},${
              yScale(midPrice) + topSpacing + 5
            } ${this.chartWidth - rightSpacing + 5},${
              yScale(midPrice) + topSpacing - 5
            } ${this.chartWidth - rightSpacing - 2},${
              yScale(midPrice) + topSpacing
            }`
          )
          .style("fill", theme.blue);

        midPriceLabel
          .append("text")
          .style("font-size", 12)
          .style("font-weight", "bold")
          .style("fill", "white")
          .attr("y", yScale(midPrice) + topSpacing + 5)
          .attr("x", this.chartWidth - rightSpacing + 7)
          .text(midPrice.toFixed(2));
      }

      const rectAsks = svg.selectAll(".askRect").data(displayData.asks);
      const rectBids = svg.selectAll(".bidRect").data(displayData.bids);

      rectAsks
        .enter()
        .append("rect")
        .attr("class", "askRect")
        .attr("width", (d) => xScale(d.totalVolume))
        .attr("height", (d, i) => getDynamicHeight(d, i, "ask"))
        .attr(
          "x",
          (d) => this.chartWidth - xScale(d.totalVolume) - rightSpacing
        )
        .attr(
          "y",
          (d, i) => yScale(d.price) + topSpacing - getDynamicHeight(d, i, "ask")
        )
        .style("fill", theme.askRect);

      rectBids
        .enter()
        .append("rect")
        .attr("class", "bidRect")
        .attr("width", (d) => xScale(d.totalVolume))
        .attr("height", (d, i) => getDynamicHeight(d, i, "bid"))
        .attr(
          "x",
          (d) => this.chartWidth - xScale(d.totalVolume) - rightSpacing
        )
        .attr("y", (d, i) => yScale(d.price) + topSpacing)
        .style("fill", theme.bidRect);

      const stdDevAsks = getStandardDeviation(displayData.asks);
      const stdDevBids = getStandardDeviation(displayData.bids);

      displayData.asks.forEach((d, i) => {
        svg
          .append("line") // vertical
          .style("stroke", theme.askLine)
          .style("stroke-width", 2)
          .attr("x1", this.chartWidth - xScale(d.totalVolume) - rightSpacing)
          .attr("x2", this.chartWidth - xScale(d.totalVolume) - rightSpacing)
          .attr("y1", yScale(d.price) + topSpacing)
          .attr("y2", () => {
            if (i < displayData.asks.length - 1) {
              return yScale(displayData.asks[i + 1].price) + topSpacing;
            } else return 10; // for the highest ask
          });

        if (i > 0) {
          svg
            .append("line") // horizontal
            .style("stroke", theme.askLine)
            .style("stroke-width", 2)
            .attr("x1", this.chartWidth - xScale(d.totalVolume) - rightSpacing)
            .attr(
              "x2",
              this.chartWidth -
                xScale(displayData.asks[i - 1].totalVolume) -
                rightSpacing
            )
            .attr("y1", yScale(d.price) + topSpacing)
            .attr("y2", yScale(d.price) + topSpacing);
        } else {
          svg
            .append("line") // horizontal (for the first ask)
            .style("stroke", theme.askLine)
            .style("stroke-width", 2)
            .attr("x1", this.chartWidth - rightSpacing)
            .attr("x2", this.chartWidth - xScale(d.totalVolume) - rightSpacing)
            .attr("y1", yScale(d.price) + topSpacing)
            .attr("y2", yScale(d.price) + topSpacing);
        }

        if (i < displayData.asks.length - 1) {
          if (
            displayData.asks[i + 1].totalVolume - d.totalVolume >
            stdDevAsks * 4
          ) {
            svg // adding horizontal lines for support and resistance spots.
              .append("line")
              .attr("class", "supResLine")
              .style("stroke", theme.grayLight)
              .style("stroke-width", 1)
              .style("stroke-dasharray", "5,5")
              .attr("x1", 0)
              .attr(
                "x2",
                this.chartWidth -
                  xScale(displayData.asks[i + 1].totalVolume) -
                  rightSpacing
              )
              .attr(
                "y1",
                yScale(d.price) + topSpacing - getDynamicHeight(d, i, "ask")
              )
              .attr(
                "y2",
                yScale(d.price) + topSpacing - getDynamicHeight(d, i, "ask")
              );

            svg
              .append("text")
              .style("fill", theme.grayDark)
              .style("font-family", "PT Mono")
              .style("font-size", 12)
              .attr("x", 0)
              .attr("y", yScale(displayData.asks[i + 1].price) + topSpacing - 3)
              .text(displayData.asks[i + 1].price.toFixed(2));
          }
        }
      });

      displayData.bids.forEach((d, i) => {
        svg
          .append("line") // vertical
          .style("stroke", theme.bidLine)
          .style("stroke-width", 2)
          .attr("x1", this.chartWidth - xScale(d.totalVolume) - rightSpacing)
          .attr("x2", this.chartWidth - xScale(d.totalVolume) - rightSpacing)
          .attr("y1", yScale(d.price) + topSpacing)
          .attr("y2", () => {
            if (i < displayData.bids.length - 1) {
              return yScale(displayData.bids[i + 1].price) + topSpacing;
            } else
              return (
                yScale(d.price) + getDynamicHeight(d, i, "bid") + topSpacing
              );
          });

        svg
          .append("line") // horizontal
          .style("stroke", theme.bidLine)
          .style("stroke-width", 2)
          .attr("x1", this.chartWidth - xScale(d.totalVolume) - rightSpacing)
          .attr("x2", () => {
            if (i > 0) {
              return (
                this.chartWidth -
                xScale(displayData.bids[i - 1].totalVolume) -
                rightSpacing
              );
            } else return this.chartWidth - rightSpacing;
          })
          .attr("y1", yScale(d.price) + topSpacing)
          .attr("y2", yScale(d.price) + topSpacing);

        if (i < displayData.bids.length - 1) {
          if (
            displayData.bids[i + 1].totalVolume - d.totalVolume >
            stdDevBids * 4
          ) {
            svg // adding horizontal lines for support and resistance spots.
              .append("line")
              .attr("class", "supResLine")
              .style("stroke", theme.grayLight)
              .style("stroke-width", 1)
              .style("stroke-dasharray", "5,5")
              .attr("x1", 0)
              .attr(
                "x2",
                this.chartWidth - xScale(d.totalVolume) - rightSpacing
              )
              .attr(
                "y1",
                yScale(d.price) + topSpacing + getDynamicHeight(d, i, "bid")
              )
              .attr(
                "y2",
                yScale(d.price) + topSpacing + getDynamicHeight(d, i, "bid")
              );

            svg
              .append("text")
              .style("fill", theme.grayDark)
              .style("font-family", "PT Mono")
              .style("font-size", 12)
              .attr("x", 0)
              .attr(
                "y",
                yScale(d.price) + topSpacing + getDynamicHeight(d, i, "bid") - 2
              )
              .text(displayData.bids[i + 1].price.toFixed(2));
          }
        }
      });

      /////////////////////////////////////////////////////// mouse events
      svg
        .append("rect")
        .attr("id", "overlay")
        .attr("width", this.chartWidth - rightSpacing)
        .attr("height", this.chartHeight - topSpacing - 10)
        .attr("x", 0)
        .attr("y", topSpacing - 10)
        .style("pointer-events", "all")
        .style("fill", "none")
        .style("cursor", "cell");
      const overlay = d3.select("#overlay");

      overlay.on("mouseenter", (e) => {
        d3.select("body").style("overflow", "hidden");
      });

      overlay.on("mousemove", (e) => {
        d3.selectAll(
          "#yTooltip, #yTooltipLine, #xTooltip, #xTooltipLine"
        ).remove();

        const coordinates = d3.pointer(e);
        const x = coordinates[0];
        const y = coordinates[1];
        this.lastMouseX = x;
        this.lastMouseY = y;
        const yPrice = yScale.invert(y - topSpacing);
        const xTotalVolume = xScale.invert(this.chartWidth - x - rightSpacing);

        svg.append("g").attr("id", "yTooltip");

        svg.append("g").attr("id", "xTooltip");

        const yTooltip = d3.selectAll("#yTooltip");
        const xTooltip = d3.selectAll("#xTooltip");

        yTooltip
          .append("rect")
          .attr("width", "2.5rem")
          .attr("height", "1.25rem")
          .attr("y", y - 10)
          .attr("x", this.chartWidth - rightSpacing)
          .style("fill", "red");

        yTooltip
          .append("text")
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", theme.textPrimary)
          .attr("y", y + 4)
          .attr("x", this.chartWidth - rightSpacing)
          .text(Number(yPrice.toFixed(2)));

        svg
          .append("line")
          .attr("id", "yTooltipLine")
          .attr("x1", this.chartWidth - rightSpacing)
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
          .attr("width", xTotalVolume.toFixed(2).length * 7)
          .attr("height", "1.25rem")
          .attr("x", x - 22)
          .attr("y", this.chartHeight - topSpacing + 2)
          .style("fill", "red");

        xTooltip
          .append("text")
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", theme.textPrimary)
          .attr("x", x - 20)
          .attr("y", this.chartHeight - 5)
          .text(Number(xTotalVolume.toFixed(2)));

        svg
          .append("line")
          .attr("id", "xTooltipLine")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", topSpacing - 10)
          .attr("y2", this.chartHeight - topSpacing)
          .style("stroke", theme.grayDark)
          .style("stroke-width", 1)
          .style("cursor", "cell")
          .style("stroke-dasharray", "2,2")
          .style("pointer-events", "none");
      });

      svg.on("wheel", (e) => {
        const direction = !(e.wheelDelta < 0);
        direction ? this.onWheel(true) : this.onWheel(false);
      });

      svg.on("mouseenter", (e) => {
        d3.selectAll("#order-flow-page").style("overflow", "hidden");
      });
      svg.on("mouseleave", (e) => {
        d3.selectAll("#order-flow-page").style("overflow", "auto");
        this.lastMouseX = null;
        this.lastMouseY = null;
      });

      ///////////////////////////////////////////////////////

      // section in below keep coord. tooltips in the chart on mousemove end.
      var x = this.lastMouseX;
      var y = this.lastMouseY;
      if (x && y) {
        var yPrice = yScale.invert(y - topSpacing);
        var xTotalVolume = xScale.invert(this.chartWidth - x - rightSpacing);

        svg.append("g").attr("id", "yTooltip");
        svg.append("g").attr("id", "xTooltip");

        var yTooltip = d3.selectAll("#yTooltip");
        var xTooltip = d3.selectAll("#xTooltip");

        yTooltip
          .append("rect")
          .attr("width", yPrice.toFixed(2).length * 7.25)
          .attr("height", "1.25rem")
          .attr("y", y - 10)
          .attr("x", this.chartWidth - rightSpacing)
          .style("fill", "red");

        yTooltip
          .append("text")
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", "white")
          .attr("y", y + 4)
          .attr("x", this.chartWidth - rightSpacing)
          .text(Number(yPrice.toFixed(2)));

        svg
          .append("line")
          .attr("id", "yTooltipLine")
          .attr("x1", this.chartWidth - rightSpacing)
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
          .style("font-size", "12px")
          .style("font-weight", "bold")
          .style("fill", "white")
          .attr("x", x - (xTotalVolume.toFixed(2).length * 7.25) / 2 + 2)
          .attr("y", this.chartHeight - 5)
          .text(xTotalVolume.toFixed(2));

        svg
          .append("line")
          .attr("id", "xTooltipLine")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", topSpacing - 10)
          .attr("y2", this.chartHeight - topSpacing)
          .style("stroke", theme.grayDark)
          .style("stroke-width", 1)
          .style("cursor", "cell")
          .style("stroke-dasharray", "2,2")
          .style("pointer-events", "none");
      }
      //

      overlay.on("mouseleave", (e) => {
        d3.selectAll("#yTooltip").remove();
        d3.selectAll("#yTooltipLine").remove();
        d3.selectAll("#xTooltip").remove();
        d3.selectAll("#xTooltipLine").remove();
        d3.selectAll(".supResLine").style("visibility", "visible");
        d3.select("body").style("overflow", "auto");
      });
      //console.log("CHART RENDERED SUCCESSFULLY.");
    },
  },
};
