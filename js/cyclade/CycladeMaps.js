import CycladeGraphs from './CycladeGraphs.js';
export default class CycladeMaps extends CycladeGraphs {

    /**********************CONSTRUCTOR**********************/

    #map = {
        "def": "map where all the data is printed",
        "content": {}
    }
    #layers = {
        "def": "All the layers printed for one file, ordered by number of depression",
        "content": []
    }
    #linkGraphMap = {
        "def": "Has all the created popups of the file, ordered by trajectory and date",
        "content": {}
    };
    #linkGraphWind = {
        "def": "All the printed wind rays of the file, ordered by trajectory and date ",
        "content": {}
    };

    /**
     * Prépare une instance, avec en paramètre les réglages de cartes du fichier de configuration préparés par une fonction de CycladeSettings, un fond de carte et une variable contenant les données d'un fichier json
     * @param {object} instanceGraphRootCyclade 
     * @param {object} settings 
     * @param {object} data 
     */
    constructor(settings, data, map) {
        super(settings, data);
        this.#map.content = map;
        this.#layers.content = new Array();
    }
    /**********************REMOVE FROM MAP**********************/

    /**
     * Supprime toutes les couches créees sur le fond de carte
     */
    removeAllLayers() {
        this.#layers.content.forEach(element =>
            element.removeFrom(this.#map.content));
    }
    /**
     * Supprime la couche d'une seule trajectoire 
     * Ici pour un modèle on envoie une date, et un numéro de traj pour les best-tracks
     * @param {number or string} idTraj 
     */
    removeALayer(idtraj) {
        if (this.findTheSytemNumber(idtraj)) {
            if (this.#layers.content[this.rank.content.rankInSysts]) {
                (this.#layers.content[this.rank.content.rankInSysts]).removeFrom(this.#map.content);
            }
        }
    }

    /**********************PRINT ON MAP**********************/
    /**
     * Imprime toutes les trajectoires d'un fichier
     */

    printAllTrajectories() {
        for (let t = 0; t < this.data.content[this.settings.content.hierarchy.trajectories].length; t++) {
            this.rank.content.rankInSysts = t;
            this.getTheRightFilePrinted(t);
        }
    }
    /**
     * Crée un groupe de couches pour toutes les données relatives à un système ou une prévision
     * et les fait s'imprimer selon les réglages définis dans le style associé à l'instance qui demande une impression
     * @param {number or string} id 
     */

    getTheRightFilePrinted(id) {
        //tester si des données existent
        if (this.findTheSytemNumber(id)) {
            //Crée un groupe de couches pour un système
            if (typeof (this.#layers.content[this.rank.content.rankInSysts]) == 'undefined') {
                this.#layers.content[this.rank.content.rankInSysts] = L.layerGroup();

                //imprimer un fichier geoJSON
                this.#printDataOnMap(this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["trajectoire"], this.rank.content.rankInSysts);

                if (this.settings.content.style.points) {
                    //crée un objet pour stocker toutes les pop-ups associées à une trajectoire et imprime tous les points pour une trajectoire
                    this.#linkGraphMap.content[this.rank.content.rankInSysts] = {};
                    this.#printPointsForOneTrajectory();
                }

                //test si impresion de vents lors du parcours du graph, génére et stocke ces rayons si oui
                if (this.settings.content.on_click) {
                    if (this.settings.content.on_click.vents) {
                        this.#linkGraphWind.content[this.rank.content.rankInSysts] = {};
                        this.#printTheWind();
                    }
                }
            }

            //ajouter le groupe à la carte pour qu'il s'affiche
            this.#layers.content[this.rank.content.rankInSysts].addTo(this.#map.content);
        } else {
            console.log("pas de données trouvées pour " + id + " sur la saison " + this.data.content.saison + " bassin " + this.data.content.bassin);
            return false;
        }
    };
    /**
     * Ne fonctionne que sur des données au format geoJSON. 
     * Les fait s'imprimer en plusieurs fois en cas de "feature collection", en une seule sinon. 
     */
    publishMap() {
        if (this.data["type"] === "FeatureCollection") {
            for (let oneItem = 0; oneItem < this.data.content.features.length; oneItem++) {
                this.#printDataOnMap(this.data.content.features[oneItem]);
            }
        } else {
            this.#printDataOnMap(this.data.content);
        }
    }
    /**
     * Publie des données au format geoJSON sur la carte en fonction du style défini par config_map et le main 
     * @param {object} data pour une traj
     * @param {number} noTraj
     */
   #printDataOnMap(data, noTraj = null) {
        if (this.settings.content.style.icon) {
            var icon = this.settings.content.style.icon;
        }

        if (this.settings.content.on_click) {
            this.#printAClickablePoint(data, noTraj);
        }
        let style = this.settings.content.style;
        //tri seulement sur la couleur et trajectoire pleine / tirets
        var color = this.getStyle(noTraj, style.color);
        var dashArray = this.getStyle(noTraj, style.dashArray);

        let popupmap = this.#linkGraphMap.content;
        let inst = this;
        let geoJTraj = (L.geoJSON(data, {
            //style : for polygons and lines
            color: color,
            dashArray: dashArray,
            weight: this.settings.content.style.weight,
            opacity: this.settings.content.style.opacity,
            //for points
            pointToLayer: function (feature, latlong) {
                return L.marker(latlong, {
                    icon: icon
                });
            },
            //pop up
            onEachFeature: function (feature, layer) {
                if (style.popup && noTraj == null) {
                    let infos = inst.#genererPopUp(feature, layer, style, date);
                    return popupmap[infos[0]] = layer.bindPopup(infos[1]);
                }
            }
        }));
        if (noTraj !== null) {
            geoJTraj.addTo(this.#layers.content[noTraj]);
            //si on est sur un fichier avec une seul geoJSON simple, il est imprimé directement sur le fond de carte
        } else {
            this.#layers.content.push(geoJTraj);
            geoJTraj.addTo(this.#map.content);
        }
    }

    /**
     * Prépare un rayon de vent sur la carte pour chaque point, mais ne l'imprime pas. 
     * La figure est enregistrée dans la propriété #linkGraphWind
     *Le vent doit être au format geoJSON
     */
   #printTheWind() {
        for (let unvent = 0; unvent < this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"].length; unvent++) {
            let style = {
                "color": null,
                "weight": this.settings.content.on_click.vents.style.weight,
                "opacity": this.settings.content.on_click.vents.style.weight
            };
            let feature = this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"][unvent];
            let indice = (((new Date((eval(this.utils.readStringPath(this.settings.content.graph.datelocation)))).getTime()) / 10000000).toFixed());
            style.color = this.getStyle(unvent, this.settings.content.on_click.vents.style);
            let data = eval(this.utils.readStringPath(this.settings.content.on_click.vents.emplacement));
            if (data !== null) {
                let trajVent = (L.geoJSON(data, {
                    style: style,
                }));
                this.#linkGraphWind.content[this.rank.content.rankInSysts][indice] = trajVent;
            }
        }
    }

    /**
     * Imprime tous les points d'une trajectoire avec un tri sur les couleurs si nécessaire
     * + fenêtre popup
     */

   #printPointsForOneTrajectory() {
        for (let i = 0; i < this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"].length; i++) {
            var mycolor = this.getStyle(i, this.settings.content.style.points);
            let feature = this.data.content[this.settings.content.hierarchy.trajectories][this.rank.content.rankInSysts]["points"][i];
            let date = new Date(eval(this.utils.readStringPath(this.settings.content.graph.datelocation))).getTime();

            let mypoint = (L.circleMarker([feature.lat, feature.lon], {
                color: mycolor,
                fillColor: mycolor,
                fillOpacity: this.settings.content.style.points_settings.fillOpacity,
                radius: this.settings.content.style.points_settings.radius,
                weight: this.settings.content.style.points_settings.weight,

            }));
            //cas json complexe
            if (this.rank.content.rankInSysts !== null) {
                //mettre des pop-up sur les points;
                if (this.settings.content.style.popup) {
                    let infospopup = this.#genererPopUp(feature, mypoint, this.settings.content.style, date);
                    console.log(infospopup);
                    this.#linkGraphMap.content[this.rank.content.rankInSysts][infospopup[0]] = mypoint.bindPopup(infospopup[1]);
                }
                mypoint.addTo(this.#layers.content[this.rank.content.rankInSysts]);
                //cas geojson simple
            } else {
                (this.#layers.content).push(mypoint);
                mypoint.addTo(this.#map.content);
            }
        }
    }
    /**
     * Imprime une icone ou un cercle sur le premier point d'une trajectoire
     * Clicquable avec popup dont le contenu est défini dans config_map
     * cas 1 : gros fichier, il y a un number et on ne se sert pas du paramètre data parce que l'info est portée par les points
     * cas 2 : fichier traj seule, pas de point dons on prend la point de départ de la traj
     * @param {number} number 
     * @param {object} data 
     */
   #printAClickablePoint(data, number = null) {

        //cas gros fichier
        if (this.data.content[this.settings.content.hierarchy.trajectories]) {
            var unPoint = this.data.content[this.settings.content.hierarchy.trajectories][number]["points"][0];
            //cas geoJSON simple
        } else {
            switch (data.geometry.type) {
                //si on a un fichier traj seule
                case "LineString":
                    //chercher le lat lon du premier point d'une traj sans objet point geojson
                    var unPoint = {}
                    unPoint["lat"] = data.geometry.coordinates[0][1];
                    unPoint["lon"] = data.geometry.coordinates[0][0];
                    break;
                case "Point":
                    var unPoint = {}
                    unPoint["lat"] = data.geometry.coordinates[0];
                    unPoint["lon"] = data.geometry.coordinates[1];
                    break;
                default:
                    console.log("pas de point au départ géré dans cette situation");
            }
        }

        let style = this.settings.content.on_click.map_style;
        //si il y a une icone, c'est cette icone qui s'imprimera
        if (this.settings.content.on_click.map_style.icon) {
            var mypoint = L.marker([unPoint.lat, unPoint.lon], {
                icon: this.settings.content.on_click.map_style.icon
            });
        } else {
            let color = this.getStyle(0, this.settings.content.on_click.map_style);
            //sinon, c'est juste un rond en couleur
            var mypoint = L.circleMarker([unPoint.lat, unPoint.lon], {
                color: color,
                fillColor: style.color,
                fillOpacity: style.fillOpacity,
                weight: style.weight,
                radius: style.radius
            });
        }
        //create a pop up with some information on click
        //TODO FACTORISER AVEC LE GENERATEUR DE POP UPS       
        mypoint.addEventListener("click", () => {
            let popupcontent = "";
            let fields = this.settings.content.on_click.popup_on_click;

            for (let i = 0; i < fields.length; i++) {
                //initialiation popup
                if (popupcontent !== "") {
                    popupcontent += "<br>";
                }
                if (popupcontent == "") {
                    popupcontent += "<h4>";
                }

                let value = "champ non trouvé";
                try {
                    //bas niveau
                    if (typeof (this.data.content[this.settings.content.hierarchy.trajectories][number][fields[i]]) !== 'undefined') {
                        value = this.data.content[this.settings.content.hierarchy.trajectories][number][fields[i]];
                        //haut niveau
                    } else if (typeof (this.data.content[fields[i]]) !== 'undefined') {
                        value = this.data.content[fields[i]];
                    }
                } catch {
                    console.log("Le champs" + [fields[i]] + "n'est pas accessible");
                }
                popupcontent += value;
            }
            popupcontent += "</h4>";
            mypoint.bindPopup(popupcontent);
        });
        if (number !== null) {
            mypoint.addTo(this.#layers.content[number]);
        } else {
            this.#layers.content.push(mypoint);
            mypoint.addTo(this.#map.content);
        }
    }

    /**
     * Prépare le texte d'une popup, selon les réglages de config_map.json
     * Renvoie un tableau avec le timestamp de la popup en pos 0, et le texte en pos 1. 
     * @param {object} feature data
     * @param {object} thislayer leafletlayer
     * @param {object} mystyle style
     * @param {number} date date du premier point d'une trajectoire, utilisée pour référencer la popup 
     * @returns {array}
     */

   #genererPopUp(feature, thislayer, mystyle, date) {
        let popUp = "";
        for (let item in mystyle.popupContent) {
            if (popUp !== "") {
                popUp += "<br>";
            }
            popUp += "<h4> " + mystyle.popupContent[item] + " </h4>";
            try {
                popUp += eval(this.utils.readStringPath(mystyle.popupContent[item]));
            } catch {
                console.log(mystyle.popupContent[item] + " n'est pas défini pour cette donnée");
            }
           
        }
        //ajout de la pop-up à la couche. Cela a lieu APRES l'impression de la couche sur la carte
        let indice = (((new Date(date).getTime()) / 10000000).toFixed());
        return ([indice, popUp]);
    }

    /*******************************************LINK GRAPH AND MAP*******************************************/

    /**
     * Renvoie un tableau associatif avec toutes les popup sur les points et tous les rayons de vent pour une trajectoire, 
     * si les réglages de l'instance ont défini qu'il devaient être imprimés
     * @param {number} numero no du système ou date pour un modèle
     * @returns {object}
     */

    getMapObjects(numero) {
        if (this.findTheSytemNumber(numero)) {
            let result = {};
            //Le fait qu'il y ait des popup est déclenché par une clé "points" dans le style choisi pour l'instance
            if (this.#linkGraphMap.content[this.rank.content.rankInSysts]) {
                if (Object.keys(this.#linkGraphMap.content[this.rank.content.rankInSysts]).length !== 0) {
                    result["popup"] = this.#linkGraphMap.content[this.rank.content.rankInSysts];
                } else {
                    console.log("Pas de popup pour ce trajet, regarder dans style/points");
                }
            }
            //Le fait qu'il y ait des popup est déclenché par une propriété on_click/vents dans les réglages de l'instance
            if (this.#linkGraphWind.content[this.rank.content.rankInSysts]) {
                if (Object.keys(this.#linkGraphWind.content[this.rank.content.rankInSysts]).length !== 0) {
                    result["wind"] = this.#linkGraphWind.content[this.rank.content.rankInSysts];
                } else {
                    console.log("Pas de rayons de vents définis pour ce trajet, problème dans on_click/vents ou uniquement valeurs null");
                }
            }
            return result;
        } else {
            return false;
        }
    }
}