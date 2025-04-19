// Function to get the query parameter from the URL
function getQueryParam(parameterName) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(parameterName);
}

document.addEventListener("DOMContentLoaded", () => {
    const cityCode = getQueryParam("cityCode");
    const cityName = getQueryParam("name");
    let selectedParties = new Set();

    // Handle selected parties from query parameter
    const selectedPartiesParam = getQueryParam("selectedParties");
    if (selectedPartiesParam) {
        const selectedPartiesArray = selectedPartiesParam.split(',');
        selectedParties = new Set(selectedPartiesArray);

        selectedPartiesArray.forEach(party => {
            const checkbox = document.querySelector(`input[type="checkbox"][value="${party}"]`);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
    }

    if (cityCode) {
        buildBarChart(cityCode, cityName, selectedParties);
    }
});

// Build a bar chart using the specified city code
async function buildBarChart(cityCode, cityName, selectedParties) {
    const data = await fetchData(cityCode);

    const labels = Object.values(data.dimension.Vuosi.category.label);
    const parties = Object.values(data.dimension.Puolue.category.label);
    const partiesReversed = parties.reverse();
    const values = data.value;
    const reversedValues = values.reverse();

    const datasets = partiesReversed.map((party, index) => {
        let partySupport = [];
        for (let i = 0; i < 7; i++) {
            partySupport.push(reversedValues[i * parties.length + index]);
        }
        return {
            name: party,
            values: partySupport.reverse()
        };
    });

    const chartData = {
        labels: labels,
        datasets: datasets.filter(party => !selectedParties.has(party.name))
    };

    const chart = new frappe.Chart("#chart", {
        title: `Finnish parliamentary elections in ${cityName} | 1999 - 2023`,
        data: chartData,
        type: "line",
        height: 400,
        colors: ["#2B67C9", "#ffdd93", "#F00A64", "#006845", "#3AAD2E", "#F54B4B", "#FFDE55", "#006288"],
        lineOptions: {
            hideDots: 1
        },
        tooltipOptions: {
            formatTooltipY: d => d + "%"
        }
    });

    showHiddenElements();

    document.querySelectorAll(`input[type="checkbox"].party-checkbox`).forEach(checkbox => {
        checkbox.addEventListener("change", function () {
            if (checkbox.checked) {
                selectedParties.delete(checkbox.value);
            } else {
                selectedParties.add(checkbox.value);
            }
            refreshPage(selectedParties);
        });
    });

    document.getElementById("export-svg").addEventListener("click", () => {
        chart.export();
    });
}

// Refresh the page with updated selected checkboxes and parties
function refreshPage(selectedParties) {
    const selectedPartiesParam = Array.from(selectedParties).join(',');
    const newURL = new URL(window.location.href);
    newURL.searchParams.set("selectedParties", selectedPartiesParam);
    location.href = newURL.toString();
}

// Show hidden elements after loading
function showHiddenElements() {
    const loadingElement = document.getElementById("loading-text");
    const chartElement = document.getElementById("chart-container");
    const partySelectionElement = document.getElementById("party-selection");
    const navigationElement = document.getElementById("navigation");
    const exportSvgElement = document.getElementById("export-svg");

    if (chartElement) chartElement.style.display = "block";
    if (partySelectionElement) partySelectionElement.style.display = "block";
    if (navigationElement) navigationElement.style.display = "block";
    if (exportSvgElement) exportSvgElement.style.display = "inline-block";
    if (loadingElement) loadingElement.style.display = "none";
}

async function fetchData(cityCode) {
    return await getElectionForCity(cityCode);
}
