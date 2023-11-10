const fetchData = async () => {
    const url = "https://geo.stat.fi/geoserver/wfs?service=WFS&version=2.0.0&request=GetFeature&typeName=tilastointialueet:kunta4500k&outputFormat=json&srsName=EPSG:4326"
    const res = await fetch(url)
    const data = await res.json()
    const elecData = await getElectionMap();
    initMap(data, elecData)
};
let highlightedMunicipality = null;

const onDragStart = (event) => {
    event.dataTransfer.setData("text/plain", event.target.id);
}

//When draggin one of the draggable elements
const onDragOver = (event) => {
    event.preventDefault();
    const latlng = map.mouseEventToLatLng(event);
    const hoveredMunicipality = getClickedRegion(latlng);
    if (hoveredMunicipality !== highlightedMunicipality) {
        // If a different municipality is being hovered, reset the previous one
        if (highlightedMunicipality) {
            resetMunicipalityStyle(highlightedMunicipality);
        }
        if (hoveredMunicipality) {
            saveOriginalStyle(hoveredMunicipality);
            highlightMunicipality(hoveredMunicipality);
        }
        highlightedMunicipality = hoveredMunicipality;
    }
};

const originalStylesMap = new Map(); // Map to store original styles

const saveOriginalStyle = (municipality) => {
    // Store the original style in the map
    originalStylesMap.set(municipality, {
        fillColor: municipality.options.fillColor,
        fillOpacity: municipality.options.fillOpacity,
        weight: municipality.options.weight
    });
};

const resetMunicipalityStyle = (municipality) => {
    // Restore the original style of the municipality
    const originalStyle = originalStylesMap.get(municipality);
    if (originalStyle) {
        municipality.setStyle(originalStyle);
    }
};

//This highlights the municipality that is being dragged over
const highlightMunicipality = (municipality) => {
    const originalFillColor = municipality.options.fillColor;
    // Used to darken the original color
    const brightendColor = tinycolor(originalFillColor).brighten(20).toString();
    // Increase the opacity to make the municipality stand out
    municipality.setStyle({
        fillColor: brightendColor,
        fillOpacity: 1,
        weight:5,
    });
};

const onDrop = (event) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData("text/plain");
    if (itemId) {
        // Get the region where the item was dropped
        const latlng = map.mouseEventToLatLng(event);
        const droppedRegion = getClickedRegion(latlng);
        if (droppedRegion) {
            // Create a temporary element to parse info from the region
            const tempElement = document.createElement("div");
            tempElement.innerHTML = droppedRegion._popup._content;    //here you can find info i have already done (see later in code)
            if (itemId == "item1"){
                const anchorElement = tempElement.querySelector("#navigation1");
                const href = anchorElement.getAttribute("href");
                window.location.href = href;
            }else if(itemId == "item2"){
                const anchorElement = tempElement.querySelector("#navigation2");
                const href = anchorElement.getAttribute("href");
                window.location.href = href;
            }
        }
    }
}
    
const items = document.querySelectorAll(".draggable");

items.forEach((item) => {
    item.addEventListener("dragstart", onDragStart);
});

const mapContainer = document.querySelector(".map-container");
mapContainer.addEventListener("dragover", onDragOver);
mapContainer.addEventListener("drop", onDrop);

const getClickedRegion = (event) => {
    const latlng = L.latLng(event.lat, event.lng);
    return geoJson.getLayers().find(layer => layer.getBounds().contains(latlng));
};

const initMap = (data, elecData) => {
    map = L.map("map", {
        minZoom: -3,
    })

    geoJson = L.geoJSON(data, {
        style: {
            weight: 2,
        },
        onEachFeature: (feature, layer) => {
            getFeature(feature, layer, elecData);
        },
    }).addTo(map)

    let osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap"
    }).addTo(map);


    let google = L.tileLayer("https://{s}.google.com/vt/lyrs=s@221097413,traffic&x={x}&y={y}&z={z}", {
        maxZoom: 20,
        minZoom: 2,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map)

    let baseMaps = {
        "OpenStreetMap": osm,
        "Google Maps": google
    }

    let layerControl = L.control.layers(baseMaps).addTo(map);

    map.fitBounds(geoJson.getBounds())

    const loadingText = document.getElementById("loading-text");
    loadingText.style.opacity = 0; // Hides the loading text after map is initialised

}


const getFeature = (feature, layer, elecData) => {
    if (!feature.id) return;
    const cityIndex = elecData.dimension["Vaalipiiri ja kunta vaalivuonna"].category.index;
    const cityNameCode = elecData.dimension["Vaalipiiri ja kunta vaalivuonna"].category.label;
    
    //Used to parse trought the data and getting all the needed info (kunta code, name, kunta number)
    const CodeToData = {};
    for (const code in cityIndex) {
        let index = cityIndex[code];
        const numericValues = [];
        for (let i = 0; i < 8; i++) {
            numericValues.push(elecData.value[index]);
            index += 474;
        }
        const textValue = cityNameCode[code];
        const shortenedTextValue = textValue.substring(0, 5);

        CodeToData[shortenedTextValue] = {
            numericValues,
            code
        };
    }

    const kuntaCode = `KU${feature.properties.kunta}`;
    const allVotes=CodeToData[kuntaCode].numericValues;
    const cityCode = CodeToData[kuntaCode].code

    //Getting the most voted party position in the dataset, as well as the amount it was voted by (%)
    const result = allVotes.reduce((acc, current, index) => {
        if (current > acc.value) {
          return { value: current, index: index };
        } else {
          return acc;
        }
      }, { value: -Infinity, index: -1 });

    const highestVoteNumber = result.value
    const partyIndex =  result.index

    const partyColors = {
        "KOK": "#006288",
        "PS": "#FFDE55",
        "SDP": "#F54B4B",
        "KESK": "#3AAD2E",
        "VIHR": "#006845",
        "VAS": "#F00A64",
        "RKP": "#ffdd93",
        "KD": "#2B67C9"
    };

    //Matching the party index with th party names
    function getPartyNameByIndex(index) {
        const partyNames = ["KOK", "PS", "SDP", "KESK", "VIHR", "VAS", "RKP", "KD"];
        if (index >= 0 && index < partyNames.length && highestVoteNumber!=0) {
            return partyNames[index];
        }
    }
    const partyName = getPartyNameByIndex(partyIndex);
    const partyColor = partyColors[partyName];
    layer.setStyle({
        fillColor: partyColor,
        fillOpacity: 0.5,
        weight: 1,
        color: "black",
        dashArray: "3",
        dashOffset: "1",
    });
    
    layer.bindPopup(`
    <p>${feature.properties.name}</p>
    <ul>
        <li>Party: ${partyName}</li>
        <li>Percentage vote: ${highestVoteNumber}%</li>
    </ul>
    <div class="popup-links">
        <a href="pages/electionChart.html?cityCode=${cityCode}&name=${feature.properties.name}" id="navigation1">Election Data</a>
        <a href="pages/ageChart.html?cityKunta=KU${feature.properties.kunta}&name=${feature.properties.name}" id="navigation2">Age Data</a>
    </div>
`);

    layer.bindTooltip(feature.properties.name);
}

fetchData();