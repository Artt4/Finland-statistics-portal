document.addEventListener("DOMContentLoaded", () => {
    function getQueryParam(name) {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
    }
  
    const cityCode = getQueryParam("cityCode");
    const cityName = getQueryParam("name");
    let selectedParties = new Set();
  
    const selectedPartiesParam = getQueryParam("selectedParties");
    if (selectedPartiesParam) {
      const selected = selectedPartiesParam.split(',');
      selectedParties = new Set(selected);
      selected.forEach(party => {
        const checkbox = document.querySelector(`input[value="${party}"]`);
        if (checkbox) checkbox.checked = false;
      });
    }
  
    if (cityCode) {
      waitForFrappe(() => buildBarChart(cityCode, cityName, selectedParties));
    }
  });
  
  function waitForFrappe(callback) {
    if (typeof frappe !== 'undefined') {
      callback();
    } else {
      setTimeout(() => waitForFrappe(callback), 50);
    }
  }
  
  async function buildBarChart(cityCode, cityName, selectedParties) {
    const data = await fetchData(cityCode);
  
    const labels = Object.values(data.dimension.Vuosi.category.label);
    const parties = Object.values(data.dimension.Puolue.category.label).reverse();
    const values = data.value.reverse();
    const datasets = parties.map((party, index) => {
      const support = [];
      for (let i = 0; i < 7; i++) {
        support.push(values[i * parties.length + index]);
      }
      return {
        name: party,
        values: support.reverse()
      };
    });
  
    const chart = new frappe.Chart("#chart", {
      title: `Finnish parliamentary elections in ${cityName} | 1999 - 2023`,
      data: {
        labels: labels,
        datasets: datasets.filter(p => !selectedParties.has(p.name))
      },
      type: "line",
      height: 400,
      colors: ["#2B67C9", "#ffdd93", "#F00A64", "#006845", "#3AAD2E", "#F54B4B", "#FFDE55", "#006288"],
      lineOptions: { hideDots: 1 },
      tooltipOptions: { formatTooltipY: d => d + "%" }
    });
  
    showHiddenElements();
  
    document.querySelectorAll(".party-checkbox").forEach(checkbox => {
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedParties.delete(checkbox.value);
        else selectedParties.add(checkbox.value);
        refreshPage(selectedParties);
      });
    });
  
    document.getElementById("export-svg").addEventListener("click", () => chart.export());
  }
  
  function refreshPage(selectedParties) {
    const param = Array.from(selectedParties).join(',');
    const url = new URL(window.location.href);
    url.searchParams.set("selectedParties", param);
    location.href = url.toString();
  }
  
  function showHiddenElements() {
    document.getElementById("chart-container").style.display = "block";
    document.getElementById("party-selection").style.display = "block";
    document.getElementById("navigation").style.display = "block";
    document.getElementById("export-svg").style.display = "inline-block";
    document.getElementById("loading-text").style.display = "none";
  }
  
  async function fetchData(cityCode) {
    return await getElectionForCity(cityCode); // assumed to be defined in dataFetch.js
  }
  