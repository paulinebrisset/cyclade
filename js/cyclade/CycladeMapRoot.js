export default class CycladeMapRoot {
    
    #config_map = {
        "def": "Object with map settings getted from CycladeSettings",
        "content": null
    }
    #geo_layers = {
        "def": "All geographic layers",
        "content": null
    }
    #layers = {
        "def": "All the layers printed for one file, ordered by number of depression",
        "backgroundTiles": {
            "layer": [], //contient les fonds de carte
            "control": {}, //ajoute une option cliquable sur l'interface pour 
            "allControls": {} //permet de choisir des fonds de carte différents sur l'interface
        }
    }

    /**
     * Demande deux objets déjà lus par read_json : un objet "carte" préparé par CycladeSettings, et un objet qui contient au moins un fond de carte, de geo_layers.json
     * @param {object} mapLayers 
     * @param {object} mapObject 
     */
    constructor(mapLayers, mapObject) {
        this.#geo_layers.content = mapLayers;
        this.#config_map.content = mapObject;
    }

    /**
     * Implémente la carte en utilisant Leaflet, propose tous les fonds de cartes contenur dans geo_lays.json, et les réglages de config_map (zoom, focus par défaut)
     * Avec des repères de latitude/longitude si demande (booléen) 
     * Le premier fond de carte renseigné sera celui proposé par défaut 
     * @param {bool} graticule 
     */
    implementMap(graticule = false) {
        //definition du focus de la carte à l'initatialisation
        this.#config_map.content.map = L.map(this.#config_map.content.map_div_id).setView([this.#config_map.content.default_lat_center, this.#config_map.content.default_lon_center], this.#config_map.content.default_zoom);
        //collecter les fonds de carte
        for (var layer = 0; layer < this.#geo_layers.content.length; layer++) {
            //intégrer les fonds de carte du fichier de config dans le tableau des fonds de cartes
            this.#layers.backgroundTiles.layer[layer] = L.tileLayer(this.#geo_layers.content[layer].url, this.#geo_layers.content[layer].attributes);
            //on ajoute une option en haut à droite de la carte qui permettra de sélectionner les fonds
            this.#layers.backgroundTiles.control[this.#geo_layers.content[layer].name] = this.#layers.backgroundTiles.layer[layer];
        }
        //par défaut la carte s'ouvre sur le premier fond de carte renseigné dans le fichier de config !!DOC
        this.#layers.backgroundTiles.layer[0].addTo(this.#config_map.content.map);
        //ajout du bouton cliquable en haut à droite qui permet de changer le fond 
        this.#layers.backgroundTiles.allControls = L.control.layers(this.#layers.backgroundTiles.control).addTo(this.#config_map.content.map);
        if (graticule) {
            var graticules = (this.pasteGraticule()).addTo(this.#config_map.content.map);
        }
    }
    /**
     * Imprime des lignes repères latitude/longitude, basé sur une extension Leaflet (leaflet.latlng-graticule.js)
     * origine de la méthode et démonstration : https://github.com/cloudybay/leaflet.latlng-graticule/blob/master/leaflet.latlng-graticule.js
     * @returns graticule prêt à être inséré dans la carte
     */
    pasteGraticule() {
        return L.latlngGraticule({
            color: this.#config_map.content.graticule_color,
            weight: 1,
            opacity: 0.5,
            showLabel: true,
            font: '12px Verdana,sans-serif',
            dashArray: [5, 5],
            zoomInterval: [{
                    start: 2,
                    end: 3,
                    interval: 30
                },
                {
                    start: 4,
                    end: 4,
                    interval: 10
                },
                {
                    start: 5,
                    end: 7,
                    interval: 5
                },
                {
                    start: 8,
                    end: 10,
                    interval: 1
                }
            ]
        });
    }
    /**
     * Renvoie l'objet carte pour instanciations de CycladeMaps
     * @param {string} nameMap 
     * @returns {object}
     */
    getMap() {
        return this.#config_map.content.map;
    }
}