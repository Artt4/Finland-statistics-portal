// Function to get the query parameter from the URL
function getQueryParam(parameterName) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(parameterName);
}

// Retrieve from the URL
const cityKunta = getQueryParam("cityKunta");
const cityName = getQueryParam("name");

if (cityKunta) {
    buildBarChart(cityKunta);
}
// Build a bar chart using the specified city code
async function buildBarChart(cityKunta) {
    const data = await fetchData(cityKunta);
    const rawData = Object.values(data.value)
    const labels = Object.values(data.dimension.Vuosi.category.label);
    const ageGroupLabels = ["0-14", "15-64", "65-74", "75-"];
    const datasets = [];

    //Here we parse trough the data to match the year and age group with the correct values
    for (let index = 0; index < ageGroupLabels.length; index++) {
        const label = ageGroupLabels[index];
        const values = rawData.slice(index * 13, (index + 1) * 13);
    
        datasets.push({
            name: `Ages ${label}`,
            values: values,
            chartType: "bar",
        });
    }
    // Calculate the average age for each year
    const totalPopulationData = [];
    for (let yearIndex = 0; yearIndex < labels.length; yearIndex++) {
        let totalPopulation = 0;
        for (let ageGroupIndex = 0; ageGroupIndex < ageGroupLabels.length; ageGroupIndex++) {
            totalPopulation += rawData[ageGroupIndex * labels.length + yearIndex];
        }
        totalPopulationData.push(totalPopulation);
    }

    datasets.push({
        name: "Total Pop.",
        values: totalPopulationData,
        chartType: "line",

});

    const chartData = {
        labels: labels,
        datasets: datasets,
    };
    // Create a chart with both bar and line data
    const chart = new frappe.Chart("#chart", {
        title: `Population by age in ${cityName} | 1998 - 2022`,
        data: chartData,
        type: "axis-mixed",
        height: 400,
        colors: ["#FF5733", "#33FF7E", "#337EFF", "#FF33C3", "#000000"],
        lineOptions: {
            hideDots: true,
        },
        
    });
    showHiddenElements();

    //This allows the user to add more data to the chart
    document.getElementById("add-data").addEventListener("click", () => {
        let newDataPointsArray = []
        for (let i = 0; i < 4; i++) {
            const population = chart.data.datasets[i].values;
            const deltaMean = calculateDeltaMean(population);
            const lastDataPoint = population[population.length - 1];
            const newDataPoint = lastDataPoint + deltaMean;
            newDataPointsArray.push(newDataPoint)
        }
        let newDataPoint = sumArray(newDataPointsArray)
        newDataPointsArray.push(newDataPoint)
        const newLabel = Math.max(...chart.data.labels) + 2;

        chart.addDataPoint(newLabel, newDataPointsArray);
    });
    document.getElementById("export-svg").addEventListener("click", () => {
        chart.export();
    });

    // Function to display the hidden elements
    function showHiddenElements() {
        const chartElement = document.getElementById("chart");
        const navigationElement = document.getElementById("navigation");
        const addDataElement = document.getElementById("add-data")
        const exportSvgElement = document.getElementById("export-svg");
        const loadingElement = document.getElementById("loading-text");

        if (chartElement) {
            chartElement.style.display = "block'";
        }
        if (navigationElement) {
            navigationElement.style.display = "block";
        }
        if (addDataElement) {
            addDataElement.style.display = "inline-block";
        }
        if (exportSvgElement) {
            exportSvgElement.style.display = "inline-block";
        }
        if (loadingElement) {
            loadingElement.style.display = "none";
        }
    }
    //Used when user wants to add more data to chart
    function calculateDeltaMean(population) {
        let deltaSum = 0;
        for (let i = 1; i < population.length; i++) {
            deltaSum += population[i] - population[i - 1];
        }
        return Math.round(deltaSum / (population.length - 1));
    }
    //Funtion for summing an array
    function sumArray(arr) {
        let sum = 0;
        for (let i = 0; i < arr.length; i++) {
            sum += arr[i];
        }
        return sum;
    }
}

async function fetchData(cityKunta) {
    const data = await getPopulationAgeForCity(cityKunta);
    return data;
}
