export default class CycladeSettings {

    #config_map = {
        "def": "Map configuration = config_map.json",
        "content": null
    }
    #config_charts = {
        "def": "Configuration graph = config_charts.json",
        "content": null
    }

    /**
     * Constructeur : attend des json déjà lus avec read_json en paramètres
     * @param {object} config_map 
     * @param {object} config_graph 
     */
    constructor(config_graph, config_map = null) {
        this.#config_charts.content = config_graph;
        this.#config_map.content = config_map;
    }

    /**
     * Crée un gros objet qui servira à instancier CycladeGraphs ou CycladeMaps. Extrait des fichiers de configuration les réglages demandés
     * @param {object} obj 
     * @returns object
     */
    getCycladeObject(obj) {

        var result = {};

        /********* Data location *********/

        /**
         * Différences de noms de champs entre analyses et modèles, structure des fichiers (prévisions vs trajectoires)
         * Se base sur le champ ("type" de l'objet envoyé)
         */
        result["hierarchy"] = {};
        for (var item in this.#config_charts.content.differentFields) {
            result["hierarchy"][item] = this.#config_charts.content.differentFields[item][obj.type];
        }
        result["graph"] = {};
        result.graph["datelocation"] = this.#config_charts.content.Xfield.date.location[obj.type];
        result.graph["paramsFields"] = {};

        for (var item in this.#config_charts.content.paramsFields) {
            //gestion des champs qui n'auraient pas le même nom
            let location = this.#config_charts.content.paramsFields[item]["location"];
            if (location.differentFields) {
                result.graph["paramsFields"][item] = this.#config_charts.content.differentFields[item][obj.type];
            } else {
                result.graph["paramsFields"][item] = location;
            }
        }

        /********* Style *********/
        if (typeof (obj.style) == 'undefined') {
            obj.style = "default"
        }
        result["style"] = eval(this.#config_charts.content.trajectories_styles[obj.style]);
        this.#errorMessage("config_charts/trajectories_style" + [obj.style], result["style"]);
        //couleur principale pour 1 fichier
        if (result["style"]["color"]) {
            if (result["style"]["color"]["colors_sorting"]) {
                result["style"]["color"]["colors_sorting"] = eval(this.#config_charts.content.colors_sorting[result.style.color.colors_sorting]);
            }
        }

        //style de tracé (plain ou pointillés)
        if (result.style.dashArray) {
            if (result.style.dashArray.colors_sorting) {
                result.style.dashArray.colors_sorting = eval(this.#config_charts.content.colors_sorting[result.style.dashArray.colors_sorting]);
            }
        }

        /*************** Map Style ****************/
        //Si on travaille avec une carte, des paramétrages issus de config_map sont ajoutées

        if (this.#config_map.content !== null) {
            //ajouter les propriétés de style spécifique à la carte
            let style = eval(this.#config_map.content.trajectories_styles[obj.style]);
            try {
                for (item in style) {
                    //contenu des pop-ups
                    if (item == "popupContent") {
                        if (typeof(this.#config_map.content.popup_content[style[item]]) !== 'undefined') {
                            result.style.popupContent = this.#config_map.content.popup_content[style[item]];
                        } 
                    } else {
                        result["style"][item] = this.#config_map.content.trajectories_styles[obj.style][item];
                    }
                }
            } catch {
                this.#errorMessage("config_map/trajectories_style" + obj.style, style);
            }
            //si pas de popup définie, popup par défaut
            if (result.style.popup){
                if (typeof(result.style.popupContent) == 'undefined'){
                    console.log("non");
                    result.style.popupContent = this.#config_map.content.popup_content.default;
                }
            }

            //icones
            if (result.style.icon) {
                result.style["icon"] = this.#getMyIcon(result.style.icon);
            }

            //couleur des points
            if (result.style.points) {
                if (obj.points) {
                    result.style["points"] = {};
                    //Les tests de couleur sur points peuvent être dans config_map (ex:vent fort)
                    if (this.#config_map.content.colors_sorting[obj.points]) {
                        result.style.points["colors_sorting"] = this.#config_map.content.colors_sorting[obj.points];
                    } else {
                        //ou alors dans config_chart, si ils concerne un color_sorting qui vaut aussi pour la couleur principale du graph (ex : modele)
                        result.style.points["colors_sorting"] = this.#config_charts.content.colors_sorting[obj.points];
                    }
                } else {
                    result.style.points = result.style.color;
                }
            }

            //taille des points, pleins ou vides
            if (obj.points_settings) {
                result.style["points_settings"] = this.#config_map.content.points_settings[obj.points_settings];
            } else {
                result.style["points_settings"] = this.#config_map.content.points_settings.normal;
            }

            if (obj.on_click) {
                result["on_click"] = {};
                //point cliquable au début
                if (obj.on_click.map_style) {
                    result.on_click["map_style"] = eval(this.#config_map.content.on_click[obj.on_click.map_style]);
                    try {
                        if (result.on_click.map_style.icon) {
                            result.on_click.map_style.icon = this.#getMyIcon(result.on_click.map_style.icon);
                        }
                    } catch {
                        this.#errorMessage("config_map.json / on_click /" + obj.on_click.map_style, result.on_click["map_style"]);
                    }
                    //pop-up spécifique point cliquable
                    if (result.on_click.map_style.popUpContent) {
                        result.on_click["popup_on_click"] = this.#config_map.content.popup_content[result.on_click.map_style.popUpContent];
                    }
                }
                //rayons de vent
                if (obj.on_click.vents) {
                    result.on_click["vents"] = eval(this.#config_map.content.on_click[obj.on_click.vents]);
                    try {
                        if (result.on_click.vents.style.color.colors_sorting) {
                            result.on_click.vents.style["colors_sorting"] = (this.#config_map.content.colors_sorting[result.on_click.vents.style.color.colors_sorting]);
                        }
                    } catch {
                        this.#errorMessage("config_map.json / on_click /" + obj.on_click.vents, result.on_click["vents"]);
                    }

                }
            }
        }
        return result;
    }
    /**
     * Utilisée pour mettre les checkboxs sur l'interface
     * @returns {object} tous les diagnostics prévus dans config_charts
     */
    getAvailablesParamsFieldsNames() {
        var fields = {};
        for (var item in this.#config_charts.content.paramsFields) {
            fields[item] = this.#config_charts.content.paramsFields[item]["name"];
        }
        return fields;
    }

    /**
     * Même chose pour les graphiques
     * @returns {object}
     */
    #getAvailablesParamsFieldsForRoot() {
        var fields = {};
        for (var item in this.#config_charts.content.paramsFields) {
            fields[item] = {};
            fields[item]["name"] = this.#config_charts.content.paramsFields[item]["name"];
            fields[item]["unit"] = this.#config_charts.content.paramsFields[item]["unit"]
        }
        return fields;
    }
    /**
     * Style du graphique 
     * @returns {object}
     */
    getChartRootParams() {
        var result = {};
        result["style"] = this.#config_charts.content.style;
        result["paramsFields"] = this.#getAvailablesParamsFieldsForRoot();
        result["baseInterval"] = this.#config_charts.content.baseInterval;
        return result;
    }

    /**
     * Rend la racine de la carte
     * @param {string} nameMap 
     * @returns {object}
     */
    getMapObject(nameMap) {
        let mapObject = this.#config_map.content[nameMap];
        return mapObject;
    }
    /**
     * Prépare des icones prêtes à l'emploi, utilisant le fichier de configuration config_map
     * @param {string} iconName 
     * @returns object prêt à être lu par les méthodes de Leaflet
     */
    #getMyIcon(iconName) {
        if (typeof (iconName) === 'string') {
            let url = (this.#config_map.content.icons.iconUrl + iconName);
            this.#errorMessage("config_map/icons/iconUrl" + iconName, url);
            let icon = new L.icon({
                iconUrl: url,
                iconSize: this.#config_map.content.icons.iconSize,
                iconAnchor: this.#config_map.content.icons.iconAnchor
            });
            return icon;
        } else {
            return iconName;
        }
    }
    /**
     * Imprime un message d'erreur si besoin
     * @param {any}
     */
    #errorMessage(name, variable) {
        if (typeof (variable) == 'undefined') {
            console.log("Erreur : " + name + " est mal paramétré et ne peut pas être lu");
        }
    }
}