// Function to get the query parameter from the URL
function getQueryParam(parameterName) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(parameterName);
}

// Retrieves from the URL
const cityCode = getQueryParam("cityCode");
const cityName = getQueryParam("name");

let selectedParties = new Set();

// Check if the 'selectedParties' parameter is in the URL
const selectedPartiesParam = getQueryParam("selectedParties");
if (selectedPartiesParam) {
    const selectedPartiesArray = selectedPartiesParam.split(',');
    selectedParties = new Set(selectedPartiesArray);

    // Loop through the selected parties and uncheck their corresponding checkboxes
    selectedPartiesArray.forEach(party => {
        const checkbox = document.querySelector(`input[type="checkbox"][value="${party}"]`);
        if (checkbox) {
            checkbox.checked = false;
        }
    });
}

if (cityCode) {
    buildBarChart(cityCode);
}
// Build a bar chart using the specified city code
async function buildBarChart(cityCode) {
    const data = await fetchData(cityCode);

    const labels = Object.values(data.dimension.Vuosi.category.label);
    const parties = Object.values(data.dimension.Puolue.category.label);
    const partiesReversed = parties.reverse();
    const values = data.value;
    const reversedValues = values.reverse();

    //Matching the values to the party and year
    partiesReversed.forEach((party, index) => {
        let partySupport = [];
        for (let i = 0; i < 7; i++) {
            partySupport.push(reversedValues[i * parties.length + index]);
        }
        partiesReversed[index] = {
            name: party,
            values: partySupport.reverse()
        };
    });

    const chartData = {
        labels: labels,
        datasets: parties.filter(party => !selectedParties.has(party.name)) //Makes sure to show the parties that are checked
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
            refreshPage();
        });
    });

    // Function to refresh the page with updated selected checkboxes and parties
    function refreshPage() {
        // Pass the selectedParties set as a query parameter for the page reload
        const selectedPartiesParam = Array.from(selectedParties).join(',');
        const newURL = new URL(window.location.href);
        newURL.searchParams.set("selectedParties", selectedPartiesParam);
        location.href = newURL.toString();
    }
    
    document.getElementById("export-svg").addEventListener("click", () => {
        chart.export();
    });

    //Used when loading page
    function showHiddenElements() {
        const loadingElement = document.getElementById("loading-text");
        const chartElement = document.getElementById("chart-container");
        const partySelectionElement = document.getElementById("party-selection");
        const navigationElement = document.getElementById("navigation");
        const exportSvgElement = document.getElementById("export-svg");

        if (chartElement) {
            chartElement.style.display = "block";
        }
        if (partySelectionElement) {
            partySelectionElement.style.display = "block";
        }
        if (navigationElement) {
            navigationElement.style.display = "block";
        }
        if (exportSvgElement) {
            exportSvgElement.style.display = "inline-block";
        }
        if (loadingElement) {
            loadingElement.style.display = "none";
        }
    }
}

async function fetchData(cityCode) {
    const data = await getElectionForCity(cityCode);
    return data;
}
