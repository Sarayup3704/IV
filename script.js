document.addEventListener("DOMContentLoaded", () => {
    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    let data = [], filters = { subject: 'all', director: 'all', awards: 'all' };
    const tooltip = d3.select("#tooltip");
  
    d3.csv("a1-film.csv").then(raw => {
      data = raw.map(d => ({
        Title: d.Title,
        Director: d.Director,
        Subject: (d.Subject || "").trim(),
        Awards: (/yes/i.test((d.Awards || "").trim()) ? "Yes" : "No"),
        Popularity: +d.Popularity,
        Length: +d.Length
      })).filter(d => d.Popularity && d.Length && d.Director);
  
      initFilters();
      renderAll();
    });
  
    function initFilters() {
      setOptions("#subject-filter", data.map(d => d.Subject));
      setOptions("#director-filter", data.map(d => d.Director));
      setOptions("#award-filter", data.map(d => d.Awards));
  
      d3.selectAll(".filter").on("change", () => {
        filters.subject = d3.select("#subject-filter").property("value");
        filters.director = d3.select("#director-filter").property("value");
        filters.awards = d3.select("#award-filter").property("value");
        renderAll();
      });
  
      d3.select("#reset-btn").on("click", () => {
        filters = { subject: 'all', director: 'all', awards: 'all' };
        d3.selectAll(".filter").property("value", "all");
        renderAll();
      });
  
      d3.select("#reset-genre-btn").on("click", () => {
        filters.subject = 'all';
        d3.select("#subject-filter").property("value", "all");
        renderAll();
      });
    }
  
    function setOptions(selector, values) {
      const clean = Array.from(new Set(values.map(v => (v || "").trim()))).filter(Boolean).sort();
      d3.select(selector).selectAll("option")
        .data(["all", ...clean])
        .join("option")
        .attr("value", d => d)
        .text(d => d === "all" ? "All" : d);
    }
  
    function getFilteredData() {
      return data.filter(d =>
        (filters.subject === "all" || d.Subject === filters.subject) &&
        (filters.director === "all" || d.Director === filters.director) &&
        (filters.awards === "all" || d.Awards === filters.awards)
      );
    }
  
    function showTooltip(event, html) {
      tooltip.style("display", "block")
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY + 10}px`)
        .html(html);
    }
  
    function hideTooltip() {
      tooltip.style("display", "none");
    }
  
    function renderAll() {
      const filtered = getFilteredData();
      renderBulletChart(filtered);
      renderScatterPlot(filtered);
      renderTreemap(data);
    }
  
    function renderBulletChart(data) {
      const container = d3.select("#bar-chart").html("");
      if (!data.length) return container.append("p").text("No data available for the selected filters.");
  
      const width = 600, height = 400;
      const grouped = d3.rollups(data, v => d3.mean(v, d => d.Popularity), d => d.Director)
        .map(([Director, avg]) => ({ Director, avg }))
        .sort((a, b) => b.avg - a.avg).slice(0, 8);
  
      const svg = container.append("svg").attr("width", width).attr("height", height);
      const x = d3.scaleLinear().domain([0, 10]).range([0, width - margin.left - margin.right]);
      const y = d3.scaleBand().domain(grouped.map(d => d.Director)).range([0, height - margin.top - margin.bottom]).padding(0.3);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
      g.selectAll("rect")
        .data(grouped)
        .join("rect")
        .attr("x", 0)
        .attr("y", d => y(d.Director))
        .attr("width", d => x(d.avg))
        .attr("height", y.bandwidth())
        .attr("fill", "#3b82f6")
        .on("mouseover", (e, d) => showTooltip(e, `<strong>${d.Director}</strong><br>Avg Popularity: ${d.avg.toFixed(1)}`))
        .on("mouseout", hideTooltip);
  
      g.append("g").call(d3.axisLeft(y));
      g.append("g").attr("transform", `translate(0,${y.range()[1]})`).call(d3.axisBottom(x));
      g.append("text").attr("x", (width - margin.left - margin.right) / 2).attr("y", height - margin.top - 10)
        .attr("text-anchor", "middle").text("Average Popularity");
      g.append("text").attr("transform", "rotate(-90)").attr("x", -(height - margin.top - margin.bottom) / 2)
        .attr("y", -60).attr("text-anchor", "middle").text("Director");
    }
  
    function renderScatterPlot(data) {
      const container = d3.select("#scatter-plot").html("");
      if (!data.length) return container.append("p").text("No data available for the selected filters.");
  
      const width = 600, height = 400;
      const svg = container.append("svg").attr("width", width).attr("height", height);
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  
      const plotWidth = width - margin.left - margin.right;
      const plotHeight = height - margin.top - margin.bottom;
  
      const x = d3.scaleLinear().domain(d3.extent(data, d => d.Length)).nice().range([0, plotWidth]);
      const y = d3.scaleLinear().domain(d3.extent(data, d => d.Popularity)).nice().range([plotHeight, 0]);
  
      const xAxis = g.append("g").attr("transform", `translate(0,${plotHeight})`).call(d3.axisBottom(x));
      const yAxis = g.append("g").call(d3.axisLeft(y));
  
      const circles = g.append("g").attr("class", "zoom-layer")
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => x(d.Length))
        .attr("cy", d => y(d.Popularity))
        .attr("r", 5)
        .attr("fill", "#10b981")
        .attr("opacity", 0.8)
        .on("mouseover", (e, d) => showTooltip(e, `<strong>${d.Title}</strong><br>${d.Length} min, Pop: ${d.Popularity}`))
        .on("mouseout", hideTooltip);
  
      g.append("text").attr("x", plotWidth / 2).attr("y", plotHeight + 40)
        .attr("text-anchor", "middle").text("Film Length (minutes)");
      g.append("text").attr("transform", "rotate(-90)").attr("x", -plotHeight / 2)
        .attr("y", -60).attr("text-anchor", "middle").text("Popularity");
  
      const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", ({ transform }) => {
          const zx = transform.rescaleX(x);
          const zy = transform.rescaleY(y);
          xAxis.call(d3.axisBottom(zx));
          yAxis.call(d3.axisLeft(zy));
  
          circles
            .attr("cx", d => zx(d.Length))
            .attr("cy", d => zy(d.Popularity));
        });
  
      svg.call(zoom);
    }
  
    function renderTreemap(fullData) {
      const container = d3.select("#genretreemap").html("");
      const width = 600, height = 400;
  
      const grouped = d3.rollups(fullData, v => v.length, d => d.Subject).map(([name, value]) => ({ name, value }));
      const root = d3.hierarchy({ children: grouped }).sum(d => d.value);
      d3.treemap().size([width, height]).padding(2)(root);
  
      const svg = container.append("svg").attr("width", width).attr("height", height);
      const color = d3.scaleOrdinal(d3.schemeTableau10).domain(grouped.map(d => d.name));
  
      const nodes = svg.selectAll("g")
        .data(root.leaves())
        .join("g")
        .attr("transform", d => `translate(${d.x0},${d.y0})`);
  
      nodes.append("rect")
        .attr("width", d => d.x1 - d.x0)
        .attr("height", d => d.y1 - d.y0)
        .attr("fill", d => color(d.data.name))
        .attr("stroke", d => filters.subject === d.data.name ? "#000" : null)
        .attr("stroke-width", d => filters.subject === d.data.name ? 2 : 0)
        .on("click", (event, d) => {
          filters.subject = d.data.name;
          d3.select("#subject-filter").property("value", d.data.name);
          renderAll();
        })
        .on("mouseover", (e, d) => showTooltip(e, `<strong>${d.data.name}</strong><br>${d.data.value} films`))
        .on("mouseout", hideTooltip);
  
      nodes.append("text")
        .attr("x", 4).attr("y", 16).text(d => d.data.name)
        .attr("font-size", "11px").attr("fill", "white");
    }
  });
  